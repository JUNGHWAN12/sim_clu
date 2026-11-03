# 데이터 군집화 시뮬레이터 — 프로젝트 계획서

> 저장소: `junghwan12/sim_clu`
> 배포 주소(예정): https://junghwan12.github.io/sim_clu/
> 작성일: 2026-11-03

---

## 1. 프로젝트 개요

### 1.1 목적
데이터 군집화(Clustering) 알고리즘이 **어떤 과정을 거쳐 군집을 만들어 가는지**를
웹 브라우저에서 단계별 애니메이션으로 보여주는 교육용 시뮬레이터를 만든다.
수식이나 결과 그림만 보는 대신, 사용자가 직접 데이터를 만들고 파라미터를 바꾸며
알고리즘의 동작을 "한 단계씩" 관찰할 수 있게 하는 것이 핵심이다.

### 1.2 대상 사용자
- 머신러닝·데이터 과학을 처음 배우는 학생 (고등학생 ~ 대학생)
- 수업 시간에 군집화 개념을 시연하려는 교사
- 알고리즘별 차이(K-Means vs DBSCAN 등)를 직관적으로 비교하고 싶은 학습자

### 1.3 사용 언어
화면 문구, 단계 설명, 의사코드, 도움말 등 **모든 콘텐츠는 한국어**로 제공한다.
문구는 `src/content/`에 모아 관리하되, 별도의 다국어(i18n) 라이브러리는 사용하지 않는다.

### 1.4 성공 기준
- 별도 설치 없이 주소만으로 접속해 바로 사용할 수 있다 (GitHub Pages).
- 2.2절의 알고리즘 6종(K-Means, K-Means++, DBSCAN, 계층적 군집, GMM, Mean-Shift)을 모두 단계별로 재생·일시정지·되감기할 수 있다.
- 모든 데이터는 2차원(x, y) 평면에서 다룬다.
- 각 단계마다 "지금 무슨 일이 일어나는지"를 한국어로 설명한다.
- 데스크톱과 태블릿(수업용 화면)에서 문제없이 동작한다.

---

## 2. 주요 기능

### 2.1 데이터 생성
| 기능 | 설명 |
|---|---|
| 프리셋 데이터셋 | 가우시안 덩어리(Blobs), 초승달(Moons), 동심원(Circles), 균일 분포(Random), 비등방(늘어진) 덩어리 |
| 직접 그리기 | 캔버스를 클릭/드래그해 점 추가, 우클릭(또는 지우개 모드)으로 삭제 |
| 설정 | 점 개수, 노이즈 정도, 덩어리 수, 난수 시드(같은 데이터 재현용) |
| 가져오기/내보내기 | CSV(x, y) 파일 업로드·다운로드 *(2차 목표)* |

### 2.2 군집화 알고리즘 (단계별 시뮬레이션)

| 우선순위 | 알고리즘 | 시각화할 단계 | 조절 파라미터 |
|---|---|---|---|
| 필수 | **K-Means** | ① 초기 중심 배치 → ② 각 점을 가장 가까운 중심에 할당 → ③ 중심을 군집 평균으로 이동 → ②③ 반복 → 수렴 | K, 초기화 방식(랜덤 / K-Means++), 최대 반복 횟수 |
| 필수 | **K-Means++ 초기화** | 첫 중심 선택 → 거리²에 비례한 확률로 다음 중심 선택 (확률을 점 크기·색으로 표시) | K |
| 필수 | **DBSCAN** | 점 하나 방문 → ε 반경 원 표시 → 핵심점/경계점/노이즈 판정 → 군집 확장(BFS) | ε(반경), MinPts |
| 필수 | **계층적 군집 (Agglomerative)** | 가장 가까운 두 군집 병합 → 덴드로그램이 함께 자라남 | 연결 방식(single / complete / average / ward), 자를 군집 수 |
| 필수 | **가우시안 혼합 모델 (GMM, EM)** | E단계(소속 확률을 색 혼합으로) → M단계(타원 갱신), 로그 가능도 변화 표시 | 성분 수 K, 최대 반복 횟수 |
| 필수 | **Mean-Shift** | 각 점이 밀도가 높은 곳으로 이동하는 궤적 | 대역폭(bandwidth) |

