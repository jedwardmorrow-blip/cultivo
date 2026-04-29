import { useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ROOM_LAYOUT, ROOM_LAYOUT_MAP, SVG_VIEWPORT, BUILDING_OUTLINE, CORRIDOR, WING_LABELS, CORRIDOR_GAP,
} from '../../constants/buildingLayout';
import {
  ROOM_STATES, ROOM_TASKS, ROOM_GRIDS, TODAY_LABEL,
  type RoomState, type RoomTask,
} from './data';
import {
  RoomBlock, AttentionPill, TaskRow, BentoCard, StrainPills, RoomPlacementGrid,
} from './atoms';
import './command.css';

// ── Header ──────────────────────────────────────────────────────────
function FacilityHeader({ doneCount, totalCount }: { doneCount: number; totalCount: number }) {
  const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
  return (
    <div className="fac-header">
      <div className="fac-header-l">
        <div>
          <div className="fac-title-eyebrow">Cultivation</div>
          <h1 className="fac-title">Command Center</h1>
        </div>
        <span className="fac-title-date">{TODAY_LABEL}</span>
      </div>
      <div className="fac-header-r">
        <div className="fac-progress">
          <span><strong>{doneCount}</strong>/<strong>{totalCount}</strong> done</span>
          <div className="fac-progress-bar"><span style={{ width: `${pct}%` }} /></div>
        </div>
      </div>
    </div>
  );
}

// ── Attention strip ─────────────────────────────────────────────────
function AttentionStrip({ states, onSelect }: { states: RoomState[]; onSelect: (code: string) => void }) {
  const flagged = states.filter((s) => s.urgency >= 1 && s.urgencyReason).sort((a, b) => b.urgency - a.urgency);
  if (flagged.length === 0) return null;
  return (
    <div className="fac-att">
      <span className="fac-att-label">Attention · {flagged.length}</span>
      <div className="fac-att-pills">
        {flagged.map((s) => <AttentionPill key={s.code} state={s} onClick={() => onSelect(s.code)} />)}
      </div>
    </div>
  );
}

