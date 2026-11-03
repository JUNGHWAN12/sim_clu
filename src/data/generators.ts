import type { Point } from '../algorithms/types';
import { createRng, gaussian, type Rng } from './random';

export type PresetId = 'blobs' | 'aniso' | 'moons' | 'circles' | 'random' | 'empty';

export interface DatasetConfig {
  preset: PresetId;
  n: number;
  noise: number; // 0 ~ 1
  clusters: number; // blobs, aniso 에서 사용
  seed: number;
}

export const PRESETS: { id: PresetId; label: string; hint: string }[] = [
  { id: 'blobs', label: '덩어리 (Blobs)', hint: '둥근 덩어리 여러 개. K-Means가 잘 맞는 데이터' },
  { id: 'aniso', label: '늘어진 덩어리', hint: '한쪽으로 길쭉한 덩어리. GMM이 유리' },
  { id: 'moons', label: '초승달 (Moons)', hint: '맞물린 초승달 두 개. K-Means가 실패하는 대표 예' },
  { id: 'circles', label: '동심원 (Circles)', hint: '원 안의 원. 밀도 기반 방법이 유리' },
  { id: 'random', label: '균일 분포', hint: '군집 구조가 없는 데이터' },
  { id: 'empty', label: '빈 화면 (직접 그리기)', hint: '캔버스를 눌러 점을 직접 찍어 보세요' },
];

/** 생성된 점을 화면 여백(0.05~0.95) 안으로 맞춤 */
function fitToUnit(points: Point[], margin = 0.06): Point[] {
  if (points.length === 0) return points;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const scale = (1 - 2 * margin) / span;
  const offX = (1 - (maxX - minX) * scale) / 2;
  const offY = (1 - (maxY - minY) * scale) / 2;
  return points.map((p) => ({ x: (p.x - minX) * scale + offX, y: (p.y - minY) * scale + offY }));
}

function blobs(n: number, k: number, noise: number, rng: Rng): Point[] {
  const centers: Point[] = [];
  // 서로 너무 가깝지 않은 중심을 고름
  for (let tries = 0; centers.length < k && tries < 2000; tries++) {
    const c = { x: 0.15 + rng() * 0.7, y: 0.15 + rng() * 0.7 };
    const minGap = 0.5 / Math.sqrt(k);
    if (centers.every((o) => Math.hypot(o.x - c.x, o.y - c.y) > minGap)) centers.push(c);
  }
  while (centers.length < k) centers.push({ x: rng(), y: rng() });
  const sd = 0.025 + noise * 0.09;
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const c = centers[i % k];
    pts.push({ x: c.x + gaussian(rng) * sd, y: c.y + gaussian(rng) * sd });
  }
  return pts;
}

function aniso(n: number, k: number, noise: number, rng: Rng): Point[] {
  const pts: Point[] = [];
  const centers: Point[] = [];
  for (let tries = 0; centers.length < k && tries < 2000; tries++) {
    const c = { x: 0.15 + rng() * 0.7, y: 0.15 + rng() * 0.7 };
    if (centers.every((o) => Math.hypot(o.x - c.x, o.y - c.y) > 0.55 / Math.sqrt(k)))
      centers.push(c);
  }
  while (centers.length < k) centers.push({ x: rng(), y: rng() });
  const angles = centers.map(() => rng() * Math.PI);
  const long = 0.08 + noise * 0.06;
  const short = 0.012 + noise * 0.03;
  for (let i = 0; i < n; i++) {
    const ci = i % k;
    const a = gaussian(rng) * long;
    const b = gaussian(rng) * short;
    const t = angles[ci];
    pts.push({
      x: centers[ci].x + a * Math.cos(t) - b * Math.sin(t),
      y: centers[ci].y + a * Math.sin(t) + b * Math.cos(t),
    });
  }
  return pts;
}

function moons(n: number, noise: number, rng: Rng): Point[] {
  const pts: Point[] = [];
  const sd = 0.03 + noise * 0.15;
  for (let i = 0; i < n; i++) {
    const t = rng() * Math.PI;
    if (i % 2 === 0)
      pts.push({ x: Math.cos(t) + gaussian(rng) * sd, y: Math.sin(t) + gaussian(rng) * sd });
    else
      pts.push({
        x: 1 - Math.cos(t) + gaussian(rng) * sd,
        y: 0.5 - Math.sin(t) + gaussian(rng) * sd,
      });
  }
  // 화면 좌표는 y가 아래로 증가하므로 뒤집어 준다
  return pts.map((p) => ({ x: p.x, y: -p.y }));
}

function circles(n: number, noise: number, rng: Rng): Point[] {
  const pts: Point[] = [];
  const sd = 0.02 + noise * 0.08;
  for (let i = 0; i < n; i++) {
    const t = rng() * 2 * Math.PI;
    const r = i % 2 === 0 ? 1 : 0.45;
    pts.push({ x: r * Math.cos(t) + gaussian(rng) * sd, y: r * Math.sin(t) + gaussian(rng) * sd });
  }
  return pts;
}

function uniform(n: number, rng: Rng): Point[] {
  return Array.from({ length: n }, () => ({ x: rng(), y: rng() }));
}

export function generateDataset(cfg: DatasetConfig): Point[] {
  const rng = createRng(cfg.seed);
  switch (cfg.preset) {
    case 'blobs':
      return fitToUnit(blobs(cfg.n, cfg.clusters, cfg.noise, rng), 0.04).map(clamp);
    case 'aniso':
      return fitToUnit(aniso(cfg.n, cfg.clusters, cfg.noise, rng)).map(clamp);
    case 'moons':
      return fitToUnit(moons(cfg.n, cfg.noise, rng)).map(clamp);
    case 'circles':
      return fitToUnit(circles(cfg.n, cfg.noise, rng)).map(clamp);
    case 'random':
      return fitToUnit(uniform(cfg.n, rng), 0.04).map(clamp);
    case 'empty':
      return [];
  }
}

function clamp(p: Point): Point {
  return { x: Math.min(0.995, Math.max(0.005, p.x)), y: Math.min(0.995, Math.max(0.005, p.y)) };
}

/** 한 지점 주위에 점 여러 개를 뿌림 (뿌리기 도구) */
export function spray(center: Point, count: number, radius: number, rng: Rng): Point[] {
  return Array.from({ length: count }, () =>
    clamp({ x: center.x + gaussian(rng) * radius, y: center.y + gaussian(rng) * radius }),
  );
}
