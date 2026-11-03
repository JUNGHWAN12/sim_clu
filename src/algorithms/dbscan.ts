import { countClusters } from './geometry';
import { ROLE, type Point, type Step } from './types';

export interface DbscanParams {
  eps: number;
  minPts: number;
  detail: boolean;
}

/** 각 점의 ε-이웃 목록 (자기 자신 포함) */
export function regionQueryAll(points: Point[], eps: number): number[][] {
  const n = points.length;
  const e2 = eps * eps;
  const nb: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    nb[i].push(i);
    for (let j = i + 1; j < n; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      if (dx * dx + dy * dy <= e2) {
        nb[i].push(j);
        nb[j].push(i);
      }
    }
  }
  return nb;
}

export function* dbscan(points: Point[], params: DbscanParams): Generator<Step, void, void> {
  const n = points.length;
  if (n === 0) {
    yield {
      kind: 'empty',
      labels: new Int32Array(0),
      message: '점이 없습니다. 데이터를 생성하거나 캔버스에 점을 찍어 주세요.',
    };
    return;
  }
  const { eps, minPts, detail } = params;
  const nb = regionQueryAll(points, eps);
  const labels = new Int32Array(n).fill(-1);
  const roles = new Uint8Array(n); // ROLE.NONE = 아직 방문 안 함
  const visited = new Uint8Array(n);
  let noise = 0;

  const snap = (
    kind: string,
    message: string,
    codeLine: number,
    focus?: number,
    highlight?: number[],
  ): Step => ({
    kind,
    labels: labels.slice(),
    roles: roles.slice(),
    message,
    codeLine,
    highlight: highlight ?? (focus !== undefined ? [focus] : undefined),
    overlays:
      focus !== undefined
        ? [{ type: 'circle', x: points[focus].x, y: points[focus].y, r: eps, tone: 'focus' }]
        : undefined,
    metrics: { clusters: countClusters(labels), noise },
  });

  yield snap(
    'init',
    `반경 ε=${eps.toFixed(3)}, 최소 이웃 수 MinPts=${minPts}로 시작합니다. 아직 아무 점도 방문하지 않았습니다.`,
    0,
  );

  let c = -1;
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = 1;
    const isCore = nb[i].length >= minPts;
    if (!isCore) {
      roles[i] = ROLE.NOISE;
      noise++;
      if (detail) {
        yield snap(
          'noise',
          `${i + 1}번 점: 반경 안의 이웃이 ${nb[i].length}개로 MinPts(${minPts})보다 적습니다. 일단 노이즈로 표시합니다.`,
          3,
          i,
        );
      }
      continue;
    }
    c++;
    labels[i] = c;
    roles[i] = ROLE.CORE;
    yield snap(
      'new-cluster',
      `${i + 1}번 점: 이웃이 ${nb[i].length}개로 핵심점입니다. 새 군집 ${c + 1}을(를) 만들고 이웃으로 넓혀 갑니다.`,
      4,
      i,
      nb[i],
    );
    const queue = nb[i].filter((j) => j !== i);
    const inQueue = new Uint8Array(n);
    for (const j of queue) inQueue[j] = 1;
    while (queue.length > 0) {
      const j = queue.shift()!;
      if (roles[j] === ROLE.NOISE) {
        // 노이즈였던 점이 군집의 가장자리로 편입
        noise--;
        roles[j] = ROLE.BORDER;
        labels[j] = c;
      }
      if (labels[j] === -1) labels[j] = c;
      if (visited[j]) continue;
      visited[j] = 1;
      if (nb[j].length >= minPts) {
        roles[j] = ROLE.CORE;
        let added = 0;
        for (const q of nb[j]) {
          // 아직 군집이 없는 점(노이즈였던 점 포함)만 대기열에 추가
          if (!inQueue[q] && labels[q] === -1 && q !== i) {
            queue.push(q);
            inQueue[q] = 1;
            added++;
          }
        }
        if (detail) {
          yield snap(
            'expand-core',
            `${j + 1}번 점도 핵심점입니다 (이웃 ${nb[j].length}개). 새 이웃 ${added}개를 확장 대기열에 넣습니다. (대기열 ${queue.length}개)`,
            6,
            j,
          );
        }
      } else {
        roles[j] = ROLE.BORDER;
        if (detail) {
          yield snap(
            'expand-border',
            `${j + 1}번 점은 이웃이 ${nb[j].length}개뿐이라 경계점입니다. 군집 ${c + 1}에 넣지만 더 넓히지는 않습니다.`,
            7,
            j,
          );
        }
      }
    }
    let size = 0;
    for (let q = 0; q < n; q++) if (labels[q] === c) size++;
    yield snap('cluster-done', `군집 ${c + 1} 확장이 끝났습니다 (점 ${size}개).`, 8);
  }
  yield snap('done', `모든 점을 방문했습니다. 군집 ${c + 1}개, 노이즈 ${noise}개를 찾았습니다.`, 9);
}
