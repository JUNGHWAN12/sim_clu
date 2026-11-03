import { dist, dist2 } from './geometry';
import type { Merge, Point, Step } from './types';

export type Linkage = 'single' | 'complete' | 'average' | 'ward';

export interface AgglomerativeParams {
  linkage: Linkage;
  k: number;
}

export const LINKAGE_LABEL: Record<Linkage, string> = {
  single: '단일 연결(가장 가까운 점)',
  complete: '완전 연결(가장 먼 점)',
  average: '평균 연결',
  ward: 'Ward(분산 증가 최소)',
};

interface MergeDetail extends Merge {
  rowA: number;
  rowB: number;
}

/**
 * Lance–Williams 공식으로 모든 병합 순서를 계산한다. O(n³)
 * 반환: 병합 기록 (길이 n-1)
 */
export function computeMerges(points: Point[], linkage: Linkage): MergeDetail[] {
  const n = points.length;
  const D = new Float64Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const d = linkage === 'ward' ? dist2(points[i], points[j]) : dist(points[i], points[j]);
      D[i * n + j] = d;
      D[j * n + i] = d;
    }
  const active = new Uint8Array(n).fill(1);
  const size = new Int32Array(n).fill(1);
  const clusterId = Int32Array.from({ length: n }, (_, i) => i);
  const merges: MergeDetail[] = [];

  for (let m = 0; m < n - 1; m++) {
    let bi = -1;
    let bj = -1;
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      if (!active[i]) continue;
      for (let j = i + 1; j < n; j++) {
        if (!active[j]) continue;
        const d = D[i * n + j];
        if (d < best) {
          best = d;
          bi = i;
          bj = j;
        }
      }
    }
    const ni = size[bi];
    const nj = size[bj];
    // bi 행에 합친 군집과 나머지 군집 사이의 새 거리
    for (let k = 0; k < n; k++) {
      if (!active[k] || k === bi || k === bj) continue;
      const dik = D[bi * n + k];
      const djk = D[bj * n + k];
      let d: number;
      switch (linkage) {
        case 'single':
          d = Math.min(dik, djk);
          break;
        case 'complete':
          d = Math.max(dik, djk);
          break;
        case 'average':
          d = (ni * dik + nj * djk) / (ni + nj);
          break;
        case 'ward': {
          const nk = size[k];
          d = ((ni + nk) * dik + (nj + nk) * djk - nk * best) / (ni + nj + nk);
          break;
        }
      }
      D[bi * n + k] = d;
      D[k * n + bi] = d;
    }
    merges.push({
      a: clusterId[bi],
      b: clusterId[bj],
      height: linkage === 'ward' ? Math.sqrt(best) : best,
      size: ni + nj,
      rowA: bi,
      rowB: bj,
    });
    active[bj] = 0;
    size[bi] = ni + nj;
    clusterId[bi] = n + m;
  }
  return merges;
}

/** 처음 count개의 병합만 적용했을 때 각 점의 군집 (0..n-count-1) */
export function labelsAfterMerges(n: number, merges: Merge[], count: number): Int32Array {
  const parent = Int32Array.from({ length: 2 * n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (let m = 0; m < count; m++) {
    parent[find(merges[m].a)] = n + m;
    parent[find(merges[m].b)] = n + m;
  }
  const map = new Map<number, number>();
  const labels = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!map.has(r)) map.set(r, map.size);
    labels[i] = map.get(r)!;
  }
  return labels;
}

function centroidOf(points: Point[], idx: number[]): Point {
  let x = 0;
  let y = 0;
  for (const i of idx) {
    x += points[i].x;
    y += points[i].y;
  }
  return { x: x / idx.length, y: y / idx.length };
}

export function* agglomerative(
  points: Point[],
  params: AgglomerativeParams,
): Generator<Step, void, void> {
  const n = points.length;
  if (n === 0) {
    yield {
      kind: 'empty',
      labels: new Int32Array(0),
      message: '점이 없습니다. 데이터를 생성하거나 캔버스에 점을 찍어 주세요.',
    };
    return;
  }
  const k = Math.max(1, Math.min(params.k, n));
  const merges = computeMerges(points, params.linkage);
  const shared: Merge[] = merges.map(({ a, b, height, size }) => ({ a, b, height, size }));

  // 화면 표시용: 점 2개 이상인 군집에만 색을 줌. 병합 시 더 큰 쪽의 색을 이어받음
  const rowOf = Int32Array.from({ length: n }, (_, i) => i);
  const members: number[][] = Array.from({ length: n }, (_, i) => [i]);
  const color = new Int32Array(n).fill(-1);
  let nextColor = 0;

  const display = () => {
    const labels = new Int32Array(n);
    for (let i = 0; i < n; i++) labels[i] = color[rowOf[i]];
    return labels;
  };

  yield {
    kind: 'init',
    labels: display(),
    dendrogram: { merges: shared, upto: 0 },
    message: `점 ${n}개가 각각 하나의 군집인 상태에서 시작합니다. 연결 방식: ${LINKAGE_LABEL[params.linkage]}.`,
    codeLine: 0,
  };

  for (let m = 0; m < merges.length; m++) {
    const { rowA, rowB, height } = merges[m];
    const A = members[rowA];
    const B = members[rowB];
    const ca = centroidOf(points, A);
    const cb = centroidOf(points, B);
    const sizeA = A.length;
    const sizeB = B.length;
    if (color[rowA] === -1 && color[rowB] === -1) color[rowA] = nextColor++;
    else if (color[rowA] === -1 || (color[rowB] !== -1 && sizeB > sizeA)) color[rowA] = color[rowB];
    for (const i of B) rowOf[i] = rowA;
    members[rowA] = A.concat(B);
    members[rowB] = [];
    const remaining = n - m - 1;
    yield {
      kind: 'merge',
      labels: display(),
      highlight: members[rowA],
      overlays: [{ type: 'line', x1: ca.x, y1: ca.y, x2: cb.x, y2: cb.y, tone: 'focus' }],
      dendrogram: { merges: shared, upto: m + 1 },
      metrics: { height },
      message: `가장 가까운 두 군집(점 ${sizeA}개 + 점 ${sizeB}개)을 병합했습니다. 병합 거리 ${height.toFixed(3)}, 남은 군집 ${remaining}개.`,
      codeLine: remaining > 1 ? 2 : 3,
    };
  }

  const cutIdx = n - k; // 처음 cutIdx개의 병합만 적용하면 군집 k개
  const lo = cutIdx > 0 ? merges[cutIdx - 1].height : 0;
  const hi = cutIdx < merges.length ? merges[cutIdx].height : lo * 1.1 + 1e-3;
  yield {
    kind: 'cut',
    labels: labelsAfterMerges(n, shared, cutIdx),
    dendrogram: { merges: shared, upto: merges.length, cutHeight: (lo + hi) / 2 },
    message: `덴드로그램을 높이 ${((lo + hi) / 2).toFixed(3)}에서 잘라 군집 ${k}개로 나눴습니다. 오른쪽의 '군집 수'를 바꾸면 자르는 높이가 달라집니다.`,
    codeLine: 4,
  };
}
