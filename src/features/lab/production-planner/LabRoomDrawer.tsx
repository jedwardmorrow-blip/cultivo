import { useEffect, useMemo } from 'react';
import type { CalendarRoom, StrainCultivationStats } from '@/features/production-planner/types';
import type { Batch } from './planner-mock';
import type { MotherLot } from './LabPlanCycleForm';

interface LabRoomDrawerProps {
  room: CalendarRoom | null;
  /** All rooms (for room-code lookup in segment timeline). */
  rooms: CalendarRoom[];
  /** All batches in the facility; the drawer filters to those currently in `room`. */
  batches: Batch[];
  selectedBatchId: string | null;
  strainStatsById: Map<string, StrainCultivationStats>;
  /**
   * Mother lots in the genetics library, keyed by mom_plant_group_id.
   * The BatchPane uses this to render the Mother row's "model" pill
   * conditionally — only when the actual mother is synthetic-back-filled
   * per the cultivo_planner_data_lineage v2 doctrine. Without this,
   * the drawer hardcoded the pill on every mother row, which lied for
   * the 16 plausibly-dated mothers.
   */
  motherLots?: MotherLot[];
  onClose: () => void;
  onSelectBatch: (id: string | null) => void;
  onPlanCycle?: (room: CalendarRoom) => void;
}

function fmtNum(n: number | null | undefined, suffix = ''): string {
  if (n === null || n === undefined) return '—';
  return `${Math.round(n).toLocaleString()}${suffix}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `${n.toFixed(1)}%`;
}

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysFromToday(iso: string): number {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/* ─────────── FIG. 02 ROOM PANE — lists batches in the room ─────────── */

function RoomPane({
  room,
  batches,
  selectedBatchId,
  split,
  onSelectBatch,
}: {
  room: CalendarRoom;
  batches: Batch[];
  selectedBatchId: string | null;
  split: boolean;
  onSelectBatch: (id: string) => void;
}) {
  const cap = room.capacity_plants ?? 0;
  const utilizationPct = cap > 0 ? Math.round((room.total_plants / cap) * 100) : 0;

  // Batches currently in this room (mother room is special: shows mother
  // strains as a genetics-library list, not as batches).
  const isMother = room.room_type === 'mother';
  const inRoom = batches.filter((b) => b.current_room_id === room.room_id);

  return (
    <div className={`drawer-room-pane ${split ? 'split' : ''}`}>
      <div className="drawer-stamp">
        <span className="serial">FIG. 02</span>
        <span className="sep">·</span>
        <span>Room</span>
        <span className="sep">·</span>
        <span className="strong">{room.room_code}</span>
        <span className="sep">·</span>
        <span>{room.room_type}</span>
      </div>

      <div className="drawer-room-head">
        <div className="drawer-cap-row">
          <span className="cap">Capacity</span>
          <span className="display drawer-big-num">
            {room.total_plants}
            <span className="mute">{room.capacity_plants ? ` / ${room.capacity_plants}` : ''}</span>
          </span>
        </div>
        <div className="drawer-fill">
          <div className="drawer-fill-track">
            <div
              className="drawer-fill-fill"
              style={{ width: `${Math.min(100, utilizationPct)}%` }}
              aria-label={`${utilizationPct}% utilized`}
            />
          </div>
          <span className="cap mute">{utilizationPct}% utilized</span>
        </div>
      </div>

      <div className="drawer-section-cap">
        <span>{isMother ? 'Genetics' : 'Batches'}</span>
        <span className="cap mute">{isMother ? room.strains.length : inRoom.length}</span>
      </div>

      {isMother ? (
        <div className="drawer-strain-list">
          {room.strains.map((s) => (
            <div key={s.strain_id} className="drawer-strain-row mother-row">
              <div className="drawer-strain-head">
                <span className="bar-dot dot-mother" aria-hidden />
                <span className="strain-name">{s.strain_name}</span>
                <span className="strain-stage cap mute">mother</span>
                <span className="strain-count num">×{s.plant_count}</span>
              </div>
              <div className="drawer-strain-meta">
                <span>Established <span className="num">{s.earliest_planted_date ? fmtDateShort(s.earliest_planted_date) : '—'}</span></span>
                <span className="quarantine-pill" title="Mother establishment date is back-filled per data-lineage doctrine">model</span>
              </div>
            </div>
          ))}
        </div>
      ) : inRoom.length === 0 ? (
        <div className="drawer-empty">
          <span className="cap mute">No active batches in this room</span>
        </div>
      ) : (
        <div className="drawer-batch-list">
          {inRoom.map((b) => {
            const currentSeg = b.segments.find((s) => s.is_current);
            const flowerSeg = b.segments.find((s) => s.stage === 'flower');
            const harvestISO = flowerSeg?.end ?? null;
            const daysToHarvest = harvestISO ? daysFromToday(harvestISO) : null;
            const isSelected = selectedBatchId === b.batch_id;
            return (
              <div
                key={b.batch_id}
                className={`drawer-batch-row ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectBatch(b.batch_id)}
                role="button"
                tabIndex={0}
              >
                <div className="drawer-batch-head">
                  <span className={`bar-dot dot-${b.current_stage}`} aria-hidden />
                  <span className="batch-code mono">{b.batch_code}</span>
                  <span className="batch-strain">{b.strain_name}</span>
                  <span className="batch-stage cap mute">{b.current_stage}</span>
                  <span className="batch-count num">×{currentSeg?.plant_count ?? 0}</span>
                </div>
                <div className="drawer-batch-meta">
                  {harvestISO && daysToHarvest !== null && (
                    <span>
                      Harvest <span className="num">{fmtDateShort(harvestISO)}</span>
                      {daysToHarvest >= 0 && (
                        <span className="cap mute"> · {daysToHarvest}d</span>
                      )}
                    </span>
                  )}
                  <span>Cut <span className="num">{fmtDateShort(b.clone_cut_date)}</span></span>
                  <span className="open-chip">Open Batch →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────── FIG. 03 BATCH PANE — lineage timeline + cycle detail ─────────── */

