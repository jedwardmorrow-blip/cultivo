import { memo } from 'react';
import type { RoomOperationalState } from '../../hooks/useRoomOperationalState';
import {
  type RoomLayoutEntry,
  LAYOUT_TYPE_COLORS,
  URGENCY_STYLES,
  SVG_VIEWPORT,
} from '../../constants/buildingLayout';

interface RoomPolygonProps {
  layout: RoomLayoutEntry;
  ops: RoomOperationalState | null;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (code: string | null) => void;
  onClick: (code: string) => void;
  /** Sequential index for entrance draw-in animation */
  drawIndex?: number;
}

/**
 * Individual room SVG element for the building map.
 * Renders gradient fill, left-edge accent, room code, plant count,
 * strain pills, harvest countdown, task micro-bar, and urgency glow.
 */
function RoomPolygonInner({ layout, ops, isSelected, isHovered, onHover, onClick, drawIndex = 0 }: RoomPolygonProps) {
  const base = LAYOUT_TYPE_COLORS[layout.layoutType];
  const isUtility = layout.layoutType === 'non-grow';
  const isTiny = layout.h < 50;

  // Operational data (or defaults for rooms without ops data)
  const plants = ops?.total_plants ?? 0;
  const isEmpty = !ops || (ops.occupancy_status === 'empty' && layout.layoutType !== 'dry' && layout.layoutType !== 'lab' && layout.layoutType !== 'water');
  const urgency = ops?.urgency_score ?? 0;
  const strains = ops?.strain_names ?? [];
  const daysToHarvest = ops?.days_to_harvest ?? null;
  const daysInStage = ops?.days_in_stage ?? null;
  const tasksTotal = Number(ops?.tasks_today) || 0;
  const tasksDone = Number(ops?.tasks_completed_today) || 0;

  // Occupancy-driven fill intensity — busier rooms glow hotter
  const occupancyBoost = !isUtility && !isEmpty && plants > 0
    ? Math.min(0.12, (plants / 500) * 0.12)
    : 0;

  const baseFillOpacity = isUtility ? 0.1 : isEmpty ? 0.05 : isSelected ? 0.37 : isHovered ? 0.30 : 0.22;
  const fillOpacity = baseFillOpacity + occupancyBoost;
  const strokeOpacity = isUtility ? 0.2 : isEmpty ? 0.12 : 0.55;
  const glow = urgency >= 1 && urgency <= 3 ? URGENCY_STYLES[urgency as 1 | 2 | 3] : null;

  const isClickable = !isUtility;

  // Unique gradient ID for this room
  const gradId = `grad-${layout.code}`;

  // Hover scale: transform from center of room
  const cx = layout.x + layout.w / 2;
  const cy = layout.y + layout.h / 2;
  const scale = isHovered && isClickable ? 1.02 : 1;

  // Draw-in entrance animation: fade-up per room, staggered left-to-right
  const drawDelay = drawIndex * 35; // 35ms stagger between rooms

  // Accessible room label
  const ariaLabel = isUtility
    ? `${layout.code} — ${layout.layoutType} room`
    : isEmpty
    ? `${layout.code} — empty ${layout.layoutType} room`
    : `${layout.code} — ${layout.layoutType} room, ${plants} plants${strains.length > 0 ? `, strains: ${strains.slice(0, 3).join(', ')}` : ''}${daysToHarvest !== null ? `, harvest in ${daysToHarvest} days` : ''}`;

  return (
    <g
      style={{
        cursor: isClickable ? 'pointer' : 'default',
        transform: `translate(${cx}px, ${cy}px) scale(${scale}) translate(${-cx}px, ${-cy}px)`,
        transition: 'transform 0.15s ease',
        opacity: 0,
        animation: `roomDrawIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${drawDelay}ms both`,
        outline: 'none',
      }}
      {...(isClickable ? {
        tabIndex: 0,
        role: 'button',
        'aria-label': ariaLabel,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(layout.code);
          }
        },
        onFocus: () => onHover(layout.code),
        onBlur: () => onHover(null),
      } : {})}
      onMouseEnter={() => isClickable && onHover(layout.code)}
      onMouseLeave={() => onHover(null)}
      onClick={() => isClickable && onClick(layout.code)}
    >
      {/* Gradient definition — top-to-bottom fade for dimensionality */}
      {!isUtility && !isEmpty && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={base} stopOpacity={fillOpacity * 1.3} />
            <stop offset="100%" stopColor={base} stopOpacity={fillOpacity * 0.5} />
          </linearGradient>
        </defs>
      )}

      {/* Urgency glow ring */}
      {glow && urgency >= 2 && (
        <rect
          x={layout.x - 2}
          y={layout.y - 2}
          width={layout.w + 4}
          height={layout.h + 4}
          rx={3}
          fill="none"
          stroke={glow.color}
          strokeWidth={1.5}
          opacity={0.5}
          style={{ filter: `drop-shadow(${glow.shadow})` }}
        >
          <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2s" repeatCount="indefinite" />
        </rect>
      )}

      {/* Room fill — gradient for occupied, flat for empty/utility */}
      <rect
        className="room-fill"
        x={layout.x}
        y={layout.y}
        width={layout.w}
        height={layout.h}
        rx={2}
        fill={!isUtility && !isEmpty ? `url(#${gradId})` : base}
        fillOpacity={isUtility || isEmpty ? fillOpacity : 1}
        stroke={isSelected ? '#FFFFFF' : glow && urgency >= 2 ? glow.color : base}
        strokeWidth={isSelected ? 1.5 : 0.8}
        strokeOpacity={isSelected ? 1 : strokeOpacity}
        style={{ transition: 'fill-opacity 0.15s ease, stroke 0.15s ease' }}
      />

      {/* Left-edge accent bar — room type color at full intensity */}
      {!isUtility && (
        <rect
          x={layout.x}
          y={layout.y + 1}
          width={2}
          height={layout.h - 2}
          rx={1}
          fill={base}
          opacity={isEmpty ? 0.2 : 0.7}
        />
      )}

      {/* Room code label */}
      <text
        x={layout.x + layout.w / 2}
        y={layout.y + (isTiny ? layout.h / 2 + 3 : 16)}
        textAnchor="middle"
        fill={isUtility ? '#404040' : '#FFFFFF'}
        fontSize={isTiny ? 7.5 : layout.w > 90 ? 11 : layout.w > 65 ? 9.5 : 8.5}
        fontFamily="'JetBrains Mono', 'SF Mono', monospace"
        fontWeight={700}
        letterSpacing="0.04em"
        opacity={isUtility ? 0.4 : 0.95}
      >
        {layout.code}
      </text>

      {/* Plant count */}
      {!isUtility && plants > 0 && !isTiny && (
        <text
          x={layout.x + layout.w / 2}
          y={layout.y + 32}
          textAnchor="middle"
          fill="#999999"
          fontSize={9}
          fontFamily="'JetBrains Mono', monospace"
        >
          {plants}p
        </text>
      )}

      {/* Strain pills (max 3 for wide rooms, 1 for narrow) + overflow indicator */}
      {!isUtility && !isTiny && strains.length > 0 && layout.w >= 60 && (() => {
        const maxPills = layout.w > 90 ? 3 : 1;
        const pills = strains.slice(0, maxPills);
        const overflow = strains.length - maxPills;
        const pillW = layout.w > 90 ? 30 : Math.min(layout.w - 12, 40);
        const pillGap = 3;
        const totalW = pills.length === 1 ? pillW : pills.length * (pillW + pillGap) - pillGap;
        const startX = layout.x + (layout.w - totalW) / 2;
        const pillY = layout.y + 44;

        return (
          <>
            {pills.map((s, i) => (
              <g key={s}>
                <rect
                  x={startX + i * (pillW + pillGap)}
                  y={pillY}
                  width={pillW}
                  height={14}
                  rx={1.5}
                  fill={base}
                  fillOpacity={0.25}
                  stroke={base}
                  strokeWidth={0.4}
                  strokeOpacity={0.35}
                />
                <text
                  x={startX + i * (pillW + pillGap) + pillW / 2}
                  y={pillY + 10}
                  textAnchor="middle"
                  fill="#999999"
                  fontSize={8}
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight={600}
                >
                  {s}
                </text>
              </g>
            ))}
            {overflow > 0 && (
              <text
                x={startX + totalW + 4}
                y={pillY + 10}
                fill="#666666"
                fontSize={8}
                fontFamily="'JetBrains Mono', monospace"
              >
                +{overflow}
              </text>
            )}
          </>
        );
      })()}

      {/* Harvest countdown (flower rooms only) */}
      {layout.layoutType === 'flower' && daysToHarvest !== null && !isTiny && (
        <g>
          <rect
            x={layout.x + 5}
            y={layout.y + 64}
            width={layout.w - 10}
            height={18}
            rx={1.5}
            fill={daysToHarvest <= 0 ? '#DC4545' : daysToHarvest <= 7 ? '#F59E0B' : '#1A1A1A'}
            fillOpacity={daysToHarvest <= 0 ? 0.25 : daysToHarvest <= 7 ? 0.18 : 0.4}
            stroke={daysToHarvest <= 0 ? '#DC4545' : daysToHarvest <= 7 ? '#F59E0B' : '#2E2E2E'}
            strokeWidth={0.4}
          >
            {daysToHarvest <= 0 && (
              <animate attributeName="fill-opacity" values="0.25;0.08;0.25" dur="1.5s" repeatCount="indefinite" />
            )}
          </rect>
          <text
            x={layout.x + layout.w / 2}
            y={layout.y + 77}
            textAnchor="middle"
            fill={daysToHarvest <= 0 ? '#DC4545' : daysToHarvest <= 7 ? '#F59E0B' : '#999999'}
            fontSize={7.5}
            fontFamily="'JetBrains Mono', monospace"
            fontWeight={700}
          >
            {daysToHarvest <= 0
              ? `${Math.abs(daysToHarvest)}d OVER`
              : daysToHarvest <= 7
              ? `Harv ${daysToHarvest}d`
              : `Day ${daysInStage ?? '?'}`}
          </text>
        </g>
      )}

      {/* Task progress micro-bar */}
      {!isUtility && !isTiny && tasksTotal > 0 && (
        <g>
          <rect
            x={layout.x + 6}
            y={layout.y + layout.h - 12}
            width={layout.w - 12}
            height={3}
            rx={1.5}
            fill="#2E2E2E"
          />
          <rect
            x={layout.x + 6}
            y={layout.y + layout.h - 12}
            width={Math.max(0, (layout.w - 12) * (tasksDone / tasksTotal))}
            height={3}
            rx={1.5}
            fill={tasksDone === tasksTotal ? '#10B981' : '#F59E0B'}
          />
          <text
            x={layout.x + layout.w / 2}
            y={layout.y + layout.h - 16}
            textAnchor="middle"
            fill="#404040"
            fontSize={8}
            fontFamily="'JetBrains Mono', monospace"
          >
            {tasksDone}/{tasksTotal}
          </text>
        </g>
      )}

      {/* Ghost task bar — zero tasks on active non-utility rooms */}
      {!isUtility && !isTiny && !isEmpty && tasksTotal === 0 && (
        <g opacity={0.2}>
          <rect
            x={layout.x + 6}
            y={layout.y + layout.h - 12}
            width={layout.w - 12}
            height={3}
            rx={1.5}
            fill="#2E2E2E"
          />
          <text
            x={layout.x + layout.w / 2}
            y={layout.y + layout.h - 16}
            textAnchor="middle"
            fill="#404040"
            fontSize={7.5}
            fontFamily="'JetBrains Mono', monospace"
          >
            0 tasks
          </text>
        </g>
      )}

      {/* Empty state — hatch pattern + label */}
      {isEmpty && !isTiny && (
        <g>
          <defs>
            <pattern id={`hatch-${layout.code}`} width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke={base} strokeWidth={0.6} opacity={0.12} />
            </pattern>
          </defs>
          <rect
            x={layout.x + 1}
            y={layout.y + 1}
            width={layout.w - 2}
            height={layout.h - 2}
            rx={1.5}
            fill={`url(#hatch-${layout.code})`}
          />
          {layout.h >= 100 && (
            <text
              x={layout.x + layout.w / 2}
              y={layout.y + layout.h / 2 + 6}
              textAnchor="middle"
              fill="#404040"
              fontSize={8}
              fontFamily="'IBM Plex Sans', system-ui"
              fontStyle="italic"
              opacity={0.3}
            >
              Empty
            </text>
          )}
        </g>
      )}

      {/* Urgency badge */}
      {!isTiny && urgency >= 2 && glow && (
        <g>
          <rect
            x={layout.x + layout.w - 38}
            y={layout.y + 2}
            width={36}
            height={12}
            rx={1.5}
            fill={glow.color}
            fillOpacity={0.25}
            stroke={glow.color}
            strokeWidth={0.4}
          />
          <text
            x={layout.x + layout.w - 20}
            y={layout.y + 11}
            textAnchor="middle"
            fill={glow.color}
            fontSize={6.5}
            fontFamily="'JetBrains Mono', monospace"
            fontWeight={800}
            letterSpacing="0.06em"
          >
            {glow.label}
          </text>
        </g>
      )}
    </g>
  );
}

