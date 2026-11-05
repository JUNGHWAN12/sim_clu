import { useMemo, useRef, useState } from 'react';
import type { Overlay, Point, Step } from '../../algorithms/types';
import { ROLE } from '../../algorithms/types';
import { BASE_INTERVAL, CENTROID_HIT_RADIUS, useSim } from '../../store/useSim';
import { clusterColor, mixColor, symbolPath, UNASSIGNED } from '../../styles/palette';
import styles from './ScatterPlot.module.css';

const S = 1000; // SVG 좌표계 크기 (데이터 0~1 → 0~1000)
const LONG_PRESS_MS = 500;
const ERASE_RADIUS = 0.025;

function OverlayShape({ o }: { o: Overlay }) {
  switch (o.type) {
    case 'circle':
      return (
        <circle
          className={styles[`overlay_${o.tone}`]}
          cx={o.x * S}
          cy={o.y * S}
          r={o.r * S}
          style={o.cluster !== undefined ? { stroke: clusterColor(o.cluster) } : undefined}
        />
      );
    case 'line':
      return (
        <line
          className={styles[`line_${o.tone}`]}
          x1={o.x1 * S}
          y1={o.y1 * S}
          x2={o.x2 * S}
          y2={o.y2 * S}
          style={o.cluster !== undefined ? { stroke: clusterColor(o.cluster) } : undefined}
        />
      );
    case 'ellipse':
      return (
        <ellipse
          className={styles.ellipse}
          cx={0}
          cy={0}
          rx={o.rx * S}
          ry={o.ry * S}
          style={{
            stroke: clusterColor(o.cluster),
            fill: clusterColor(o.cluster),
            transform: `translate(${o.x * S}px, ${o.y * S}px) rotate(${o.angle}deg)`,
          }}
        />
      );
  }
}

function Centroid({ p, label }: { p: Point; label: number }) {
  const c = clusterColor(label);
  return (
    <g className={styles.centroid} style={{ transform: `translate(${p.x * S}px, ${p.y * S}px)` }}>
      <circle r={20} className={styles.centroidHalo} />
      <path d="M-13,-13L13,13M13,-13L-13,13" className={styles.centroidCrossBg} />
      <path
        d="M-13,-13L13,13M13,-13L-13,13"
        className={styles.centroidCross}
        style={{ stroke: c }}
      />
    </g>
  );
}

/** 직접 놓은 중심점 표시 (번호가 붙은 점선 원). 끌어서 옮길 수 있다 */
function CentroidPin({
  p,
  index,
  editable,
  dragging,
}: {
  p: Point;
  index: number;
  editable: boolean;
  dragging: boolean;
}) {
  const c = clusterColor(index);
  return (
    <g
      className={`${styles.pin} ${editable ? styles.pinEditable : ''} ${dragging ? styles.pinDragging : ''}`}
      transform={`translate(${p.x * S}, ${p.y * S})`}
    >
      <circle r={26} className={styles.pinRing} style={{ stroke: c }} />
      <circle r={13} className={styles.pinBadge} style={{ fill: c }} cx={22} cy={-22} />
      <text x={22} y={-22} className={styles.pinText}>
        {index + 1}
      </text>
    </g>
  );
}

interface PointsLayerProps {
  points: Point[];
  step: Step | undefined;
  radius: number;
  shapes: boolean;
}

