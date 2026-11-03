import { describe, expect, it } from 'vitest';
import { dbscan } from '../dbscan';
import { ROLE } from '../types';
import { collect, samePartition, threeBlobs } from './helpers';

describe('DBSCAN', () => {
  it('덩어리 3개를 찾고, 멀리 떨어진 점은 노이즈로 둔다', () => {
    const { points, truth } = threeBlobs();
    const withOutlier = [...points, { x: 0.95, y: 0.95 }];
    const steps = collect(dbscan(withOutlier, { eps: 0.07, minPts: 4, detail: true }));
    const last = steps[steps.length - 1];
    expect(last.metrics!.clusters).toBe(3);
    expect(last.labels[withOutlier.length - 1]).toBe(-1);
    expect(last.roles![withOutlier.length - 1]).toBe(ROLE.NOISE);
    expect(samePartition(last.labels.slice(0, points.length), truth)).toBe(true);
  });

  it('자세히 보기를 끄면 단계 수가 줄지만 결과는 같다', () => {
    const { points } = threeBlobs();
    const a = collect(dbscan(points, { eps: 0.07, minPts: 4, detail: true }));
    const b = collect(dbscan(points, { eps: 0.07, minPts: 4, detail: false }));
    expect(b.length).toBeLessThan(a.length);
    expect(Array.from(b[b.length - 1].labels)).toEqual(Array.from(a[a.length - 1].labels));
  });

  it('노이즈였다가 경계점이 된 점은 노이즈 수에서 빠진다', () => {
    // 0번은 외딴 점처럼 보이지만 나중에 핵심점의 이웃으로 편입
    const pts = [
      { x: 0.1, y: 0.5 },
      { x: 0.15, y: 0.5 },
      { x: 0.16, y: 0.5 },
      { x: 0.17, y: 0.5 },
    ];
    const steps = collect(dbscan(pts, { eps: 0.055, minPts: 3, detail: true }));
    const last = steps[steps.length - 1];
    expect(last.metrics!.noise).toBe(0);
    expect(last.roles![0]).toBe(ROLE.BORDER);
    expect(last.labels[0]).toBe(0);
  });
});
