import type { Rng } from '../data/random';
import { randInt } from '../data/random';
import { sse } from '../metrics';
import { dist, dist2, nearestIndex } from './geometry';
import type { Overlay, Point, Step } from './types';

export interface KMeansParams {
  k: number;
  init: 'random' | 'kmeans++' | 'manual';
  /** init이 'manual'일 때 사용자가 놓은 중심점 */
  manualCentroids?: Point[];
  maxIter: number;
}

const unassigned = (n: number) => new Int32Array(n).fill(-1);

function emptyStep(): Step {
  return {
    kind: 'empty',
    labels: new Int32Array(0),
    message: '점이 없습니다. 데이터를 생성하거나 캔버스에 점을 찍어 주세요.',
  };
}

/** 무작위 초기화: 서로 다른 점 K개를 중심으로 고름 */
export function randomInit(points: Point[], k: number, rng: Rng): Point[] {
  const idx = points.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, k).map((i) => ({ ...points[i] }));
}

/**
 * K-Means++ 초기화. detailed=true 이면 중심을 하나 고를 때마다 단계를 내보낸다.
 * 반환값: 고른 중심 목록
 */
export function* kmeansPlusPlusInit(
  points: Point[],
  k: number,
  rng: Rng,
  detailed: boolean,
): Generator<Step, Point[], void> {
  const n = points.length;
  const first = randInt(rng, n);
  const centers: Point[] = [{ ...points[first] }];
  const labels = unassigned(n);
  if (detailed) {
    yield {
      kind: 'pp-first',
      labels,
      centroids: centers.map((c) => ({ ...c })),
      highlight: [first],
      message: `첫 번째 중심은 무작위로 고릅니다 (${first + 1}번 점).`,
      codeLine: 0,
    };
  }
  const d2 = new Float64Array(n);
  while (centers.length < k) {
    let total = 0;
    for (let i = 0; i < n; i++) {
      let best = Infinity;
      for (const c of centers) best = Math.min(best, dist2(points[i], c));
      d2[i] = best;
      total += best;
    }
    const probs = new Float64Array(n);
    for (let i = 0; i < n; i++) probs[i] = total > 0 ? d2[i] / total : 1 / n;
    if (detailed) {
      yield {
        kind: 'pp-weights',
        labels,
        centroids: centers.map((c) => ({ ...c })),
        weights: probs,
        message: `각 점에서 가장 가까운 중심까지의 거리²에 비례해 확률을 매깁니다. 멀리 있는 점일수록 크게 표시됩니다.`,
        codeLine: 1,
      };
    }
    // 확률에 따라 하나 뽑기
    let r = rng();
    let chosen = n - 1;
    for (let i = 0; i < n; i++) {
      r -= probs[i];
      if (r <= 0) {
        chosen = i;
        break;
      }
    }
    centers.push({ ...points[chosen] });
    if (detailed) {
      yield {
        kind: 'pp-pick',
        labels,
        centroids: centers.map((c) => ({ ...c })),
        weights: probs,
        highlight: [chosen],
        message: `${centers.length}번째 중심으로 ${chosen + 1}번 점이 뽑혔습니다 (확률 ${(probs[chosen] * 100).toFixed(1)}%).`,
        codeLine: 2,
      };
    }
  }
  return centers;
}

