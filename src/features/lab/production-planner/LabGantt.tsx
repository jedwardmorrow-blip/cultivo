import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CalendarRoom, CalendarPlannedEntry } from '@/features/production-planner/types';
import type { Batch, LifecycleStage } from './planner-mock';
import { STAGE_SHORT, STAGE_LONG } from './planner-mock';
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
  /** Optional: open the plan-cycle form sourced from a mother room.
   *  Caller is responsible for picking the destination flower room. */
  onCutClones?: (motherRoom: CalendarRoom) => void;
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
  /**
   * Cohort grouping (per Justin's clone-cut date confirmation 2026-05-07):
   * batches in the same room sharing the YYMMDD prefix of batch_code are
   * one operator-real cohort. When a cohort has 2+ batches, the Gantt
   * collapses them into a single cohort tile to honor the operator's
   * unit-of-work (a single harvest event), reduce wall-of-bars noise, and
   * surface the cohort's plant total + strain count as the primary signal.
   * The drawer's FIG. 02 room pane still lists every batch, so individual
   * drilldown is preserved.
   */
  cohortBatches?: Batch[];
  cohortKey?: string;
  cohortTotalPlants?: number;
  cohortSynthetic?: boolean;
  cohortQuarantined?: boolean;
}

function getCohortKey(batch: Batch): string {
  // YYMMDD prefix per batch_code_prefix_semantic doctrine.
  // batch_code format: "YYMMDD-STRAIN" where YYMMDD is the clone-cut date.
  const m = batch.batch_code.match(/^(\d{6})/);
  return m ? m[1] : batch.batch_id;
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
  onCutClones,
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

  /**
   * Per-room flower gap bands. For each flower room, gather all flower
   * segments (regardless of current/historical/projected status — the
   * gap exists in time even if the segment isn't rendering as a bar
   * today), sort by start, and produce a band per consecutive pair.
   * Positive gap → idle band (gold hairline). Negative gap → overlap
   * band (red, indicates scheduling collision per file 2's "Gap"
   * column convention).
   */
  type GapBand = {
    roomIndex: number;
    x: number;
    w: number;
    days: number;
    isOverlap: boolean;
  };
  const gapBands = useMemo<GapBand[]>(() => {
    const out: GapBand[] = [];
    const windowEnd = new Date(startDate);
    windowEnd.setDate(windowEnd.getDate() + totalDays);
    rooms.forEach((room, ri) => {
      if (room.room_type !== 'flower') return;
      // Dedupe per batch group: one entry per (room, YYMMDD prefix) so
      // strains within the same group don't pairwise-overlap with each
      // other. Same-room same-prefix strains share start+end by design.
      const byCohort = new Map<string, { start: Date; end: Date }>();
      for (const b of batches) {
        const seg = b.segments.find((s) => s.stage === 'flower' && s.room_id === room.room_id);
        if (!seg) continue;
        const start = new Date(seg.start);
        const end = new Date(seg.end);
        if (end < startDate || start > windowEnd) continue;
        const m = b.batch_code.match(/^(\d{6})/);
        const key = m ? m[1] : b.batch_id;
        const prior = byCohort.get(key);
        if (!prior) {
          byCohort.set(key, { start, end });
        } else {
          // Should match within a group, but be defensive: take min start, max end.
          if (start < prior.start) prior.start = start;
          if (end > prior.end) prior.end = end;
        }
      }
      const segs = Array.from(byCohort.values()).sort(
        (a, b) => a.start.getTime() - b.start.getTime()
      );
      for (let i = 1; i < segs.length; i++) {
        const prev = segs[i - 1];
        const curr = segs[i];
        const gapDays = Math.round((curr.start.getTime() - prev.end.getTime()) / 86400000);
        if (gapDays === 0) continue;
        if (gapDays > 0) {
          // Positive idle gap.
          const x = daysBetween(startDate, prev.end) * DAY_WIDTH;
          const w = gapDays * DAY_WIDTH;
          out.push({ roomIndex: ri, x, w, days: gapDays, isOverlap: false });
        } else {
          // Negative gap = overlap. Render the band over the overlap window.
          const x = daysBetween(startDate, curr.start) * DAY_WIDTH;
          const w = Math.max(8, -gapDays * DAY_WIDTH);
          out.push({ roomIndex: ri, x, w, days: gapDays, isOverlap: true });
        }
      }
    });
    return out;
  }, [batches, rooms, startDate, totalDays]);

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
    const todayISO = new Date().toISOString().slice(0, 10);
    for (const b of batches) {
      const isHighlighted = highlightedBatch === b.batch_id;
      // Batch is "in flight" when its earliest segment (clone) has
      // actually been cut, i.e., its first segment's start is in the
      // past. Future-committed cycles whose clone cut hasn't happened
      // yet do not qualify; their projections remain hidden in CURRENT
      // view to avoid double-counting paper commitments as imminent
      // reality. Batches mid-stage with a future-starting current
      // segment (e.g., a harvest seg starting in 3 days) still count
      // as in flight because the prior phases already happened.
      const earliestSeg = b.segments[0];
      const isInFlight = !!earliestSeg && earliestSeg.start <= todayISO;
      for (let i = 0; i < b.segments.length; i++) {
        const seg = b.segments[i];

        // Doctrine: clone segments rendered as bars when they live in a
        // dedicated propagation room. Clone segments routed to a mother
        // room are absorbed into the genetics-library summary bar and
        // skip individual rendering, since the cuts have not separated
        // from the mother bank yet.
        if (seg.stage === 'clone') {
          const cloneRoom = roomIndexById.get(seg.room_id);
          if (cloneRoom === undefined) continue;
          const room = rooms[cloneRoom];
          if (room?.room_type === 'mother') continue;
        }

        // Doctrine: history hidden unless the batch is highlighted
        if (!seg.is_current && !seg.is_projected && !isHighlighted) continue;

        // Doctrine: projections hidden in CURRENT view, EXCEPT for
        // flower segments belonging to in-flight batches that have
        // not yet landed in their destination room. These render as
        // faint dashed "incoming" bars so the operator sees which
        // upstream batch is destined for which flower room without
        // flipping to PLANNING view. Post-harvest projections (drying,
        // trim, cure, test, pack) intentionally do NOT render here —
        // including them quadruples the bar count and the SEED row
        // already surfaces stuck cohorts. Operator can switch to
        // PLANNING view or highlight a specific batch for the full
        // downstream pipeline.
        const isIncomingFlowerProjection =
          seg.is_projected
          && seg.stage === 'flower'
          && isInFlight
          && viewMode !== 'planning';
        if (seg.is_projected && viewMode !== 'planning' && !isIncomingFlowerProjection && !isHighlighted) continue;

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
    // Cohort pass (1.5): group segments by (roomIndex, cohortKey) for the
    // current stage. Groups of 2+ collapse to a single cohort tile.
    // Historical and projected segments are left as individual bars since
    // the cohort visual only makes sense for the live operational unit.
    // Mother room segments are excluded from cohort grouping — mothers
    // are an independent genetics library, not a harvest cohort, and
    // synthetic-burst back-fill dates would otherwise collapse the
    // entire library into one misleading tile.
    const cohortGroups = new Map<string, RenderSegment[]>();
    const passThrough: RenderSegment[] = [];
    for (const seg of out) {
      const isMotherRoom = rooms[seg.roomIndex]?.room_type === 'mother';
      // Eligibility for batch-group grouping:
      //   - Mother room: never group (genetics library, not batches).
      //   - Flower stage: always group when ≥2 batches share (room, YYMMDD).
      //     This covers active flower batch groups, projected flower
      //     segments of upstream veg/clone batches, and committed planning
      //     groups in one rule.
      //   - Clone or veg stage: group only the current operational unit
      //     (is_current && !is_projected). Other clone/veg segments pass
      //     through as individual bars.
      if (isMotherRoom) {
        passThrough.push(seg);
        continue;
      }
      const isLiveNonFlower = seg.isCurrent && !seg.isProjected && seg.stage !== 'flower';
      const isFlower = seg.stage === 'flower';
      if (!isLiveNonFlower && !isFlower) {
        passThrough.push(seg);
        continue;
      }
      const key = `${seg.roomIndex}:${getCohortKey(seg.batch)}:${seg.stage}`;
      const list = cohortGroups.get(key) ?? [];
      list.push(seg);
      cohortGroups.set(key, list);
    }

    const collapsed: RenderSegment[] = [...passThrough];
    for (const [key, group] of cohortGroups) {
      if (group.length === 1) {
        collapsed.push(group[0]);
        continue;
      }
      // Build composite cohort tile from group
      const minX = Math.min(...group.map(g => g.x));
      const maxEndX = Math.max(...group.map(g => g.x + g.w));
      const totalPlants = group.reduce(
        (sum, g) => sum + g.batch.segments[g.segmentIndex].plant_count,
        0
      );
      const anySynthetic = group.some(g => g.batch.segments[g.segmentIndex].is_synthetic);
      const anyQuarantined = group.some(g => g.batch.is_quarantined);
      const primary = group.reduce(
        (a, b) => a.batch.segments[a.segmentIndex].plant_count >= b.batch.segments[b.segmentIndex].plant_count ? a : b
      );
      collapsed.push({
        ...primary,
        x: minX,
        w: Math.max(8, maxEndX - minX),
        cohortBatches: group.map(g => g.batch),
        cohortKey: key,
        cohortTotalPlants: totalPlants,
        cohortSynthetic: anySynthetic,
        cohortQuarantined: anyQuarantined,
      });
    }

    // Pass 2: stack within room. For each room, sort by start, lane-pack.
    const byRoom = new Map<number, RenderSegment[]>();
    collapsed.forEach((s) => {
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
    return collapsed;
  }, [batches, rooms, roomIndexById, startDate, harvestOverrides, highlightedBatch, viewMode]);

  // Batch lookup by id for drag handlers
  const batchById = useMemo(() => {
    const m = new Map<string, Batch>();
    batches.forEach((b) => m.set(b.batch_id, b));
    return m;
  }, [batches]);

  // Cascade preview during drag. When the operator is shifting a
  // harvest edge or a planned-cycle bar, project the downstream
  // segments at their shifted positions and render them as ghost
  // bars. Mark conflicts where the shift puts a segment into a room
  // that another batch already occupies in the same window.
  type CascadeGhost = {
    stage: string;
    roomIndex: number;
    x: number;
    w: number;
    conflict: boolean;
    deltaText: string;
  };
  const cascadePreview = useMemo<CascadeGhost[]>(() => {
    if (!drag || drag.delta === 0) return [];
    const out: CascadeGhost[] = [];
    const deltaText = `${drag.delta > 0 ? '+' : ''}${drag.delta}d`;

    const overlapsAnyOther = (selfBatchId: string, roomId: string, start: Date, end: Date) => {
      return batches.some((other) => {
        if (other.batch_id === selfBatchId) return false;
        return other.segments.some((seg) => {
          if (seg.room_id !== roomId) return false;
          return new Date(seg.start) < end && new Date(seg.end) > start;
        });
      });
    };

    if (drag.target.kind === 'harvest') {
      const batch = batchById.get(drag.target.id);
      if (!batch) return out;
      // Shift harvest, drying, trim, cure, test, pack. Skip clone, veg,
      // flower because flower's shift is already shown by the
      // displayW override on the live bar.
      for (const seg of batch.segments) {
        if (['clone', 'veg', 'flower'].includes(seg.stage)) continue;
        const newStart = new Date(seg.start);
        newStart.setDate(newStart.getDate() + drag.delta);
        const newEnd = new Date(seg.end);
        newEnd.setDate(newEnd.getDate() + drag.delta);
        const ri = roomIndexById.get(seg.room_id);
        if (ri === undefined) continue;
        const x = daysBetween(startDate, newStart) * DAY_WIDTH;
        const w = Math.max(8, daysBetween(newStart, newEnd) * DAY_WIDTH);
        const conflict = overlapsAnyOther(batch.batch_id, seg.room_id, newStart, newEnd);
        out.push({ stage: seg.stage, roomIndex: ri, x, w, conflict, deltaText });
      }
    } else if (drag.target.kind === 'planned') {
      // Synthesize the cascade for a sliding planned cycle. Fixture
      // post-harvest day counts mirror the Sostanza Master Production
      // Schedule: harvest 1d, cleaning 4d, trim 10d (overlaps drying),
      // cure 5d, test 14d, pack 1d.
      const cycle = Object.values(plannedByRoom).flat().find((p) => p.id === drag.target.id);
      if (!cycle) return out;
      const baseFlowerStart = new Date(cycle.flower_start_date);
      const newFlowerStart = new Date(baseFlowerStart);
      newFlowerStart.setDate(newFlowerStart.getDate() + drag.delta);
      const flowerDays = flowerDaysByStrain?.(cycle.strain_id) ?? 63;
      const newHarvestStart = new Date(newFlowerStart);
      newHarvestStart.setDate(newHarvestStart.getDate() + flowerDays);
      const stages: Array<{ stage: string; roomCode: string; days: number; offsetFromHarvest: number }> = [
        { stage: 'harvest', roomCode: drag.target.roomId, days: 1, offsetFromHarvest: 0 },
        { stage: 'drying', roomCode: 'r-dry-01', days: 15, offsetFromHarvest: 5 },
        { stage: 'trim', roomCode: 'r-trim-01', days: 10, offsetFromHarvest: 5 },
        { stage: 'cure', roomCode: 'r-cure-01', days: 5, offsetFromHarvest: 15 },
        { stage: 'test', roomCode: 'r-cure-01', days: 14, offsetFromHarvest: 20 },
        { stage: 'pack', roomCode: 'r-pack-01', days: 1, offsetFromHarvest: 34 },
      ];
      for (const s of stages) {
        const segStart = new Date(newHarvestStart);
        segStart.setDate(segStart.getDate() + s.offsetFromHarvest);
        const segEnd = new Date(segStart);
        segEnd.setDate(segEnd.getDate() + s.days);
        const ri = roomIndexById.get(s.roomCode);
        if (ri === undefined) continue;
        const x = daysBetween(startDate, segStart) * DAY_WIDTH;
        const w = Math.max(8, daysBetween(segStart, segEnd) * DAY_WIDTH);
        const conflict = overlapsAnyOther(cycle.id, s.roomCode, segStart, segEnd);
        out.push({ stage: s.stage, roomIndex: ri, x, w, conflict, deltaText });
      }
    }
    return out;
  }, [drag, batchById, batches, roomIndexById, startDate, plannedByRoom, flowerDaysByStrain]);

  // Quarantine polarity inversion. Per the four-state lineage doctrine the
  // dotted-bottom + dotted-left-edge treatments mark "data lineage is
  // suspect." On Cult's live data ~95% of segments carry one of those
  // signals, which inverts the doctrine's intent: the eye lands on noise
  // rather than on the few trustworthy values. When the ratio of
  // suspect-current segments crosses 50%, the lab flips polarity by
  // rendering a small gold "captured" chip on segments that are NOT
  // synthetic AND NOT quarantined. The dotted treatments stay so the
  // operator can still see provenance per-bar; the chip is the
  // additive signal that lands the eye on what to trust.
  const quarantineRatio = useMemo(() => {
    const current = renderedSegments.filter(rs => rs.isCurrent && !rs.isProjected);
    if (current.length === 0) return 0;
    const suspect = current.filter(rs => {
      if (rs.cohortBatches) return !!rs.cohortQuarantined || !!rs.cohortSynthetic;
      const seg = rs.batch.segments[rs.segmentIndex];
      return !!rs.batch.is_quarantined || !!seg.is_synthetic;
    }).length;
    return suspect / current.length;
  }, [renderedSegments]);
  const showCapturedChip = quarantineRatio > 0.5;

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
          {rooms.map((room, ri) => {
            const plannedCount = plannedByRoom[room.room_id]?.length ?? 0;
            // Match the same "incoming" definition used by the
            // PLAN A CYCLE chip suppression: a projected flower
            // segment from an in-flight batch lands here within the
            // visible window. When this fires, the cap shows
            // "INCOMING" instead of "EMPTY" so the operator sees
            // the room's true state, not a contradiction with the
            // faint dashed projection bar in the same row.
            const hasIncomingForCap = renderedSegments.some(rs =>
              rs.roomIndex === ri && rs.stage === 'flower' && rs.isProjected && !rs.isCurrent
            );
            const isEmptyRoom =
              room.room_type !== 'mother' &&
              room.total_plants === 0 &&
              plannedCount === 0 &&
              !hasIncomingForCap;
            const isIncomingRoom =
              room.room_type !== 'mother' &&
              room.total_plants === 0 &&
              hasIncomingForCap;
            // Yield × area math (file 2's per-row Production
            // formula). When square_footage is present we surface a
            // mono SQFT tag on the capacity row and put the full
            // formula in the title attribute. For Sostanza's flower
            // rooms (28 sqft × 800 g/sqft) this materializes the
            // 22.4 kg per harvest expectation directly on the cap.
            const sqft = room.square_footage ?? null;
            const capTitle = sqft
              ? `${room.room_code} · ${sqft} sqft. At Pink Kush avg yield (800 g/sqft) this room projects ${Math.round(sqft * 0.8)} kg per harvest.`
              : undefined;
            return (
              <div
                key={room.room_id}
                className="gantt-left-cap"
                style={{ height: ROW_HEIGHT }}
                onClick={() => onRoomClick(room)}
                role="button"
                tabIndex={0}
                title={capTitle}
                data-room-code={room.room_code}
                data-room-id={room.room_id}
              >
                <div className="cap-row-1">
                  <span className="room-code mono">{room.room_code}</span>
                  <span className="room-type cap">{room.room_type}</span>
                  {isEmptyRoom && (
                    <span
                      className="room-empty-chip cap"
                      title="No current batches and no planned cycles in this room. Open the drawer to plan a cycle."
                    >
                      Empty
                    </span>
                  )}
                  {isIncomingRoom && (
                    <span
                      className="room-incoming-chip cap"
                      title="This flower room is currently empty but a committed in-flight batch is on its way. The faint dashed bar in this row marks the projected flower segment."
                    >
                      Incoming
                    </span>
                  )}
                </div>
                <div className="cap-row-2">
                  <span className="cap-cap">CAPACITY</span>
                  <span className="cap-num display">
                    {room.total_plants}
                    <span className="cap-num-mute">
                      {room.capacity_plants ? ` / ${room.capacity_plants}` : ''}
                    </span>
                  </span>
                  {sqft !== null && (
                    <span className="cap-area cap mono" aria-label={`${sqft} square feet`}>
                      {sqft} sqft
                    </span>
                  )}
                </div>
              </div>
            );
          })}
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

            {/* Per-room flower gap bands. Hairline gold band with
                "GAP · Nd" label between consecutive flower batches in
                the same room. Negative gap (overlap) renders red as
                "OVERLAP · Nd" — a scheduling collision per Sostanza's
                Master Production Schedule convention. */}
            {gapBands.map((g, gi) => (
              <div
                key={`gap-${gi}`}
                className={`gantt-gap-band ${g.isOverlap ? 'is-overlap' : ''}`}
                style={{
                  left: g.x,
                  top: HEADER_HEIGHT + g.roomIndex * ROW_HEIGHT + (ROW_HEIGHT - 18) / 2,
                  width: g.w,
                  height: 18,
                }}
                title={
                  g.isOverlap
                    ? `Overlap of ${Math.abs(g.days)} day${Math.abs(g.days) === 1 ? '' : 's'} — next batch starts before the prior batch harvests. Scheduling collision.`
                    : `Idle ${g.days} day${g.days === 1 ? '' : 's'} between batches in this room.`
                }
                aria-hidden
              >
                <span className="gantt-gap-band-label cap mono">
                  {g.isOverlap
                    ? `Overlap · ${Math.abs(g.days)}d`
                    : `Gap · ${g.days}d`}
                </span>
              </div>
            ))}

            {/* Room rows */}
            {rooms.map((room, ri) => {
              const planned = plannedByRoom[room.room_id] ?? [];
              const isMother = room.room_type === 'mother';
              // Imminent incoming: a projected flower segment from an
              // in-flight batch lands in this room within the visible
              // window. If so, the room isn't truly "empty" — it has a
              // committed cycle already on its way. Suppress the
              // PLAN A CYCLE chip to avoid prompting a duplicate plan.
              const hasIncoming = renderedSegments.some(rs =>
                rs.roomIndex === ri && rs.stage === 'flower' && rs.isProjected && !rs.isCurrent
              );
              const isEmpty = !isMother && room.strains.length === 0 && planned.length === 0 && !hasIncoming;
              return (
                <div
                  key={room.room_id}
                  className="gantt-row"
                  style={{ top: HEADER_HEIGHT + ri * ROW_HEIGHT, height: ROW_HEIGHT, width: totalWidth }}
                >
                  {weeks.map((w) => (
                    <div key={w.x} className="gantt-row-tick" style={{ left: w.x }} aria-hidden />
                  ))}

                  {/* Mother room: continuous summary bar. With Cult's
                      live data carrying ~65 strains in the genetics
                      library, inline strain-name rendering becomes a
                      wall of text. The collapsed default surfaces the
                      operator's mental model — "the genetics library
                      contains N strains, M total mothers." Click the
                      bar to open the drawer for the per-strain breakdown
                      with synthetic-mother quarantine treatment. */}
                  {isMother && room.strains.length > 0 && (() => {
                    // Cutback cadence summary — surfaces the mother
                    // workflow per file 2's Mother Cutback column. We
                    // take the most-recent days_in_stage across the
                    // genetics library as a proxy for "the next mom
                    // ready to cut." Sostanza target is 16d.
                    const CUTBACK_CADENCE = 16;
                    const dayValues = room.strains
                      .map((s) => s.days_in_stage)
                      .filter((d): d is number => typeof d === 'number');
                    const minDays = dayValues.length > 0 ? Math.min(...dayValues) : null;
                    const readyCount = dayValues.filter((d) => d >= CUTBACK_CADENCE).length;
                    return (
                      <div
                        className="mother-bar"
                        style={{ left: 0, width: totalWidth }}
                        onClick={() => onRoomClick(room)}
                        role="button"
                        tabIndex={0}
                        title={
                          minDays !== null
                            ? `${room.room_code} · ${room.strains.length} strain${room.strains.length === 1 ? '' : 's'} · ${room.total_plants} mothers · ${readyCount} ready to cut · next cutback in ${Math.max(0, CUTBACK_CADENCE - minDays)}d. Click to open the genetics library.`
                            : `${room.room_code} · ${room.strains.length} strains · ${room.total_plants} mothers. Click to open the genetics library.`
                        }
                      >
                        <span className="bar-dot dot-mother" aria-hidden />
                        <div className="mother-summary mono">
                          <span className="mother-summary-label cap">Genetics library</span>
                          <span className="mother-summary-num">{room.strains.length}</span>
                          <span className="mother-summary-unit cap">{room.strains.length === 1 ? 'strain' : 'strains'}</span>
                          <span className="mother-summary-sep">·</span>
                          <span className="mother-summary-num">{room.total_plants}</span>
                          <span className="mother-summary-unit cap">mothers</span>
                          {minDays !== null && (
                            <>
                              <span className="mother-summary-sep">·</span>
                              {readyCount > 0 ? (
                                <span className="mother-cutback-pill is-ready cap mono" title={`${readyCount} mother strain${readyCount === 1 ? '' : 's'} past the ${CUTBACK_CADENCE}-day cutback cadence`}>
                                  {readyCount} ready to cut
                                </span>
                              ) : (
                                <span className="mother-cutback-pill is-recovering cap mono" title={`Next cutback ready in ${CUTBACK_CADENCE - minDays} day${CUTBACK_CADENCE - minDays === 1 ? '' : 's'} on the ${CUTBACK_CADENCE}-day cadence`}>
                                  Next cutback {CUTBACK_CADENCE - minDays}d
                                </span>
                              )}
                            </>
                          )}
                          {onCutClones && (
                            <button
                              type="button"
                              className="mother-cut-chip cap mono"
                              onClick={(e) => { e.stopPropagation(); onCutClones(room); }}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onCutClones(room); } }}
                              title="Plan a clone cut from this mother room"
                            >
                              Cut Clones →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

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

              const seg = rs.batch.segments[rs.segmentIndex];
              const isCohort = !!rs.cohortBatches && rs.cohortBatches.length >= 2;

              // "To" tag — for clone or veg current bars, surface the
              // destination flower room and projected flip date so the
              // operator can read upstream pipeline lineage at a glance.
              let toRoomCode: string | null = null;
              let toFlipDate: string | null = null;
              if (rs.isCurrent && (rs.stage === 'clone' || rs.stage === 'veg') && !isCohort) {
                const flowerSeg = rs.batch.segments.find(s => s.stage === 'flower');
                if (flowerSeg) {
                  const destRoom = rooms[roomIndexById.get(flowerSeg.room_id) ?? -1];
                  if (destRoom) {
                    toRoomCode = destRoom.room_code;
                    const d = new Date(flowerSeg.start);
                    toFlipDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }
                }
              }
              const cohortCount = isCohort ? rs.cohortBatches!.length : 0;
              const plantCount = isCohort
                ? (rs.cohortTotalPlants ?? seg.plant_count)
                : seg.plant_count;
              const isSegSynthetic = isCohort
                ? !!rs.cohortSynthetic
                : !!seg.is_synthetic;
              const isBatchQuarantined = isCohort
                ? !!rs.cohortQuarantined
                : !!rs.batch.is_quarantined;

              const quarantineParts: string[] = [];
              if (isBatchQuarantined) {
                quarantineParts.push(isCohort
                  ? 'one or more batches in this cohort carry orphan or cultivation_only confidence per cultivo_planner_data_lineage v2'
                  : `batch quarantine: ${rs.batch.quarantine_reason ?? 'confidence tier suspect'}`);
              }
              if (isSegSynthetic) {
                quarantineParts.push(isCohort
                  ? 'one or more segments in this cohort have inferred dates'
                  : `segment: ${seg.synthetic_reason ?? 'dates inferred'}`);
              }

              // Urgency computation. Static signal only (no animations) per
              // the working-instrument design contract. Flower-stage bars
              // surface days-to-harvest urgency; drying-stage bars surface
              // stuck-in-stage urgency. Floor today to start-of-day so the
              // calendar-day delta matches the chrome KPI calculation.
              const todayStart = new Date(today);
              todayStart.setHours(0, 0, 0, 0);
              const todayMs = todayStart.getTime();
              const urgencyCandidates: { level: 'bad' | 'warn'; reason: string }[] = [];
              const urgentBatches = isCohort ? rs.cohortBatches! : [rs.batch];
              for (const ub of urgentBatches) {
                const ubSeg = ub.segments.find(s => s.is_current) ?? ub.segments[0];
                if (!ubSeg) continue;
                if (rs.stage === 'flower') {
                  const harvestISO = harvestOverrides[ub.batch_id] ?? ubSeg.end;
                  const harvestMs = new Date(harvestISO).getTime();
                  const daysToHarvest = Math.round((harvestMs - todayMs) / 86400000);
                  if (daysToHarvest < 0) {
                    urgencyCandidates.push({ level: 'bad', reason: `${ub.strain_name} harvest overdue ${Math.abs(daysToHarvest)}d` });
                  } else if (daysToHarvest <= 3) {
                    urgencyCandidates.push({ level: 'bad', reason: `${ub.strain_name} harvest in ${daysToHarvest}d` });
                  } else if (daysToHarvest <= 14) {
                    urgencyCandidates.push({ level: 'warn', reason: `${ub.strain_name} harvest in ${daysToHarvest}d` });
                  }
                } else if (rs.stage === 'drying') {
                  // Prefer plumbed v_batch_lifecycle.days_in_stage since
                  // it tracks lifecycle_state transitions accurately. The
                  // segment-derived calc undershoots for batches whose
                  // plant_groups.stage_entered_at was overwritten by a
                  // post-drying transition (the D15 stuck-in-flower /
                  // stuck-in-drying signature).
                  const segStartMs = new Date(ubSeg.start).getTime();
                  const segDays = Math.round((todayMs - segStartMs) / 86400000);
                  const stageDays = ub.days_in_stage ?? segDays;
                  // Also factor cut-date age — if cut > 100 days ago and
                  // batch is still in drying bucket, that's stuck.
                  const cutMs = new Date(ub.clone_cut_date).getTime();
                  const ageDays = Math.round((todayMs - cutMs) / 86400000);
                  const stuckSignal = Math.max(stageDays, ageDays > 100 ? ageDays - 100 + 14 : 0);
                  if (stuckSignal >= 21) {
                    urgencyCandidates.push({ level: 'bad', reason: `${ub.strain_name} stuck ${stageDays}d in drying / cut ${ageDays}d ago` });
                  } else if (stuckSignal >= 14) {
                    urgencyCandidates.push({ level: 'warn', reason: `${ub.strain_name} drying ${stageDays}d / cut ${ageDays}d ago` });
                  }
                }
              }
              const urgencyLevel: 'bad' | 'warn' | null = urgencyCandidates.some(u => u.level === 'bad')
                ? 'bad'
                : urgencyCandidates.some(u => u.level === 'warn') ? 'warn' : null;
              const urgencyReasons = urgencyCandidates.length > 0
                ? urgencyCandidates.slice(0, 3).map(u => u.reason).join('; ') +
                  (urgencyCandidates.length > 3 ? `; +${urgencyCandidates.length - 3} more` : '')
                : null;

              const stageLong = STAGE_LONG[rs.stage as LifecycleStage] ?? rs.stage;
              let baseTitle: string;
              if (isCohort) {
                const strainList = rs.cohortBatches!.map(b => b.strain_name);
                const preview = strainList.slice(0, 6).join(', ') + (strainList.length > 6 ? `, +${strainList.length - 6} more` : '');
                baseTitle = `Batch group ${getCohortKey(rs.batch)} (cut ${rs.batch.clone_cut_date}) · ${cohortCount} strains · ${plantCount} plants · ${stageLong}\nstrains: ${preview}`;
              } else {
                baseTitle = `${rs.batch.batch_code} · ${rs.batch.strain_name} · ${stageLong} · ${plantCount} plants${fromRoomCode ? ` · from ${fromRoomCode}` : ''}`;
              }
              const titleParts = [baseTitle];
              if (urgencyReasons) titleParts.push(`urgency: ${urgencyReasons}`);
              if (quarantineParts.length > 0) titleParts.push(quarantineParts.join('\n'));
              const fullTitle = titleParts.join('\n\n');

              const cohortHasHover = isCohort && !!hoveredBatchId && rs.cohortBatches!.some(b => b.batch_id === hoveredBatchId);
              const cohortHasSelect = isCohort && !!selectedBatchId && rs.cohortBatches!.some(b => b.batch_id === selectedBatchId);
              const effectiveHighlight = isHighlighted || cohortHasHover || cohortHasSelect;

              return (
                <div
                  key={isCohort ? `cohort-${rs.cohortKey}` : `${rs.batch.batch_id}-${rs.segmentIndex}`}
                  className={`batch-seg stage-${rs.stage} ${rs.isCurrent ? 'is-current' : 'is-history'} ${rs.isProjected ? 'is-projected' : ''} ${dimmed ? 'dim' : ''} ${effectiveHighlight ? 'highlight' : ''} ${isOverridden ? 'overridden' : ''} ${isDraggingHarvest ? 'is-dragging' : ''} ${isSegSynthetic ? 'is-synthetic' : ''} ${isBatchQuarantined ? 'is-quarantined' : ''} ${isCohort ? 'is-cohort' : ''}`}
                  style={{ left: rs.x, width: displayW, top, height: rs.h }}
                  onMouseEnter={() => onBatchHover(rs.batch.batch_id)}
                  onMouseLeave={() => onBatchHover(null)}
                  onClick={(e) => {
                    if (drag) return;
                    e.stopPropagation();
                    onBatchSelect(rs.batch.batch_id === selectedBatchId ? null : rs.batch.batch_id);
                  }}
                  title={fullTitle}
                  data-batch-id={rs.batch.batch_id}
                  data-cohort-key={isCohort ? rs.cohortKey : undefined}
                  data-cohort-count={isCohort ? cohortCount : undefined}
                >
                  {fromRoomCode && !isCohort && (
                    <span className="bar-from-tag mono" aria-label={`from ${fromRoomCode}`}>
                      ←{fromRoomCode}
                    </span>
                  )}
                  <span className={`bar-dot dot-${rs.stage}`} aria-hidden />
                  {isCohort && (
                    <span className="bar-cohort-count mono" aria-label={`${cohortCount} batches in batch group`}>
                      {cohortCount}×
                    </span>
                  )}
                  {rs.stage !== 'flower' && rs.stage !== 'veg' && rs.isCurrent && (
                    <span
                      className="bar-stage-badge cap"
                      aria-label={STAGE_LONG[rs.stage as LifecycleStage] ?? rs.stage}
                    >
                      {STAGE_SHORT[rs.stage as LifecycleStage] ?? rs.stage}
                    </span>
                  )}
                  <span className="bar-strain-name mono">
                    {isCohort ? `${rs.cohortBatches![0].strain_name}${cohortCount > 1 ? ` +${cohortCount - 1}` : ''}` : rs.batch.strain_name}
                  </span>
                  <span className="bar-plant-count mono">{plantCount > 0 ? plantCount : '—'}</span>
                  {toRoomCode && toFlipDate && (
                    <span
                      className="bar-to-tag mono"
                      aria-label={`flips to ${toRoomCode} on ${toFlipDate}`}
                      title={`Destined for ${toRoomCode} on ${toFlipDate}`}
                    >
                      {/* Tight bars (clone phase, narrow veg) drop the
                          date and show only the room code. The full
                          destination is in the title attribute and the
                          drawer, so no information is lost. */}
                      →{toRoomCode}{displayW >= 180 ? ` · ${toFlipDate}` : ''}
                    </span>
                  )}
                  {showCapturedChip && !isBatchQuarantined && rs.isCurrent && (
                    <span
                      className="bar-captured cap"
                      title="Confidence tier is clean (operator-captured per cultivo_planner_data_lineage). In a render where most batches carry quarantine signals, this chip marks the lineage you can trust. Note: dotted-underlined dates inside the bar may still indicate date projection — that signal is independent from lineage trust."
                    >
                      Captured
                    </span>
                  )}
                  {urgencyLevel && (
                    <span
                      className={`bar-urgency dot-${urgencyLevel === 'bad' ? 'alarm' : 'warn'}`}
                      aria-label={`urgency ${urgencyLevel}`}
                    />
                  )}
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

            {/* Cascade preview ghosts. Render during a non-zero drag to
                show where the downstream segments would land at the new
                date. Conflict ghosts mark rooms where an existing batch
                already occupies the projected window. */}
            {cascadePreview.map((g, i) => (
              <div
                key={`cascade-${i}`}
                className={`cascade-ghost cap mono${g.conflict ? ' is-conflict' : ''}`}
                style={{
                  left: g.x,
                  top: HEADER_HEIGHT + g.roomIndex * ROW_HEIGHT + 8,
                  width: g.w,
                  height: ROW_HEIGHT - 16,
                }}
                aria-hidden
              >
                <span className="cascade-ghost-stage">{g.stage}</span>
                <span className="cascade-ghost-delta">{g.deltaText}</span>
                {g.conflict && <span className="cascade-ghost-warn">conflict</span>}
              </div>
            ))}

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
