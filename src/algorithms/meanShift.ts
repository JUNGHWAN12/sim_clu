import { dist, dist2 } from './geometry';
import type { Point, Step } from './types';

export interface MeanShiftParams {
  bandwidth: number;
  kernel: 'flat' | 'gaussian';
  maxIter: number;
}

const STOP = 1e-4;

export function* meanShift(points: Point[], params: MeanShiftParams): Generator<Step, void, void> {
  const n = points.length;
  if (n === 0) {
    yield {
      kind: 'empty',
      labels: new Int32Array(0),
      message: '점이 없습니다. 데이터를 생성하거나 캔버스에 점을 찍어 주세요.',
    };
    return;
  }
  const h = params.bandwidth;
  const h2 = h * h;
  const unlabeled = new Int32Array(n).fill(-1);
  let pos: Point[] = points.map((p) => ({ ...p }));
  const done = new Uint8Array(n);
  // 한 점을 골라 반경 원을 따라가며 보여 줌
  const tracked = Math.floor(n / 2);

  yield {
    kind: 'init',
    labels: unlabeled,
    positions: pos.map((p) => ({ ...p })),
    overlays: [{ type: 'circle', x: pos[tracked].x, y: pos[tracked].y, r: h, tone: 'focus' }],
    highlight: [tracked],
    message: `모든 점의 복사본을 만들었습니다. 각 복사본은 반경 h=${h.toFixed(2)} 안의 원래 점들의 평균 쪽으로 이동합니다. (원은 예시로 한 점의 반경)`,
    codeLine: 0,
  };

  let iter = 0;
  for (iter = 1; iter <= params.maxIter; iter++) {
    let maxShift = 0;
    let moving = 0;
    const next = pos.map((p, i) => {
      if (done[i]) return p;
      let sx = 0;
      let sy = 0;
      let sw = 0;
      for (const q of points) {
        const d2 = dist2(p, q);
        let w = 0;
        if (params.kernel === 'flat') w = d2 <= h2 ? 1 : 0;
        else if (d2 <= 9 * h2) w = Math.exp(-d2 / (2 * h2));
        sx += w * q.x;
        sy += w * q.y;
        sw += w;
      }
      const np = sw > 0 ? { x: sx / sw, y: sy / sw } : p;
      const s = dist(p, np);
      if (s < STOP) done[i] = 1;
      else moving++;
      maxShift = Math.max(maxShift, s);
      return np;
    });
    pos = next;
    const stop = maxShift < STOP;
    yield {
      kind: stop ? 'shift-done' : 'shift',
      labels: unlabeled,
      positions: pos.map((p) => ({ ...p })),
      overlays: [{ type: 'circle', x: pos[tracked].x, y: pos[tracked].y, r: h, tone: 'focus' }],
      highlight: [tracked],
      metrics: { maxShift },
      message: stop
        ? `${iter}회차: 더 이상 움직이는 점이 없습니다. 점들이 밀도가 높은 지점(모드)에 모였습니다.`
        : `${iter}회차: 복사본을 이웃 평균 위치로 옮겼습니다. 아직 움직이는 점 ${moving}개, 가장 크게 움직인 거리 ${maxShift.toFixed(4)}.`,
      codeLine: stop ? 4 : 3,
    };
    if (stop) break;
  }

  // 가까이 모인 위치를 하나의 모드로 묶기
  const modes: Point[] = [];
  const modeCount: number[] = [];
  const labels = new Int32Array(n);
  const mergeR2 = (h / 2) ** 2;
  for (let i = 0; i < n; i++) {
    let found = -1;
    for (let m = 0; m < modes.length; m++)
      if (dist2(pos[i], modes[m]) <= mergeR2) {
        found = m;
        break;
      }
    if (found === -1) {
      modes.push({ ...pos[i] });
      modeCount.push(1);
      found = modes.length - 1;
    } else {
      // 모드 위치를 소속 점들의 평균으로 갱신
      const c = modeCount[found]++;
      modes[found] = {
        x: (modes[found].x * c + pos[i].x) / (c + 1),
        y: (modes[found].y * c + pos[i].y) / (c + 1),
      };
    }
    labels[i] = found;
  }
  // 큰 군집부터 0번이 되도록 정렬
  const order = modeCount
    .map((c, i) => [c, i])
    .sort((a, b) => b[0] - a[0])
    .map(([, i]) => i);
  const remap = new Int32Array(modes.length);
  order.forEach((old, newIdx) => (remap[old] = newIdx));
  const finalLabels = labels.map((l) => remap[l]);
  const finalModes = order.map((i) => modes[i]);

  yield {
    kind: 'modes',
    labels: finalLabels,
    positions: pos.map((p) => ({ ...p })),
    centroids: finalModes,
    message: `서로 h/2 이내로 모인 위치를 하나로 묶었더니 모드가 ${finalModes.length}개 나왔습니다. 같은 모드로 모인 점들이 하나의 군집입니다.`,
    codeLine: 5,
  };
  yield {
    kind: 'done',
    labels: finalLabels,
    centroids: finalModes,
    message: `완료: 군집 ${finalModes.length}개. 반경 h를 키우면 군집이 합쳐지고, 줄이면 잘게 나뉩니다.`,
    codeLine: 5,
  };
}