function PointsLayer({ points, step, radius, shapes }: PointsLayerProps) {
  const highlight = useMemo(() => new Set(step?.highlight ?? []), [step]);
  const maxW = useMemo(() => (step?.weights ? Math.max(...step.weights) || 1 : 1), [step]);
  const moving = step?.positions;

  return (
    <g>
      {points.map((p, i) => {
        const label = step && i < step.labels.length ? step.labels[i] : -1;
        const role = step?.roles?.[i];
        const soft = step?.soft?.[i];
        let fill = soft ? mixColor(soft) : clusterColor(label);
        let r = radius;
        let cls = styles.point;
        if (role === ROLE.NOISE) {
          cls = styles.noise;
          fill = UNASSIGNED;
          r = radius * 0.8;
        } else if (role === ROLE.BORDER) {
          r = radius * 0.75;
        }
        if (step?.weights) r = radius * (0.45 + 1.8 * Math.sqrt(step.weights[i] / maxW));
        const pos = moving ? moving[i] : p;
        const isHi = highlight.has(i);
        const shape = shapes ? symbolPath(label, r) : null;
        return (
          <g
            key={i}
            className={moving ? styles.movingPoint : undefined}
            style={{ transform: `translate(${pos.x * S}px, ${pos.y * S}px)` }}
          >
            {shape ? (
              <path d={shape} className={cls} style={{ fill }} />
            ) : (
              <circle
                r={r}
                className={cls}
                style={role === ROLE.NOISE ? { stroke: fill } : { fill }}
              />
            )}
            {isHi && <circle r={r + 6} className={styles.highlight} />}
          </g>
        );
      })}
    </g>
  );
}

