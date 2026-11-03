import { useId } from 'react';
import styles from './Panel.module.css';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** 드래그를 마쳤을 때 (무거운 계산은 여기서) */
  onCommit?: (v: number) => void;
  format?: (v: number) => string;
  help?: string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  format,
  help,
}: SliderProps) {
  const id = useId();
  const commit = (e: React.SyntheticEvent<HTMLInputElement>) =>
    onCommit?.(Number(e.currentTarget.value));
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.sliderHead}>
        <span className={styles.label}>{label}</span>
        <output className={styles.value}>{format ? format(value) : value}</output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onTouchEnd={commit}
      />
      {help && <p className={styles.hint}>{help}</p>}
    </div>
  );
}
