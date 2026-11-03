import { describe, expect, it } from 'vitest';
import { meanShift } from '../meanShift';
import { collect, samePartition, threeBlobs } from './helpers';

describe('Mean-Shift', () => {
  const { points, truth } = threeBlobs();

  it.each(['flat', 'gaussian'] as const)(
    '%s 커널: 떨어진 덩어리들이 서로 다른 모드로 모인다',
    (kernel) => {
      const steps = collect(meanShift(points, { bandwidth: 0.12, kernel, maxIter: 100 }));
      const last = steps[steps.length - 1];
      expect(last.centroids).toHaveLength(3);
      expect(samePartition(last.labels, truth)).toBe(true);
    },
  );

  it('반경이 덩어리 사이 거리(약 0.6)보다 크면 군집이 합쳐진다', () => {
    const steps = collect(meanShift(points, { bandwidth: 0.7, kernel: 'flat', maxIter: 100 }));
    expect(steps[steps.length - 1].centroids!.length).toBeLessThan(3);
  });
});
