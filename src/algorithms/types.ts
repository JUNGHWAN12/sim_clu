import type { Rng } from '../data/random';

/** 모든 좌표는 0~1 범위의 2차원 평면을 기준으로 한다 */
export interface Point {
  x: number;
  y: number;
}

export type Overlay =
  | {
      type: 'circle';
      x: number;
      y: number;
      r: number;
      tone: 'focus' | 'muted' | 'cluster';
      cluster?: number;
    }
  | {
      type: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      tone: 'focus' | 'muted' | 'cluster';
      cluster?: number;
    }
  | {
      type: 'ellipse';
      x: number;
      y: number;
      rx: number;
      ry: number;
      angle: number;
      cluster: number;
    };

/** DBSCAN 점 역할 (Uint8Array 값) */
export const ROLE = { NONE: 0, CORE: 1, BORDER: 2, NOISE: 3 } as const;

export interface Merge {
  a: number; // 병합된 군집 id (0..n-1 은 점, n 이상은 병합으로 생긴 군집)
  b: number;
  height: number;
  size: number;
}

export interface DendrogramState {
  merges: Merge[]; // 전체 병합 기록 (모든 단계가 같은 배열을 공유)
  upto: number; // 이 단계까지 진행된 병합 수
  cutHeight?: number; // 자르는 높이 (마지막 단계)
}

/** 알고리즘이 한 단계를 마칠 때마다 내보내는 상태 스냅샷 */
export interface Step {
  kind: string;
  /** 각 점의 군집 번호 (-1 = 미할당 / 노이즈) */
  labels: Int32Array;
  message: string;
  codeLine?: number;
  centroids?: Point[];
  highlight?: number[];
  overlays?: Overlay[];
  metrics?: Record<string, number>;
  /** DBSCAN: 핵심점/경계점/노이즈 */
  roles?: Uint8Array;
  /** GMM: 각 점의 군집 소속 확률 (n × k) */
  soft?: Float64Array[];
  /** K-Means++: 다음 중심으로 뽑힐 확률 (점 크기로 표시) */
  weights?: Float64Array;
  /** Mean-Shift: 이동 중인 점의 현재 위치 */
  positions?: Point[];
  /** 계층적 군집: 덴드로그램 */
  dendrogram?: DendrogramState;
}

export type AlgorithmRun<P> = (points: Point[], params: P, rng: Rng) => Generator<Step, void, void>;

export type ParamSpec =
  | {
      key: string;
      label: string;
      type: 'int' | 'float';
      min: number;
      max: number;
      step: number;
      help?: string;
    }
  | {
      key: string;
      label: string;
      type: 'select';
      options: { value: string; label: string }[];
      help?: string;
    }
  | { key: string; label: string; type: 'bool'; help?: string };

export type ParamValues = Record<string, number | string | boolean>;

export interface AlgorithmDef {
  id: string;
  name: string;
  summary: string;
  principle: string[];
  pros: string[];
  cons: string[];
  pseudocode: string[];
  params: ParamSpec[];
  defaults: ParamValues;
  /** 계산량 때문에 허용하는 최대 점 개수 */
  maxPoints: number;
  /** 그래프로 그릴 지표 */
  metric?: { key: string; label: string };
  run: AlgorithmRun<ParamValues>;
}