export const RoomPolygon = memo(RoomPolygonInner);

/**
 * Hover tooltip rendered as an HTML overlay positioned
 * by percentage within the SVG container.
 * Entrance animation: fade in + slide up.
 */
interface RoomTooltipProps {
  layout: RoomLayoutEntry;
  ops: RoomOperationalState | null;
}

function RoomTooltipInner({ layout, ops }: RoomTooltipProps) {
  const isEmpty = !ops || ops.occupancy_status === 'empty';
  const plants = ops?.total_plants ?? 0;
  const strains = ops?.strain_names ?? [];
  const daysToHarvest = ops?.days_to_harvest ?? null;
  const daysInStage = ops?.days_in_stage ?? null;
  const tasksTotal = Number(ops?.tasks_today) || 0;
  const tasksDone = Number(ops?.tasks_completed_today) || 0;
  const roomType = ops?.room_type ?? layout.layoutType;
  const base = LAYOUT_TYPE_COLORS[layout.layoutType];

  // Position: center above the room
  const leftPct = ((layout.x + layout.w / 2) / SVG_VIEWPORT.width) * 100;
  const topPct = ((layout.y - 4) / SVG_VIEWPORT.height) * 100;

  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform: 'translate(-50%, -100%)',
        animation: 'tooltipIn 0.15s ease-out both',
      }}
    >
      {/* Inline keyframes for tooltip entrance */}
      <style>{`
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        className="bg-cult-surface border border-cult-border px-3 py-2 shadow-lg"
        style={{ minWidth: 160, maxWidth: 200 }}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-sm" style={{ background: base, opacity: 0.7 }} />
            <span className="text-cult-text-primary font-mono font-bold text-xs">{layout.code}</span>
          </div>
          <span className="text-cult-text-muted font-mono text-[9px] uppercase">{roomType}</span>
        </div>
        {isEmpty ? (
          <span className="text-cult-text-faint text-[10px] italic">No active plants</span>
        ) : (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-cult-text-muted">Plants</span>
              <span className="text-cult-text-primary font-semibold">{plants}</span>
            </div>
            {strains.length > 0 && (
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-cult-text-muted">Strains</span>
                <span className="text-cult-text-primary font-semibold">{strains.slice(0, 3).join(', ')}{strains.length > 3 ? ` +${strains.length - 3}` : ''}</span>
              </div>
            )}
            {daysInStage !== null && (
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-cult-text-muted">Day in stage</span>
                <span className="text-cult-text-primary font-semibold">{daysInStage}</span>
              </div>
            )}
            {daysToHarvest !== null && (
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-cult-text-muted">Harvest</span>
                <span className={`font-semibold ${daysToHarvest <= 0 ? 'text-cult-danger' : daysToHarvest <= 7 ? 'text-cult-warning' : 'text-cult-text-primary'}`}>
                  {daysToHarvest <= 0 ? `${Math.abs(daysToHarvest)}d overdue` : `${daysToHarvest}d`}
                </span>
              </div>
            )}
            {tasksTotal > 0 && (
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-cult-text-muted">Tasks</span>
                <span className={`font-semibold ${tasksDone === tasksTotal ? 'text-cult-green' : 'text-cult-warning'}`}>{tasksDone}/{tasksTotal}</span>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Caret */}
      <div
        className="mx-auto w-0 h-0"
        style={{
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '5px solid #2E2E2E',
          width: 0,
          marginTop: -1,
        }}
      />
    </div>
  );
}

export const RoomTooltip = memo(RoomTooltipInner);
