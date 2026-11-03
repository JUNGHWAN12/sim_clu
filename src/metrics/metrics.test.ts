import { describe, expect, it } from 'vitest';
import { silhouette, sse } from '.';

describe('지표', () => {
  const pts = [
    { x: 0, y: 0 },
    { x: 0, y: 0.1 },
    { x: 1, y: 1 },
    { x: 1, y: 0.9 },
  ];
  const labels = Int32Array.from([0, 0, 1, 1]);

  it('SSE', () => {
    expect(
      sse(pts, labels, [
        { x: 0, y: 0.05 },
        { x: 1, y: 0.95 },
      ]),
    ).toBeCloseTo(4 * 0.0025, 10);
  });

  it('잘 나뉜 군집의 실루엣 점수는 1에 가깝다', () => {
    expect(silhouette(pts, labels)!).toBeGreaterThan(0.9);
  });

  it('군집이 하나면 실루엣 점수는 null', () => {
    expect(silhouette(pts, Int32Array.from([0, 0, 0, 0]))).toBeNull();
  });
});
