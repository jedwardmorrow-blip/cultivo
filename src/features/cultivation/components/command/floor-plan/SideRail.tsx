import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FacilityRoom } from './data';
import { KIND_DOT } from './data';

interface Props {
  rooms?: FacilityRoom[];
  selectedCode?: string | null;
  onClose?: () => void;
}

const FLOWER_CYCLE_DAYS = 63;

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
};

const fmtLbs = (g: number | null | undefined) => {
  if (g == null) return '—';
  const lbs = g / 453.592;
  return lbs >= 100 ? `${lbs.toFixed(0)} lbs` : `${lbs.toFixed(1)} lbs`;
};

export function SideRail({ rooms = [], selectedCode, onClose }: Props) {
  const room = useMemo(
    () => rooms.find((r) => r.code === selectedCode) ?? null,
    [rooms, selectedCode]
  );
  const navigate = useNavigate();

  if (!room) {
    return (
      <div className="fpl-rail urgency-empty">
        {onClose && (
          <button type="button" className="fpl-rail-close" onClick={onClose} aria-label="Close focus panel">
            ×
          </button>
        )}
        <div className="fpl-rail-head">
          <div className="fpl-rail-eyebrow">FOCUS</div>
          <div className="fpl-rail-code">SELECT A ROOM</div>
          <div className="fpl-rail-meta" style={{ color: 'var(--op-ink-3)' }}>
            <span>Click a room block on the floor plan to focus.</span>
          </div>
        </div>
      </div>
    );
  }

  // For off-cycle rooms (CLN/MOM/CURE/LAB/WATER) we have no harvest cycle.
  if (!room.inCycle) {
    return (
      <div className="fpl-rail urgency-empty">
        {onClose && (
          <button type="button" className="fpl-rail-close" onClick={onClose} aria-label="Close focus panel">
            ×
          </button>
        )}
        <div className="fpl-rail-head">
          <div className="fpl-rail-eyebrow">
            FOCUS · OFF-CYCLE · PHASE {room.phase}
          </div>
          <div className="fpl-rail-code">{room.code} · {room.name.toUpperCase()}</div>
          <div className="fpl-rail-meta">
            {room.total_plants != null && (
              <span><strong>Plants</strong>{room.total_plants.toLocaleString()}</span>
            )}
            {room.strain_count != null && (
              <span><strong>Strains</strong>{room.strain_count}</span>
            )}
            {room.caption && (
              <span><strong>Note</strong>{room.caption}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // In-cycle room — full instrument detail from v_room_operational_state
  // Day count: prefer days_in_stage (current stage); fallback to days_to_harvest math.
  const day = room.days_in_stage ?? 0;
  const cycle = FLOWER_CYCLE_DAYS;
  const daysToHarvest = room.days_to_harvest ?? null;
  const projectedHarvestIso = (room as FacilityRoom & {
    section_projected_harvest?: string | null;
  }).section_projected_harvest ?? null;
  const lastHarvestIso = (room as FacilityRoom & {
    last_harvest_date?: string | null;
  }).last_harvest_date ?? null;
  const lastHarvestG = (room as FacilityRoom & {
    last_harvest_wet_grams?: number | null;
  }).last_harvest_wet_grams ?? null;

  const stageColor = KIND_DOT[room.layoutType] ?? 'var(--accent)';
  const dayPct = Math.min(100, Math.round((day / cycle) * 100));

  const tasksDone = room.tasks_completed_today ?? 0;
  const tasksTotal = room.tasks_today ?? 0;

  // Factual time-based status (no urgency_score editorialization).
  // OVERDUE: harvest date in the past. IMMINENT: within 7 days. ACTIVE: future.
  const sectionDays = (room as FacilityRoom & {
    section_days_to_harvest?: number | null;
  }).section_days_to_harvest ?? null;
  const factualStatus: 'OVERDUE' | 'IMMINENT' | 'ACTIVE' =
    typeof sectionDays === 'number' && sectionDays < 0
      ? 'OVERDUE'
      : typeof sectionDays === 'number' && sectionDays <= 7
      ? 'IMMINENT'
      : 'ACTIVE';
  const statusColor =
    factualStatus === 'OVERDUE'
      ? 'var(--status-bad)'
      : factualStatus === 'IMMINENT'
      ? 'var(--status-warn)'
      : 'var(--status-ok)';
  const railStatusClass =
    factualStatus === 'OVERDUE'
      ? 'urgency-bad'
      : factualStatus === 'IMMINENT'
      ? 'urgency-warn'
      : 'urgency-ok';

  return (
    <div className={`fpl-rail ${railStatusClass}`}>
      {onClose && (
        <button type="button" className="fpl-rail-close" onClick={onClose} aria-label="Close focus panel">
          ×
        </button>
      )}
      <div className="fpl-rail-head">
        <div className="fpl-rail-eyebrow">
          <span
            className="pulse"
            style={{ background: statusColor }}
          />
          {factualStatus} · {room.layoutType.toUpperCase()} · PHASE {room.phase}
        </div>
        <div className="fpl-rail-code">
          {room.code}
          <span style={{
            display: 'inline-block',
            width: 6, height: 6,
            borderRadius: 1,
            background: stageColor,
            marginLeft: 10,
            verticalAlign: 'middle',
          }} />
        </div>
        <div className="fpl-rail-meta">
          <span>
            <strong>Plants</strong>
            {(room.total_plants ?? 0).toLocaleString()}
            {room.capacity_plants ? ` / ${room.capacity_plants}` : ''}
          </span>
          <span>
            <strong>Strains</strong>
            {room.strain_count ?? '—'}
          </span>
          <span>
            <strong>Tasks</strong>
            {tasksDone}/{tasksTotal}
          </span>
          <span>
            <strong>Last hv</strong>
            {fmtDate(lastHarvestIso)}
          </span>
        </div>
      </div>

      <div className="fpl-rail-progress">
        <div className="fpl-rail-progress-row">
          <div className="fpl-rail-day">
            {day}<span className="of">/{cycle}</span>
          </div>
          <div className="fpl-rail-day-meta">
            {daysToHarvest != null
              ? <>{daysToHarvest >= 0 ? `${daysToHarvest}d to harvest` : `${Math.abs(daysToHarvest)}d overdue`}<br /></>
              : <>— to harvest<br /></>}
            <span style={{ color: 'var(--op-ink-3)' }}>
              {projectedHarvestIso ? `est ${fmtDate(projectedHarvestIso)}` : '—'}
            </span>
          </div>
        </div>
        <div className="fpl-rail-bar">
          <div
            className="fpl-rail-bar-fill"
            style={{ width: `${dayPct}%` }}
          />
        </div>
      </div>

      <div className="fpl-rail-section">
        <span>HARVEST · LAST</span>
        <span className="meta">{fmtDate(lastHarvestIso)}</span>
      </div>
      <div className="fpl-env-stack">
        <div className="fpl-env-row" style={{ gridTemplateColumns: '70px 1fr 90px 80px' }}>
          <div className="fpl-env-row-label">WET</div>
          <div />
          <div className="fpl-env-row-val">{fmtLbs(lastHarvestG)}</div>
          <div className="fpl-env-row-target">last cycle</div>
        </div>
      </div>

      <div className="fpl-rail-actions">
        <button
          type="button"
          className="fpl-rail-btn primary"
          onClick={() => navigate(`/cultivation-rooms?room=${encodeURIComponent(room.code)}`)}
        >
          Open room detail
        </button>
        <button
          type="button"
          className="fpl-rail-btn"
          onClick={() => navigate('/cultivation-command-center')}
        >
          Command center
        </button>
      </div>
    </div>
  );
}
