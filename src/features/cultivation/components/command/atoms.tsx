import { memo } from 'react';
import type { CrewMember, RoomState, RoomTask, TaskType } from './data';
import { TASK_TYPE_META } from './data';
import { LAYOUT_TYPE_COLORS, type RoomLayoutEntry, type RoomLayoutType } from '../../constants/buildingLayout';

// ── Status ring + room block (facility map) ─────────────────────────
// Rooms render as SVG rectangles. The status "ring" is a hairline outline
// keyed off urgency; calm rooms get a faint room-type tint, attention/urgent
// get a desaturated status color border with a subtle inner glow.

function statusStroke(urgency: 0 | 1 | 2 | 3, layoutType: RoomLayoutType): string {
  if (urgency === 3) return 'var(--status-bad)';
  if (urgency === 2) return 'var(--status-warn)';
  if (urgency === 1) return 'rgba(232,224,212,0.55)';
  // Calm = faint room-type tint, instrument-grade
  return mixWithLine(LAYOUT_TYPE_COLORS[layoutType] ?? '#444', 0.35);
}

function statusFill(urgency: 0 | 1 | 2 | 3): string {
  if (urgency === 3) return 'rgba(197,106,106,0.10)';
  if (urgency === 2) return 'rgba(200,148,58,0.08)';
  if (urgency === 1) return 'rgba(232,224,212,0.04)';
  return 'rgba(255,255,255,0.02)';
}

