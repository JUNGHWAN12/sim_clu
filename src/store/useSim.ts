import { create } from 'zustand';
import { ALGORITHM_MAP, ALGORITHMS, MAX_STEPS } from '../algorithms/registry';
import type { ParamValues, Point, Step } from '../algorithms/types';
import { generateDataset, spray, type DatasetConfig } from '../data/generators';
import { createRng } from '../data/random';

/** 'centroid' = K-Means 중심점 직접 놓기 */
export type Tool = 'add' | 'spray' | 'erase' | 'centroid';

export const SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 16];
/** 1배속에서 한 단계에 걸리는 시간(ms) */
export const BASE_INTERVAL = 900;
export const MAX_TOTAL_POINTS = 1500;
/** 중심점을 누르거나 끌 수 있는 거리 (데이터 좌표) */
export const CENTROID_HIT_RADIUS = 0.03;

interface SimState {
  dataset: DatasetConfig;
  points: Point[];
  algorithmId: string;
  params: Record<string, ParamValues>;
  runSeed: number;
  /** K-Means '직접 지정' 초기화에서 사용자가 놓은 중심점 */
  manualCentroids: Point[];
  steps: Step[];
  /** 점이 너무 많아 실행할 수 없을 때의 안내 */
  blocked: string | null;
  truncated: boolean;
  stepIndex: number;
  isPlaying: boolean;
  speed: number;
  tool: Tool;
  largeText: boolean;
  shapes: boolean;
  helpOpen: boolean;

  setDataset: (patch: Partial<DatasetConfig>) => void;
  regenerate: (patch?: Partial<DatasetConfig>) => void;
  addPoint: (p: Point) => void;
  removeNear: (p: Point, radius: number) => void;
  clearPoints: () => void;
  setAlgorithm: (id: string) => void;
  setParam: (key: string, value: number | string | boolean) => void;
  rerun: () => void;
  addCentroid: (p: Point) => void;
  moveCentroid: (index: number, p: Point) => void;
  removeCentroid: (index: number) => void;
  clearCentroids: () => void;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  stepForward: () => void;
  stepBack: () => void;
  seek: (i: number) => void;
  rewind: () => void;
  setSpeed: (s: number) => void;

  setTool: (t: Tool) => void;
  toggleLargeText: () => void;
  toggleShapes: () => void;
  setHelpOpen: (open: boolean) => void;
}

interface RunResult {
  steps: Step[];
  blocked: string | null;
  truncated: boolean;
}

export function runAlgorithm(
  points: Point[],
  algorithmId: string,
  params: ParamValues,
  seed: number,
  manualCentroids: Point[] = [],
): RunResult {
  const algo = ALGORITHM_MAP[algorithmId];
  if (points.length > algo.maxPoints) {
    return {
      steps: [],
      blocked: `${algo.name}은(는) 계산량이 많아 점 ${algo.maxPoints}개까지만 실행할 수 있습니다. (현재 ${points.length}개) 점 개수를 줄여 주세요.`,
      truncated: false,
    };
  }
  const steps: Step[] = [];
  const gen = algo.run(points, params, createRng(seed), { manualCentroids });
  for (let r = gen.next(); !r.done; r = gen.next()) {
    steps.push(r.value);
    if (steps.length >= MAX_STEPS) return { steps, blocked: null, truncated: true };
  }
  return { steps, blocked: null, truncated: false };
}

const initialDataset: DatasetConfig = {
  preset: 'blobs',
  n: 240,
  noise: 0.3,
  clusters: 3,
  seed: 42,
};
const initialParams = Object.fromEntries(ALGORITHMS.map((a) => [a.id, { ...a.defaults }]));
const initialPoints = generateDataset(initialDataset);
const initialRun = runAlgorithm(initialPoints, 'kmeans', initialParams.kmeans, 1);

