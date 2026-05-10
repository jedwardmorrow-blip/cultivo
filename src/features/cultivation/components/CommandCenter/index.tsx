/**
 * Cultivation Command Center — port of Claude Design v2 prototype
 *
 * Source canon: cultivation_command_center_brief_v1 (brain row c961c2f9)
 * Prototype reference: _inbound/cmd-center-prototype-2026-04-29/
 * Legacy reference: _inbound/cmd-center-prototype-2026-04-29/CommandCenter.legacy.tsx
 *
 * PR1 scope: prototype port + tokens + task complete + harvest + env placeholders.
 * PR2 adds dnd-kit reschedule, PinnedCellPopover, label printing, move-with-split,
 *     dead plant logging, stage advance.
 * PR3 adds lead promotion, tank mix inline editor, labor drawer, global add.
 */

import { useState, useMemo, useCallback } from 'react';
import { useCommandCenterData, type RoomShape, type TaskShape } from './useCommandCenterData';
import { CYCLE_PHASE_MARKERS } from '../../constants/cyclePhaseMarkers';
import { TASK_TYPE_CONFIG, type TaskType, type TaskStatus } from '../../types';
import { useRoomSections } from '../../hooks/useRoomSections';
import { usePlantGroups } from '../../hooks/usePlantGroups';
import { useGrowRooms } from '../../hooks/useGrowRooms';
import { usePlantGroupLabel } from '../../hooks/usePlantGroupLabel';
import { useTaskAssignments } from '../../hooks/useTaskAssignments';
import { useFeedProgramRecipe } from '../../hooks/useFeedProgramRecipe';
import { useTaskSchedules } from '../../hooks/useTaskSchedules';
import { useActiveStaff } from '@/features/sessions/hooks/useActiveStaff';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { HarvestWorkflow } from '../harvest';
import { MoveToRoomModal } from '../MoveToRoomModal';
import { DeadPlantForm } from '../DeadPlantForm';
import { PlantGroupLabelPrintModal } from '../PlantGroupLabelPrintModal';
import { TaskCompletionForm } from '../TaskCompletionForm';
import type { PlantGroup, GrowthStage } from '../../types';
import type { TaskCardData } from '../TaskCard';
import './CommandCenter.css';

