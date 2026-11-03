import { useSim } from '../../store/useSim';
import styles from './Header.module.css';

export function Header() {
  const largeText = useSim((s) => s.largeText);
  const shapes = useSim((s) => s.shapes);
  const { toggleLargeText, toggleShapes, setHelpOpen } = useSim.getState();
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>
        <span className={styles.logo} aria-hidden="true">
          ⁂
        </span>
        군집화 시뮬레이터
      </h1>
      <div className={styles.actions}>
        <button
          type="button"
          aria-pressed={shapes}
          onClick={toggleShapes}
          title="색과 함께 모양(●▲■◆)으로도 군집을 구분"
        >
          ▲ 모양 구분
        </button>
        <button
          type="button"
          aria-pressed={largeText}
          onClick={toggleLargeText}
          title="프로젝터·태블릿용 큰 글씨"
        >
          가 큰 글씨
        </button>
        <button type="button" onClick={() => setHelpOpen(true)}>
          ? 도움말
        </button>
      </div>
    </header>
  );
}
