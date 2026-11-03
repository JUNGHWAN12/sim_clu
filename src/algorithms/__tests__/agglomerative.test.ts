import { describe, expect, it } from 'vitest';
import { agglomerative, computeMerges, type Linkage } from '../agglomerative';
import { collect, samePartition, threeBlobs } from './helpers';

describe('계층적 군집', () => {
  const { points, truth } = threeBlobs();

  it.each<Linkage>(['ward', 'single', 'complete', 'average'])(
    '%s 연결: 병합 n-1번, 높이는 감소하지 않음',
    (linkage) => {
      const merges = computeMerges(points, linkage);
      expect(merges).toHaveLength(points.length - 1);
      for (let i = 1; i < merges.length; i++)
        expect(merges[i].height).toBeGreaterThanOrEqual(merges[i - 1].height - 1e-12);
      expect(merges[merges.length - 1].size).toBe(points.length);
    },
  );

  it.each<Linkage>(['ward', 'single', 'complete', 'average'])(
    '%s 연결: K=3으로 자르면 덩어리 3개',
    (linkage) => {
      const steps = collect(agglomerative(points, { linkage, k: 3 }));
      const last = steps[steps.length - 1];
      expect(last.kind).toBe('cut');
      expect(samePartition(last.labels, truth)).toBe(true);
      expect(steps.filter((s) => s.kind === 'merge')).toHaveLength(points.length - 1);
    },
  );
});