export function* kmeans(
  points: Point[],
  params: KMeansParams,
  rng: Rng,
  detailedInit = false,
): Generator<Step, void, void> {
  const n = points.length;
  if (n === 0) {
    yield emptyStep();
    return;
  }
  const k = Math.max(1, Math.min(params.k, n));
  const lineOffset = detailedInit ? 4 : 0; // K-Means++ 의사코드는 앞에 4줄이 더 있음

  let centroids: Point[];
  let initMessage: string;
  if (params.init === 'manual') {
    const placed = (params.manualCentroids ?? []).slice(0, params.k);
    if (placed.length < params.k) {
      // 중심이 다 놓일 때까지는 이 안내 단계 하나만 보여 줌
      yield {
        kind: 'await-manual',
        labels: unassigned(n),
        centroids: placed.map((c) => ({ ...c })),
        message: `캔버스를 눌러 중심점을 놓아 주세요. (${placed.length} / ${params.k}개) 놓은 중심은 끌어서 옮기거나 다시 눌러 지울 수 있습니다.`,
        codeLine: 0,
      };
      return;
    }
    centroids = placed.map((c) => ({ ...c }));
    initMessage = `직접 놓은 중심 ${params.k}개에서 시작합니다. 위치를 바꾸면 결과가 어떻게 달라지는지 비교해 보세요.`;
  } else if (params.init === 'kmeans++') {
    centroids = yield* kmeansPlusPlusInit(points, k, rng, detailedInit);
    initMessage = `K-Means++ 방식으로 중심 ${k}개를 배치했습니다.`;
  } else {
    centroids = randomInit(points, k, rng);
    initMessage = `데이터 중에서 무작위로 중심 ${k}개를 골랐습니다.`;
  }
  const kk = centroids.length;

  yield {
    kind: 'init',
    labels: unassigned(n),
    centroids: centroids.map((c) => ({ ...c })),
    message: initMessage,
    codeLine: detailedInit ? 3 : 0,
  };

  let labels = unassigned(n);
  for (let iter = 1; iter <= params.maxIter; iter++) {
    const next = new Int32Array(n);
    const changedIdx: number[] = [];
    for (let i = 0; i < n; i++) {
      next[i] = nearestIndex(points[i], centroids);
      if (next[i] !== labels[i]) changedIdx.push(i);
    }
    const changed = changedIdx.length;
    labels = next;

    if (iter > 1 && changed === 0) {
      yield {
        kind: 'converged',
        labels,
        centroids: centroids.map((c) => ({ ...c })),
        metrics: { sse: sse(points, labels, centroids) },
        message: `${iter}회차: 소속이 바뀐 점이 하나도 없습니다. 수렴했으므로 종료합니다.`,
        codeLine: lineOffset + 4,
      };
      return;
    }

    yield {
      kind: 'assign',
      labels,
      centroids: centroids.map((c) => ({ ...c })),
      highlight: iter > 1 ? changedIdx : undefined,
      metrics: { sse: sse(points, labels, centroids) },
      message:
        iter === 1
          ? `1회차 할당: 모든 점을 가장 가까운 중심의 군집에 넣었습니다.`
          : `${iter}회차 할당: 점 ${changed}개의 소속 군집이 바뀌었습니다.`,
      codeLine: lineOffset + 2,
    };

    // 중심 이동
    const sumX = new Float64Array(kk);
    const sumY = new Float64Array(kk);
    const cnt = new Int32Array(kk);
    for (let i = 0; i < n; i++) {
      sumX[labels[i]] += points[i].x;
      sumY[labels[i]] += points[i].y;
      cnt[labels[i]]++;
    }
    const moved: Point[] = centroids.map((c, j) =>
      cnt[j] > 0 ? { x: sumX[j] / cnt[j], y: sumY[j] / cnt[j] } : { ...c },
    );
    const overlays: Overlay[] = centroids.map((c, j) => ({
      type: 'line',
      x1: c.x,
      y1: c.y,
      x2: moved[j].x,
      y2: moved[j].y,
      tone: 'cluster',
      cluster: j,
    }));
    const maxMove = Math.max(...centroids.map((c, j) => dist(c, moved[j])));
    const empty = cnt.reduce((a, c) => a + (c === 0 ? 1 : 0), 0);
    centroids = moved;
    yield {
      kind: 'update',
      labels,
      centroids: centroids.map((c) => ({ ...c })),
      overlays,
      metrics: { sse: sse(points, labels, centroids) },
      message:
        `${iter}회차 이동: 각 중심을 소속 점들의 평균 위치로 옮겼습니다 (가장 많이 움직인 거리 ${maxMove.toFixed(3)}).` +
        (empty > 0 ? ` 빈 군집 ${empty}개는 제자리에 둡니다.` : ''),
      codeLine: lineOffset + 3,
    };
  }

  yield {
    kind: 'max-iter',
    labels,
    centroids: centroids.map((c) => ({ ...c })),
    metrics: { sse: sse(points, labels, centroids) },
    message: `최대 반복 횟수(${params.maxIter}회)에 도달해 종료합니다.`,
    codeLine: lineOffset + 4,
  };
}
