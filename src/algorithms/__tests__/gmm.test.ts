import { describe, expect, it } from 'vitest';
import { createRng } from '../../data/random';
import { gmm } from '../gmm';
import { collect, samePartition, threeBlobs } from './helpers';

describe('GMM', () => {
  const { points, truth } = threeBlobs();
  const steps = collect(gmm(points, { k: 3, maxIter: 100, init: 'kmeans++' }, createRng(5)));

  it('덩어리 3개를 찾는다', () => {
    const last = steps[steps.length - 1];
    expect(samePartition(last.labels, truth)).toBe(true);
  });

  it('로그 가능도는 반복마다 감소하지 않는다', () => {
    const ll = steps
      .filter((s) => s.kind === 'e-step' || s.kind === 'converged')
      .map((s) => s.metrics!.loglik);
    expect(ll.length).toBeGreaterThan(1);
    for (let i = 1; i < ll.length; i++) expect(ll[i]).toBeGreaterThanOrEqual(ll[i - 1] - 1e-9);
  });

  it('각 점의 소속 확률 합은 1이다', () => {
    const soft = steps.find((s) => s.soft)!.soft!;
    for (const r of soft) expect(r.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });

  it('NaN이 나오지 않는다 (같은 위치의 점이 많아도)', () => {
    const dup = [...Array(20)]
      .map(() => ({ x: 0.5, y: 0.5 }))
      .concat([...Array(20)].map(() => ({ x: 0.2, y: 0.3 })));
    const s = collect(gmm(dup, { k: 3, maxIter: 30, init: 'random' }, createRng(2)));
    for (const st of s) if (st.metrics) expect(Number.isFinite(st.metrics.loglik)).toBe(true);
  });
});
