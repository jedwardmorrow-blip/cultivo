import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Drag-to-reschedule for the Bureau Gantt body.
 *
 * Adapted from production-planner-v1.1.html (lines 3393-3597), simplified
 * for React + the Bureau dialect. Two drag kinds:
 *
 *   'harvest'  — grab the right edge of an active strain bar; the
 *                estimated harvest date shifts. Cascades downstream:
 *                dry-end (+10d), trim+cure+test (+33d), AFS-ready
 *                (= harvest + 43d), and the next flip (= harvest + 3d).
 *   'planned'  — grab the whole planned-cycle bar; the flower start
 *                date shifts (and the bar slides bodily). Harvest auto-
 *                derives from strain.flowering_time_days.
 *
 * Read-mode (default) drags are hover-preview only and snap back.
 * Edit-mode commits via the onCommit callback.
 */

export const CYCLE_DAYS = {
  dry: 10,
  trim: 5,
  cure: 14,
  test: 14,
  turnover: 3,
};

export type DragKind = 'harvest' | 'planned';

export interface DragTarget {
  kind: DragKind;
  /** Stable identifier (cycle id for planned, strain_id+room_id for harvest) */
  id: string;
  roomId: string;
  strainName: string;
  /** Original date being shifted (harvest for kind=harvest, flower-start for kind=planned) */
  baseDate: string;
  /** Strain-specific flowering days, used to derive harvest from flower-start */
  flowerDays?: number;
}

export interface DragState {
  target: DragTarget;
  startX: number;
  daysPerPx: number;
  /** Current shift in days (positive = later). */
  delta: number;
  /** Pixel coords for indicator placement */
  pointerX: number;
  pointerY: number;
}

export interface UseGanttDragArgs {
  /** Ref to the scrollable Gantt canvas (for daysPerPx calculation). */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Day width in pixels (matches the visible Gantt density). */
  dayWidth: number;
  /** Read-mode preview only by default; pass true to commit on drop. */
  editMode?: boolean;
  /** Called on successful drop (commit) with the resolved new date. */
  onCommit: (target: DragTarget, newDateISO: string) => void;
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export interface DragImpact {
  delta: number;
  deltaText: string;
  kind: DragKind;
  label: string;
  newDateLine: string;
  impactLine: string;
  pointer: { x: number; y: number };
}

export function useGanttDrag({ dayWidth, editMode = false, onCommit }: UseGanttDragArgs) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  const beginDrag = useCallback(
    (target: DragTarget, e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const next: DragState = {
        target,
        startX: e.clientX,
        daysPerPx: 1 / dayWidth,
        delta: 0,
        pointerX: e.clientX,
        pointerY: e.clientY,
      };
      setDrag(next);
      dragRef.current = next;
    },
    [dayWidth]
  );

  // Window-level mouse handling so the drag continues even when the
  // pointer leaves the bar.
  useEffect(() => {
    if (!drag) return;
    function onMove(e: MouseEvent) {
      const cur = dragRef.current;
      if (!cur) return;
      const dx = e.clientX - cur.startX;
      const days = Math.round(dx * cur.daysPerPx);
      const clamped = Math.max(-30, Math.min(120, days));
      const next: DragState = {
        ...cur,
        delta: clamped,
        pointerX: e.clientX,
        pointerY: e.clientY,
      };
      dragRef.current = next;
      setDrag(next);
    }
    function onUp() {
      const cur = dragRef.current;
      if (!cur) return;
      if (cur.delta !== 0 && editMode) {
        const newDate = addDaysISO(cur.target.baseDate, cur.delta);
        onCommit(cur.target, newDate);
      }
      // Always clear drag state on mouseup (snap back happens visually because
      // overrides are not stored in read-mode).
      dragRef.current = null;
      setDrag(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        dragRef.current = null;
        setDrag(null);
      }
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [drag, editMode, onCommit]);

  // Pre-computed impact for the floating indicator
  const impact: DragImpact | null = drag ? buildImpact(drag) : null;

  return { drag, beginDrag, impact };
}

function buildImpact(d: DragState): DragImpact {
  const dt = d.delta;
  const deltaText = dt === 0 ? '±0d' : `${dt > 0 ? '+' : ''}${dt}d`;

  if (d.target.kind === 'harvest') {
    const newHarvest = addDaysISO(d.target.baseDate, dt);
    const newDryEnd = addDaysISO(newHarvest, CYCLE_DAYS.dry);
    const newAfs = addDaysISO(newDryEnd, CYCLE_DAYS.trim + CYCLE_DAYS.cure + CYCLE_DAYS.test);
    const newNextFlip = addDaysISO(newHarvest, CYCLE_DAYS.turnover);
    return {
      delta: dt,
      deltaText,
      kind: 'harvest',
      label: `${d.target.strainName} · harvest`,
      newDateLine: `Harvest ${fmtDate(newHarvest)}`,
      impactLine: `Dry ends ${fmtDate(newDryEnd)} · AFS ${fmtDate(newAfs)} · flip ${fmtDate(newNextFlip)}`,
      pointer: { x: d.pointerX, y: d.pointerY },
    };
  }
  // planned
  const flowerDays = d.target.flowerDays ?? 63;
  const newFlip = addDaysISO(d.target.baseDate, dt);
  const newHarvest = addDaysISO(newFlip, flowerDays);
  const newDryEnd = addDaysISO(newHarvest, CYCLE_DAYS.dry);
  const newAfs = addDaysISO(newDryEnd, CYCLE_DAYS.trim + CYCLE_DAYS.cure + CYCLE_DAYS.test);
  return {
    delta: dt,
    deltaText,
    kind: 'planned',
    label: `${d.target.strainName} · flip`,
    newDateLine: `Flip ${fmtDate(newFlip)} → harvest ${fmtDate(newHarvest)}`,
    impactLine: `Dry ends ${fmtDate(newDryEnd)} · AFS ${fmtDate(newAfs)}`,
    pointer: { x: d.pointerX, y: d.pointerY },
  };
}

export function getPreviewedDateISO(d: DragState): string {
  return addDaysISO(d.target.baseDate, d.delta);
}