export const useSim = create<SimState>((set, get) => {
  /** 데이터·알고리즘·파라미터가 바뀌면 단계를 다시 계산 */
  const recompute = (patch: Partial<SimState>, keepEnd = false) => {
    const s = { ...get(), ...patch };
    const wasAtEnd = get().steps.length > 0 && get().stepIndex === get().steps.length - 1;
    const result = runAlgorithm(
      s.points,
      s.algorithmId,
      s.params[s.algorithmId],
      s.runSeed,
      s.manualCentroids,
    );
    set({
      ...patch,
      ...result,
      stepIndex: keepEnd && wasAtEnd ? Math.max(0, result.steps.length - 1) : 0,
      isPlaying: false,
    });
  };

  return {
    dataset: initialDataset,
    points: initialPoints,
    algorithmId: 'kmeans',
    params: initialParams,
    runSeed: 1,
    manualCentroids: [],
    ...initialRun,
    stepIndex: 0,
    isPlaying: false,
    speed: 1,
    tool: 'add',
    largeText: false,
    shapes: false,
    helpOpen: false,

    setDataset: (patch) => set({ dataset: { ...get().dataset, ...patch } }),
    regenerate: (patch) => {
      const dataset = { ...get().dataset, ...patch };
      recompute({ dataset, points: generateDataset(dataset) });
    },
    addPoint: (p) => {
      const { points, tool } = get();
      if (points.length >= MAX_TOTAL_POINTS) return;
      const extra =
        tool === 'spray' ? spray(p, 12, 0.03, createRng((Math.random() * 1e9) | 0)) : [p];
      recompute({ points: points.concat(extra).slice(0, MAX_TOTAL_POINTS) });
    },
    removeNear: (p, radius) => {
      const r2 = radius * radius;
      const kept = get().points.filter((q) => (q.x - p.x) ** 2 + (q.y - p.y) ** 2 > r2);
      if (kept.length !== get().points.length) recompute({ points: kept });
    },
    clearPoints: () => recompute({ points: [] }),
    setAlgorithm: (id) => {
      const tool = get().tool === 'centroid' ? 'add' : get().tool;
      recompute({ algorithmId: id, tool });
    },
    setParam: (key, value) => {
      const { params, algorithmId, manualCentroids, tool } = get();
      const next = { ...params[algorithmId], [key]: value };
      const patch: Partial<SimState> = { params: { ...params, [algorithmId]: next } };
      if (algorithmId === 'kmeans') {
        // 직접 지정을 고르면 바로 중심 놓기 모드로, 다른 방식으로 바꾸면 해제
        if (key === 'init')
          patch.tool = value === 'manual' ? 'centroid' : tool === 'centroid' ? 'add' : tool;
        // K를 줄이면 넘치는 중심점은 버림
        if (key === 'k') patch.manualCentroids = manualCentroids.slice(0, Number(value));
      }
      recompute(patch, true);
    },
    rerun: () => recompute({ runSeed: get().runSeed + 1 }),
    addCentroid: (p) => {
      const { manualCentroids, params } = get();
      if (manualCentroids.length >= Number(params.kmeans.k)) return;
      recompute({ manualCentroids: [...manualCentroids, p] });
    },
    moveCentroid: (index, p) =>
      recompute({ manualCentroids: get().manualCentroids.map((c, i) => (i === index ? p : c)) }),
    removeCentroid: (index) =>
      recompute({ manualCentroids: get().manualCentroids.filter((_, i) => i !== index) }),
    clearCentroids: () => recompute({ manualCentroids: [] }),

    play: () => {
      const { stepIndex, steps } = get();
      if (steps.length === 0) return;
      // 끝에서 재생을 누르면 처음부터 다시
      set({ isPlaying: true, stepIndex: stepIndex >= steps.length - 1 ? 0 : stepIndex });
    },
    pause: () => set({ isPlaying: false }),
    togglePlay: () => (get().isPlaying ? get().pause() : get().play()),
    stepForward: () => {
      const { stepIndex, steps } = get();
      if (stepIndex < steps.length - 1) set({ stepIndex: stepIndex + 1 });
      else set({ isPlaying: false });
    },
    stepBack: () => set({ stepIndex: Math.max(0, get().stepIndex - 1), isPlaying: false }),
    seek: (i) => set({ stepIndex: Math.max(0, Math.min(get().steps.length - 1, i)) }),
    rewind: () => set({ stepIndex: 0, isPlaying: false }),
    setSpeed: (speed) => set({ speed }),

    setTool: (tool) => set({ tool }),
    toggleLargeText: () => set({ largeText: !get().largeText }),
    toggleShapes: () => set({ shapes: !get().shapes }),
    setHelpOpen: (helpOpen) => set({ helpOpen }),
  };
});

export const currentStep = (s: SimState): Step | undefined => s.steps[s.stepIndex];
