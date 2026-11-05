import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSim } from '../../store/useSim';
import { Controls } from './Controls';

const initial = useSim.getState();

describe('재생 제어', () => {
  beforeEach(() => {
    useSim.setState(initial, true);
  });
  afterEach(cleanup);

  it('다음/이전 버튼으로 단계가 바뀐다', () => {
    render(<Controls />);
    expect(useSim.getState().stepIndex).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: '다음 단계' }));
    fireEvent.click(screen.getByRole('button', { name: '다음 단계' }));
    expect(useSim.getState().stepIndex).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: '이전 단계' }));
    expect(useSim.getState().stepIndex).toBe(1);
    expect(screen.getByText(/2 \/ \d+ 단계/)).toBeTruthy();
  });

  it('재생 버튼은 재생/일시정지를 바꾼다', () => {
    render(<Controls />);
    fireEvent.click(screen.getByRole('button', { name: '재생' }));
    expect(useSim.getState().isPlaying).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '일시정지' }));
    expect(useSim.getState().isPlaying).toBe(false);
  });

  it('처음으로 버튼은 0단계로 돌아간다', () => {
    render(<Controls />);
    act(() => useSim.getState().seek(3));
    fireEvent.click(screen.getByRole('button', { name: '처음으로' }));
    expect(useSim.getState().stepIndex).toBe(0);
  });
});

describe('상태 저장소', () => {
  beforeEach(() => useSim.setState(initial, true));

  it('마지막 단계에서 파라미터를 바꾸면 새 결과의 마지막 단계로 간다', () => {
    const s = useSim.getState();
    s.regenerate({ n: 60 });
    s.setAlgorithm('agglomerative');
    const st = useSim.getState();
    st.seek(st.steps.length - 1);
    st.setParam('k', 4);
    const after = useSim.getState();
    expect(after.stepIndex).toBe(after.steps.length - 1);
    expect(after.steps[after.stepIndex].kind).toBe('cut');
  });

  it('점 개수가 알고리즘 한도를 넘으면 실행하지 않고 안내한다', () => {
    const s = useSim.getState();
    s.regenerate({ n: 400 });
    s.setAlgorithm('agglomerative');
    expect(useSim.getState().steps).toHaveLength(0);
    expect(useSim.getState().blocked).toMatch(/300개/);
  });

  it('직접 지정: 초기화 방식을 고르면 중심 놓기 모드가 켜지고, K개를 놓으면 실행된다', () => {
    const s = useSim.getState();
    s.setParam('init', 'manual');
    expect(useSim.getState().tool).toBe('centroid');
    expect(useSim.getState().steps).toHaveLength(1);
    s.addCentroid({ x: 0.2, y: 0.2 });
    s.addCentroid({ x: 0.5, y: 0.5 });
    expect(useSim.getState().steps[0].kind).toBe('await-manual');
    s.addCentroid({ x: 0.8, y: 0.8 });
    s.addCentroid({ x: 0.9, y: 0.9 }); // K(3)개를 넘으면 무시
    expect(useSim.getState().manualCentroids).toHaveLength(3);
    expect(useSim.getState().steps.length).toBeGreaterThan(2);
    expect(useSim.getState().steps[0].kind).toBe('init');
  });

  it('직접 지정: 중심 옮기기·지우기, K를 줄이면 넘치는 중심은 버린다', () => {
    const s = useSim.getState();
    s.setParam('init', 'manual');
    s.addCentroid({ x: 0.2, y: 0.2 });
    s.addCentroid({ x: 0.5, y: 0.5 });
    s.addCentroid({ x: 0.8, y: 0.8 });
    s.moveCentroid(1, { x: 0.4, y: 0.6 });
    expect(useSim.getState().manualCentroids[1]).toEqual({ x: 0.4, y: 0.6 });
    expect(useSim.getState().steps[0].centroids![1]).toEqual({ x: 0.4, y: 0.6 });
    s.removeCentroid(0);
    expect(useSim.getState().manualCentroids).toHaveLength(2);
    s.setParam('k', 1);
    expect(useSim.getState().manualCentroids).toHaveLength(1);
    s.setParam('init', 'random');
    expect(useSim.getState().tool).toBe('add');
  });

  it('점을 찍으면 다시 계산하고 0단계로 돌아간다', () => {
    const s = useSim.getState();
    s.seek(2);
    const before = s.points.length;
    s.addPoint({ x: 0.5, y: 0.5 });
    expect(useSim.getState().points.length).toBe(before + 1);
    expect(useSim.getState().stepIndex).toBe(0);
  });
});
