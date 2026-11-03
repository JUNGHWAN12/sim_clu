# 군집화 시뮬레이터

데이터 군집화(Clustering) 알고리즘이 군집을 만들어 가는 과정을 **한 단계씩 애니메이션으로** 보여 주는 교육용 웹사이트입니다.

👉 **사이트 주소:** https://junghwan12.github.io/sim_clu/

## 지원 알고리즘

| 알고리즘 | 보여 주는 과정 |
|---|---|
| K-Means | 가까운 중심에 할당 → 중심을 평균으로 이동 반복, SSE 그래프 |
| K-Means++ | 거리²에 비례한 확률로 초기 중심 고르기(점 크기로 표시) → K-Means |
| DBSCAN | ε 반경 원, 핵심점·경계점·노이즈 판정, 군집 확장 |
| 계층적 군집 | 가장 가까운 두 군집 병합 + 덴드로그램, 연결 방식 4종 |
| 가우시안 혼합(GMM) | EM 알고리즘의 E단계(소속 확률 색 혼합)·M단계(타원 갱신) |
| Mean-Shift | 점들이 밀도 높은 곳(모드)으로 이동하는 궤적 |

## 주요 기능

- 데이터 프리셋(덩어리, 늘어진 덩어리, 초승달, 동심원, 균일 분포)과 시드 기반 재현
- 캔버스에 점 찍기 / 뿌리기 / 지우기 (오른쪽 클릭·길게 누르기로도 지우기)
- 재생·일시정지·이전/다음 단계·타임라인·속도 조절 (단축키 `Space`, `←`, `→`, `Home`)
- 단계별 한국어 설명, 의사코드 현재 줄 강조, 지표 그래프, 실루엣 점수
- 태블릿·프로젝터 대응: 반응형 레이아웃, 터치 입력, 큰 글씨 모드, 모양으로 군집 구분

## 개발

```bash
npm install
```

```bash
npm run dev        # 개발 서버 (http://localhost:5173/sim_clu/)
```

```bash
npm test           # 단위·컴포넌트 테스트 (Vitest)
```

```bash
npm run lint       # ESLint
```

```bash
npm run build      # 배포용 빌드 (dist/)
```

### 폴더 구조

```
src/
├─ algorithms/   알고리즘 (React와 무관한 순수 TypeScript 제너레이터)
├─ data/         데이터 생성기, 시드 난수
├─ metrics/      SSE, 실루엣 점수
├─ store/        Zustand 상태 저장소
├─ hooks/        재생 엔진, 키보드 단축키
├─ components/   화면 구성 요소 (CSS Modules)
├─ content/      알고리즘 설명 문구 (한국어)
└─ styles/       전역 스타일, 색상 변수, 군집 색 팔레트
```

### 새 알고리즘 추가하기

1. `src/algorithms/`에 `(points, params, rng) => Generator<Step>` 형태의 제너레이터를 작성합니다. 한 단계가 끝날 때마다 `yield`로 상태 스냅샷을 내보냅니다.
2. `src/content/algorithms.ts`에 설명·의사코드를 추가합니다.
3. `src/algorithms/registry.ts`에 파라미터 정의와 함께 등록하면 화면에 자동으로 나타납니다.

## 배포

`main` 브랜치에 push하면 GitHub Actions(`.github/workflows/deploy.yml`)가 린트·테스트·빌드 후 GitHub Pages에 배포합니다.

처음 한 번은 저장소의 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 바꿔야 합니다.