### 2.3 재생 제어
- ▶ 재생 / ⏸ 일시정지 / ⏭ 다음 단계 / ⏮ 이전 단계 / ⟲ 처음으로
- 재생 속도 슬라이더 (0.25× ~ 4×)
- 타임라인 슬라이더로 원하는 단계로 바로 이동
- 키보드 단축키: `Space`(재생/정지), `←`/`→`(이전/다음 단계)

### 2.4 설명 및 지표 패널
- **단계 설명**: "3번째 반복: 점 12개의 소속 군집이 바뀌었습니다" 처럼 현재 단계를 문장으로 안내
- **지표 실시간 표시**
  - K-Means: SSE(군집 내 제곱합, inertia) 변화 그래프
  - 공통: 군집 수, 노이즈 점 수, 실루엣 점수(완료 시)
- **알고리즘 소개 카드**: 원리, 장단점, 의사코드(현재 실행 중인 줄 강조)

### 2.5 비교 / 학습 도구 *(2차 목표)*
- **엘보우 차트**: K = 1~10에 대해 SSE를 계산해 최적 K 찾기
- **나란히 비교 모드**: 같은 데이터에 두 알고리즘을 동시에 실행
- **"K-Means가 실패하는 데이터"** 같은 학습 시나리오 프리셋 (초승달·동심원)

---

## 3. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 빌드 도구 | **Vite** | 빠른 개발 서버, GitHub Pages용 정적 빌드가 간단함 (Create React App은 지원 종료) |
| UI | **React 18 + TypeScript** | 요구사항(React), 타입으로 알고리즘 단계 데이터 구조를 안전하게 관리 |
| 시각화 | **SVG + d3-scale** (점 수가 많아지면 **Canvas**로 전환) | SVG는 애니메이션·이벤트 처리가 쉬움. 2,000점 이상이면 Canvas 사용 |
| 그래프 | 직접 그린 SVG 또는 **Recharts** | SSE 그래프·덴드로그램 |
| 상태 관리 | **Zustand** (또는 React `useReducer`) | 데이터셋·파라미터·재생 상태를 여러 컴포넌트에서 공유 |
| 스타일 | **CSS Modules** (`*.module.css`) | Vite 기본 지원으로 추가 설치 불필요, 컴포넌트별 클래스 이름 충돌 방지. 색상·간격은 `src/styles/tokens.css`의 CSS 변수로 통일 |
| 테스트 | **Vitest** + React Testing Library | Vite와 설정 공유, 알고리즘 단위 테스트 |
| 품질 | ESLint + Prettier | 코드 스타일 통일 |
| 배포 | **GitHub Actions → GitHub Pages** | `main`에 push하면 자동 빌드·배포 |

> 외부 서버나 DB는 쓰지 않는다. 모든 계산은 브라우저에서 수행한다.

---

## 4. 설계

### 4.1 핵심 설계: "알고리즘 = 단계(Step)를 내보내는 제너레이터"

알고리즘 코드와 화면 코드를 완전히 분리한다.
각 알고리즘은 React를 전혀 모르는 **순수 TypeScript 제너레이터 함수**로 작성하고,
한 단계가 끝날 때마다 그 순간의 상태 스냅샷을 `yield` 한다.

```ts
// src/algorithms/types.ts
export interface Point { x: number; y: number; }

export interface Step {
  kind: string;               // 예: 'init' | 'assign' | 'update' | 'converged'
  labels: number[];           // 각 점의 군집 번호 (-1 = 미할당/노이즈)
  centroids?: Point[];        // K-Means, GMM
  highlight?: number[];       // 지금 주목할 점 인덱스
  overlays?: Overlay[];       // ε 원, 이동 화살표, 타원 등
  metrics?: Record<string, number>; // SSE 등
  message: string;            // 화면에 보여줄 한국어 설명
  codeLine?: number;          // 의사코드에서 강조할 줄
}

export type ClusteringAlgorithm<P> =
  (points: Point[], params: P, rng: () => number) => Generator<Step>;
```

