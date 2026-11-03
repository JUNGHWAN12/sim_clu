import { useMemo } from 'react';
import type { Step } from '../../algorithms/types';
import styles from './Charts.module.css';

interface Props {
  steps: Step[];
  stepIndex: number;
  metricKey: string;
  label: string;
}

const W = 300;
const H = 110;
const PAD = 6;

function fmt(v: number): string {
  if (Number.isInteger(v)) return String(v);
  const a = Math.abs(v);
  if (a !== 0 && (a < 0.001 || a >= 10000)) return v.toExponential(2);
  return a < 1 ? v.toFixed(4) : a < 100 ? v.toFixed(3) : v.toFixed(1);
}

/** 단계별 지표 변화를 선 그래프로 */
export function MetricChart({ steps, stepIndex, metricKey, label }: Props) {
  const series = useMemo(() => {
    const pts: { i: number; v: number }[] = [];
    steps.forEach((s, i) => {
      const v = s.metrics?.[metricKey];
      if (v !== undefined && Number.isFinite(v)) pts.push({ i, v });
    });
    return pts;
  }, [steps, metricKey]);

  if (series.length === 0) return null;

  const minV = Math.min(...series.map((p) => p.v));
  const maxV = Math.max(...series.map((p) => p.v));
  const span = maxV - minV || Math.abs(maxV) || 1;
  const last = Math.max(1, steps.length - 1);
  const x = (i: number) => PAD + (i / last) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - ((v - minV) / span) * (H - 2 * PAD);
  const visible = series.filter((p) => p.i <= stepIndex);
  const current = visible[visible.length - 1];
  const path = (pts: typeof series) =>
    pts.map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i)},${y(p.v)}`).join('');

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>
        <span>{label}</span>
        <strong>{current ? fmt(current.v) : '–'}</strong>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className={styles.chart}
        aria-hidden="true"
      >
        <path d={path(series)} className={styles.future} vectorEffect="non-scaling-stroke" />
        {visible.length > 0 && (
          <path d={path(visible)} className={styles.line} vectorEffect="non-scaling-stroke" />
        )}
        <line
          x1={x(stepIndex)}
          x2={x(stepIndex)}
          y1={0}
          y2={H}
          className={styles.cursor}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className={styles.axis}>
        <span>최소 {fmt(minV)}</span>
        <span>최대 {fmt(maxV)}</span>
      </div>
    </figure>
  );
}
