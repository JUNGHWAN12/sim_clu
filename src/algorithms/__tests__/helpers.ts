import { createRng, gaussian } from '../../data/random';
import type { Point, Step } from '../types';

/** 서로 멀리 떨어진 덩어리 3개 (각 30점) */
export function threeBlobs(seed = 1): { points: Point[]; truth: number[] } {
  const rng = createRng(seed);
  const centers = [
    { x: 0.2, y: 0.2 },
    { x: 0.8, y: 0.25 },
    { x: 0.5, y: 0.8 },
  ];
  const points: Point[] = [];
  const truth: number[] = [];
  centers.forEach((c, ci) => {
    for (let i = 0; i < 30; i++) {
      points.push({ x: c.x + gaussian(rng) * 0.03, y: c.y + gaussian(rng) * 0.03 });
      truth.push(ci);
    }
  });
  return { points, truth };
}

export function collect(gen: Generator<Step, void, void>): Step[] {
  return Array.from(gen);
}

/** 예측 라벨이 정답과 같은 분할인지 (라벨 번호는 달라도 됨) */
export function samePartition(pred: Int32Array, truth: number[]): boolean {
  const map = new Map<number, number>();
  const used = new Set<number>();
  for (let i = 0; i < truth.length; i++) {
    const t = truth[i];
    const p = pred[i];
    if (!map.has(t)) {
      if (used.has(p)) return false;
      map.set(t, p);
      used.add(p);
    } else if (map.get(t) !== p) return false;
  }
  return true;
}