```ts
// src/algorithms/kmeans.ts (개략)
export function* kmeans(points, { k, init, maxIter }, rng) {
  let centroids = init === 'kmeans++' ? yield* kmeansPlusPlus(points, k, rng)
                                      : randomInit(points, k, rng);
  yield { kind: 'init', centroids, labels: points.map(() => -1),
          message: `중심점 ${k}개를 배치했습니다.` };

  for (let iter = 1; iter <= maxIter; iter++) {
    const labels = assignToNearest(points, centroids);
    yield { kind: 'assign', labels, centroids, message: `${iter}회차: 가장 가까운 중심에 할당` };

    const next = recomputeMeans(points, labels, k);
    yield { kind: 'update', labels, centroids: next, message: `${iter}회차: 중심을 평균 위치로 이동` };

    if (converged(centroids, next)) { /* 'converged' 단계 yield 후 종료 */ break; }
    centroids = next;
  }
}
```

**장점**
- 실행 시 모든 단계를 배열로 미리 모아두면(`Array.from(gen)`) **되감기·타임라인 이동이 공짜**로 된다.
- 알고리즘을 화면 없이 단위 테스트할 수 있다.
- 새 알고리즘 추가 = 제너레이터 파일 하나 + 파라미터 UI 하나.
- 점이 아주 많아 단계 수가 커지면 미리 모으지 않고 필요할 때 `next()`로 꺼내는 방식으로 전환 가능.

### 4.2 재생 엔진
- `usePlayer(steps)` 커스텀 훅: `currentIndex`, `isPlaying`, `speed`를 관리
- `requestAnimationFrame` 기반 타이머로 `speed`에 맞춰 `currentIndex` 증가
- 단계 사이 전환은 CSS transition(SVG `transform`) 또는 보간(interpolation)으로 부드럽게 처리
  (예: 중심점이 이전 위치 → 새 위치로 미끄러지듯 이동)
- 데이터나 파라미터가 바뀌면 단계 배열을 다시 계산하고 0단계로 초기화

### 4.3 난수 시드
`Math.random` 대신 시드 기반 난수(예: mulberry32)를 사용해
**같은 시드 → 같은 데이터·같은 초기 중심**이 나오도록 한다. 수업 중 재현에 중요하다.

### 4.4 폴더 구조

```
sim_clu/
├─ .github/workflows/deploy.yml   # GitHub Pages 자동 배포
├─ public/
├─ src/
│  ├─ algorithms/                 # 순수 TS, React 의존 없음
│  │  ├─ types.ts
│  │  ├─ kmeans.ts
│  │  ├─ kmeansPlusPlus.ts
│  │  ├─ dbscan.ts
│  │  ├─ agglomerative.ts
│  │  ├─ gmm.ts
│  │  ├─ meanShift.ts
│  │  └─ __tests__/
│  ├─ data/                       # 데이터셋 생성기
│  │  ├─ generators.ts            # blobs, moons, circles, random
│  │  └─ random.ts                # 시드 난수
│  ├─ metrics/                    # sse, silhouette
│  ├─ store/                      # Zustand 스토어
│  ├─ hooks/
│  │  └─ usePlayer.ts
│  ├─ components/
│  │  ├─ Canvas/                  # 점·중심·오버레이 렌더링
│  │  ├─ Controls/                # 재생 버튼, 타임라인, 속도
│  │  ├─ DataPanel/               # 데이터셋 선택·생성
│  │  ├─ AlgorithmPanel/          # 알고리즘 선택·파라미터
│  │  ├─ ExplanationPanel/        # 단계 설명·의사코드
│  │  └─ Charts/                  # SSE 그래프, 덴드로그램
│  ├─ content/                    # 알고리즘 설명 문서 (한국어)
│  ├─ styles/                     # 전역 스타일, CSS 변수(tokens.css)
│  ├─ App.tsx
│  └─ main.tsx
├─ index.html
├─ vite.config.ts
├─ package.json
└─ README.md
```

---

## 5. 화면 구성 (와이어프레임)