// ── Static helpers (hoisted out of components) ──────────────
const STAGE_DOT_CLASS: Record<string, string> = {
  flower: 'd-flower',
  veg: 'd-veg',
  clone: 'd-clone',
  mother: 'd-mother',
  mixed: 'd-mixed',
};

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatHm(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function shortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function urgencyClass(u: number): string {
  if (u >= 3) return 'urgent';
  if (u >= 2) return 'warning';
  return '';
}

function urgencyColor(u: number): string {
  if (u >= 3) return 'var(--status-bad)';
  if (u >= 2) return 'var(--status-warn)';
  return 'var(--op-ink-3)';
}

function urgencyMessage(r: RoomShape): string {
  if (r.harvestDays !== null && r.harvestDays <= 0) return `${Math.abs(r.harvestDays)}d overdue`;
  if (r.harvestDays !== null && r.harvestDays <= 7) return `Harvest in ${r.harvestDays}d`;
  if (r.day !== null && r.day > 35 && r.type === 'veg') return `${r.day}d in veg`;
  if (r.urgency >= 2) return 'Needs attention';
  return '';
}

function harvestLabel(r: RoomShape): string {
  if (r.harvestDays !== null && r.harvestDays <= 0) {
    return r.harvestDate ? `projected ${shortDate(r.harvestDate)}` : 'overdue';
  }
  if (r.harvestDays !== null) {
    return r.harvestDate ? `${r.harvestDays}d · projected ${shortDate(r.harvestDate)}` : `${r.harvestDays}d`;
  }
  if (r.type === 'veg' && r.day !== null) return `~${Math.max(0, r.cycleDays - r.day)}d to flip`;
  if (r.type === 'clone' && r.day !== null) return `${Math.max(0, r.cycleDays - r.day)}d to transplant`;
  if (r.type === 'mother') return 'perpetual';
  return '';
}

// ═══════════════════════════════════════════════════════════════
// AttentionStrip — silence is signal, urgency >= 2 only
// ═══════════════════════════════════════════════════════════════
function AttentionStrip({ rooms, onRoomClick }: { rooms: RoomShape[]; onRoomClick: (id: string) => void }) {
  const items = useMemo(
    () => rooms.filter(r => r.urgency >= 2 && !r.empty)
      .toSorted((a, b) => b.urgency - a.urgency),
    [rooms]
  );
  if (items.length === 0) return null;

  return (
    <div className="attn">
      <span className="ml" style={{ flexShrink: 0 }}>Attention</span>
      {items.map(r => (
        <button key={r.room_id} className="attn-item" type="button" onClick={() => onRoomClick(r.room_id)}>
          <span className={`d ${r.urgency >= 3 ? 'd-bad' : 'd-warn'}`} />
          <span className="attn-code">{r.code}</span>
          <span style={{ color: urgencyColor(r.urgency) }}>{urgencyMessage(r)}</span>
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SparklineWithStatusTail — atom from cultivo_atom_sparkline_status_tail_v1
// ═══════════════════════════════════════════════════════════════
function Spark({ data, status, height = 20 }: { data: number[]; status?: 'ok' | 'warn' | 'bad'; height?: number }) {
  const max = Math.max(...data, 1);
  const tailColor = status === 'ok' ? 'var(--status-ok)'
    : status === 'warn' ? 'var(--status-warn)'
    : status === 'bad' ? 'var(--status-bad)'
    : 'var(--op-ink-2)';
  return (
    <span className="cell-spark" style={{ height }}>
      {data.map((v, i) => (
        <span key={i} className="cell-spark-bar" style={{
          height: `${Math.max(2, (v / max) * height)}px`,
          background: i === data.length - 1 ? tailColor : undefined,
        }} />
      ))}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// PendingCell — atom from cultivo_atom_pending_cell_v1
// ═══════════════════════════════════════════════════════════════
function PendingCell({ label, reason }: { label: string; reason: string }) {
  return (
    <button type="button" className="cell pending-cell no-click" style={{ cursor: 'default' }}>
      <span className="cell-label" style={{ color: 'var(--op-ink-4)' }}>{label}</span>
      <span className="cell-val pending">—</span>
      <span className="cell-sub pending">{reason}</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// Labor strip — 5 cells, on-canvas, always visible
// ═══════════════════════════════════════════════════════════════
type LaborTotals = { total: number; done: number; active: number; pending: number; unassigned: number };

function LaborStrip({ totals, roomCount, topType, sparks }: {
  totals: LaborTotals;
  roomCount: number;
  topType: string;
  sparks: { total: number[]; done: number[] };
}) {
  const pct = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0;
  return (
    <div className="sec">
      <div className="sec-hd">
        <span className="ml">Labor</span>
        <span className="ml-sm ml-r">{new Date().toLocaleDateString('en-US', { weekday: 'short' })} · today</span>
      </div>
      <div className="cells" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <button type="button" className="cell">
          <span className="cell-label">Total Tasks</span>
          <span className="cell-val">{totals.total}</span>
          <span className="cell-sub">across {roomCount} rooms</span>
          <Spark data={sparks.total} />
        </button>
        <button type="button" className="cell">
          <span className="cell-label"><span className="d d-ok" /> Done</span>
          <span className="cell-val">{totals.done}</span>
          <span className="cell-sub">{pct}% complete</span>
          <Spark data={sparks.done} status="ok" />
        </button>
        <button type="button" className="cell">
          <span className="cell-label"><span className="d d-warn" /> Active</span>
          <span className="cell-val">{totals.active}</span>
          <span className="cell-sub">{totals.unassigned} unassigned</span>
        </button>
        <button type="button" className="cell">
          <span className="cell-label">Pending</span>
          <span className="cell-val">{totals.pending}</span>
          <span className="cell-sub">queue</span>
        </button>
        <button type="button" className="cell">
          <span className="cell-label">Top Type</span>
          <span className="cell-val" style={{ fontSize: 16 }}>{topType || '—'}</span>
          <span className="cell-sub">most common today</span>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RoomCard — tile in the grid; supports featured (col-span-2 row-span-2)
// ═══════════════════════════════════════════════════════════════
function RoomCard({ room, tasks, isFeatured, onClick }: {
  room: RoomShape;
  tasks: TaskShape[];
  isFeatured: boolean;
  onClick: (id: string) => void;
}) {
  if (room.empty) {
    return (
      <button type="button" className="rm empty" disabled>
        <div className="rm-top">
          <span className="d d-muted" />
          <span className="rm-code">{room.code}</span>
          <span className="rm-type" data-stage={room.type}>{room.type}</span>
        </div>
        <span className="rm-stats" style={{ marginTop: 'auto', color: 'var(--op-ink-4)' }}>Empty</span>
      </button>
    );
  }

  const done = tasks.filter(t => t.status === 'completed').length;
  const active = tasks.filter(t => t.status === 'in_progress').length;
  const pend = tasks.length - done - active;
  const urgLabel = urgencyMessage(room);
  const dotClass = STAGE_DOT_CLASS[room.type] ?? 'd-mixed';

  const upcomingPills = isFeatured && tasks.length > 0
    ? tasks.filter(t => t.status !== 'completed' && t.status !== 'skipped').slice(0, 4)
    : [];

  return (
    <button
      type="button"
      className={`rm ${urgencyClass(room.urgency)} ${isFeatured ? 'featured' : ''}`}
      onClick={() => onClick(room.room_id)}
      style={{ ['--vt-room' as string]: `cmd-room-${room.code}` }}
    >
      <div className="rm-top">
        <span className={`d ${dotClass}`} />
        <span className="rm-code">{room.code}</span>
        <span className="rm-type" data-stage={room.type}>{room.type}</span>
        {urgLabel ? (
          <span className="rm-urg" style={{ color: urgencyColor(room.urgency) }}>{urgLabel}</span>
        ) : null}
      </div>
      <span className="rm-big">{room.plants}</span>
      <span className="rm-stats">
        <span>{room.strains.length} strain{room.strains.length === 1 ? '' : 's'}</span>
        {room.day !== null ? <span>Day {room.day}</span> : null}
      </span>
      {room.strains.length > 0 ? (
        <div className="rm-strains">
          {room.strains.slice(0, isFeatured ? 8 : 4).map(s => (
            <span key={s} className="rm-strain">{s}</span>
          ))}
          {room.strains.length > (isFeatured ? 8 : 4) ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--op-ink-4)' }}>
              +{room.strains.length - (isFeatured ? 8 : 4)}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="rm-ft">
        <span className="rm-harv" style={{ color: urgencyColor(room.urgency) }}>{harvestLabel(room)}</span>
        {tasks.length > 0 ? (
          <div className="rm-tasks">
            <div className="tbar">
              {done > 0 ? <span className="tseg done" style={{ width: done * 6 }} /> : null}
              {active > 0 ? <span className="tseg act" style={{ width: active * 6 }} /> : null}
              {pend > 0 ? <span className="tseg pend" style={{ width: pend * 6 }} /> : null}
            </div>
            {done}/{tasks.length}
          </div>
        ) : null}
      </div>
      {isFeatured && upcomingPills.length > 0 ? (
        <div className="rm-ft-extra">
          <div className="rm-ft-tasks">
            {upcomingPills.map(t => (
              <span key={t.id} className="rm-task-pill">{TASK_TYPE_CONFIG[t.type as TaskType]?.label ?? t.type}</span>
            ))}
          </div>
        </div>
      ) : null}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// PhaseHero — molecule from cultivo_molecule_phase_hero_v1
// ═══════════════════════════════════════════════════════════════
function PhaseHero({ room }: { room: RoomShape }) {
  const markers = CYCLE_PHASE_MARKERS[room.type] ?? [];
  const day = room.day ?? 0;
  const cycleDays = room.cycleDays || 1;
  const pct = Math.min(100, (day / cycleDays) * 100);
  const labelLeft = room.flipDate ? `Flip ${shortDate(room.flipDate)} · Day 1` : 'Start Day 1';
  const labelRight = room.harvestDate
    ? `Harvest ~${shortDate(room.harvestDate)} · Day ${cycleDays}`
    : room.type === 'mother' ? 'perpetual' : `Cycle ~Day ${cycleDays}`;

  if (room.type === 'mother') {
    return (
      <div className="phase-hero">
        <div className="phase-track" style={{ background: 'var(--op-line)' }} />
        <div className="phase-labels"><span /><span style={{ color: 'var(--op-ink-3)' }}>perpetual</span><span /></div>
      </div>
    );
  }

  return (
    <div className="phase-hero">
      <div className="phase-track">
        <div className="phase-fill" style={{ width: `${pct}%` }}>
          <div className="phase-now" />
        </div>
        <div className="phase-markers">
          {markers.map(m => (
            <span key={m.label} className="phase-marker" style={{ left: `${m.position}%` }}>{m.label}</span>
          ))}
        </div>
      </div>
      <div className="phase-labels">
        <span>{labelLeft}</span>
        <span style={{ color: 'var(--accent)' }}>Day {day} — today</span>
        <span>{labelRight}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Stats strip (legacy card layout, retained for PR2 reference)
// ═══════════════════════════════════════════════════════════════
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _StatsStripLegacy({ room, tasks }: { room: RoomShape; tasks: TaskShape[] }) {
  const done = tasks.filter(t => t.status === 'completed').length;
  const cycleLeft = room.day !== null ? Math.max(0, room.cycleDays - room.day) : null;
  return (
    <>
      <div className="cells" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        <div className="cell no-click">
          <span className="cell-label">Plants</span>
          <span className="cell-val">{room.plants}</span>
          <span className="cell-sub">{room.strains.length} strain{room.strains.length === 1 ? '' : 's'}</span>
        </div>
        <div className="cell no-click">
          <span className="cell-label">Day</span>
          <span className="cell-val">{room.day ?? '—'}</span>
          <span className="cell-sub">of {room.cycleDays} cycle</span>
        </div>
        <div className="cell no-click">
          <span className="cell-label">Harvest</span>
          <span className="cell-val proj">{room.harvestDays !== null ? `${Math.abs(room.harvestDays)}d` : (cycleLeft !== null ? `${cycleLeft}d` : '—')}</span>
          <span className="cell-sub">{room.harvestDate ? `projected ${shortDate(room.harvestDate)}` : (room.type === 'veg' ? 'to flip' : '')}</span>
        </div>
        <div className="cell no-click">
          <span className="cell-label"><span className={`d ${done === tasks.length && tasks.length > 0 ? 'd-ok' : 'd-muted'}`} /> Tasks</span>
          <span className="cell-val">{done}/{tasks.length}</span>
          <span className="cell-sub">{tasks.length - done === 0 ? 'all done' : `${tasks.length - done} remaining`}</span>
        </div>
        <div className="cell no-click">
          <span className="cell-label">Flipped</span>
          <span className="cell-val" style={{ fontSize: 14 }}>{room.flipDate ? shortDate(room.flipDate) : '—'}</span>
          <span className="cell-sub">{room.flipDate && room.day !== null ? `${room.day} days ago` : ''}</span>
        </div>
        <div className="cell no-click">
          <span className="cell-label">Strains</span>
          <span className="cell-val">{room.strains.length}</span>
          <span className="cell-sub">{room.strains.slice(0, 3).join(' · ')}</span>
        </div>
      </div>
      {/* Environmental row — manual tag, swaps to 'live' when sensors integrate */}
      <div className="cells" style={{ gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid var(--op-line)' }}>
        <div className="cell no-click">
          <span className="cell-label">Temp</span>
          <span className="cell-val" style={{ fontSize: 18 }}>{room.envTarget.temp_f}<span style={{ fontSize: 11, color: 'var(--op-ink-3)' }}>°F</span></span>
          <span className="cell-tag">manual · target</span>
        </div>
        <div className="cell no-click">
          <span className="cell-label">RH</span>
          <span className="cell-val" style={{ fontSize: 18 }}>{room.envTarget.rh_pct}<span style={{ fontSize: 11, color: 'var(--op-ink-3)' }}>%</span></span>
          <span className="cell-tag">manual · target</span>
        </div>
        <div className="cell no-click">
          <span className="cell-label">VPD</span>
          <span className="cell-val" style={{ fontSize: 18 }}>{room.envTarget.vpd_kpa}<span style={{ fontSize: 11, color: 'var(--op-ink-3)' }}>kPa</span></span>
          <span className="cell-tag">manual · target</span>
        </div>
        <div className="cell no-click">
          <span className="cell-label">CO2</span>
          <span className="cell-val" style={{ fontSize: 18 }}>{room.envTarget.co2_ppm}<span style={{ fontSize: 11, color: 'var(--op-ink-3)' }}>{room.envTarget.co2_ppm === 'ambient' ? '' : 'ppm'}</span></span>
          <span className="cell-tag">manual · target</span>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Task row + completion modal (schema-driven)
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// FeedRecipe — read-only feed recipe display restyled to hairline DS.
// Source: useFeedProgramRecipe(stage, days, room_id) which resolves the
// active feed program for the room's current stage/week, plus any
// per-room product overrides.
// ═══════════════════════════════════════════════════════════════
function FeedRecipe({ room }: { room: RoomShape }) {
  const stage = room.type;
  const days = room.day ?? 0;
  const { recipe, roomOverride, loading } = useFeedProgramRecipe(stage, days, room.room_id);

  if (loading) {
    return <div className="cmd-loading">loading recipe…</div>;
  }
  if (!recipe) {
    return <div className="pending-hint" style={{ padding: '8px 0' }}>No feed program configured for this stage / week</div>;
  }

  const ec = roomOverride?.target_ec ?? recipe.targets.target_ec;
  const phMin = roomOverride?.target_ph_min ?? recipe.targets.target_ph_min;
  const phMax = roomOverride?.target_ph_max ?? recipe.targets.target_ph_max;
  const overrides = (roomOverride?.product_overrides ?? {}) as Record<string, number | null | undefined>;

  return (
    <div className="feed-recipe">
      <div className="feed-recipe-hd">
        <span className="feed-recipe-name">{recipe.program_name}</span>
        <span className="feed-recipe-phase">{recipe.phase} · W{recipe.week_number}</span>
        {ec ? <span className="feed-recipe-ec">EC {ec}</span> : null}
      </div>
      <div className="feed-recipe-list">
        <div className="feed-recipe-hdrow">
          <span>#</span>
          <span>Nutrient</span>
          <span>mL/gal</span>
          <span>override</span>
        </div>
        {recipe.entries.map(entry => {
          const baseAmt = entry.ml_per_gal;
          const overrideAmt = overrides[entry.product.id];
          const isOverride = overrideAmt !== undefined && overrideAmt !== null && overrideAmt !== baseAmt;
          return (
            <div key={entry.product.id} className="feed-recipe-row">
              <span className="feed-recipe-order">{entry.mixing_order}</span>
              <span className="feed-recipe-product">{entry.product.name}</span>
              <span className="feed-recipe-amt">{isOverride ? overrideAmt : baseAmt}</span>
              <span className="feed-recipe-base">{isOverride ? `(was ${baseAmt})` : '—'}</span>
            </div>
          );
        })}
      </div>
      {phMin && phMax ? (
        <div className="feed-recipe-targets">
          <span>pH {phMin}–{phMax}</span>
          {recipe.targets.target_ppm_500 ? <span>PPM {recipe.targets.target_ppm_500}</span> : null}
        </div>
      ) : null}
      <div className="feed-recipe-foot">
        <span>read-only · interactive scaling editor lands in v2</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SectionsLayout — physical room tables and sections with plant counts
// PR1: read-only with strain breakdown on click
// PR2: PinnedCellPopover with move/kill/print/advance actions (legacy carry-forward)
// ═══════════════════════════════════════════════════════════════
const NEXT_STAGE: Record<string, GrowthStage | null> = {
  clone: 'veg',
  veg: 'flower',
  flower: 'harvested',
  mother: null,
  harvested: null,
};

function SectionsLayout({ roomId }: { roomId: string }) {
  const { tables, hasSections, loading } = useRoomSections(roomId);
  const {
    groups,
    moveToRoom,
    splitAndMoveToRoom,
    splitAndMoveMultipleToRoom,
    advanceStage,
    reload: reloadGroups,
  } = usePlantGroups({ stage: 'active' });
  const { rooms: growRooms } = useGrowRooms();
  const labelHook = usePlantGroupLabel();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [movingGroups, setMovingGroups] = useState<PlantGroup[] | null>(null);
  const [killingRoomId, setKillingRoomId] = useState<string | null>(null);
  const [advancingGroups, setAdvancingGroups] = useState<PlantGroup[] | null>(null);
  const [advanceLoading, setAdvanceLoading] = useState(false);

  // Plant groups located in this room
  const roomGroups = useMemo(() => groups.filter(g => g.grow_room_id === roomId), [groups, roomId]);

  // Section -> plant groups (for action targeting)
  const sectionGroupMap = useMemo(() => {
    const m = new Map<string, PlantGroup[]>();
    for (const g of roomGroups) {
      const sectionId = (g as unknown as { room_section_id?: string | null }).room_section_id;
      if (!sectionId) continue;
      const arr = m.get(sectionId) ?? [];
      arr.push(g);
      m.set(sectionId, arr);
    }
    return m;
  }, [roomGroups]);

  // Section -> { total, strains } for display
  const sectionIndex = useMemo(() => {
    const byId = new Map<string, { total: number; strains: Map<string, { abbr: string; name: string; count: number }> }>();
    for (const g of roomGroups) {
      const sectionId = (g as unknown as { room_section_id?: string | null }).room_section_id;
      if (!sectionId) continue;
      const entry = byId.get(sectionId) ?? { total: 0, strains: new Map() };
      const count = g.plant_count ?? 0;
      entry.total += count;
      const abbr = g.strains?.abbreviation ?? '???';
      const name = g.strains?.name ?? '';
      const sEntry = entry.strains.get(abbr) ?? { abbr, name, count: 0 };
      sEntry.count += count;
      entry.strains.set(abbr, sEntry);
      byId.set(sectionId, entry);
    }
    return byId;
  }, [roomGroups]);

  // Action handlers — wire through to existing services
  const handleMove = useCallback((sectionId: string) => {
    const grps = sectionGroupMap.get(sectionId) ?? [];
    if (grps.length === 0) return;
    setMovingGroups(grps);
  }, [sectionGroupMap]);

  const handleKill = useCallback((_sectionId: string) => {
    setKillingRoomId(roomId);
  }, [roomId]);

  const handlePrintGroup = useCallback(async (sectionId: string) => {
    const grps = sectionGroupMap.get(sectionId) ?? [];
    if (grps.length === 0) return;
    await labelHook.openGroupLabel(grps[0]);
  }, [sectionGroupMap, labelHook]);

  const handlePrintPlants = useCallback(async (sectionId: string) => {
    const grps = sectionGroupMap.get(sectionId) ?? [];
    if (grps.length === 0) return;
    await labelHook.openPlantLabels(grps[0]);
  }, [sectionGroupMap, labelHook]);

  const handleAdvance = useCallback((sectionId: string) => {
    const grps = sectionGroupMap.get(sectionId) ?? [];
    if (grps.length === 0) return;
    setAdvancingGroups(grps);
  }, [sectionGroupMap]);

  const confirmAdvance = useCallback(async () => {
    if (!advancingGroups || advanceLoading) return;
    setAdvanceLoading(true);
    try {
      for (const g of advancingGroups) {
        const next = NEXT_STAGE[g.growth_stage];
        if (next) await advanceStage(g.id, next);
      }
      await reloadGroups();
    } finally {
      setAdvanceLoading(false);
      setAdvancingGroups(null);
    }
  }, [advancingGroups, advanceLoading, advanceStage, reloadGroups]);

  if (loading) {
    return <div className="tbl-empty-hint">loading layout…</div>;
  }
  if (!hasSections || tables.length === 0) {
    return <div className="tbl-empty-hint">No tables configured for this room → Room Setup</div>;
  }

  const selectedDetail = selectedSectionId ? sectionIndex.get(selectedSectionId) : null;
  const selectedSection = selectedSectionId
    ? tables.flatMap(t => t.sections).find(s => s.id === selectedSectionId) ?? null
    : null;

  return (
    <div className="tbl-wrap">
      {tables.map(t => {
        const tableTotal = t.sections.reduce((sum, s) => sum + (sectionIndex.get(s.id)?.total ?? 0), 0);
        return (
          <div key={t.id} className="tbl">
            <div className="tbl-hd">
              <div className="tbl-hd-row">
                <span className="tbl-num">T{t.table_number}</span>
                {t.table_name ? <span className="tbl-name">{t.table_name}</span> : null}
              </div>
              <span className="tbl-total">{tableTotal} plant{tableTotal === 1 ? '' : 's'} · {t.sections.length} section{t.sections.length === 1 ? '' : 's'}</span>
            </div>
            {t.sections.length === 0 ? (
              <div className="tbl-empty-hint">No sections defined</div>
            ) : (
              <div className="tbl-grid">
                {t.sections.map(s => {
                  const occ = sectionIndex.get(s.id);
                  const count = occ?.total ?? 0;
                  const dominantStrain = occ
                    ? Array.from(occ.strains.values()).toSorted((a, b) => b.count - a.count)[0]?.abbr
                    : null;
                  const isSelected = s.id === selectedSectionId;
                  const isEmpty = count === 0;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`tbl-cell ${isEmpty ? 'empty' : ''} ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        if (isEmpty) return;
                        setSelectedSectionId(prev => (prev === s.id ? null : s.id));
                      }}
                    >
                      <div className="tbl-cell-row">
                        <span className="tbl-cell-lbl">{s.section_label}</span>
                        <span className="tbl-cell-ct">{count > 0 ? count : '—'}</span>
                      </div>
                      {dominantStrain ? <span className="tbl-cell-strain">{dominantStrain}</span> : null}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedSection && selectedDetail && t.sections.some(s => s.id === selectedSection.id) ? (
              <div className="tbl-detail">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                  <span className="tbl-num">{selectedSection.section_label}</span>
                  <span className="tbl-name">{selectedDetail.total} plants · {selectedDetail.strains.size} strain{selectedDetail.strains.size === 1 ? '' : 's'}</span>
                  <button type="button"
                    onClick={() => setSelectedSectionId(null)}
                    style={{ marginLeft: 'auto', background: 'none', border: 0, color: 'var(--op-ink-3)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
                  >close</button>
                </div>
                {Array.from(selectedDetail.strains.values()).toSorted((a, b) => b.count - a.count).map(s => (
                  <div key={s.abbr} className="tbl-detail-strain">
                    <span className="tbl-detail-abbr">{s.abbr}</span>
                    <span className="tbl-detail-ct">{s.count}</span>
                    <span className="tbl-detail-name">{s.name}</span>
                  </div>
                ))}
                <div className="tbl-actions">
                  <button type="button" className="tbl-action" onClick={() => handleMove(selectedSection.id)}>
                    Move
                  </button>
                  <button type="button" className="tbl-action" onClick={() => handlePrintGroup(selectedSection.id)}>
                    Print group
                  </button>
                  <button type="button" className="tbl-action" onClick={() => handlePrintPlants(selectedSection.id)}>
                    Print plants
                  </button>
                  {(() => {
                    const grps = sectionGroupMap.get(selectedSection.id) ?? [];
                    const stage = grps[0]?.growth_stage;
                    const next = stage ? NEXT_STAGE[stage] : null;
                    return (
                      <button
                        type="button"
                        className="tbl-action accent"
                        disabled={!next}
                        onClick={() => handleAdvance(selectedSection.id)}
                      >
                        {next ? `Advance → ${next}` : 'Advance'}
                      </button>
                    );
                  })()}
                  <button type="button" className="tbl-action danger" onClick={() => handleKill(selectedSection.id)}>
                    Kill
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {/* Move modal */}
      {movingGroups && movingGroups.length > 0 ? (
        <div className="cmd-modal-overlay" onClick={() => setMovingGroups(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 720 }}>
            <MoveToRoomModal
              group={movingGroups[0]}
              groups={movingGroups.length > 1 ? movingGroups : undefined}
              rooms={growRooms}
              onMove={async (toRoomId) => {
                await moveToRoom(movingGroups[0].id, toRoomId);
                setMovingGroups(null);
              }}
              onSplitAndMove={async (input) => {
                await splitAndMoveToRoom(input);
                setMovingGroups(null);
              }}
              onSplitAndMoveMultiple={async (input) => {
                await splitAndMoveMultipleToRoom(input);
                setMovingGroups(null);
              }}
              onCancel={() => setMovingGroups(null)}
            />
          </div>
        </div>
      ) : null}

      {/* Kill (dead plant) modal */}
      {killingRoomId ? (
        <DeadPlantForm
          prefilledRoomId={killingRoomId}
          onComplete={() => { setKillingRoomId(null); void reloadGroups(); }}
          onClose={() => setKillingRoomId(null)}
        />
      ) : null}

      {/* Advance stage confirmation */}
      {advancingGroups ? (
        <div className="cmd-modal-overlay" onClick={() => !advanceLoading && setAdvancingGroups(null)}>
          <div className="cmd-modal-card" onClick={e => e.stopPropagation()}>
            <div className="cmd-modal-hd">
              <span className="ml">Advance stage</span>
              <button type="button" className="cmd-modal-close" disabled={advanceLoading} onClick={() => setAdvancingGroups(null)}>✕</button>
            </div>
            <div className="cmd-confirm">
              <span className="ml">From → To</span>
              <span className="cmd-confirm-strong">
                {advancingGroups[0]?.growth_stage ?? '—'} → {NEXT_STAGE[advancingGroups[0]?.growth_stage ?? ''] ?? '—'}
              </span>
              <span>{advancingGroups.length} group{advancingGroups.length === 1 ? '' : 's'} · {advancingGroups.reduce((s, g) => s + (g.plant_count ?? 0), 0)} plants</span>
            </div>
            <div className="cmd-modal-ft">
              <button type="button" className="cmd-modal-cancel" disabled={advanceLoading} onClick={() => setAdvancingGroups(null)}>Cancel</button>
              <button type="button" className="act-btn" style={{ flex: 1 }} disabled={advanceLoading} onClick={confirmAdvance}>
                {advanceLoading ? 'Advancing…' : 'Confirm advance'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Print labels modal — both group and per-plant modes */}
      <PlantGroupLabelPrintModal
        isOpen={labelHook.isOpen}
        isLoading={labelHook.isLoading}
        isPrinting={labelHook.isPrinting}
        labelData={labelHook.labelData}
        logoDataUrl={labelHook.logoDataUrl}
        error={labelHook.error}
        onClose={labelHook.closeLabel}
        onPrint={labelHook.printLabels}
      />
    </div>
  );
}

function TaskRow({ task, onToggle, onOpenComplete, onExpand, assigneeCount, isExpanded }: {
  task: TaskShape;
  onToggle: () => void;
  onOpenComplete: () => void;
  onExpand: () => void;
  assigneeCount: number;
  isExpanded: boolean;
}) {
  const isDone = task.status === 'completed';
  const isActive = task.status === 'in_progress';
  const label = TASK_TYPE_CONFIG[task.type as TaskType]?.label ?? task.type;

  function handleClick() {
    if (isDone) return;
    if (isActive) { onOpenComplete(); return; }
    onToggle();
  }

  return (
    <div className="tl-row">
      <div className={`tl-chk ${isDone ? 'done' : isActive ? 'act' : ''}`} onClick={handleClick}>{isDone ? '✓' : ''}</div>
      <span className={`tl-name ${isDone ? 'struck' : ''}`} onClick={handleClick}>{label}</span>
      <button type="button" className="tl-assignees" onClick={onExpand}>
        {assigneeCount > 0
          ? <>{assigneeCount} assigned <span className="tl-arr">{isExpanded ? '▾' : '▸'}</span></>
          : <span className="unassigned">unassigned <span className="tl-arr">{isExpanded ? '▾' : '▸'}</span></span>}
      </button>
      <span className="tl-time">{formatHm(task.time)}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TaskRowAssignees — inline expansion: see assignees, add one, promote to lead
// ═══════════════════════════════════════════════════════════════
function TaskRowAssignees({ taskId, assignments, staff, onAssign, onPromote }: {
  taskId: string;
  assignments: { id: string; staff_id: string; role: string; staff?: { id: string; first_name: string; last_name: string } }[];
  staff: { id: string; first_name: string }[];
  onAssign: (staffId: string) => Promise<void>;
  onPromote: (assignmentId: string) => Promise<void>;
}) {
  const assignedIds = new Set(assignments.map(a => a.staff_id));
  const available = staff.filter(s => !assignedIds.has(s.id));

  return (
    <div className="tl-assignees-bd" data-task={taskId}>
      {assignments.length === 0 ? (
        <div className="pending-hint" style={{ padding: '4px 0' }}>No staff assigned yet</div>
      ) : (
        <div className="tl-assignees-list">
          {assignments.map(a => (
            <div key={a.id} className="tl-assignee">
              <span className={`tl-role ${a.role}`}>{a.role}</span>
              <span className="tl-name-mono">{a.staff?.first_name ?? a.staff_id.slice(0, 8)}</span>
              {a.role !== 'lead' ? (
                <button type="button" className="tl-promote" onClick={() => void onPromote(a.id)}>
                  promote → lead
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {available.length > 0 ? (
        <div className="tl-assign-add">
          <span className="ml" style={{ marginRight: 8 }}>Assign</span>
          <select
            className="cmd-modal-input"
            style={{ flex: 1, fontSize: 11 }}
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              void onAssign(v);
              e.currentTarget.value = '';
            }}
          >
            <option value="">+ add staff…</option>
            {available.map(s => <option key={s.id} value={s.id}>{s.first_name}</option>)}
          </select>
        </div>
      ) : null}
    </div>
  );
}

// TaskCompletionForm is the legacy component, fully feature-complete with per-type
// log writes (ipm_spray_log, batch_tank_mix_log, scouting_log, defoliation_log,
// cleaning_log, training_log, custom_task_log, saturation_check_log, irrigation_audit_log).
// Convert TaskShape → TaskCardData and delegate to it. Modal chrome is preserved
// for the visual contract; the form's internal layout is its own concern.

function toTaskCardData(t: TaskShape, room: RoomShape): TaskCardData {
  return {
    id: t.id,
    task_type: t.type as TaskType,
    room_name: room.code,
    assigned_to: t.assignee,
    assigned_to_name: t.assignee,
    status: t.status,
    estimated_duration: (t.raw.estimated_duration as string | null) ?? null,
    notes: (t.raw.notes as string | null) ?? null,
    scope: (t.raw.scope as string | undefined),
    task_config: t.raw.task_config,
  };
}

// ═══════════════════════════════════════════════════════════════
// Expanded room view — phase hero, stats, tasks main, sidebar swap
// ═══════════════════════════════════════════════════════════════
// Quick task types for inline add (matches legacy INLINE_TASK_TYPES set)
const INLINE_TASK_TYPES: TaskType[] = ['batch_tank_mix', 'ipm_spray', 'scouting', 'defoliation', 'cleaning', 'training', 'maintenance', 'custom'];

const ALL_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function phaseToDate(flipDate: string, phaseDay: number): string {
  const d = new Date(flipDate + 'T12:00:00');
  d.setDate(d.getDate() + phaseDay - 1);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ═══════════════════════════════════════════════════════════════
// ScheduleCalendar — dnd-kit reschedule (hairline restyle of legacy)
// Source: cultivo_drill_down_mechanics (drag-overlay uses 1px --op-line-strong
// border + --accent ink shift; no scale transform per new DS).
// ═══════════════════════════════════════════════════════════════

function DraggableTaskPill({ task, isOverlay }: { task: TaskShape; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  const cfg = TASK_TYPE_CONFIG[task.type as TaskType];
  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      {...(!isOverlay ? { ...attributes, ...listeners } : {})}
      className={`sched-pill ${isDragging && !isOverlay ? 'dragging' : ''} ${isOverlay ? 'overlay' : ''}`}
    >
      <span className="sched-pill-dot" style={{ background: cfg?.color ?? 'var(--op-ink-3)' }} />
      <span className="sched-pill-label">{cfg?.label ?? task.type}</span>
      {task.assignee ? <span className="sched-pill-assigned">●</span> : null}
    </div>
  );
}

function DroppableDayColumn({ dateStr, phaseDay, isToday, children }: {
  dateStr: string;
  phaseDay: number | null;
  isToday: boolean;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: dateStr });
  const d = new Date(dateStr + 'T12:00:00');
  const dayName = ALL_DAYS_SHORT[d.getDay()];
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;

  return (
    <div
      ref={setNodeRef}
      className={`sched-day ${isWeekend ? 'weekend' : ''} ${isOver ? 'dragover' : ''} ${isToday ? 'today' : ''}`}
    >
      <div className="sched-day-hd">
        <span className="sched-day-name">{dayName}</span>
        {phaseDay !== null ? <span className="sched-day-phase">D{phaseDay}</span> : null}
        <span className="sched-day-date">{formatShortDate(dateStr)}</span>
      </div>
      <div className="sched-day-bd">{children}</div>
    </div>
  );
}

function ScheduleCalendar({ room, tasks, today, onReschedule }: {
  room: RoomShape;
  tasks: TaskShape[];
  today: string;
  onReschedule: (taskId: string, newDate: string) => Promise<unknown>;
}) {
  const { schedules } = useTaskSchedules(room.room_id);
  const totalDays = room.cycleDays || 42;
  const currentPhaseDay = room.day ?? 1;
  const currentWeek = Math.max(1, Math.ceil(currentPhaseDay / 7));
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const [viewWeek, setViewWeek] = useState(currentWeek);
  const [activeId, setActiveId] = useState<string | null>(null);
  const flipDate = room.flipDate;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const weekDates = useMemo(() => {
    if (!flipDate) {
      const d = new Date(today + 'T12:00:00');
      const dayOfWeek = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        return { dateStr: date.toISOString().slice(0, 10), phaseDay: null as number | null };
      });
    }
    const weekStartDay = (viewWeek - 1) * 7 + 1;
    return Array.from({ length: 7 }, (_, i) => {
      const phaseDay = weekStartDay + i;
      return { dateStr: phaseToDate(flipDate, phaseDay), phaseDay };
    });
  }, [flipDate, viewWeek, today]);

  const dayTasks = useMemo(() => {
    const map = new Map<string, TaskShape[]>();
    for (const wd of weekDates) {
      map.set(wd.dateStr, tasks.filter(t => (t.raw.task_date as string) === wd.dateStr));
    }
    return map;
  }, [tasks, weekDates]);

  const milestones = useMemo(() => {
    if (!flipDate) return [] as { id: string; taskType: string; phaseDay: number; daysAway: number }[];
    return schedules
      .filter(s => s.scheduling_mode === 'phase_day' && s.phase_day_start != null)
      .map(s => {
        const phaseDay = s.phase_day_start!;
        const realDate = phaseToDate(flipDate, phaseDay);
        const daysAway = Math.round(
          (new Date(realDate + 'T00:00:00Z').getTime() - new Date(today + 'T00:00:00Z').getTime()) / 86400000
        );
        return { id: s.id, taskType: s.task_type, phaseDay, daysAway };
      })
      .toSorted((a, b) => a.phaseDay - b.phaseDay);
  }, [schedules, flipDate, today]);

  const draggedTask = activeId ? tasks.find(t => t.id === activeId) ?? null : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !active) return;
    const taskId = active.id as string;
    const newDate = over.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task || (task.raw.task_date as string) === newDate) return;
    await onReschedule(taskId, newDate);
  }, [tasks, onReschedule]);

  return (
    <div className="sched-cal">
      <div className="sched-cal-hd">
        <span className="ml">{room.code} schedule</span>
        <span className="ml-sm">
          {weekDates[0]?.phaseDay !== null && weekDates[6]?.phaseDay !== null
            ? `Day ${weekDates[0]?.phaseDay}-${weekDates[6]?.phaseDay} · `
            : ''}
          {formatShortDate(weekDates[0]?.dateStr ?? today)} – {formatShortDate(weekDates[6]?.dateStr ?? today)}
        </span>
        {flipDate ? (
          <div className="sched-cal-nav">
            <button
              type="button"
              className="sched-nav-btn"
              onClick={() => setViewWeek(w => Math.max(1, w - 1))}
              disabled={viewWeek <= 1}
            >‹</button>
            <span className="sched-week-label">Week {viewWeek} of {totalWeeks}</span>
            <button
              type="button"
              className="sched-nav-btn"
              onClick={() => setViewWeek(w => Math.min(totalWeeks, w + 1))}
              disabled={viewWeek >= totalWeeks}
            >›</button>
          </div>
        ) : null}
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="sched-grid">
          {weekDates.map(wd => (
            <DroppableDayColumn
              key={wd.dateStr}
              dateStr={wd.dateStr}
              phaseDay={wd.phaseDay}
              isToday={wd.dateStr === today}
            >
              {(dayTasks.get(wd.dateStr) ?? []).map(t => (
                <DraggableTaskPill key={t.id} task={t} />
              ))}
              {(dayTasks.get(wd.dateStr) ?? []).length === 0 ? (
                <span className="sched-day-empty">—</span>
              ) : null}
            </DroppableDayColumn>
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {draggedTask ? <DraggableTaskPill task={draggedTask} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {milestones.length > 0 ? (
        <div className="sched-milestones">
          <div className="ml" style={{ marginBottom: 6 }}>Phase milestones</div>
          {milestones.map(m => {
            const cfg = TASK_TYPE_CONFIG[m.taskType as TaskType];
            const isPast = m.daysAway < 0;
            return (
              <div key={m.id} className={`sched-milestone ${isPast ? 'past' : ''}`}>
                <span className="sched-milestone-dot" style={{ background: cfg?.color ?? 'var(--op-ink-3)' }} />
                <span className="sched-milestone-label">{cfg?.label ?? m.taskType}</span>
                <span className="sched-milestone-day">Day {m.phaseDay}</span>
                <span className="sched-milestone-away">
                  {m.daysAway === 0 ? 'TODAY' : m.daysAway > 0 ? `in ${m.daysAway}d` : `${Math.abs(m.daysAway)}d ago`}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="sched-cal-foot">drag a task pill to a different day to reschedule</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GlobalAddTaskModal — header-right + add. Picks room, then a task type.
// ═══════════════════════════════════════════════════════════════
function GlobalAddTaskModal({ rooms, today, onCreate, onClose, onJumpToRoom }: {
  rooms: RoomShape[];
  today: string;
  onCreate: (input: { room_id: string; task_type: string; task_date: string }) => Promise<unknown>;
  onClose: () => void;
  onJumpToRoom: (roomId: string) => void;
}) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = useCallback(async (taskType: TaskType) => {
    if (!selectedRoomId) return;
    setSaving(true);
    try {
      await onCreate({ room_id: selectedRoomId, task_type: taskType, task_date: today });
      onClose();
    } finally {
      setSaving(false);
    }
  }, [onCreate, selectedRoomId, today, onClose]);

  return (
    <div className="cmd-modal-overlay" onClick={onClose}>
      <div className="cmd-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="cmd-modal-hd">
          <span className="ml">Add task</span>
          <button type="button" className="cmd-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cmd-modal-bd">
          <div className="cmd-modal-row" style={{ gridTemplateColumns: '60px 1fr' }}>
            <span className="cmd-modal-key">Room</span>
            <select className="cmd-modal-input" value={selectedRoomId ?? ''} onChange={e => setSelectedRoomId(e.target.value || null)}>
              <option value="">— select —</option>
              {rooms.map(r => (
                <option key={r.room_id} value={r.room_id}>
                  {r.code} · {r.type} · {r.plants} plants
                </option>
              ))}
            </select>
          </div>
          {selectedRoomId ? (
            <div className="tl-add-row" style={{ borderTop: 0, padding: 0, marginTop: 4 }}>
              <span className="ml">Type</span>
              {INLINE_TASK_TYPES.map(type => {
                const cfg = TASK_TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    type="button"
                    className="tl-add-pill"
                    disabled={saving}
                    onClick={() => void handleCreate(type)}
                  >
                    <span className="d" style={{ background: cfg.color }} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="cmd-modal-ft">
          <button type="button" className="cmd-modal-cancel" onClick={onClose}>Cancel</button>
          {selectedRoomId ? (
            <button type="button" className="act-btn" style={{ flex: 1 }} onClick={() => onJumpToRoom(selectedRoomId)}>
              Jump to room →
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ExpandedRoom({ room, tasks, onBack, onUpdateStatus, onCompleteWithLog, onAssignWorker, onCreateTask, onReschedule, today }: {
  room: RoomShape;
  tasks: TaskShape[];
  onBack: () => void;
  onUpdateStatus: (id: string, status: TaskStatus) => Promise<unknown>;
  onCompleteWithLog: (id: string, refTable: string, refId: string, duration: string | null) => Promise<unknown>;
  onAssignWorker: (id: string, staffId: string) => Promise<unknown>;
  onCreateTask: (input: { room_id: string; task_type: string; task_date: string; assigned_to?: string | null; notes?: string | null }) => Promise<unknown>;
  onReschedule: (taskId: string, newDate: string) => Promise<unknown>;
  today: string;
}) {
  const [completingTask, setCompletingTask] = useState<TaskShape | null>(null);
  const [showHarvest, setShowHarvest] = useState(false);
  const [focusedCard, setFocusedCard] = useState<null | 'schedule' | 'plants' | 'tables' | 'env' | 'feed'>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleInlineAdd = useCallback(async (taskType: TaskType) => {
    setAdding(true);
    try {
      await onCreateTask({ room_id: room.room_id, task_type: taskType, task_date: today });
      setShowInlineAdd(false);
    } finally {
      setAdding(false);
    }
  }, [onCreateTask, room.room_id, today]);

  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);
  const { assignments, assignToTask, promoteToLead, getForTask } = useTaskAssignments({ taskIds });
  const { staff: activeStaff } = useActiveStaff();
  const staffOptions = useMemo(
    () => (activeStaff ?? []).map(s => ({ id: s.id, first_name: s.first_name })),
    [activeStaff]
  );

  const done = tasks.filter(t => t.status === 'completed').length;
  const dotClass = STAGE_DOT_CLASS[room.type] ?? 'd-mixed';
  const harvUrg = urgencyMessage(room);

  const handleToggle = useCallback((task: TaskShape) => {
    if (task.status === 'pending') {
      void onUpdateStatus(task.id, 'in_progress');
    }
  }, [onUpdateStatus]);

  const handleRowExpand = useCallback((taskId: string) => {
    setExpandedTaskId(prev => (prev === taskId ? null : taskId));
  }, []);

  const handleCompletionDone = useCallback((refTable: string, refId: string, duration: string | null) => {
    if (!completingTask) return;
    void onCompleteWithLog(completingTask.id, refTable, refId, duration);
    setCompletingTask(null);
  }, [completingTask, onCompleteWithLog]);

  const cycleLeft = room.day !== null ? Math.max(0, room.cycleDays - room.day) : null;
  const harvestVal = room.harvestDays !== null ? `${Math.abs(room.harvestDays)}d` : (cycleLeft !== null ? `${cycleLeft}d` : '—');
  const harvestSub = room.harvestDate ? `projected ${shortDate(room.harvestDate)}` : (room.type === 'veg' ? 'to flip' : '');
  const remaining = tasks.length - done;
  const sortedTasks = useMemo(
    () => tasks.toSorted((a, b) => {
      const order = (s: TaskStatus) => s === 'in_progress' ? 0 : s === 'pending' ? 1 : 2;
      return order(a.status) - order(b.status);
    }),
    [tasks]
  );

  return (
    <div className="exp" style={{ ['--vt-room' as string]: `cmd-room-${room.code}` }}>
      {/* Strip 1: identity + actions, hairline only */}
      <div className="exp-strip">
        <div className="exp-id">
          <button type="button" className="back-btn" onClick={onBack}>← Rooms</button>
          <span className={`d ${dotClass}`} />
          <span className="exp-code">{room.code}</span>
          <span className="exp-meta">
            <span>{room.type}</span>
            {room.day !== null ? <span>Day {room.day}</span> : null}
            <span>{room.plants} plants</span>
          </span>
          {room.strains.length > 0 ? (
            <span className="strain-mini">{room.strains.slice(0, 4).join(' · ')}{room.strains.length > 4 ? ` +${room.strains.length - 4}` : ''}</span>
          ) : null}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {harvUrg ? (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: urgencyColor(room.urgency) }}>{harvUrg}</span>
            ) : null}
            {room.type === 'flower' ? (
              <button type="button" className="act-btn" onClick={() => setShowHarvest(true)}>Harvest</button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Strip 2: phase + room context (combined into one read) */}
      <div className="exp-strip">
        <div className="exp-strip-hd">
          <span className="ml">Cycle</span>
          <span className="ml-sm">{room.flipDate ? `flipped ${shortDate(room.flipDate)}` : (room.type === 'mother' ? 'perpetual' : 'pre-flip')}</span>
        </div>
        <div className="exp-context">
          <div className="ctx-cell ctx-phase">
            <PhaseHero room={room} />
          </div>
          <div className="ctx-cell">
            <span className="ctx-label">Day</span>
            <span className="ctx-val">{room.day ?? '—'}</span>
            <span className="ctx-sub">of {room.cycleDays}</span>
          </div>
          <div className="ctx-cell">
            <span className="ctx-label">Harvest</span>
            <span className="ctx-val proj">{harvestVal}</span>
            <span className="ctx-sub">{harvestSub}</span>
          </div>
          <div className="ctx-cell">
            <span className="ctx-label">Plants</span>
            <span className="ctx-val">{room.plants}</span>
            <span className="ctx-sub">{room.strains.length} strain{room.strains.length === 1 ? '' : 's'}</span>
          </div>
          <div className="ctx-cell">
            <span className="ctx-label">Mortality</span>
            <span className="ctx-val">—</span>
            <span className="ctx-sub">PR3</span>
          </div>
        </div>
      </div>

      {/* Strip 2 was tasks; now hoisted into the card-swap body below */}
      <div className="exp-body">
        {/* Main panel — tasks (default) or focused card content */}
        <div className="exp-main">
          {focusedCard === null ? (
            <>
              <div className="exp-main-hd">
                <span className="ml">Today</span>
                <span className="ml-sm">{done}/{tasks.length} done · {remaining === 0 ? 'all clear' : `${remaining} to go`}</span>
                <span className="ml-sm" style={{ marginLeft: 'auto' }}>tap row to start · tap again to log</span>
              </div>
              <div className="exp-main-bd no-pad">
                <div className="exp-tasks">
                  {sortedTasks.length > 0 ? (
                    sortedTasks.map(t => {
                      const taskAssignments = getForTask(t.id);
                      const expanded = expandedTaskId === t.id;
                      return (
                        <div key={t.id}>
                          <TaskRow
                            task={t}
                            onToggle={() => handleToggle(t)}
                            onOpenComplete={() => setCompletingTask(t)}
                            onExpand={() => handleRowExpand(t.id)}
                            assigneeCount={taskAssignments.length}
                            isExpanded={expanded}
                          />
                          {expanded ? (
                            <TaskRowAssignees
                              taskId={t.id}
                              assignments={taskAssignments}
                              staff={staffOptions}
                              onAssign={async (staffId) => { await assignToTask(t.id, staffId); }}
                              onPromote={async (id) => { await promoteToLead(id); }}
                            />
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <div className="cmd-empty">No tasks scheduled today</div>
                  )}
                  {showInlineAdd ? (
                    <div className="tl-add-row">
                      <span className="ml">Add</span>
                      {INLINE_TASK_TYPES.map(type => {
                        const cfg = TASK_TYPE_CONFIG[type];
                        return (
                          <button
                            key={type}
                            type="button"
                            className="tl-add-pill"
                            disabled={adding}
                            onClick={() => void handleInlineAdd(type)}
                          >
                            <span className="d" style={{ background: cfg.color }} />
                            {cfg.label}
                          </button>
                        );
                      })}
                      <button type="button" className="tl-add-cancel" onClick={() => setShowInlineAdd(false)}>cancel</button>
                    </div>
                  ) : (
                    <button type="button" className="tl-add" onClick={() => setShowInlineAdd(true)}>+ add task</button>
                  )}
                </div>
              </div>
            </>
          ) : focusedCard === 'schedule' ? (
            <>
              <div className="exp-main-hd">
                <span className="ml">Schedule</span>
                <span className="ml-sm">drag to reschedule</span>
                <button type="button" className="exp-back" onClick={() => setFocusedCard(null)}>← Tasks</button>
              </div>
              <div className="exp-main-bd no-pad">
                <ScheduleCalendar room={room} tasks={tasks} today={today} onReschedule={onReschedule} />
              </div>
            </>
          ) : focusedCard === 'plants' ? (
            <>
              <div className="exp-main-hd">
                <span className="ml">Plants</span>
                <span className="ml-sm">{room.plants} total · {room.strains.length} strain{room.strains.length === 1 ? '' : 's'}</span>
                <button type="button" className="exp-back" onClick={() => setFocusedCard(null)}>← Tasks</button>
              </div>
              <div className="exp-main-bd">
                {room.strains.length > 0 ? (
                  <div className="rail-strains" style={{ gap: 6 }}>
                    {room.strains.map(s => <span key={s} className="rail-strain-pill">{s}</span>)}
                  </div>
                ) : <div className="pending-hint">No strains assigned</div>}
                <div style={{ marginTop: 12, padding: '10px 0 0', borderTop: '1px dashed var(--op-line)', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--op-ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  PR2 · per-group breakdown with section anchors · split-and-move
                </div>
              </div>
            </>
          ) : focusedCard === 'tables' ? (
            <>
              <div className="exp-main-hd">
                <span className="ml">Tables + Sections</span>
                <span className="ml-sm">tap a section to see strain mix · PR2 · move/kill/print/advance</span>
                <button type="button" className="exp-back" onClick={() => setFocusedCard(null)}>← Tasks</button>
              </div>
              <div className="exp-main-bd">
                <SectionsLayout roomId={room.room_id} />
              </div>
            </>
          ) : focusedCard === 'feed' ? (
            <>
              <div className="exp-main-hd">
                <span className="ml">Feed Recipe</span>
                <span className="ml-sm">stage · {room.type} · day {room.day ?? '—'}</span>
                <button type="button" className="exp-back" onClick={() => setFocusedCard(null)}>← Tasks</button>
              </div>
              <div className="exp-main-bd">
                <FeedRecipe room={room} />
              </div>
            </>
          ) : (
            <>
              <div className="exp-main-hd">
                <span className="ml">Environment</span>
                <span className="ml-sm">manual targets · sensor integration pending</span>
                <button type="button" className="exp-back" onClick={() => setFocusedCard(null)}>← Tasks</button>
              </div>
              <div className="exp-main-bd no-pad">
                <div className="exp-env">
                  <div className="env-cell">
                    <span className="env-label">Temp</span>
                    <span className="env-val">{room.envTarget.temp_f}</span>
                    <span className="env-unit">°F</span>
                    <span className="env-tag">manual</span>
                  </div>
                  <div className="env-cell">
                    <span className="env-label">RH</span>
                    <span className="env-val">{room.envTarget.rh_pct}</span>
                    <span className="env-unit">%</span>
                    <span className="env-tag">manual</span>
                  </div>
                  <div className="env-cell">
                    <span className="env-label">VPD</span>
                    <span className="env-val">{room.envTarget.vpd_kpa}</span>
                    <span className="env-unit">kPa</span>
                    <span className="env-tag">manual</span>
                  </div>
                  <div className="env-cell">
                    <span className="env-label">CO2</span>
                    <span className="env-val">{room.envTarget.co2_ppm}</span>
                    <span className="env-unit">{room.envTarget.co2_ppm === 'ambient' ? '' : 'ppm'}</span>
                    <span className="env-tag">manual</span>
                  </div>
                </div>
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--op-line)', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--op-ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  v2 · live readings via Aroya / Trolmaster
                </div>
              </div>
            </>
          )}
        </div>

        {/* Rail — compact cards, click to swap into main */}
        <div className="exp-rail-wrap">
          {focusedCard !== null ? (
            <button type="button" className="exp-rail-tasks" onClick={() => setFocusedCard(null)}>
              <span className="ml">Tasks</span>
              <span className="ml-sm">{done}/{tasks.length} · {remaining === 0 ? 'clear' : `${remaining} open`}</span>
              <span className="exp-back" style={{ marginLeft: 'auto' }}>open</span>
            </button>
          ) : null}
          {focusedCard !== 'schedule' ? (
            <button type="button" className="rail-card" onClick={() => setFocusedCard('schedule')}>
              <div className="rail-card-hd"><span className="ml">Schedule</span><span className="ml-sm" style={{ marginLeft: 'auto' }}>3-day</span></div>
              <div className="rail-card-bd compact">
                <span className="rail-stat"><span className="rail-stat-val">{tasks.length}</span><span className="rail-stat-lbl">today</span></span>
                <span className="rail-stat"><span className="rail-stat-val">{done}</span><span className="rail-stat-lbl">done</span></span>
                <span className="rail-stat"><span className="rail-stat-val">{tasks.length - done}</span><span className="rail-stat-lbl">left</span></span>
              </div>
            </button>
          ) : null}
          {focusedCard !== 'plants' ? (
            <button type="button" className="rail-card" onClick={() => setFocusedCard('plants')}>
              <div className="rail-card-hd"><span className="ml">Plants</span><span className="ml-sm" style={{ marginLeft: 'auto' }}>{room.plants}</span></div>
              <div className="rail-card-bd">
                <div className="rail-strains">
                  {room.strains.slice(0, 5).map(s => <span key={s} className="rail-strain-pill">{s}</span>)}
                  {room.strains.length > 5 ? <span className="rail-strain-pill">+{room.strains.length - 5}</span> : null}
                </div>
              </div>
            </button>
          ) : null}
          {focusedCard !== 'tables' ? (
            <button type="button" className="rail-card" onClick={() => setFocusedCard('tables')}>
              <div className="rail-card-hd"><span className="ml">Tables</span><span className="ml-sm" style={{ marginLeft: 'auto' }}>tap to expand</span></div>
              <div className="rail-card-bd compact">
                <span className="rail-stat"><span className="rail-stat-val">{room.plants}</span><span className="rail-stat-lbl">plants placed</span></span>
              </div>
            </button>
          ) : null}
          {focusedCard !== 'env' ? (
            <button type="button" className="rail-card" onClick={() => setFocusedCard('env')}>
              <div className="rail-card-hd"><span className="ml">Environment</span><span className="ml-sm" style={{ marginLeft: 'auto' }}>manual</span></div>
              <div className="rail-card-bd compact">
                <span className="rail-stat"><span className="rail-stat-val">{room.envTarget.temp_f}</span><span className="rail-stat-unit">°F</span></span>
                <span className="rail-stat"><span className="rail-stat-val">{room.envTarget.rh_pct}</span><span className="rail-stat-unit">%</span></span>
                <span className="rail-stat"><span className="rail-stat-val">{room.envTarget.vpd_kpa}</span><span className="rail-stat-unit">kPa</span></span>
              </div>
            </button>
          ) : null}
          {focusedCard !== 'feed' ? (
            <button type="button" className="rail-card" onClick={() => setFocusedCard('feed')}>
              <div className="rail-card-hd"><span className="ml">Feed Recipe</span><span className="ml-sm" style={{ marginLeft: 'auto' }}>tap to expand</span></div>
              <div className="rail-card-bd compact">
                <span className="rail-stat-lbl">stage {room.type} · day {room.day ?? '—'}</span>
              </div>
            </button>
          ) : null}
        </div>
      </div>

      {completingTask ? (
        <TaskCompletionForm
          task={toTaskCardData(completingTask, room)}
          roomId={room.room_id}
          staffOptions={staffOptions}
          onAssignWorker={async (taskId, staffId) => { await onAssignWorker(taskId, staffId); }}
          onComplete={handleCompletionDone}
          onNavigateHarvest={() => { setCompletingTask(null); setShowHarvest(true); }}
          onNavigateClone={() => { setCompletingTask(null); }}
          onClose={() => setCompletingTask(null)}
        />
      ) : null}
      {/* Suppress unused-import warning while keeping room reference for future task room-selector logic. */}
      {assignments.length === -1 ? <span data-room={room.room_id} /> : null}
      {showHarvest ? (
        <div className="cmd-modal-overlay" onClick={() => setShowHarvest(false)}>
          <div className="cmd-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="cmd-modal-hd">
              <span className="ml">Harvest · {room.code}</span>
              <button type="button" className="cmd-modal-close" onClick={() => setShowHarvest(false)}>✕</button>
            </div>
            <div className="cmd-modal-bd" style={{ padding: 0 }}>
              <HarvestWorkflow
                initialRoomId={room.room_id}
                onComplete={() => setShowHarvest(false)}
                onCancel={() => setShowHarvest(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Top-level CommandCenter
// ═══════════════════════════════════════════════════════════════
export function CommandCenter() {
  const data = useCommandCenterData();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [featuredRoomId, setFeaturedRoomId] = useState<string | null>(null);
  const [showGlobalAdd, setShowGlobalAdd] = useState(false);

  // Auto-feature: closest-to-harvest flower room (preserves cult-ops behavior)
  const defaultFeaturedId = useMemo(() => {
    const flower = data.rooms.filter(r => r.type === 'flower' && !r.empty);
    if (flower.length === 0) return null;
    const sorted = flower.toSorted((a, b) => {
      const ad = a.harvestDays ?? Infinity;
      const bd = b.harvestDays ?? Infinity;
      return ad - bd;
    });
    return sorted[0]?.room_id ?? null;
  }, [data.rooms]);

  const activeFeaturedId = featuredRoomId ?? defaultFeaturedId;
  const selectedRoom = useMemo(
    () => selectedRoomId ? data.rooms.find(r => r.room_id === selectedRoomId) ?? null : null,
    [selectedRoomId, data.rooms]
  );
  const selectedTasks = useMemo(
    () => selectedRoom ? (data.tasksByRoom.get(selectedRoom.room_id) ?? []) : [],
    [selectedRoom, data.tasksByRoom]
  );

  // Helper: dispatch a state change wrapped in document.startViewTransition when supported
  const transition = useCallback((apply: () => void) => {
    type DocWithVT = Document & { startViewTransition?: (cb: () => void) => unknown };
    const doc = document as DocWithVT;
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(apply);
    } else {
      apply();
    }
  }, []);

  // Two-stage click: first click features, second click expands (with view transition)
  const handleTileClick = useCallback((roomId: string) => {
    if (activeFeaturedId === roomId) {
      transition(() => setSelectedRoomId(roomId));
    } else {
      setFeaturedRoomId(roomId);
    }
  }, [activeFeaturedId, transition]);

  // Direct expand (from AttentionStrip — skip featuring)
  const handleAttentionClick = useCallback((roomId: string) => {
    transition(() => setSelectedRoomId(roomId));
  }, [transition]);

  const handleBack = useCallback(() => {
    type DocWithVT = Document & { startViewTransition?: (cb: () => void) => unknown };
    const doc = document as DocWithVT;
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(() => setSelectedRoomId(null));
    } else {
      setSelectedRoomId(null);
    }
  }, []);

  // Top task type today
  const topType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of data.tasks) {
      counts.set(t.type, (counts.get(t.type) ?? 0) + 1);
    }
    let best = ''; let max = 0;
    counts.forEach((n, k) => { if (n > max) { best = k; max = n; } });
    return TASK_TYPE_CONFIG[best as TaskType]?.label ?? best;
  }, [data.tasks]);

  // Room sectioning — active rooms grouped by stage; empty collapsed to a strip
  const roomSections = useMemo(() => {
    const active = data.rooms.filter(r => !r.empty);
    const empty = data.rooms.filter(r => r.empty);
    return {
      flower: active.filter(r => r.type === 'flower'),
      veg: active.filter(r => r.type === 'veg'),
      clone: active.filter(r => r.type === 'clone'),
      mother: active.filter(r => r.type === 'mother'),
      other: active.filter(r => !['flower', 'veg', 'clone', 'mother'].includes(r.type)),
      empty,
    };
  }, [data.rooms]);

  // Static sparks for now; PR3 wires real 7-day rollups
  const sparks = useMemo(() => ({
    total: [18, 21, 24, 19, 25, 22, data.totals.total],
    done: [10, 14, 18, 12, 20, 16, data.totals.done],
  }), [data.totals.total, data.totals.done]);

  if (data.loading) {
    return <div className="cmd"><div className="cmd-loading">loading cultivation state…</div></div>;
  }

  const activeRooms = data.rooms.filter(r => !r.empty).length;

  return (
    <div className="cmd">
      <div className="hdr">
        <div className="hdr-l">
          <span className="hdr-title">Cultivation Command</span>
          <span className="hdr-meta">{formatToday()}</span>
          <span className="hdr-meta">tasks <strong>{data.totals.done} / {data.totals.total}</strong> today</span>
        </div>
        <div className="hdr-r">
          <button type="button" className="hdr-add" onClick={() => setShowGlobalAdd(true)}>+ add</button>
          <span className="hdr-live">live</span>
        </div>
      </div>

      {showGlobalAdd ? (
        <GlobalAddTaskModal
          rooms={data.rooms.filter(r => !r.empty)}
          today={data.today}
          onCreate={data.createTask}
          onClose={() => setShowGlobalAdd(false)}
          onJumpToRoom={(roomId) => { setShowGlobalAdd(false); transition(() => setSelectedRoomId(roomId)); }}
        />
      ) : null}
      {selectedRoom ? (
        <ExpandedRoom
          room={selectedRoom}
          tasks={selectedTasks}
          onBack={handleBack}
          onUpdateStatus={data.updateStatus}
          onCompleteWithLog={data.completeWithLog}
          onAssignWorker={data.assignWorker}
          onCreateTask={data.createTask}
          onReschedule={async (taskId, newDate) => { await data.updateTask(taskId, { task_date: newDate }); }}
          today={data.today}
        />
      ) : (
        <>
          <AttentionStrip rooms={data.rooms} onRoomClick={handleAttentionClick} />
          <LaborStrip
            totals={data.totals}
            roomCount={activeRooms}
            topType={topType}
            sparks={sparks}
          />
          <div className="sec">
            <div className="sec-hd">
              <span className="ml">Rooms</span>
              <span className="ml-sm ml-r">{activeRooms} active · {roomSections.empty.length} empty</span>
            </div>
            {(['flower', 'veg', 'clone', 'mother', 'other'] as const).map(stage => {
              const list = roomSections[stage];
              if (list.length === 0) return null;
              const label = stage === 'other' ? 'Mixed' : stage.charAt(0).toUpperCase() + stage.slice(1);
              const totalPlants = list.reduce((sum, r) => sum + r.plants, 0);
              return (
                <div key={stage} className="rooms-section">
                  <div className="rooms-section-hd">
                    <span className="ml">{label}</span>
                    <span className="ml-sm">{list.length} room{list.length === 1 ? '' : 's'} · {totalPlants} plants</span>
                  </div>
                  <div className="rooms">
                    {list.map(r => (
                      <RoomCard
                        key={r.room_id}
                        room={r}
                        tasks={data.tasksByRoom.get(r.room_id) ?? []}
                        isFeatured={r.room_id === activeFeaturedId}
                        onClick={handleTileClick}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {roomSections.empty.length > 0 ? (
              <div className="rooms-empty-strip">
                <span className="ml">Empty</span>
                {roomSections.empty.map(r => (
                  <button key={r.room_id} type="button" className="rooms-empty-pill" onClick={() => handleAttentionClick(r.room_id)}>
                    {r.code}
                  </button>
                ))}
                <span className="ml-sm" style={{ marginLeft: 'auto' }}>{roomSections.empty.length} room{roomSections.empty.length === 1 ? '' : 's'} · ready for plant-in</span>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export default CommandCenter;