export function ScatterPlot() {
  const points = useSim((s) => s.points);
  const step = useSim((s) => s.steps[s.stepIndex]);
  const speed = useSim((s) => s.speed);
  const tool = useSim((s) => s.tool);
  const largeText = useSim((s) => s.largeText);
  const shapes = useSim((s) => s.shapes);
  const addPoint = useSim((s) => s.addPoint);
  const removeNear = useSim((s) => s.removeNear);
  const manualCentroids = useSim((s) => s.manualCentroids);
  const manualMode = useSim((s) => s.algorithmId === 'kmeans' && s.params.kmeans.init === 'manual');
  const { addCentroid, moveCentroid, removeCentroid } = useSim.getState();
  const placing = manualMode && tool === 'centroid';

  const svgRef = useRef<SVGSVGElement>(null);
  const press = useRef<{ timer: number; fired: boolean } | null>(null);
  /** 중심점 끌기 상태 (놓을 때까지는 화면에만 반영) */
  const [drag, setDrag] = useState<{
    index: number;
    start: Point;
    p: Point;
    moved: boolean;
  } | null>(null);
  const pendingAdd = useRef(false);

  const nearestCentroid = (p: Point): number => {
    let best = -1;
    let bestD = CENTROID_HIT_RADIUS * CENTROID_HIT_RADIUS;
    manualCentroids.forEach((c, i) => {
      const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
      if (d <= bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };

  const toData = (e: React.PointerEvent | React.MouseEvent): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    const ox = rect.left + (rect.width - size) / 2;
    const oy = rect.top + (rect.height - size) / 2;
    const x = (e.clientX - ox) / size;
    const y = (e.clientY - oy) / size;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x, y };
  };

  const toDataClamped = (e: React.PointerEvent): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    const ox = rect.left + (rect.width - size) / 2;
    const oy = rect.top + (rect.height - size) / 2;
    const clamp = (v: number) => Math.min(0.995, Math.max(0.005, v));
    return { x: clamp((e.clientX - ox) / size), y: clamp((e.clientY - oy) / size) };
  };

  // --- 중심점 직접 놓기 모드 ---
  const onCentroidDown = (e: React.PointerEvent, p: Point) => {
    const hit = nearestCentroid(p);
    if (hit >= 0) {
      svgRef.current?.setPointerCapture?.(e.pointerId);
      setDrag({ index: hit, start: manualCentroids[hit], p: manualCentroids[hit], moved: false });
    } else {
      pendingAdd.current = true;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toDataClamped(e);
    if (!p) return;
    const moved = drag.moved || Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 0.01;
    setDrag({ ...drag, p, moved });
  };

  const onCentroidUp = (e: React.PointerEvent) => {
    if (drag) {
      // 끌었으면 옮기고, 제자리에서 눌렀다 떼면 지우기
      if (drag.moved) moveCentroid(drag.index, drag.p);
      else removeCentroid(drag.index);
      setDrag(null);
      return;
    }
    if (pendingAdd.current) {
      pendingAdd.current = false;
      const p = toData(e);
      if (p) addCentroid(p);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = toData(e);
    if (!p) return;
    if (placing) {
      onCentroidDown(e, p);
      return;
    }
    // 길게 누르면 지우기 (터치 기기용)
    const state = { timer: 0, fired: false };
    state.timer = window.setTimeout(() => {
      state.fired = true;
      removeNear(p, ERASE_RADIUS);
    }, LONG_PRESS_MS);
    press.current = state;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (placing) {
      onCentroidUp(e);
      return;
    }
    const state = press.current;
    press.current = null;
    if (!state) return;
    window.clearTimeout(state.timer);
    if (state.fired) return;
    const p = toData(e);
    if (!p) return;
    if (tool === 'erase') removeNear(p, ERASE_RADIUS);
    else addPoint(p);
  };

  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
    pendingAdd.current = false;
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const p = toData(e);
    if (!p) return;
    if (placing) {
      const hit = nearestCentroid(p);
      if (hit >= 0) removeCentroid(hit);
      return;
    }
    removeNear(p, ERASE_RADIUS);
  };

  const anim = Math.min(450, (BASE_INTERVAL / speed) * 0.7);
  const radius = largeText ? 10 : 7;
  const ellipses = step?.overlays?.filter((o) => o.type === 'ellipse') ?? [];
  const otherOverlays = step?.overlays?.filter((o) => o.type !== 'ellipse') ?? [];

  return (
    <div className={styles.wrap}>
      <svg
        ref={svgRef}
        className={`${styles.svg} ${styles[`tool_${placing ? 'centroid' : tool === 'centroid' ? 'add' : tool}`]}`}
        viewBox={`0 0 ${S} ${S}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ ['--anim' as string]: `${anim}ms` }}
        role="img"
        aria-label={`산점도: 점 ${points.length}개. ${step?.message ?? ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={cancelPress}
        onPointerCancel={() => {
          cancelPress();
          setDrag(null);
        }}
        onContextMenu={onContextMenu}
      >
        <rect className={styles.bg} x={0} y={0} width={S} height={S} rx={8} />
        <g className={styles.grid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <g key={i}>
              <line x1={i * 100} y1={0} x2={i * 100} y2={S} />
              <line x1={0} y1={i * 100} x2={S} y2={i * 100} />
            </g>
          ))}
        </g>

        {ellipses.map((o, i) => (
          <OverlayShape key={`e${i}`} o={o} />
        ))}

        {step?.positions && (
          <g className={styles.trails}>
            {points.map((p, i) => (
              <line
                key={i}
                x1={p.x * S}
                y1={p.y * S}
                x2={step.positions![i].x * S}
                y2={step.positions![i].y * S}
              />
            ))}
            {points.map((p, i) => (
              <circle
                key={`o${i}`}
                cx={p.x * S}
                cy={p.y * S}
                r={radius * 0.5}
                className={styles.origin}
              />
            ))}
          </g>
        )}

        <PointsLayer points={points} step={step} radius={radius} shapes={shapes} />

        {otherOverlays.map((o, i) => (
          <OverlayShape key={`o${i}`} o={o} />
        ))}

        {step?.centroids?.map((c, i) => (
          <Centroid
            key={i}
            // 시작 단계에서 중심을 끄는 중이면 ✕도 함께 움직임
            p={
              drag?.index === i && (step.kind === 'init' || step.kind === 'await-manual')
                ? drag.p
                : c
            }
            label={i}
          />
        ))}

        {manualMode &&
          manualCentroids.map((c, i) => (
            <CentroidPin
              key={`pin${i}`}
              p={drag?.index === i ? drag.p : c}
              index={i}
              editable={placing}
              dragging={drag?.index === i}
            />
          ))}

        {points.length === 0 && !placing && (
          <text x={S / 2} y={S / 2} className={styles.emptyText}>
            여기를 눌러 점을 찍어 보세요
          </text>
        )}
      </svg>
    </div>
  );
}
