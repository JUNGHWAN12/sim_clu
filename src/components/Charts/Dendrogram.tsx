import { useMemo } from 'react';
import type { DendrogramState } from '../../algorithms/types';
import styles from './Charts.module.css';

const W = 300;
const H = 150;
const PAD = 6;

/** 계층적 군집의 병합 과정을 나무 모양으로 그림 */
export function Dendrogram({ state }: { state: DendrogramState }) {
  const { merges, upto, cutHeight } = state;
  const n = merges.length + 1;

  const layout = useMemo(() => {
    // 최종 나무를 기준으로 잎(점)의 가로 순서를 정함
    const order: number[] = [];
    const stack = [2 * n - 2];
    while (stack.length) {
      const id = stack.pop()!;
      if (id < n) order.push(id);
      else {
        const m = merges[id - n];
        stack.push(m.b, m.a);
      }
    }
    const xs = new Float64Array(2 * n - 1);
    order.forEach((leaf, i) => (xs[leaf] = n === 1 ? 0.5 : i / (n - 1)));
    const hs = new Float64Array(2 * n - 1);
    merges.forEach((m, k) => {
      xs[n + k] = (xs[m.a] + xs[m.b]) / 2;
      hs[n + k] = m.height;
    });
    const maxH = merges.length ? merges[merges.length - 1].height || 1 : 1;
    return { xs, hs, maxH };
  }, [merges, n]);

  if (n < 2) return null;
  const { xs, hs, maxH } = layout;
  const X = (v: number) => PAD + v * (W - 2 * PAD);
  const Y = (h: number) => H - PAD - (h / maxH) * (H - 2 * PAD);

  const segs = [];
  for (let k = 0; k < upto; k++) {
    const m = merges[k];
    const id = n + k;
    const d = `M${X(xs[m.a])},${Y(hs[m.a])}V${Y(hs[id])}H${X(xs[m.b])}V${Y(hs[m.b])}`;
    segs.push(
      <path
        key={k}
        d={d}
        className={k === upto - 1 ? styles.dendroLatest : styles.dendroLine}
        vectorEffect="non-scaling-stroke"
      />,
    );
  }

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>
        <span>덴드로그램</span>
        <strong>
          병합 {upto} / {merges.length}
        </strong>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className={styles.dendro}
        role="img"
        aria-label="덴드로그램"
      >
        <line
          x1={PAD}
          x2={W - PAD}
          y1={H - PAD}
          y2={H - PAD}
          className={styles.baseline}
          vectorEffect="non-scaling-stroke"
        />
        {segs}
        {cutHeight !== undefined && (
          <line
            x1={0}
            x2={W}
            y1={Y(cutHeight)}
            y2={Y(cutHeight)}
            className={styles.cut}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div className={styles.axis}>
        <span>아래: 점 하나하나</span>
        <span>위로 갈수록 먼 군집끼리 병합</span>
      </div>
    </figure>
  );
}
