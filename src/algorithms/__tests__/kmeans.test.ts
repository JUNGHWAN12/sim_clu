import { describe, expect, it } from 'vitest';
import { createRng } from '../../data/random';
import { kmeans } from '../kmeans';
import { collect, samePartition, threeBlobs } from './helpers';

describe('K-Means', () => {
  const { points, truth } = threeBlobs();

  it('잘 떨어진 덩어리 3개를 정확히 나눈다 (K-Means++)', () => {
    const steps = collect(kmeans(points, { k: 3, init: 'kmeans++', maxIter: 50 }, createRng(7)));
    const last = steps[steps.length - 1];
    expect(last.kind).toBe('converged');
    expect(samePartition(last.labels, truth)).toBe(true);
  });

  it('같은 시드면 같은 결과가 나온다', () => {
    const a = collect(kmeans(points, { k: 3, init: 'random', maxIter: 50 }, createRng(3)));
    const b = collect(kmeans(points, { k: 3, init: 'random', maxIter: 50 }, createRng(3)));
    expect(a.length).toBe(b.length);
    expect(Array.from(a[a.length - 1].labels)).toEqual(Array.from(b[b.length - 1].labels));
  });

  it('SSE는 단계가 지날수록 늘어나지 않는다', () => {
    const steps = collect(kmeans(points, { k: 4, init: 'random', maxIter: 50 }, createRng(11)));
    const sses = steps.filter((s) => s.metrics?.sse !== undefined).map((s) => s.metrics!.sse);
    for (let i = 1; i < sses.length; i++) expect(sses[i]).toBeLessThanOrEqual(sses[i - 1] + 1e-12);
  });

  it('K-Means++ 자세히 보기는 중심 선택 단계를 내보낸다', () => {
    const steps = collect(
      kmeans(points, { k: 3, init: 'kmeans++', maxIter: 50 }, createRng(1), true),
    );
    expect(steps.filter((s) => s.kind === 'pp-pick')).toHaveLength(2);
    const w = steps.find((s) => s.kind === 'pp-weights')!.weights!;
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('점이 없으면 안내 단계 하나만 낸다', () => {
    const steps = collect(kmeans([], { k: 3, init: 'random', maxIter: 10 }, createRng(1)));
    expect(steps).toHaveLength(1);
    expect(steps[0].kind).toBe('empty');
  });
});
