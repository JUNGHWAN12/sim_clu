import { describe, expect, it } from 'vitest';
import { generateDataset, PRESETS } from './generators';

describe('데이터 생성기', () => {
  it.each(PRESETS.filter((p) => p.id !== 'empty').map((p) => p.id))(
    '%s: 점 개수와 범위',
    (preset) => {
      const pts = generateDataset({ preset, n: 200, noise: 0.3, clusters: 4, seed: 42 });
      expect(pts).toHaveLength(200);
      for (const p of pts) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(1);
      }
    },
  );

  it('같은 시드는 같은 데이터를 만든다', () => {
    const cfg = { preset: 'moons' as const, n: 50, noise: 0.2, clusters: 2, seed: 9 };
    expect(generateDataset(cfg)).toEqual(generateDataset(cfg));
  });
});
