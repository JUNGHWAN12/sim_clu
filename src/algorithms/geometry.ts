import type { Point } from './types';

export function dist2(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function dist(a: Point, b: Point): number {
  return Math.sqrt(dist2(a, b));
}

export function nearestIndex(p: Point, centers: Point[]): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < centers.length; i++) {
    const d = dist2(p, centers[i]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** 빈 군집이 몇 개인지 세면서 라벨을 0..k-1 로 다시 번호 매김 */
export function relabelCompact(labels: Int32Array): Int32Array {
  const map = new Map<number, number>();
  const out = new Int32Array(labels.length);
  for (let i = 0; i < labels.length; i++) {
    const l = labels[i];
    if (l < 0) {
      out[i] = -1;
      continue;
    }
    if (!map.has(l)) map.set(l, map.size);
    out[i] = map.get(l)!;
  }
  return out;
}

export function countClusters(labels: Int32Array): number {
  const s = new Set<number>();
  for (const l of labels) if (l >= 0) s.add(l);
  return s.size;
}
