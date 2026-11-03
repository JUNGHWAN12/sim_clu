import { TEXT } from '../content/algorithms';
import { agglomerative, type AgglomerativeParams } from './agglomerative';
import { dbscan, type DbscanParams } from './dbscan';
import { gmm, type GmmParams } from './gmm';
import { kmeans, type KMeansParams } from './kmeans';
import { meanShift, type MeanShiftParams } from './meanShift';
import type { AlgorithmDef } from './types';

const kParam = { key: 'k', label: '군집 수 K', type: 'int', min: 1, max: 10, step: 1 } as const;

export const ALGORITHMS: AlgorithmDef[] = [
  {
    id: 'kmeans',
    ...TEXT.kmeans,
    params: [
      kParam,
      {
        key: 'init',
        label: '초기화 방식',
        type: 'select',
        options: [
          { value: 'random', label: '무작위' },
          { value: 'kmeans++', label: 'K-Means++' },
        ],
      },
      { key: 'maxIter', label: '최대 반복 횟수', type: 'int', min: 1, max: 100, step: 1 },
    ],
    defaults: { k: 3, init: 'random', maxIter: 50 },
    maxPoints: 1500,
    metric: { key: 'sse', label: 'SSE (군집 내 거리 제곱합)' },
    run: (points, p, rng) => kmeans(points, p as unknown as KMeansParams, rng),
  },
  {
    id: 'kmeanspp',
    ...TEXT.kmeanspp,
    params: [
      kParam,
      { key: 'maxIter', label: '최대 반복 횟수', type: 'int', min: 1, max: 100, step: 1 },
    ],
    defaults: { k: 3, maxIter: 50 },
    maxPoints: 1500,
    metric: { key: 'sse', label: 'SSE (군집 내 거리 제곱합)' },
    run: (points, p, rng) =>
      kmeans(points, { ...(p as unknown as KMeansParams), init: 'kmeans++' }, rng, true),
  },
  {
    id: 'dbscan',
    ...TEXT.dbscan,
    params: [
      {
        key: 'eps',
        label: '반경 ε',
        type: 'float',
        min: 0.01,
        max: 0.3,
        step: 0.005,
        help: '이웃으로 볼 거리',
      },
      {
        key: 'minPts',
        label: 'MinPts',
        type: 'int',
        min: 2,
        max: 30,
        step: 1,
        help: '핵심점이 되기 위한 최소 이웃 수(자기 포함)',
      },
      {
        key: 'detail',
        label: '점 하나씩 자세히 보기',
        type: 'bool',
        help: '끄면 군집 단위로 빠르게 진행',
      },
    ],
    defaults: { eps: 0.06, minPts: 5, detail: true },
    maxPoints: 1500,
    metric: { key: 'clusters', label: '찾은 군집 수' },
    run: (points, p) => dbscan(points, p as unknown as DbscanParams),
  },
  {
    id: 'agglomerative',
    ...TEXT.agglomerative,
    params: [
      {
        key: 'linkage',
        label: '연결 방식',
        type: 'select',
        options: [
          { value: 'ward', label: 'Ward (분산 증가 최소)' },
          { value: 'single', label: '단일 연결 (가장 가까운 점)' },
          { value: 'complete', label: '완전 연결 (가장 먼 점)' },
          { value: 'average', label: '평균 연결' },
        ],
      },
      { ...kParam, label: '자를 군집 수 K' },
    ],
    defaults: { linkage: 'ward', k: 3 },
    maxPoints: 300,
    metric: { key: 'height', label: '병합 거리' },
    run: (points, p) => agglomerative(points, p as unknown as AgglomerativeParams),
  },
  {
    id: 'gmm',
    ...TEXT.gmm,
    params: [
      { ...kParam, label: '분포 수 K' },
      {
        key: 'init',
        label: '초기화 방식',
        type: 'select',
        options: [
          { value: 'kmeans++', label: 'K-Means++' },
          { value: 'random', label: '무작위' },
        ],
      },
      { key: 'maxIter', label: '최대 반복 횟수', type: 'int', min: 1, max: 200, step: 1 },
    ],
    defaults: { k: 3, init: 'kmeans++', maxIter: 60 },
    maxPoints: 1500,
    metric: { key: 'loglik', label: '평균 로그 가능도' },
    run: (points, p, rng) => gmm(points, p as unknown as GmmParams, rng),
  },
  {
    id: 'meanshift',
    ...TEXT.meanshift,
    params: [
      {
        key: 'bandwidth',
        label: '반경 h (대역폭)',
        type: 'float',
        min: 0.02,
        max: 0.4,
        step: 0.01,
      },
      {
        key: 'kernel',
        label: '커널',
        type: 'select',
        options: [
          { value: 'flat', label: '평평한 커널 (반경 안 단순 평균)' },
          { value: 'gaussian', label: '가우시안 커널 (가까울수록 큰 가중치)' },
        ],
      },
      { key: 'maxIter', label: '최대 반복 횟수', type: 'int', min: 1, max: 200, step: 1 },
    ],
    defaults: { bandwidth: 0.12, kernel: 'flat', maxIter: 60 },
    maxPoints: 600,
    metric: { key: 'maxShift', label: '가장 크게 움직인 거리' },
    run: (points, p) => meanShift(points, p as unknown as MeanShiftParams),
  },
];

export const ALGORITHM_MAP: Record<string, AlgorithmDef> = Object.fromEntries(
  ALGORITHMS.map((a) => [a.id, a]),
);

/** 최대 단계 수 (무한 루프·메모리 폭주 방지) */
export const MAX_STEPS = 5000;
