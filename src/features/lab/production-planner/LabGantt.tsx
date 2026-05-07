import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CalendarRoom, CalendarPlannedEntry } from '@/features/production-planner/types';
import type { Batch } from './planner-mock';
import { useGanttDrag } from './useGanttDrag';
import type { DragImpact } from './useGanttDrag';

const DAY_WIDTH = 8;
const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 36;
const WEEKS_BEFORE = 4;
const WEEKS_AFTER_CURRENT = 16;
const WEEKS_AFTER_PLANNING = 26;

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function shortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

export interface LabGanttProps {
  rooms: CalendarRoom[];
  batches: Batch[];
  plannedByRoom: Record<string, CalendarPlannedEntry[]>;
  viewMode?: 'current' | 'planning';
  hoveredBatchId: string | null;
  selectedBatchId: string | null;
  onBatchHover: (id: string | null) => void;
  onBatchSelect: (id: string | null) => void;
  onRoomClick: (room: CalendarRoom) => void;
  onPlanCycle: (room: CalendarRoom) => void;
  onCycleEdit?: (
    roomId: string,
    cycleId: string,
    patch: { planned_plant_count?: number; flower_start_date?: string }
  ) => void;
  onCycleDelete?: (roomId: string, cycleId: string) => void;
  /** key = batch_id, value = ISO harvest override */
  harvestOverrides?: Record<string, string>;
  flowerDaysByStrain?: (strainId: string) => number;
  onHarvestShift?: (batchId: string, newHarvestISO: string) => void;
  onPlannedShift?: (roomId: string, cycleId: string, newFlowerStartISO: string) => void;
  editMode?: boolean;
}

interface RenderSegment {
  batch: Batch;
  segmentIndex: number;
  roomIndex: number;
  x: number;
  y: number; // top within the row
  w: number;
  h: number;
  stage: string;
  isCurrent: boolean;
  isProjected: boolean;
}

