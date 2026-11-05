import { useMemo } from 'react';
import { countClusters } from '../../algorithms/geometry';
import { ALGORITHM_MAP } from '../../algorithms/registry';
import { ROLE } from '../../algorithms/types';
import { silhouette } from '../../metrics';
import { useSim } from '../../store/useSim';
import { Dendrogram } from '../Charts/Dendrogram';
import { MetricChart } from '../Charts/MetricChart';
import panel from '../common/Panel.module.css';
import styles from './ExplanationPanel.module.css';

const LEGEND: Record<string, { mark: string; text: string }[]> = {
  kmeans: [
    { mark: '✕', text: '군집 중심' },
    { mark: '◌', text: '테두리: 이번 단계에 소속이 바뀐 점' },
  ],
  kmeanspp: [
    { mark: '✕', text: '군집 중심' },
    { mark: '⬤', text: '점 크기: 다음 중심으로 뽑힐 확률' },
  ],
  dbscan: [
    { mark: '⬤', text: '핵심점' },
    { mark: '•', text: '경계점 (작은 점)' },
    { mark: '○', text: '노이즈 (속 빈 회색 점)' },
    { mark: '◌', text: '점선 원: 반경 ε' },
  ],
  agglomerative: [
    { mark: '◌', text: '테두리: 방금 병합된 군집' },
    { mark: '●', text: '회색: 아직 혼자인 점' },
  ],
  gmm: [
    { mark: '⬭', text: '타원: 분포의 2σ 범위' },
    { mark: '◐', text: '섞인 색: 소속이 애매한 점' },
  ],
  meanshift: [
    { mark: '·', text: '흐린 점: 원래 위치' },
    { mark: '⬤', text: '진한 점: 이동 중인 복사본' },
    { mark: '◌', text: '점선 원: 반경 h (예시 한 점)' },
  ],
};

export function ExplanationPanel() {
  const algorithmId = useSim((s) => s.algorithmId);
  const steps = useSim((s) => s.steps);
  const stepIndex = useSim((s) => s.stepIndex);
  const points = useSim((s) => s.points);
  const algo = ALGORITHM_MAP[algorithmId];
  const step = steps[stepIndex];
  const isLast = steps.length > 0 && stepIndex === steps.length - 1;

  const sil = useMemo(
    () =>
      isLast && step && step.labels.length === points.length
        ? silhouette(points, step.labels)
        : null,
    [isLast, step, points],
  );

  const manual = useSim((s) => s.algorithmId === 'kmeans' && s.params.kmeans.init === 'manual');
  const legend = [
    ...(LEGEND[algorithmId] ?? []),
    ...(manual ? [{ mark: '◌', text: '번호 붙은 점선 원: 직접 놓은 시작 위치' }] : []),
  ];

  const clusters = step ? countClusters(step.labels) : 0;
  let noise = 0;
  if (step?.roles) for (const r of step.roles) if (r === ROLE.NOISE) noise++;

  return (
    <div className={styles.column}>
      <section className={panel.panel} aria-labelledby="step-title">
        <h2 id="step-title" className={panel.title}>
          현재 단계
        </h2>
        <p className={styles.message} aria-live="polite">
          {step?.message ?? '실행할 수 없습니다.'}
        </p>
        <dl className={styles.stats}>
          <div>
            <dt>군집 수</dt>
            <dd>{clusters}</dd>
          </div>
          {step?.roles && (
            <div>
              <dt>노이즈</dt>
              <dd>{noise}</dd>
            </div>
          )}
          <div>
            <dt title="-1~1, 1에 가까울수록 군집이 잘 나뉨">실루엣 점수</dt>
            <dd>{isLast ? (sil === null ? '–' : sil.toFixed(3)) : '완료 후'}</dd>
          </div>
        </dl>
        <ul className={styles.legend}>
          {legend.map((l) => (
            <li key={l.text}>
              <span aria-hidden="true">{l.mark}</span> {l.text}
            </li>
          ))}
        </ul>
      </section>

      <section className={panel.panel} aria-labelledby="code-title">
        <h2 id="code-title" className={panel.title}>
          의사코드
        </h2>
        <ol className={styles.code}>
          {algo.pseudocode.map((line, i) => (
            <li
              key={i}
              className={step?.codeLine === i ? styles.codeOn : undefined}
              aria-current={step?.codeLine === i ? 'step' : undefined}
            >
              <span className={styles.lineNo}>{i + 1}</span>
              <span className={styles.lineText}>{line}</span>
            </li>
          ))}
        </ol>
      </section>

      {(algo.metric || step?.dendrogram) && (
        <section className={panel.panel} aria-label="그래프">
          {step?.dendrogram && <Dendrogram state={step.dendrogram} />}
          {algo.metric && (
            <MetricChart
              steps={steps}
              stepIndex={stepIndex}
              metricKey={algo.metric.key}
              label={algo.metric.label}
            />
          )}
        </section>
      )}

      <details className={`${panel.panel} ${styles.about}`}>
        <summary>{algo.name} 알아보기</summary>
        <h3>원리</h3>
        <ul>
          {algo.principle.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <h3>장점</h3>
        <ul>
          {algo.pros.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <h3>단점</h3>
        <ul>
          {algo.cons.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
