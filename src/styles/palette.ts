/** 색각 이상이 있어도 구분하기 쉬운 군집 색 (Okabe–Ito 기반 + 확장) */
export const PALETTE = [
  '#0072B2', // 파랑
  '#E69F00', // 주황
  '#009E73', // 초록
  '#D55E00', // 주홍
  '#CC79A7', // 분홍
  '#56B4E9', // 하늘
  '#8E6C8A', // 보라
  '#7F6A3C', // 갈색
  '#2F4B7C', // 남색
  '#B5A300', // 겨자
];

export const UNASSIGNED = '#9AA3AD';

export function clusterColor(label: number): string {
  return label < 0 ? UNASSIGNED : PALETTE[label % PALETTE.length];
}

const RGB = PALETTE.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));

/** 소속 확률에 따라 색을 섞음 (GMM) */
export function mixColor(probs: ArrayLike<number>): string {
  let r = 0;
  let g = 0;
  let b = 0;
  for (let j = 0; j < probs.length; j++) {
    const c = RGB[j % RGB.length];
    r += probs[j] * c[0];
    g += probs[j] * c[1];
    b += probs[j] * c[2];
  }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/** 모양 구분 모드에서 쓰는 도형 (중심이 0,0 인 path) */
export function symbolPath(label: number, r: number): string | null {
  if (label < 0) return null;
  switch (label % 4) {
    case 0:
      return null; // 원
    case 1: {
      const h = r * 1.25;
      return `M0,${-h} L${h * 0.95},${h * 0.7} L${-h * 0.95},${h * 0.7}Z`; // 삼각형
    }
    case 2: {
      const s = r * 0.9;
      return `M${-s},${-s}H${s}V${s}H${-s}Z`; // 사각형
    }
    default: {
      const d = r * 1.25;
      return `M0,${-d}L${d},0L0,${d}L${-d},0Z`; // 마름모
    }
  }
}
