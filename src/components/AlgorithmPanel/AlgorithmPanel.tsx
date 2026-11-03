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

export function AlgorithmPanel() {
  const algorithmId = useSim((s) => s.algorithmId);
  const params = useSim((s) => s.params[s.algorithmId]);
  const blocked = useSim((s) => s.blocked);
  const truncated = useSim((s) => s.truncated);
  const { setAlgorithm, rerun } = useSim.getState();
  const algo = ALGORITHM_MAP[algorithmId];
  const usesRandom = ['kmeans', 'kmeanspp', 'gmm'].includes(algorithmId);

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
