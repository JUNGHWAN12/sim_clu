import { useEffect, useRef } from 'react';
import { useSim } from '../../store/useSim';
import styles from './HelpDialog.module.css';

export function HelpDialog() {
  const open = useSim((s) => s.helpOpen);
  const setHelpOpen = useSim((s) => s.setHelpOpen);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);
  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={() => setHelpOpen(false)}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="help-title">사용 방법</h2>
        <ol>
          <li>
            <b>데이터 고르기</b> — 왼쪽에서 데이터 모양을 고르거나, 캔버스를 눌러 점을 직접
            찍습니다.
          </li>
          <li>
            <b>알고리즘 고르기</b> — K-Means, DBSCAN 등 6가지 중 하나를 고르고 파라미터를
            조절합니다.
          </li>
          <li>
            <b>재생하기</b> — 아래의 ▶ 버튼을 누르면 알고리즘이 한 단계씩 진행됩니다. 오른쪽에서
            지금 무슨 일이 일어나는지 설명과 의사코드를 확인하세요.
          </li>
        </ol>
        <h3>단축키</h3>
        <table className={styles.keys}>
          <tbody>
            <tr>
              <td>
                <kbd>Space</kbd>
              </td>
              <td>재생 / 일시정지</td>
            </tr>
            <tr>
              <td>
                <kbd>←</kbd> <kbd>→</kbd>
              </td>
              <td>이전 / 다음 단계</td>
            </tr>
            <tr>
              <td>
                <kbd>Home</kbd>
              </td>
              <td>처음으로</td>
            </tr>
            <tr>
              <td>오른쪽 클릭 / 길게 누르기</td>
              <td>점 지우기</td>
            </tr>
          </tbody>
        </table>
        <h3>해 볼 만한 실험</h3>
        <ul>
          <li>‘초승달’ 데이터에 K-Means와 DBSCAN을 각각 실행해 비교해 보세요.</li>
          <li>
            K-Means에서 ‘초기값 바꿔서 다시 실행’을 여러 번 눌러 결과가 어떻게 달라지는지 보세요.
          </li>
          <li>
            K-Means의 초기화 방식을 ‘직접 지정’으로 바꾸고 캔버스에 중심을 놓아 보세요. 중심 두 개를
            한 덩어리 안에 몰아 두면 어떤 결과가 나올까요? (중심은 끌어서 옮기고, 눌러서 지울 수
            있습니다)
          </li>
          <li>
            계층적 군집이 끝난 뒤 ‘자를 군집 수 K’를 바꾸면 덴드로그램의 자르는 선이 움직입니다.
          </li>
          <li>‘늘어진 덩어리’ 데이터에서 K-Means와 GMM의 결과를 비교해 보세요.</li>
          <li>Mean-Shift의 반경 h를 키우거나 줄이면 군집 수가 어떻게 변하나요?</li>
        </ul>
        <button
          ref={closeRef}
          type="button"
          className={styles.close}
          onClick={() => setHelpOpen(false)}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
