import { useEffect } from 'react';
import { BASE_INTERVAL, useSim } from '../store/useSim';

/** 재생 중이면 속도에 맞춰 다음 단계로 넘김 */
export function usePlayer() {
  const isPlaying = useSim((s) => s.isPlaying);
  const speed = useSim((s) => s.speed);
  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => useSim.getState().stepForward(), BASE_INTERVAL / speed);
    return () => window.clearInterval(id);
  }, [isPlaying, speed]);
}

/** 키보드 단축키: Space 재생/정지, ←/→ 이전/다음, Home 처음으로 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA'))
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useSim.getState();
      switch (e.key) {
        case ' ':
          e.preventDefault();
          s.togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          s.pause();
          s.stepForward();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          s.stepBack();
          break;
        case 'Home':
          e.preventDefault();
          s.rewind();
          break;
        case 'Escape':
          s.setHelpOpen(false);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
