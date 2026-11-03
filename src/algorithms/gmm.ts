import type { Rng } from '../data/random';
import { randInt } from '../data/random';
import { kmeansPlusPlusInit, randomInit } from './kmeans';
import type { Overlay, Point, Step } from './types';

export interface GmmParams {
  k: number;
  maxIter: number;
  init: 'random' | 'kmeans++';
}

/** 2×2 대칭 공분산 [a b; b d] */
export interface Cov {
  a: number;
  b: number;
  d: number;
}

const REG = 1e-6; // 공분산이 특이해지지 않도록 대각선에 더하는 값
const TWO_PI = 2 * Math.PI;

export function logPdf(p: Point, mu: Point, c: Cov): number {
  const det = c.a * c.d - c.b * c.b;
  const dx = p.x - mu.x;
  const dy = p.y - mu.y;
  const m = (c.d * dx * dx - 2 * c.b * dx * dy + c.a * dy * dy) / det;
  return -0.5 * m - Math.log(TWO_PI) - 0.5 * Math.log(det);
}

/** 공분산 → 2σ 타원 (반지름, 기울기[도]) */
export function covEllipse(mu: Point, c: Cov, cluster: number): Overlay {
  const tr = (c.a + c.d) / 2;
  const diff = Math.sqrt(((c.a - c.d) / 2) ** 2 + c.b * c.b);
  const l1 = Math.max(tr + diff, 1e-12);
  const l2 = Math.max(tr - diff, 1e-12);
  const angle = (0.5 * Math.atan2(2 * c.b, c.a - c.d) * 180) / Math.PI;
  return {
    type: 'ellipse',
    x: mu.x,
    y: mu.y,
    rx: 2 * Math.sqrt(l1),
    ry: 2 * Math.sqrt(l2),
    angle,
    cluster,
  };
}

export function* gmm(points: Point[], params: GmmParams, rng: Rng): Generator<Step, void, void> {
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

  // 전체 데이터 분산을 초기 공분산의 기준으로 사용
  let mx = 0;
  let my = 0;
  for (const p of points) {
    mx += p.x;
    my += p.y;
  }
  mx /= n;
  my /= n;
  let v = 0;
  for (const p of points) v += (p.x - mx) ** 2 + (p.y - my) ** 2;
  v = Math.max(v / (2 * n), 1e-4);
  const initVar = v / k;

  let means: Point[];
  if (params.init === 'kmeans++') {
    const gen = kmeansPlusPlusInit(points, k, rng, false);
    let r = gen.next();
    while (!r.done) r = gen.next();
    means = r.value;
  } else {
    means = randomInit(points, k, rng);
  }
  let covs: Cov[] = means.map(() => ({ a: initVar, b: 0, d: initVar }));
  let weights = new Array(k).fill(1 / k);

  const ellipses = () => means.map((mu, j) => covEllipse(mu, covs[j], j));
  const snapshot = () => ({ centroids: means.map((m) => ({ ...m })), overlays: ellipses() });

  yield {
    kind: 'init',
    labels: new Int32Array(n).fill(-1),
    ...snapshot(),
    message: `가우시안 분포 ${k}개를 같은 크기의 원 모양으로 배치하고 시작합니다. 타원은 각 분포의 2σ(약 86%) 범위입니다.`,
    codeLine: 0,
  };

  const resp: Float64Array[] = Array.from({ length: n }, () => new Float64Array(k));
  let prevLL = -Infinity;
  const logs = new Float64Array(k);

  for (let iter = 1; iter <= params.maxIter; iter++) {
    // E단계: 각 점이 각 분포에서 나왔을 확률(책임도)
    let ll = 0;
    const labels = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      let maxL = -Infinity;
      for (let j = 0; j < k; j++) {
        logs[j] = Math.log(weights[j] + 1e-300) + logPdf(points[i], means[j], covs[j]);
        if (logs[j] > maxL) maxL = logs[j];
      }
      let s = 0;
      for (let j = 0; j < k; j++) s += Math.exp(logs[j] - maxL);
      const lse = maxL + Math.log(s);
      ll += lse;
      let best = 0;
      for (let j = 0; j < k; j++) {
        resp[i][j] = Math.exp(logs[j] - lse);
        if (resp[i][j] > resp[i][best]) best = j;
      }
      labels[i] = best;
    }
    const avgLL = ll / n;
    const soft = resp.map((r) => r.slice());

    const converged = Math.abs(avgLL - prevLL) < 1e-5;
    yield {
      kind: converged ? 'converged' : 'e-step',
      labels,
      soft,
      ...snapshot(),
      metrics: { loglik: avgLL },
      message: converged
        ? `${iter}회차: 로그 가능도가 거의 변하지 않습니다 (${avgLL.toFixed(4)}). 수렴했으므로 종료합니다.`
        : `${iter}회차 E단계: 각 점이 어느 분포에 속할지 확률을 계산했습니다. 점 색이 섞여 보이면 소속이 애매하다는 뜻입니다. (평균 로그 가능도 ${avgLL.toFixed(3)})`,
      codeLine: converged ? 4 : 2,
    };
    if (converged) return;
    prevLL = avgLL;

    // M단계: 책임도를 가중치로 평균, 공분산, 비율 갱신
    const newMeans: Point[] = [];
    const newCovs: Cov[] = [];
    const newWeights: number[] = [];
    let reinit = 0;
    for (let j = 0; j < k; j++) {
      let nk = 0;
      let sx = 0;
      let sy = 0;
      for (let i = 0; i < n; i++) {
        const r = resp[i][j];
        nk += r;
        sx += r * points[i].x;
        sy += r * points[i].y;
      }
      if (nk < 1e-8) {
        // 아무 점도 맡지 않은 분포는 무작위 점에서 다시 시작
        reinit++;
        newMeans.push({ ...points[randInt(rng, n)] });
        newCovs.push({ a: initVar, b: 0, d: initVar });
        newWeights.push(1 / n);
        continue;
      }
      const mu = { x: sx / nk, y: sy / nk };
      let a = 0;
      let b = 0;
      let d = 0;
      for (let i = 0; i < n; i++) {
        const r = resp[i][j];
        const dx = points[i].x - mu.x;
        const dy = points[i].y - mu.y;
        a += r * dx * dx;
        b += r * dx * dy;
        d += r * dy * dy;
      }
      newMeans.push(mu);
      newCovs.push({ a: a / nk + REG, b: b / nk, d: d / nk + REG });
      newWeights.push(nk / n);
    }
    const wsum = newWeights.reduce((s, w) => s + w, 0);
    means = newMeans;
    covs = newCovs;
    weights = newWeights.map((w) => w / wsum);

    yield {
      kind: 'm-step',
      labels,
      soft,
      ...snapshot(),
      metrics: { loglik: avgLL },
      message:
        `${iter}회차 M단계: 확률을 가중치로 삼아 각 분포의 중심·모양(공분산)·비율을 다시 계산했습니다.` +
        (reinit > 0 ? ` 비어 있던 분포 ${reinit}개는 새 위치에서 다시 시작합니다.` : ''),
      codeLine: 3,
    };
  }

  yield {
    kind: 'max-iter',
    labels: new Int32Array(n).map((_, i) => {
      let best = 0;
      for (let j = 1; j < k; j++) if (resp[i][j] > resp[i][best]) best = j;
      return best;
    }),
    soft: resp.map((r) => r.slice()),
    ...snapshot(),
    metrics: { loglik: prevLL },
    message: `최대 반복 횟수(${params.maxIter}회)에 도달해 종료합니다.`,
    codeLine: 4,
  };
}