export function LabGantt({
  rooms,
  batches,
  plannedByRoom,
  viewMode = 'current',
  hoveredBatchId,
  selectedBatchId,
  onBatchHover,
  onBatchSelect,
  onRoomClick,
  onPlanCycle,
  onCycleEdit,
  onCycleDelete,
  harvestOverrides = {},
  flowerDaysByStrain,
  onHarvestShift,
  onPlannedShift,
  editMode = true,
}: LabGanttProps) {
  const weeksAfter = viewMode === 'planning' ? WEEKS_AFTER_PLANNING : WEEKS_AFTER_CURRENT;
  const today = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const d = getMonday(today);
    d.setDate(d.getDate() - WEEKS_BEFORE * 7);
    return d;
  }, [today]);
  const totalDays = (WEEKS_BEFORE + weeksAfter) * 7;
  const totalWidth = totalDays * DAY_WIDTH;
  const todayX = daysBetween(startDate, today) * DAY_WIDTH;

  const weeks = useMemo(() => {
    const out: { x: number; label: string; isMonthStart: boolean }[] = [];
    for (let w = 0; w < WEEKS_BEFORE + weeksAfter; w++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + w * 7);
      out.push({ x: w * 7 * DAY_WIDTH, label: shortDate(d), isMonthStart: d.getDate() <= 7 });
    }
    return out;
  }, [startDate, weeksAfter]);

  const roomIndexById = useMemo(() => {
    const m = new Map<string, number>();
    rooms.forEach((r, i) => m.set(r.room_id, i));
    return m;
  }, [rooms]);

  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ planned_plant_count: string; flower_start_date: string }>({ planned_plant_count: '', flower_start_date: '' });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, todayX - scrollRef.current.clientWidth / 3);
    }
  }, [todayX]);

  // Drag-to-reschedule
  const { drag, beginDrag, impact } = useGanttDrag({
    scrollRef,
    dayWidth: DAY_WIDTH,
    editMode,
    onCommit: (target, newDateISO) => {
      if (target.kind === 'harvest') {
        onHarvestShift?.(target.id, newDateISO);
      } else {
        onPlannedShift?.(target.roomId, target.id, newDateISO);
      }
    },
  });

  const highlightedBatch = selectedBatchId ?? hoveredBatchId;

  // Compute every segment's render geometry up front so the connector overlay
  // can read it without re-deriving.
  //
  // Filtering doctrine (per UX cleanup 2026-05-07):
  //   - Clone segments NEVER render as bars. Clone-cut date is implied by
  //     batch_code prefix; the clone phase belongs in the drawer, not the Gantt.
  //   - Current segments always render.
  //   - Historical segments only render when their batch is the highlighted one
  //     (hovered or selected). Otherwise they are hidden, eliminating ambient
  //     lineage noise. The leading-edge "from" tag on the current bar carries
  //     the "where did this come from" signal without history bars in view.
  //   - Projected segments render only in Planning view.
  const renderedSegments = useMemo<RenderSegment[]>(() => {
    const out: RenderSegment[] = [];
    if (!Array.isArray(batches)) return out;
    for (const b of batches) {
      const isHighlighted = highlightedBatch === b.batch_id;
      for (let i = 0; i < b.segments.length; i++) {
        const seg = b.segments[i];

        // Doctrine: clone segments never render as bars
        if (seg.stage === 'clone') continue;

        // Doctrine: history hidden unless the batch is highlighted
        if (!seg.is_current && !seg.is_projected && !isHighlighted) continue;

        // Doctrine: projections hidden in Current view
        if (seg.is_projected && viewMode !== 'planning') continue;

        const roomIdx = roomIndexById.get(seg.room_id);
        if (roomIdx === undefined) continue;
        const startD = new Date(seg.start);
        let endD = new Date(seg.end);
        // Apply harvest override on the flower segment of the matching batch.
        if (seg.stage === 'flower' && harvestOverrides[b.batch_id]) {
          endD = new Date(harvestOverrides[b.batch_id]);
        }
        const x = daysBetween(startDate, startD) * DAY_WIDTH;
        const w = Math.max(8, daysBetween(startD, endD) * DAY_WIDTH);
        out.push({
          batch: b,
          segmentIndex: i,
          roomIndex: roomIdx,
          x,
          y: 0, // filled in pass 2
          w,
          h: 18,
          stage: seg.stage,
          isCurrent: seg.is_current,
          isProjected: seg.is_projected,
        });
      }
    }
    // Pass 2: stack within room. For each room, sort by start, lane-pack.
    const byRoom = new Map<number, RenderSegment[]>();
    out.forEach((s) => {
      const list = byRoom.get(s.roomIndex) ?? [];
      list.push(s);
      byRoom.set(s.roomIndex, list);
    });
    byRoom.forEach((list) => {
      list.sort((a, b) => a.x - b.x);
      const lanes: { endX: number }[] = [];
      list.forEach((seg) => {
        let placed = false;
        for (let li = 0; li < lanes.length; li++) {
          if (seg.x >= lanes[li].endX + 2) {
            seg.y = 6 + li * 22;
            seg.h = 20;
            lanes[li].endX = seg.x + seg.w;
            placed = true;
            break;
          }
        }
        if (!placed) {
          const li = lanes.length;
          seg.y = 6 + li * 22;
          seg.h = 20;
          lanes.push({ endX: seg.x + seg.w });
        }
      });
    });
    return out;
  }, [batches, roomIndexById, startDate, harvestOverrides, highlightedBatch, viewMode]);

  // Batch lookup by id for drag handlers
  const batchById = useMemo(() => {
    const m = new Map<string, Batch>();
    batches.forEach((b) => m.set(b.batch_id, b));
    return m;
  }, [batches]);

  // Connector overlay geometry: for each batch, draw curves between the
  // end of segment[i] (in room i's row) and the start of segment[i+1] (in room
  // i+1's row), provided both rooms are visible.
  const overlayRef = useRef<SVGSVGElement>(null);

  return (
    <div className="gantt-shell">
      <div className="gantt-frame">
        <div className="gantt-left">
          <div className="gantt-left-head" style={{ height: HEADER_HEIGHT }}>
            <span className="cap">Rooms</span>
            <span className="cap dim">{rooms.length}</span>
          </div>
          {rooms.map((room) => (
            <div
              key={room.room_id}
              className="gantt-left-cap"
              style={{ height: ROW_HEIGHT }}
              onClick={() => onRoomClick(room)}
              role="button"
              tabIndex={0}
            >
              <div className="cap-row-1">
                <span className="room-code mono">{room.room_code}</span>
                <span className="room-type cap">{room.room_type}</span>
              </div>
              <div className="cap-row-2">
                <span className="cap-cap">CAPACITY</span>
                <span className="cap-num display">
                  {room.total_plants}
                  <span className="cap-num-mute">
                    {room.capacity_plants ? ` / ${room.capacity_plants}` : ''}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="gantt-scroll" ref={scrollRef}>
          <div className="gantt-canvas" style={{ width: totalWidth, height: HEADER_HEIGHT + rooms.length * ROW_HEIGHT }}>
            {/* Week marker header */}
            <div className="gantt-weeks" style={{ height: HEADER_HEIGHT, width: totalWidth }}>
              {weeks.map((w) => (
                <div
                  key={w.x}
                  className={`gantt-week ${w.isMonthStart ? 'month-start' : ''}`}
                  style={{ left: w.x, width: 7 * DAY_WIDTH }}
                >
                  <span className="gantt-week-label">{w.label}</span>
                </div>
              ))}
            </div>

            {/* Today line + label */}
            <div
              className="gantt-today"
              style={{ left: todayX, top: HEADER_HEIGHT, height: rooms.length * ROW_HEIGHT }}
              aria-hidden
            />
            <div
              className="gantt-today-label"
              style={{ left: todayX + 1, top: 8 }}
              aria-hidden
            >
              Today
            </div>

            {/* Room rows */}
            {rooms.map((room, ri) => {
              const planned = plannedByRoom[room.room_id] ?? [];
              const isMother = room.room_type === 'mother';
              const isEmpty = !isMother && room.strains.length === 0 && planned.length === 0;
              return (
                <div
                  key={room.room_id}
                  className="gantt-row"
                  style={{ top: HEADER_HEIGHT + ri * ROW_HEIGHT, height: ROW_HEIGHT, width: totalWidth }}
                >
                  {weeks.map((w) => (
                    <div key={w.x} className="gantt-row-tick" style={{ left: w.x }} aria-hidden />
                  ))}

                  {/* Mother room: continuous bar across full timeline */}
                  {isMother && room.strains.length > 0 && (
                    <div
                      className="mother-bar"
                      style={{ left: 0, width: totalWidth }}
                      onClick={() => onRoomClick(room)}
                      role="button"
                      tabIndex={0}
                      title={`${room.room_code} · ${room.strains.length} mothers`}
                    >
                      <span className="bar-dot dot-mother" aria-hidden />
                      <div className="mother-strains">
                        {room.strains.slice(0, 6).map((s) => (
                          <span
                            key={s.strain_id}
                            className="mother-strain"
                          >
                            {s.strain_name}
                            <span className="count">×{s.plant_count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty room verb-chip */}
                  {isEmpty && (
                    <button
                      type="button"
                      className="plan-chip"
                      style={{ left: todayX + 8 }}
                      onClick={() => onPlanCycle(room)}
                    >
                      Plan a Cycle →
                    </button>
                  )}

                  {/* Planned cycle bars (existing milestone-4 logic, retained) */}
                  {planned.map((p, pi) => {
                    const isDragging = drag?.target.kind === 'planned' && drag.target.id === p.id;
                    const dragDelta = isDragging && drag ? drag.delta : 0;
                    const flowerDays = flowerDaysByStrain ? flowerDaysByStrain(p.strain_id) : 63;
                    const startBar = p.veg_start_date ? new Date(p.veg_start_date) : new Date(p.flower_start_date);
                    startBar.setDate(startBar.getDate() + dragDelta);
                    const flipDate = new Date(p.flower_start_date);
                    flipDate.setDate(flipDate.getDate() + dragDelta);
                    const endBar = new Date(flipDate);
                    endBar.setDate(endBar.getDate() + flowerDays);
                    const x = daysBetween(startDate, startBar) * DAY_WIDTH;
                    const w = Math.max(8, daysBetween(startBar, endBar) * DAY_WIDTH);
                    const matched = highlightedBatch ? false : true;
                    const dimmed = !!highlightedBatch && !matched;
                    const baseTop = ROW_HEIGHT - 22;
                    const isEditing = editingCycleId === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`cycle-bar planned status-${p.status} ${dimmed ? 'dim' : ''} ${isEditing ? 'editing' : ''} ${isDragging ? 'is-dragging' : ''}`}
                        style={{ left: x, width: w, top: baseTop, height: 18 }}
                        onMouseDown={(e) => {
                          if (isEditing) return;
                          beginDrag(
                            {
                              kind: 'planned',
                              id: p.id,
                              roomId: room.room_id,
                              strainName: p.strain_name,
                              baseDate: p.flower_start_date,
                              flowerDays,
                            },
                            e
                          );
                        }}
                        onClick={(e) => {
                          if (isEditing) return;
                          if (drag) return;
                          e.stopPropagation();
                          setEditingCycleId(p.id);
                          setEditValues({
                            planned_plant_count: String(p.planned_plant_count),
                            flower_start_date: p.flower_start_date,
                          });
                        }}
                        title={`${p.strain_name} · ${p.planned_plant_count} planned · drag to slide flip date`}
                        role="button"
                        tabIndex={0}
                      >
                        <span className="bar-dot dot-planned" aria-hidden />
                        <span className="bar-strain mono">{p.strain_name}</span>
                        <span className="bar-count mono">{p.planned_plant_count}</span>
                      </div>
                    );
                  })}

                  {/* Inline editor for planned bars (kept) */}
                  {planned.map((p) => {
                    if (editingCycleId !== p.id) return null;
                    const start = p.veg_start_date ? new Date(p.veg_start_date) : new Date(p.flower_start_date);
                    const x = daysBetween(startDate, start) * DAY_WIDTH;
                    const baseTop = ROW_HEIGHT - 4;
                    const commit = () => {
                      const count = parseInt(editValues.planned_plant_count, 10);
                      const patch: { planned_plant_count?: number; flower_start_date?: string } = {};
                      if (!Number.isNaN(count) && count !== p.planned_plant_count) patch.planned_plant_count = count;
                      if (editValues.flower_start_date && editValues.flower_start_date !== p.flower_start_date) patch.flower_start_date = editValues.flower_start_date;
                      if (Object.keys(patch).length > 0) {
                        onCycleEdit?.(room.room_id, p.id, patch);
                      }
                      setEditingCycleId(null);
                    };
                    const cancel = () => setEditingCycleId(null);
                    return (
                      <div
                        key={`edit-${p.id}`}
                        className="cycle-editor"
                        style={{ left: Math.max(0, x), top: baseTop }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="cycle-editor-row">
                          <span className="cap">Plants</span>
                          <input
                            className="cycle-editor-input num"
                            type="number"
                            min="1"
                            value={editValues.planned_plant_count}
                            onChange={(e) => setEditValues((v) => ({ ...v, planned_plant_count: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commit();
                              if (e.key === 'Escape') cancel();
                            }}
                            autoFocus
                          />
                        </div>
                        <div className="cycle-editor-row">
                          <span className="cap">Flower start</span>
                          <input
                            className="cycle-editor-input num"
                            type="date"
                            value={editValues.flower_start_date}
                            onChange={(e) => setEditValues((v) => ({ ...v, flower_start_date: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commit();
                              if (e.key === 'Escape') cancel();
                            }}
                          />
                        </div>
                        <div className="cycle-editor-actions">
                          <button className="cycle-editor-btn primary" type="button" onClick={commit}>Commit</button>
                          <button className="cycle-editor-btn" type="button" onClick={cancel}>Cancel</button>
                          <button
                            className="cycle-editor-btn danger"
                            type="button"
                            onClick={() => {
                              onCycleDelete?.(room.room_id, p.id);
                              setEditingCycleId(null);
                            }}
                          >Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Batch segments — rendered over rooms in absolute coords, indexed
                by computed (x, y) within the room's row. */}
            {renderedSegments.map((rs) => {
              const isHighlighted = highlightedBatch === rs.batch.batch_id;
              const dimmed = !!highlightedBatch && !isHighlighted;
              const isDraggingHarvest = drag?.target.kind === 'harvest' && drag.target.id === rs.batch.batch_id;
              // For harvest drag, override width during drag preview
              let displayW = rs.w;
              if (isDraggingHarvest && rs.stage === 'flower' && drag) {
                const baseEnd = new Date(drag.target.baseDate);
                baseEnd.setDate(baseEnd.getDate() + drag.delta);
                const startD = new Date(rs.batch.segments[rs.segmentIndex].start);
                displayW = Math.max(8, daysBetween(startD, baseEnd) * DAY_WIDTH);
              }
              const top = HEADER_HEIGHT + rs.roomIndex * ROW_HEIGHT + rs.y;
              const isOverridden = !!harvestOverrides[rs.batch.batch_id] && rs.stage === 'flower';
              const baseHarvestISO = harvestOverrides[rs.batch.batch_id]
                ?? rs.batch.segments[rs.segmentIndex].end;
              // "From" tag — when current bar has a prior segment in a
              // different room, show a leading-edge marker.
              let fromRoomCode: string | null = null;
              if (rs.isCurrent && rs.segmentIndex > 0) {
                const prior = rs.batch.segments[rs.segmentIndex - 1];
                if (prior && prior.room_id !== rs.batch.segments[rs.segmentIndex].room_id) {
                  // Skip clone room references in the "from" tag — clone is implied
                  if (prior.stage !== 'clone') {
                    const priorRoom = rooms[roomIndexById.get(prior.room_id) ?? -1];
                    if (priorRoom) fromRoomCode = priorRoom.room_code;
                  }
                }
              }
              const plantCount = rs.batch.segments[rs.segmentIndex].plant_count;
              return (
                <div
                  key={`${rs.batch.batch_id}-${rs.segmentIndex}`}
                  className={`batch-seg stage-${rs.stage} ${rs.isCurrent ? 'is-current' : 'is-history'} ${rs.isProjected ? 'is-projected' : ''} ${dimmed ? 'dim' : ''} ${isHighlighted ? 'highlight' : ''} ${isOverridden ? 'overridden' : ''} ${isDraggingHarvest ? 'is-dragging' : ''}`}
                  style={{ left: rs.x, width: displayW, top, height: rs.h }}
                  onMouseEnter={() => onBatchHover(rs.batch.batch_id)}
                  onMouseLeave={() => onBatchHover(null)}
                  onClick={(e) => {
                    if (drag) return;
                    e.stopPropagation();
                    onBatchSelect(rs.batch.batch_id === selectedBatchId ? null : rs.batch.batch_id);
                  }}
                  title={`${rs.batch.batch_code} · ${rs.batch.strain_name} · ${rs.stage} · ${plantCount} plants${fromRoomCode ? ` · from ${fromRoomCode}` : ''}`}
                  data-batch-id={rs.batch.batch_id}
                >
                  {fromRoomCode && (
                    <span className="bar-from-tag mono" aria-label={`from ${fromRoomCode}`}>
                      ←{fromRoomCode}
                    </span>
                  )}
                  <span className={`bar-dot dot-${rs.stage}`} aria-hidden />
                  <span className="bar-strain-name mono">{rs.batch.strain_name}</span>
                  <span className="bar-plant-count mono">{plantCount}</span>
                  {/* Drag handle on flower-stage current segment only */}
                  {rs.stage === 'flower' && rs.isCurrent && (
                    <span
                      className="bar-edge-handle"
                      onMouseDown={(e) =>
                        beginDrag(
                          {
                            kind: 'harvest',
                            id: rs.batch.batch_id,
                            roomId: rs.batch.current_room_id,
                            strainName: rs.batch.batch_code,
                            baseDate: baseHarvestISO,
                          },
                          e
                        )
                      }
                      aria-hidden
                    />
                  )}
                </div>
              );
            })}

            {/* Connector overlay: arrows between consecutive segments of the
                same batch, when both end-of-prev and start-of-next are visible. */}
            <BatchConnectors
              renderedSegments={renderedSegments}
              roomIndexById={roomIndexById}
              highlightedBatchId={highlightedBatch}
              overlayRef={overlayRef}
              totalWidth={totalWidth}
              totalHeight={HEADER_HEIGHT + rooms.length * ROW_HEIGHT}
            />
          </div>
        </div>
      </div>

      {impact && <DragIndicator impact={impact} />}
    </div>
  );
}

function BatchConnectors({
  renderedSegments,
  roomIndexById,
  highlightedBatchId,
  overlayRef,
  totalWidth,
  totalHeight,
}: {
  renderedSegments: RenderSegment[];
  roomIndexById: Map<string, number>;
  highlightedBatchId: string | null;
  overlayRef: React.RefObject<SVGSVGElement>;
  totalWidth: number;
  totalHeight: number;
}) {
  // Group segments by batch_id, sort by segmentIndex
  const byBatch = useMemo(() => {
    const m = new Map<string, RenderSegment[]>();
    for (const rs of renderedSegments) {
      const list = m.get(rs.batch.batch_id) ?? [];
      list.push(rs);
      m.set(rs.batch.batch_id, list);
    }
    m.forEach((list) => list.sort((a, b) => a.segmentIndex - b.segmentIndex));
    return m;
  }, [renderedSegments]);

  return (
    <svg
      ref={overlayRef}
      className="batch-connector-overlay"
      width={totalWidth}
      height={totalHeight}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
      aria-hidden
    >
      {/* Doctrine: connectors are hover/select-driven, not ambient.
          Only render the curves for the batch currently highlighted. */}
      {highlightedBatchId &&
        (() => {
          const list = byBatch.get(highlightedBatchId) ?? [];
          return list.slice(0, -1).map((cur, i) => {
            const nxt = list[i + 1];
            if (cur.roomIndex === nxt.roomIndex) return null;
            const x1 = cur.x + cur.w;
            const rowH = ROW_HEIGHT;
            const headerH = HEADER_HEIGHT;
            const y1 = headerH + cur.roomIndex * rowH + cur.y + cur.h / 2;
            const x2 = nxt.x;
            const y2 = headerH + nxt.roomIndex * rowH + nxt.y + nxt.h / 2;
            const midX = (x1 + x2) / 2;
            const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
            return (
              <g key={`${highlightedBatchId}-${i}`} className="batch-connector highlight">
                <path d={path} className="batch-connector-path" />
                <circle cx={x2} cy={y2} r={3.2} className="batch-connector-dot" />
              </g>
            );
          });
        })()}
    </svg>
  );
}

function DragIndicator({ impact }: { impact: DragImpact }) {
  const x = impact.pointer.x + 18;
  const y = impact.pointer.y - 36;
  return (
    <div className="drag-indicator" style={{ left: x, top: y }} role="status" aria-live="polite">
      <div className="drag-indicator-row">
        <span className="drag-indicator-delta">{impact.deltaText}</span>
        <span className="sep">·</span>
        <span className="drag-indicator-label">{impact.label}</span>
      </div>
      <div className="drag-indicator-date">{impact.newDateLine}</div>
      <div className="drag-indicator-impact">{impact.impactLine}</div>
    </div>
  );
}

export default LabGantt;
