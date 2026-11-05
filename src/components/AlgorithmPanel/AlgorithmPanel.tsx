import { useEffect, useState } from 'react';
import { ALGORITHM_MAP, ALGORITHMS } from '../../algorithms/registry';
import type { ParamSpec } from '../../algorithms/types';
import { useSim } from '../../store/useSim';
import { Slider } from '../common/Slider';
import styles from '../common/Panel.module.css';

function ParamControl({ spec, value }: { spec: ParamSpec; value: number | string | boolean }) {
  const setParam = useSim((s) => s.setParam);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  if (spec.type === 'select') {
    return (
      <label className={styles.field}>
        <span className={styles.label}>{spec.label}</span>
        <select value={String(value)} onChange={(e) => setParam(spec.key, e.target.value)}>
          {spec.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {spec.help && <span className={styles.hint}>{spec.help}</span>}
      </label>
    );
  }
  if (spec.type === 'bool') {
    return (
      <div className={styles.field}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => setParam(spec.key, e.target.checked)}
          />
          {spec.label}
        </label>
        {spec.help && <span className={styles.hint}>{spec.help}</span>}
      </div>
    );
  }
  const decimals = spec.type === 'float' ? Math.max(0, -Math.floor(Math.log10(spec.step))) : 0;
  return (
    <Slider
      label={spec.label}
      value={Number(draft)}
      min={spec.min}
      max={spec.max}
      step={spec.step}
      help={spec.help}
      format={(v) => v.toFixed(decimals)}
      onChange={setDraft}
      onCommit={(v) => v !== value && setParam(spec.key, v)}
    />
  );
}

/** K-Means '직접 지정' 초기화 안내와 버튼 */
function ManualCentroidBox({ k }: { k: number }) {
  const count = useSim((s) => s.manualCentroids.length);
  const placing = useSim((s) => s.tool === 'centroid');
  const { setTool, clearCentroids } = useSim.getState();
  const done = count >= k;
  return (
    <div className={styles.manualBox}>
      <div className={styles.row}>
        <strong>
          중심점 {count} / {k}개
        </strong>
        <span className={done ? styles.badgeDone : styles.badgeTodo}>
          {done ? '준비 완료' : '놓는 중'}
        </span>
      </div>
      <p className={styles.hint}>
        {placing
          ? done
            ? '중심을 끌어서 옮기거나, 눌러서 지울 수 있습니다. ▶를 눌러 실행해 보세요.'
            : `캔버스를 눌러 중심점을 ${k - count}개 더 놓아 주세요.`
          : '점 그리기 도구를 쓰는 중입니다. 아래 버튼을 눌러 다시 중심을 놓을 수 있습니다.'}
      </p>
      <div className={styles.row}>
        <button
          type="button"
          className={placing ? styles.button : styles.buttonGhost}
          aria-pressed={placing}
          onClick={() => setTool(placing ? 'add' : 'centroid')}
        >
          📍 중심 놓기 {placing ? '켜짐' : '꺼짐'}
        </button>
        <button
          type="button"
          className={styles.buttonGhost}
          onClick={clearCentroids}
          disabled={count === 0}
        >
          모두 지우기
        </button>
      </div>
    </div>
  );
}

export function AlgorithmPanel() {
  const algorithmId = useSim((s) => s.algorithmId);
  const params = useSim((s) => s.params[s.algorithmId]);
  const blocked = useSim((s) => s.blocked);
  const truncated = useSim((s) => s.truncated);
  const { setAlgorithm, rerun } = useSim.getState();
  const algo = ALGORITHM_MAP[algorithmId];
  const manual = algorithmId === 'kmeans' && params.init === 'manual';
  const usesRandom = ['kmeans', 'kmeanspp', 'gmm'].includes(algorithmId) && !manual;

  return (
    <section className={styles.panel} aria-labelledby="algo-title">
      <h2 id="algo-title" className={styles.title}>
        알고리즘
      </h2>
      <div className={styles.algoGrid} role="radiogroup" aria-label="알고리즘 선택">
        {ALGORITHMS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={a.id === algorithmId}
            className={a.id === algorithmId ? styles.algoOn : undefined}
            onClick={() => setAlgorithm(a.id)}
          >
            {a.name}
          </button>
        ))}
      </div>
      <p className={styles.hint}>{algo.summary}</p>

      <div className={styles.subTitle}>파라미터</div>
      {algo.params.map((spec) => (
        <ParamControl key={`${algorithmId}-${spec.key}`} spec={spec} value={params[spec.key]} />
      ))}

      {manual && <ManualCentroidBox k={Number(params.k)} />}

      {usesRandom && (
        <button
          type="button"
          className={styles.buttonGhost}
          onClick={rerun}
          title="초기 중심을 새로 뽑아 다시 실행"
        >
          🔁 초기값 바꿔서 다시 실행
        </button>
      )}

      {blocked && <p className={styles.warning}>{blocked}</p>}
      {truncated && (
        <p className={styles.warning}>
          단계가 너무 많아 앞부분만 보여 줍니다. 점 개수를 줄이거나 '자세히 보기'를 꺼 보세요.
        </p>
      )}
    </section>
  );
}