// ── Facility map ────────────────────────────────────────────────────
function FacilityMap({ selectedCode, onSelect }: { selectedCode: string | null; onSelect: (code: string) => void }) {
  return (
    <div className="fac-map-wrap">
      <svg
        className="fac-map"
        viewBox={`0 0 ${SVG_VIEWPORT.width} ${SVG_VIEWPORT.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Facility floor plan"
      >
        {/* Building outline */}
        <rect
          className="fac-building-outline"
          x={BUILDING_OUTLINE.x}
          y={BUILDING_OUTLINE.y}
          width={BUILDING_OUTLINE.width}
          height={BUILDING_OUTLINE.height}
          rx={3}
        />
        {/* Corridor */}
        <rect
          className="fac-corridor"
          x={CORRIDOR.x}
          y={CORRIDOR.y}
          width={CORRIDOR.width}
          height={CORRIDOR.height}
        />
        {/* Corridor gap (between LAB and VEG-02) */}
        <line className="fac-corridor-gap" x1={CORRIDOR_GAP.leftX} y1={CORRIDOR_GAP.topY} x2={CORRIDOR_GAP.leftX} y2={CORRIDOR_GAP.bottomY} />
        <line className="fac-corridor-gap" x1={CORRIDOR_GAP.rightX} y1={CORRIDOR_GAP.topY} x2={CORRIDOR_GAP.rightX} y2={CORRIDOR_GAP.bottomY} />
        {/* Wing labels */}
        <text className="fac-wing-label" x={WING_LABELS.west.x} y={WING_LABELS.west.y} textAnchor="middle">WEST WING</text>
        <text className="fac-wing-label" x={WING_LABELS.east.x} y={WING_LABELS.east.y} textAnchor="middle">EAST WING</text>
        {/* Rooms */}
        {ROOM_LAYOUT.map((layout) => (
          <RoomBlock
            key={layout.code}
            layout={layout}
            state={ROOM_STATES[layout.code]}
            selected={selectedCode === layout.code}
            onClick={() => onSelect(layout.code)}
          />
        ))}
      </svg>
    </div>
  );
}

function MapLegend() {
  return (
    <div className="fac-legend">
      <span className="fac-legend-item"><span className="fac-legend-dot calm" /> calm</span>
      <span className="fac-legend-item"><span className="fac-legend-dot watch" /> watch</span>
      <span className="fac-legend-item"><span className="fac-legend-dot attn" /> attention</span>
      <span className="fac-legend-item"><span className="fac-legend-dot urgent" /> urgent</span>
    </div>
  );
}

// ── Room view (Screen 2) ────────────────────────────────────────────
function RoomView({ code, onBack, onSelectRoom }: { code: string; onBack: () => void; onSelectRoom: (code: string) => void }) {
  const layout = ROOM_LAYOUT_MAP[code];
  const state = ROOM_STATES[code];
  const tasks: RoomTask[] = ROOM_TASKS[code] ?? [];
  const grid = ROOM_GRIDS[code];

  const [expandedTask, setExpandedTask] = useState<string | null>(tasks.find((t) => t.status === 'in_progress')?.id ?? null);
  const [expandedCard, setExpandedCard] = useState<'tasks-week' | 'strains' | 'layout' | 'info'>('strains');

  const doneCount = tasks.filter((t) => t.status === 'completed').length;
  const ringClass = state ? (state.urgency === 3 ? 'urgent' : state.urgency === 2 ? 'attention' : state.urgency === 1 ? 'watch' : 'calm') : 'calm';

  if (!layout || !state) return null;

  const harvestLabel = state.harvestInDays != null ? `${state.harvestInDays}d to harvest` : 'No harvest set';

  return (
    <div className="fac-room-view">
      {/* Sidebar quick-switch */}
      <aside className="fac-sidebar">
        <button type="button" className="fac-sidebar-back" onClick={onBack} aria-label="Back to facility map">←</button>
        {ROOM_LAYOUT.map((r) => {
          const s = ROOM_STATES[r.code];
          const tone = s?.urgency === 3 ? 'urgent' : s?.urgency === 2 ? 'attention' : s?.urgency === 1 ? 'watch' : '';
          return (
            <button
              key={r.code}
              type="button"
              className={`fac-sidebar-room ${r.code === code ? 'is-active' : ''} ${tone}`}
              onClick={() => onSelectRoom(r.code)}
            >
              <span className="fac-sidebar-code">{r.code}</span>
              {s && s.plants > 0 ? <span className="fac-sidebar-plants">{s.plants}</span> : null}
            </button>
          );
        })}
      </aside>

      <div className="fac-room-main">
        {/* Top section */}
        <div className="fac-room-top">
          <div className="fac-room-id">
            <div className="fac-room-id-row">
              <span className={`fac-room-status-ring ${ringClass}`} />
              <span className="fac-room-code-big">{code}</span>
              <span className="fac-room-type-badge">{layout.layoutType}</span>
            </div>
            {state.urgencyReason ? (
              <div className="fac-room-id-meta" style={{ color: state.urgency === 3 ? 'var(--status-bad)' : state.urgency === 2 ? 'var(--status-warn)' : 'var(--op-ink-2)' }}>
                {state.urgencyReason}
              </div>
            ) : (
              <div className="fac-room-id-meta">{state.envSummary}</div>
            )}
          </div>
          <div className="fac-room-stats">
            {state.dayInStage != null && state.cycleDays != null ? (
              <div className="fac-room-stat">
                <span className="label">Day</span>
                <span className="val">{state.dayInStage}<span style={{ color: 'var(--op-ink-3)', fontFamily: 'var(--font-mono)', fontSize: 12, marginLeft: 2 }}>/ {state.cycleDays}</span></span>
              </div>
            ) : null}
            <div className="fac-room-stat">
              <span className="label">Plants</span>
              <span className="val">{state.plants.toLocaleString()}</span>
            </div>
            <div className="fac-room-stat">
              <span className="label">Strains</span>
              <span className="val">{state.strainCount}</span>
            </div>
            {state.harvestInDays != null ? (
              <div className="fac-room-stat">
                <span className="label">Harvest</span>
                <span className={`val ${state.harvestInDays <= 3 ? 'warn' : ''}`}>{state.harvestInDays}<span style={{ color: 'var(--op-ink-3)', fontFamily: 'var(--font-mono)', fontSize: 12, marginLeft: 2 }}>d</span></span>
              </div>
            ) : null}
          </div>
          <div className="fac-room-actions">
            <button type="button" className="fac-btn">Move plants</button>
            {state.layoutType === 'flower' ? <button type="button" className="fac-btn">Start harvest</button> : null}
            <button type="button" className="fac-btn">Print labels</button>
          </div>
        </div>

        {/* Bento split */}
        <div className="fac-bento">
          {/* Left: Today's tasks */}
          <div className="fac-bento-l">
            <div className="fac-tasks-head">
              <h2 className="fac-tasks-h">Today · {harvestLabel}</h2>
              <span className="fac-tasks-count">{doneCount} of {tasks.length} done</span>
            </div>
            <div className="fac-tasks-list">
              {tasks.length === 0 ? (
                <div className="fac-tasks-empty">No tasks scheduled for {code} today.</div>
              ) : (
                tasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    expanded={expandedTask === t.id}
                    onToggle={() => setExpandedTask((cur) => (cur === t.id ? null : t.id))}
                  />
                ))
              )}
            </div>
            <div className="fac-tasks-add">
              <button type="button" className="fac-btn">+ Add task</button>
            </div>
          </div>

          {/* Right: Bento cards */}
          <div className="fac-bento-r">
            <BentoCard
              title="Strains"
              meta={`${state.strainCount} active`}
              expanded={expandedCard === 'strains'}
              onToggle={() => setExpandedCard('strains')}
            >
              <StrainPills strains={state.strains} />
            </BentoCard>

            <BentoCard
              title="Room layout"
              meta={grid ? `${grid.rows}×${grid.cols} grid` : 'no grid configured'}
              expanded={expandedCard === 'layout'}
              onToggle={() => setExpandedCard('layout')}
            >
              {grid ? <RoomPlacementGrid grid={grid} /> : <span className="fac-empty">Configure tables and sections in Settings</span>}
            </BentoCard>

            <BentoCard
              title="Room info"
              expanded={expandedCard === 'info'}
              onToggle={() => setExpandedCard('info')}
            >
              <div className="fac-info-list">
                <div className="fac-info-row"><span className="k">Capacity</span><span className="v">{state.capacity || '—'}</span></div>
                <div className="fac-info-row"><span className="k">Occupancy</span><span className="v">{state.capacity ? `${Math.round(state.plants / state.capacity * 100)}%` : '—'}</span></div>
                <div className="fac-info-row"><span className="k">Env summary</span><span className={`v ${state.envState !== 'ok' ? state.envState : ''}`}>{state.envSummary}</span></div>
                <div className="fac-info-row"><span className="k">Stage</span><span className="v">{state.dominantStage ?? 'none'}</span></div>
              </div>
            </BentoCard>

            <BentoCard
              title="This week"
              meta="Wed · Thu · Fri"
              expanded={expandedCard === 'tasks-week'}
              onToggle={() => setExpandedCard('tasks-week')}
            >
              <div className="fac-info-list">
                <div className="fac-info-row"><span className="k">Wed Apr 27</span><span className="v">Feed · Defo</span></div>
                <div className="fac-info-row"><span className="k">Thu Apr 28</span><span className="v">Scout</span></div>
                <div className="fac-info-row"><span className="k">Fri Apr 29</span><span className="v">Feed · IPM</span></div>
              </div>
            </BentoCard>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Top-level surface ───────────────────────────────────────────────
export function CultivationCommand() {
  const [params, setParams] = useSearchParams();
  const selectedCode = params.get('room');

  const select = useCallback((code: string | null) => {
    if (code) {
      params.set('room', code);
    } else {
      params.delete('room');
    }
    setParams(params, { replace: true });
  }, [params, setParams]);

  const allStates = useMemo(() => Object.values(ROOM_STATES), []);
  const { doneCount, totalCount } = useMemo(() => {
    const tasks = Object.values(ROOM_TASKS).flat();
    return {
      doneCount: tasks.filter((t) => t.status === 'completed').length,
      totalCount: tasks.length,
    };
  }, []);

  if (selectedCode && ROOM_LAYOUT_MAP[selectedCode]) {
    return (
      <div className="fac-root product">
        <div className="fac-frame">
          <RoomView code={selectedCode} onBack={() => select(null)} onSelectRoom={(c) => select(c)} />
        </div>
      </div>
    );
  }

  return (
    <div className="fac-root product">
      <div className="fac-frame">
        <FacilityHeader doneCount={doneCount} totalCount={totalCount} />
        <AttentionStrip states={allStates} onSelect={select} />
        <FacilityMap selectedCode={null} onSelect={select} />
        <MapLegend />
      </div>
      <button type="button" className="fac-fab" aria-label="Quick add task">+</button>
    </div>
  );
}