function BatchPane({
  batch,
  rooms,
  strainStats,
  syntheticMotherIds,
  onClose,
}: {
  batch: Batch;
  rooms: CalendarRoom[];
  strainStats: StrainCultivationStats | null;
  /** Set of mom_plant_group_ids whose mother is synthetic-back-filled
   *  per the 2026-04-27 audit-import burst fingerprint. The Mother row's
   *  "model" pill renders only when the batch's mom_plant_group_id is in
   *  this set — never always-on. */
  syntheticMotherIds: Set<string>;
  onClose: () => void;
}) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const flowerSeg = batch.segments.find((s) => s.stage === 'flower');
  const vegSeg = batch.segments.find((s) => s.stage === 'veg');
  const cloneSeg = batch.segments.find((s) => s.stage === 'clone');
  const harvestISO = flowerSeg?.end ?? null;
  const daysToHarvest = harvestISO ? daysFromToday(harvestISO) : null;

  const totalCycleDays = cloneSeg && flowerSeg ? daysBetween(cloneSeg.start, flowerSeg.end) : null;

  const roomCodeById = useMemo(() => {
    const m = new Map<string, string>();
    rooms.forEach((r) => m.set(r.room_id, r.room_code));
    return m;
  }, [rooms]);

  // Linear progress: today's position along the clone→harvest line.
  const progressPct = (() => {
    if (!cloneSeg || !flowerSeg) return 0;
    const start = new Date(cloneSeg.start).getTime();
    const end = new Date(flowerSeg.end).getTime();
    const now = today.getTime();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  })();

  const yieldGrams = batch.forecast_yield_grams ?? null;
  const revenue = yieldGrams ? yieldGrams * 4.5 : null;

  return (
    <div className="drawer-strain-pane drawer-batch-pane">
      <div className="drawer-stamp">
        <span className="serial">FIG. 03</span>
        <span className="sep">·</span>
        <span>Batch</span>
        <span className="sep">·</span>
        <span className="strong mono">{batch.batch_code}</span>
        {batch.is_quarantined && (
          <span
            className="quarantine-pill"
            title={batch.quarantine_reason ?? 'Batch lineage suspect per cultivo_planner_data_lineage doctrine'}
          >
            quarantined
          </span>
        )}
        <button className="drawer-stamp-x" onClick={onClose} aria-label="Close batch detail">×</button>
      </div>

      {/* Identity strip */}
      <div className="drawer-batch-identity">
        <div className="identity-row">
          <span className="cap">Strain</span>
          <span className="strong">{batch.strain_name}</span>
        </div>
        <div className="identity-row">
          <span className="cap">Stage</span>
          <span className="strong">
            <span className={`bar-dot dot-${batch.current_stage}`} aria-hidden />{' '}
            {batch.current_stage.toUpperCase()}
          </span>
        </div>
        <div className="identity-row">
          <span className="cap">Mother</span>
          <span className="strong">
            {batch.mom_strain_name ?? 'External'}
            {batch.mom_strain_name &&
              batch.mom_plant_group_id &&
              syntheticMotherIds.has(batch.mom_plant_group_id) && (
                <span
                  className="quarantine-pill"
                  title="Mother establishment date falls in the 2026-04-27 audit-import burst window per cultivo_planner_data_lineage v2. Operator-verified mothers do not carry this pill."
                >
                  model
                </span>
              )}
          </span>
        </div>
      </div>

      {/* Lifecycle progress */}
      <div className="drawer-section-cap">
        <span>Lifecycle</span>
        <span className="cap mute">
          {totalCycleDays ? `${totalCycleDays}d total` : '—'}
        </span>
      </div>
      <div className="drawer-batch-progress">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          <div className="progress-marker" style={{ left: `${progressPct}%` }} aria-hidden />
        </div>
        <div className="progress-label cap">
          <span>Day {Math.round(((progressPct / 100) * (totalCycleDays ?? 0)))}</span>
          <span className="mute">{progressPct}% of cycle</span>
        </div>
      </div>

      {/* Stage segments timeline (clone → veg → flower) */}
      <div className="drawer-section-cap">
        <span>Segments</span>
      </div>
      <div className="drawer-segment-list">
        {batch.segments.map((seg, i) => {
          const roomCode = roomCodeById.get(seg.room_id) ?? seg.room_id;
          const dur = daysBetween(seg.start, seg.end);
          const isPast = new Date(seg.end).getTime() <= today.getTime();
          const isFuture = new Date(seg.start).getTime() > today.getTime();
          const status = seg.is_current ? 'now' : isPast ? 'past' : isFuture ? 'projected' : 'now';
          const isSegSynthetic = !!seg.is_synthetic;
          return (
            <div
              key={i}
              className={`segment-row segment-${status} ${isSegSynthetic ? 'segment-synthetic' : ''}`}
              title={isSegSynthetic && seg.synthetic_reason ? seg.synthetic_reason : undefined}
            >
              <span className={`bar-dot dot-${seg.stage}`} aria-hidden />
              <span className="segment-stage mono">{seg.stage.toUpperCase()}</span>
              <span className="segment-room cap">{roomCode}</span>
              <span className={`segment-dates mono ${isSegSynthetic ? 'quarantine-underline' : ''}`}>
                {fmtDateShort(seg.start)} → {fmtDateShort(seg.end)}
              </span>
              <span className="segment-dur cap mute">{dur}d</span>
              {seg.is_current && <span className="segment-now-pill">NOW</span>}
              {isFuture && !seg.is_current && <span className="segment-future-pill">PROJECTED</span>}
              {isSegSynthetic && (
                <span
                  className="quarantine-pill"
                  title={seg.synthetic_reason ?? 'Segment dates inferred per data-lineage doctrine'}
                >
                  model
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Forecast */}
      <div className="drawer-section-cap">
        <span>Forecast</span>
      </div>
      <div className="drawer-stat-grid">
        <Stat label="Plants" value={fmtNum(batch.segments[0]?.plant_count)} />
        <Stat label="Yield" value={yieldGrams ? `${(yieldGrams / 1000).toFixed(1)} kg` : '—'} />
        <Stat label="Revenue" value={revenue ? `$${Math.round(revenue).toLocaleString()}` : '—'} />
        <Stat
          label="To Harvest"
          value={harvestISO ? fmtDateShort(harvestISO) : '—'}
          sub={daysToHarvest !== null && daysToHarvest >= 0 ? `${daysToHarvest}d remaining` : undefined}
        />
      </div>

      {/* Strain hand-off */}
      {strainStats && (
        <>
          <div className="drawer-section-cap">
            <span>Strain · {strainStats.strain_name}</span>
          </div>
          <div className="drawer-stat-grid">
            <Stat label="Flower Time" value={fmtNum(strainStats.flowering_time_days, ' d')} />
            <Stat label="Yield / sqft" value={fmtNum(strainStats.avg_wet_g_per_sqft, ' g')} />
            <Stat label="THC" value={fmtPct(strainStats.avg_thc_pct)} />
            <Stat label="Demand" value={fmtNum(strainStats.demand_total_units, ' u')} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="drawer-stat">
      <span className="cap">{label}</span>
      <span className="display drawer-stat-num">{value}</span>
      {sub && <span className="cap mute">{sub}</span>}
    </div>
  );
}

export function LabRoomDrawer({
  room,
  rooms,
  batches,
  selectedBatchId,
  strainStatsById,
  motherLots,
  onClose,
  onSelectBatch,
  onPlanCycle,
}: LabRoomDrawerProps) {
  useEffect(() => {
    if (!room) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [room, onClose]);

  // Stable Set of mom_plant_group_ids whose mother is synthetic. Computed
  // once per motherLots change so BatchPane lookups are O(1).
  const syntheticMotherIds = useMemo(() => {
    const s = new Set<string>();
    for (const m of motherLots ?? []) {
      if (m.synthetic && m.mom_plant_group_id) s.add(m.mom_plant_group_id);
    }
    return s;
  }, [motherLots]);

  if (!room) return null;

  const split = !!selectedBatchId;
  const selectedBatch = selectedBatchId ? batches.find((b) => b.batch_id === selectedBatchId) ?? null : null;
  const strainStats = selectedBatch ? strainStatsById.get(selectedBatch.strain_id) ?? null : null;

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} aria-hidden />
      <aside
        className={`drawer ${split ? 'is-split' : ''}`}
        role="dialog"
        aria-label={`Room ${room.room_code} detail`}
      >
        <div className="drawer-toolbar">
          <span className="cap mute">Drawer</span>
          <div className="drawer-toolbar-actions">
            {onPlanCycle && (
              <button
                type="button"
                className="drawer-plan-chip"
                onClick={() => onPlanCycle(room)}
              >
                Plan a Cycle →
              </button>
            )}
            <button
              type="button"
              className="drawer-close"
              onClick={onClose}
              aria-label="Close drawer"
            >
              Close ×
            </button>
          </div>
        </div>
        <div className="drawer-body">
          <RoomPane
            room={room}
            batches={batches}
            selectedBatchId={selectedBatchId}
            split={split}
            onSelectBatch={onSelectBatch}
          />
          {split && selectedBatch && (
            <BatchPane
              batch={selectedBatch}
              rooms={rooms}
              strainStats={strainStats}
              syntheticMotherIds={syntheticMotherIds}
              onClose={() => onSelectBatch('')}
            />
          )}
          {split && !selectedBatch && (
            <div className="drawer-strain-pane drawer-strain-empty">
              <div className="drawer-stamp">
                <span className="serial">FIG. 03</span>
                <span className="sep">·</span>
                <span>Batch</span>
                <span className="sep">·</span>
                <span>—</span>
              </div>
              <div className="drawer-empty">
                <span className="cap mute">Batch not found in fixture</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default LabRoomDrawer;
