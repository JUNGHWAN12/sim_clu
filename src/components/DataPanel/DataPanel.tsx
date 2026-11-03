import { PRESETS, type PresetId } from '../../data/generators';
import { MAX_TOTAL_POINTS, useSim, type Tool } from '../../store/useSim';
import { Slider } from '../common/Slider';
import styles from '../common/Panel.module.css';

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: 'add', label: '● 점 찍기', hint: '누른 곳에 점 1개 추가' },
  { id: 'spray', label: '⁘ 뿌리기', hint: '누른 곳 주변에 점 12개 추가' },
  { id: 'erase', label: '⌫ 지우기', hint: '누른 곳 근처의 점 삭제' },
];

export function DataPanel() {
  const dataset = useSim((s) => s.dataset);
  const count = useSim((s) => s.points.length);
  const tool = useSim((s) => s.tool);
  const { regenerate, setDataset, setTool, clearPoints } = useSim.getState();
  const usesClusters = dataset.preset === 'blobs' || dataset.preset === 'aniso';
  const isEmpty = dataset.preset === 'empty';
  const hint = PRESETS.find((p) => p.id === dataset.preset)?.hint;

  return (
    <section className={styles.panel} aria-labelledby="data-title">
      <h2 id="data-title" className={styles.title}>
        데이터
      </h2>

      <label className={styles.field}>
        <span className={styles.label}>데이터 모양</span>
        <select
          value={dataset.preset}
          onChange={(e) => regenerate({ preset: e.target.value as PresetId })}
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      {hint && <p className={styles.hint}>{hint}</p>}

      {!isEmpty && (
        <>
          <Slider
            label="점 개수"
            value={dataset.n}
            min={20}
            max={1000}
            step={10}
            onChange={(n) => setDataset({ n })}
            onCommit={(n) => regenerate({ n })}
          />
          <Slider
            label="흩어진 정도"
            value={dataset.noise}
            min={0}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(noise) => setDataset({ noise })}
            onCommit={(noise) => regenerate({ noise })}
          />
          {usesClusters && (
            <Slider
              label="덩어리 수"
              value={dataset.clusters}
              min={1}
              max={8}
              step={1}
              onChange={(clusters) => setDataset({ clusters })}
              onCommit={(clusters) => regenerate({ clusters })}
            />
          )}
          <div className={styles.row}>
            <label className={styles.inline}>
              <span className={styles.label}>시드</span>
              <input
                type="number"
                value={dataset.seed}
                min={0}
                onChange={(e) => regenerate({ seed: Math.max(0, Number(e.target.value) || 0) })}
                aria-describedby="seed-help"
              />
            </label>
            <button
              type="button"
              className={styles.button}
              onClick={() => regenerate({ seed: Math.floor(Math.random() * 10000) })}
            >
              🎲 새로 생성
            </button>
          </div>
          <p id="seed-help" className={styles.hint}>
            같은 시드를 쓰면 언제나 같은 데이터가 만들어집니다.
          </p>
        </>
      )}

      <div className={styles.subTitle}>직접 그리기</div>
      <div className={styles.segment} role="radiogroup" aria-label="그리기 도구">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={tool === t.id}
            className={tool === t.id ? styles.segmentOn : undefined}
            onClick={() => setTool(t.id)}
            title={t.hint}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className={styles.hint}>
        캔버스를 눌러 사용합니다. 오른쪽 클릭이나 길게 누르기로도 지울 수 있습니다.
      </p>
      <div className={styles.row}>
        <span className={styles.muted}>
          점 {count}개{count >= MAX_TOTAL_POINTS ? ' (최대)' : ''}
        </span>
        <button
          type="button"
          className={styles.buttonGhost}
          onClick={clearPoints}
          disabled={count === 0}
        >
          모두 지우기
        </button>
      </div>
    </section>
  );
}
