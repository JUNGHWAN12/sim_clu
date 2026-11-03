import { useEffect } from 'react';
import { AlgorithmPanel } from './components/AlgorithmPanel/AlgorithmPanel';
import { Controls } from './components/Controls/Controls';
import { DataPanel } from './components/DataPanel/DataPanel';
import { ExplanationPanel } from './components/ExplanationPanel/ExplanationPanel';
import { Header } from './components/Header/Header';
import { HelpDialog } from './components/Help/HelpDialog';
import { ScatterPlot } from './components/ScatterPlot/ScatterPlot';
import { useKeyboardShortcuts, usePlayer } from './hooks/usePlayer';
import { useSim } from './store/useSim';

/** 좁은 화면에서 캔버스 바로 아래에 보여 주는 단계 설명 */
function StepCaption() {
  const message = useSim((s) => s.steps[s.stepIndex]?.message ?? s.blocked ?? '');
  return <p className={styles.caption}>{message}</p>;
}
import styles from './App.module.css';

export default function App() {
  usePlayer();
  useKeyboardShortcuts();
  const largeText = useSim((s) => s.largeText);
  useEffect(() => {
    document.documentElement.classList.toggle('large', largeText);
  }, [largeText]);

  return (
    <div className={styles.app}>
      <Header />
      <main className={styles.main}>
        <aside className={styles.left} aria-label="설정">
          <AlgorithmPanel />
          <DataPanel />
        </aside>
        <div className={styles.center}>
          <ScatterPlot />
          <StepCaption />
        </div>
        <aside className={styles.right} aria-label="설명">
          <ExplanationPanel />
        </aside>
      </main>
      <div className={styles.controls}>
        <Controls />
      </div>
      <HelpDialog />
    </div>
  );
}
