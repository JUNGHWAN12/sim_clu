import type { Point } from '../algorithms/types';
import { dist, dist2 } from '../algorithms/geometry';

/** 군집 내 제곱합 (SSE, inertia) */
export function sse(points: Point[], labels: Int32Array, centroids: Point[]): number {
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const l = labels[i];
    if (l >= 0 && centroids[l]) s += dist2(points[i], centroids[l]);
  }
  return s;
}

/**
 * 실루엣 점수 (-1 ~ 1). 노이즈(-1)는 제외.
 * 군집이 2개 미만이면 null.
 */
export function silhouette(points: Point[], labels: Int32Array): number | null {
  const idx: number[] = [];
  const ks = new Set<number>();
  for (let i = 0; i < points.length; i++) {
    if (labels[i] >= 0) {
      idx.push(i);
      ks.add(labels[i]);
    }
  }
  if (ks.size < 2 || idx.length < 3) return null;
  const kList = [...ks];
  const kPos = new Map(kList.map((k, i) => [k, i]));
  const sizes = new Array(kList.length).fill(0);
  for (const i of idx) sizes[kPos.get(labels[i])!]++;

  let total = 0;
  const sums = new Float64Array(kList.length);
  for (const i of idx) {
    sums.fill(0);
    for (const j of idx) if (i !== j) sums[kPos.get(labels[j])!] += dist(points[i], points[j]);
    const own = kPos.get(labels[i])!;
    if (sizes[own] <= 1) continue; // 혼자인 군집은 0으로 취급
    const a = sums[own] / (sizes[own] - 1);
    let b = Infinity;
    for (let c = 0; c < kList.length; c++) if (c !== own) b = Math.min(b, sums[c] / sizes[c]);
    total += (b - a) / Math.max(a, b);
  }
  return total / idx.length;
}