```
┌──────────────────────────────────────────────────────────────────┐
│  군집화 시뮬레이터            [K-Means ▼]            [? 도움말]  │
├───────────────┬──────────────────────────────────┬───────────────┤
│ ▣ 데이터      │                                  │ ▣ 현재 단계   │
│  ○ Blobs      │                                  │  3회차 할당:  │
│  ○ Moons      │                                  │  점 12개의    │
│  ○ Circles    │        (2D 산점도 캔버스)        │  소속이       │
│  ○ 직접 그리기│     ● ● ●      ▲                 │  바뀌었습니다 │
│  점 개수 [300]│       ●  ●        ● ●            │               │
│  노이즈  [▬▬] │          ▲     ● ●  ▲            │ ▣ 의사코드    │
│  시드    [42] │                                  │  1 초기화     │
│  [새로 생성]  │                                  │ ▶2 할당       │
│               │                                  │  3 중심 이동  │
│ ▣ 파라미터    │                                  │               │
│  K       [3]  │                                  │ ▣ SSE 추이    │
│  초기화 [++▼] │                                  │  ╲__          │
│               │                                  │      ‾‾──     │
├───────────────┴──────────────────────────────────┴───────────────┤
│  ⟲  ⏮  ▶  ⏭   ●━━━━━━━○━━━━━━━━━━━  7 / 18 단계   속도 [1x ▼]  │
└──────────────────────────────────────────────────────────────────┘
```

- **태블릿·프로젝터 지원**
  - 태블릿/좁은 화면(1024px 미만): 좌·우 패널을 캔버스 아래로 접어서 배치
  - 터치 입력: 탭으로 점 추가, 길게 누르기로 삭제, 버튼 최소 크기 44px
  - 프로젝터: 큰 글씨 모드(글자·점 크기 확대) 토글, 높은 명암 대비 유지
- 군집 색상: 색각 이상 사용자도 구분 가능한 팔레트 + 군집별 모양(●▲■) 병행
- 다크 모드 지원 *(2차 목표)*

---

## 6. GitHub Pages 배포 계획