function mixWithLine(hex: string, alpha: number): string {
  // Simple rgba helper for hex like #10b981
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface RoomBlockProps {
  layout: RoomLayoutEntry;
  state: RoomState | undefined;
  selected: boolean;
  onClick: () => void;
}

export const RoomBlock = memo(function RoomBlock({ layout, state, selected, onClick }: RoomBlockProps) {
  const u: 0 | 1 | 2 | 3 = state?.urgency ?? 0;
  const stroke = statusStroke(u, layout.layoutType);
  const fill = statusFill(u);
  const isFlower = layout.layoutType === 'flower';
  const isSmall = layout.h < 80;

  return (
    <g
      className={`fac-room ${u === 3 ? 'urgent' : ''} ${u === 2 ? 'attention' : ''} ${u === 1 ? 'watch' : ''} ${selected ? 'selected' : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <rect
        x={layout.x}
        y={layout.y}
        width={layout.w}
        height={layout.h}
        fill={fill}
        stroke={stroke}
        strokeWidth={selected ? 2 : u >= 2 ? 1.5 : 1}
        rx={2}
      />
      {/* Stage marker — 6px dot only, never a fill (per CLAUDE.md polarity rule) */}
      {state?.dominantStage && state.plants > 0 ? (
        <circle
          cx={layout.x + 10}
          cy={layout.y + 10}
          r={3}
          fill={LAYOUT_TYPE_COLORS[layout.layoutType] ?? '#666'}
        />
      ) : null}
      {/* Room code */}
      <text
        x={layout.x + layout.w / 2}
        y={layout.y + (isSmall ? 14 : layout.h / 2 - 2)}
        textAnchor="middle"
        fill="var(--op-ink)"
        fontFamily="var(--font-mono)"
        fontSize={isSmall ? 10 : 13}
        fontWeight={500}
        letterSpacing="0.06em"
      >
        {layout.code}
      </text>
      {/* Plant count */}
      {state && state.plants > 0 && !isSmall ? (
        <text
          x={layout.x + layout.w / 2}
          y={layout.y + layout.h / 2 + 18}
          textAnchor="middle"
          fill="var(--op-ink-2)"
          fontFamily="var(--font-mono)"
          fontSize={11}
          fontVariantNumeric="tabular-nums"
        >
          {state.plants}
        </text>
      ) : null}
      {/* Day badge for flower (bottom right) */}
      {isFlower && state?.dayInStage != null && state?.cycleDays != null ? (
        <text
          x={layout.x + layout.w - 6}
          y={layout.y + layout.h - 6}
          textAnchor="end"
          fill="var(--op-ink-3)"
          fontFamily="var(--font-mono)"
          fontSize={9}
          letterSpacing="0.04em"
        >
          D{state.dayInStage}/{state.cycleDays}
        </text>
      ) : null}
      {/* Urgency pulse dot */}
      {u === 3 ? (
        <circle
          cx={layout.x + layout.w - 10}
          cy={layout.y + 10}
          r={3.5}
          fill="var(--status-bad)"
          className="fac-pulse"
        />
      ) : u === 2 ? (
        <circle
          cx={layout.x + layout.w - 10}
          cy={layout.y + 10}
          r={3}
          fill="var(--status-warn)"
        />
      ) : null}
    </g>
  );
});

// ── Attention strip pill ─────────────────────────────────────────────
interface AttentionPillProps { state: RoomState; onClick: () => void; }
export const AttentionPill = memo(function AttentionPill({ state, onClick }: AttentionPillProps) {
  const tone = state.urgency === 3 ? 'urgent' : state.urgency === 2 ? 'attention' : 'watch';
  return (
    <button type="button" className={`fac-att-pill ${tone}`} onClick={onClick}>
      <span className="dot" />
      <span className="code">{state.code}</span>
      <span className="reason">{state.urgencyReason}</span>
    </button>
  );
});

// ── Crew avatar strip ────────────────────────────────────────────────
export const CrewStrip = memo(function CrewStrip({ assignees }: { assignees: CrewMember[] }) {
  if (!assignees.length) return <span className="fac-task-crew empty">Unassigned</span>;
  return (
    <div className="fac-task-crew">
      {assignees.map((a) => (
        <span key={a.staff_id} className={`fac-crew-init ${a.role === 'lead' ? 'lead' : 'crew'} ${a.active ? '' : 'stepped-out'}`} title={`${a.name} · ${a.role}`}>
          {a.init}
        </span>
      ))}
    </div>
  );
});

// ── Task row ─────────────────────────────────────────────────────────
interface TaskRowProps { task: RoomTask; expanded: boolean; onToggle: () => void; }
export const TaskRow = memo(function TaskRow({ task, expanded, onToggle }: TaskRowProps) {
  const meta = TASK_TYPE_META[task.type];
  const checkClass = task.status === 'completed' ? 'done' : task.status === 'in_progress' ? 'half' : '';
  return (
    <div className={`fac-task ${task.status} ${expanded ? 'is-expanded' : ''}`}>
      <button type="button" className="fac-task-row" onClick={onToggle}>
        <span className={`fac-task-check ${checkClass}`} aria-hidden />
        <span className="fac-task-type" style={{ color: meta.color }}>
          <span className="fac-task-type-dot" style={{ background: meta.color }} />
          {meta.label}
        </span>
        <span className="fac-task-label">{task.label}</span>
        <span className="fac-task-time">{task.scheduledFor}</span>
        <CrewStrip assignees={task.assignees} />
      </button>
      {expanded ? (
        <div className="fac-task-detail">
          {task.notes ? <p className="fac-task-notes">{task.notes}</p> : null}
          {task.recipe ? (
            <div className="fac-recipe">
              <div className="fac-recipe-head">
                <span className="fac-recipe-program">{task.recipe.program}</span>
                <span className="fac-recipe-meta">Week {task.recipe.week} · target EC {task.recipe.ec.toFixed(1)} · pH {task.recipe.ph.toFixed(1)}</span>
              </div>
              <div className="fac-recipe-list">
                {task.recipe.products.map((p) => (
                  <div className="fac-recipe-row" key={p.name}>
                    <span className="prod">{p.name}</span>
                    <span className="ml">{p.mlPerGal} mL/gal</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="fac-task-actions">
            {task.status !== 'completed' ? <button type="button" className="fac-btn primary">Complete</button> : <span className="fac-task-done">Done · {task.scheduledFor}</span>}
            <button type="button" className="fac-btn">Add note</button>
          </div>
        </div>
      ) : null}
    </div>
  );
});

// ── Bento card (right column) ───────────────────────────────────────
interface BentoCardProps {
  title: string;
  meta?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}
export const BentoCard = memo(function BentoCard({ title, meta, expanded, onToggle, children }: BentoCardProps) {
  return (
    <section className={`fac-bento-card ${expanded ? 'is-expanded' : ''}`}>
      <button type="button" className="fac-bento-head" onClick={onToggle}>
        <span className="fac-bento-title">{title}</span>
        {meta ? <span className="fac-bento-meta">{meta}</span> : null}
        <span className="fac-bento-toggle">{expanded ? '−' : '+'}</span>
      </button>
      <div className="fac-bento-body">{children}</div>
    </section>
  );
});

// ── Strain pills ─────────────────────────────────────────────────────
export const StrainPills = memo(function StrainPills({ strains }: { strains: string[] }) {
  if (!strains.length) return <span className="fac-empty">No strains</span>;
  return (
    <div className="fac-strain-pills">
      {strains.map((s) => (
        <span key={s} className="fac-strain-pill">{s}</span>
      ))}
    </div>
  );
});

// ── Room placement grid (table × section) ───────────────────────────
import type { RoomGrid } from './data';
export const RoomPlacementGrid = memo(function RoomPlacementGrid({ grid }: { grid: RoomGrid }) {
  return (
    <div className="fac-grid" style={{ gridTemplateColumns: `repeat(${grid.cols}, 1fr)` }}>
      {grid.cells.map((c) => (
        <div key={`${c.row}-${c.col}`} className={`fac-grid-cell ${c.plants ? 'occupied' : 'empty'}`} title={c.strain}>
          {c.plants ? <span className="n">{c.plants}</span> : null}
        </div>
      ))}
    </div>
  );
});
