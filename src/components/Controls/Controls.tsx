import { SPEEDS, useSim } from '../../store/useSim';
import styles from './Controls.module.css';

export function Controls() {
  const stepIndex = useSim((s) => s.stepIndex);
  const total = useSim((s) => s.steps.length);
  const isPlaying = useSim((s) => s.isPlaying);
  const speed = useSim((s) => s.speed);
  const { togglePlay, stepForward, stepBack, seek, rewind, setSpeed, pause } = useSim.getState();
  const disabled = total === 0;
  const atEnd = stepIndex >= total - 1;

  return (
    <div className={styles.bar} role="toolbar" aria-label="재생 제어">
      <div className={styles.buttons}>
        <button
          type="button"
          onClick={rewind}
          disabled={disabled}
          title="처음으로 (Home)"
          aria-label="처음으로"
        >
          ⟲
        </button>
        <button
          type="button"
          onClick={stepBack}
          disabled={disabled || stepIndex === 0}
          title="이전 단계 (←)"
          aria-label="이전 단계"
        >
          ⏮
        </button>
        <button
          type="button"
          className={styles.play}
          onClick={togglePlay}
          disabled={disabled}
          title="재생/일시정지 (Space)"
          aria-label={isPlaying ? '일시정지' : '재생'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          type="button"
          onClick={() => {
            pause();
            stepForward();
          }}
          disabled={disabled || atEnd}
          title="다음 단계 (→)"
          aria-label="다음 단계"
        >
          ⏭
        </button>
      </div>
      <input
        className={styles.timeline}
        type="range"
        min={0}
        max={Math.max(0, total - 1)}
        value={stepIndex}
        disabled={disabled}
        onChange={(e) => {
          pause();
          seek(Number(e.target.value));
        }}
        aria-label="단계 이동"
      />
      <span className={styles.counter} aria-live="polite">
        {total === 0 ? '0 / 0' : `${stepIndex + 1} / ${total}`} 단계
      </span>
      <label className={styles.speed}>
        <span className={styles.speedText}>속도</span>
        <select
          aria-label="재생 속도"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