### 6.1 Vite 설정
저장소 이름이 `sim_clu`이므로 하위 경로를 지정한다.

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  base: '/sim_clu/',
});
```

### 6.2 자동 배포 워크플로
`.github/workflows/deploy.yml` — `main` 브랜치에 push되면 빌드 후 Pages에 배포한다.

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run test -- --run
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 6.3 저장소 설정 (1회, 직접 해야 함)
GitHub 저장소 → **Settings → Pages → Build and deployment → Source: "GitHub Actions"** 선택

### 6.4 주의 사항
- 페이지를 여러 개로 나눌 경우 **HashRouter**를 사용한다 (GitHub Pages는 SPA 경로 새로고침 시 404 발생).
  초기 버전은 단일 페이지로 구성해 라우터 없이 시작한다.
- 이미지·파일 경로는 `import.meta.env.BASE_URL` 기준으로 작성한다.

---

## 7. 개발 일정 (마일스톤)

총 약 **7~8주** 예상 (주당 10시간 내외 기준). 각 단계가 끝날 때마다 배포해 확인한다.

| 단계 | 기간 | 작업 내용 | 완료 기준 |
|---|---|---|---|
| **M0. 준비** | 2~3일 | Vite + React + TS 프로젝트 생성, ESLint/Prettier/Vitest 설정, 배포 워크플로 작성 | "Hello" 페이지가 GitHub Pages 주소에서 보임 |
| **M1. 데이터 & 캔버스** | 1주 | 시드 난수, 데이터 생성기 4종, SVG 산점도, 직접 그리기 | 데이터셋을 바꾸면 점이 즉시 다시 그려짐 |
| **M2. K-Means + 재생 엔진** | 1주 | Step 타입, K-Means/K-Means++ 제너레이터, `usePlayer`, 재생 컨트롤, 중심 이동 애니메이션 | K-Means를 처음부터 수렴까지 재생·되감기 가능 |
| **M3. 설명 & 지표** | 4~5일 | 단계 설명 문구, 의사코드 강조, SSE 그래프, 실루엣 점수 | 각 단계마다 설명과 SSE가 갱신됨 |
| **M4. DBSCAN** | 4~5일 | ε 원·핵심/경계/노이즈 표시, BFS 확장 애니메이션 | 초승달 데이터에서 DBSCAN이 올바르게 분리됨 |
| **M5. 계층적 군집** | 1주 | 병합 과정 + 덴드로그램 동기화, 연결 방식 4종 | 덴드로그램에서 자르는 높이를 바꾸면 군집이 바뀜 |
| **M6. GMM (EM)** | 1주 | 공분산 타원 렌더링, E단계 소속 확률 색 혼합, M단계 갱신, 로그 가능도 그래프 | 늘어진 덩어리 데이터에서 K-Means보다 잘 맞는 결과가 보임 |
| **M7. Mean-Shift** | 4~5일 | 점 이동 궤적 애니메이션, 대역폭 원 표시, 수렴점 병합 → 군집 결정 | 대역폭을 바꾸면 군집 수가 달라지는 것이 보임 |
| **M8. 다듬기** | 1주 | 반응형 레이아웃, 터치 입력, 큰 글씨 모드, 접근성(키보드·색상), 도움말, README, 성능 점검 | 태블릿·프로젝터에서 정상 동작, Lighthouse 성능 90점 이상 |
| **M9. 확장 (선택)** | — | 엘보우 차트, 비교 모드, CSV 입출력, 다크 모드 | — |

---

## 8. 테스트 및 품질 관리

- **알고리즘 단위 테스트 (Vitest)**
  - 명확히 분리된 3개 덩어리 → K-Means(K=3)가 정확히 3개로 나누는지
  - 같은 시드 → 같은 결과가 나오는지 (재현성)
  - SSE가 반복마다 감소(또는 유지)하는지
  - DBSCAN: 고립된 점이 노이즈(-1)로 분류되는지
  - 계층적 군집: 병합 횟수 = 점 개수 − 1
  - GMM: 로그 가능도가 반복마다 감소하지 않는지, 소속 확률 합이 1인지
  - Mean-Shift: 멀리 떨어진 두 덩어리가 서로 다른 수렴점으로 모이는지
  - 가능하면 scikit-learn 결과와 소규모 데이터로 비교
- **컴포넌트 테스트**: 재생/정지/다음 버튼이 단계 인덱스를 올바르게 바꾸는지
- **CI**: 배포 워크플로에서 테스트가 실패하면 배포하지 않음
- **수동 점검**: Chrome, Edge, Safari(iPad) 에서 확인

---

## 9. 예상 위험 요소와 대응

| 위험 | 영향 | 대응 |
|---|---|---|
| 점이 많을 때 SVG 렌더링이 느려짐 | 애니메이션 끊김 | 점 수 상한(예: 2,000) 설정, 초과 시 Canvas 렌더러로 전환 |
| 계층적 군집은 O(n³)으로 느림 | 브라우저 멈춤 | 계층적 군집은 점 수를 300개 이하로 제한하고 안내 문구 표시. 필요 시 Web Worker로 계산 |
| Mean-Shift는 반복마다 O(n²) 계산 | 점이 많으면 느려짐 | Mean-Shift는 점 수를 500개 이하로 제한, 필요 시 Web Worker로 계산 |
| GMM 공분산 행렬이 특이(singular)해짐 | 계산 오류(NaN) | 대각선에 작은 값(ε)을 더하는 정규화, 성분이 비면 재초기화 |
| 단계 수가 너무 많음 (DBSCAN은 점마다 단계 발생) | 메모리 증가, 재생이 지루함 | "세부 단계 / 요약 단계" 보기 전환, 단계 배열에는 변경분만 저장 |
| GitHub Pages 경로 문제 (흰 화면) | 배포 실패 | `base: '/sim_clu/'` 설정, M0 단계에서 바로 배포 검증 |
| 설명 문구가 어렵게 느껴짐 | 교육 효과 저하 | 실제 학생/교사에게 M3 이후 피드백 받아 수정 |

---

## 10. 확정된 결정 사항

| 항목 | 결정 |
|---|---|
| 사용 언어 | ✅ 한국어 (화면·설명·의사코드 모두 한국어, 다국어 지원 없음) |
| 알고리즘 범위 | ✅ 6종 모두 구현 — K-Means, K-Means++, DBSCAN, 계층적 군집, GMM, Mean-Shift |
| 스타일 방식 | ✅ CSS Modules |
| 대상 기기 | ✅ 데스크톱 + 태블릿 + 수업용 프로젝터 (반응형·터치·큰 글씨 모드) |
| 데이터 차원 | ✅ 2D만 |

---

## 11. 다음 단계

모든 결정 사항이 확정되었으므로 **M0(프로젝트 초기 설정 + 배포 파이프라인)** 부터 진행합니다.
M0이 끝나면 `https://junghwan12.github.io/sim_clu/` 에서 빈 페이지가 보이는 것을 먼저 확인한 뒤,
M1(데이터 생성 & 캔버스)으로 넘어갑니다.
