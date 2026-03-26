import { memo } from 'react';
import type { RoomOperationalState } from '../../hooks/useRoomOperationalState';
import {
  type RoomLayoutEntry,
  LAYOUT_TYPE_COLORS,
  URGENCY_STYLES,
} from '../../constants/buildingLayout';

interface RoomPolygonProps {
  layout: RoomLayoutEntry;
  ops: RoomOperationalState | null;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (code: string | null) => void;
  onClick: (code: string) => void;
}

/**
 * Individual room SVG element for the building map.
 * Renders the rect, room code, plant count, strain pills,
 * harvest countdown, task micro-bar, and urgency glow.
 */
function RoomPolygonInner({ layout, ops, isSelected, isHovered, onHover, onClick }: RoomPolygonProps) {
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

  // Visual states
  const fillOpacity = isUtility ? 0.1 : isEmpty ? 0.05 : isSelected ? 0.37 : isHovered ? 0.30 : 0.22;
  const strokeOpacity = isUtility ? 0.2 : isEmpty ? 0.12 : 0.55;
  const glow = urgency >= 1 && urgency <= 3 ? URGENCY_STYLES[urgency as 1 | 2 | 3] : null;

  const isClickable = !isUtility;

  return (
    <g
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
      onMouseEnter={() => isClickable && onHover(layout.code)}
      onMouseLeave={() => onHover(null)}
      onClick={() => isClickable && onClick(layout.code)}
    >
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

      {/* Room fill */}
      <rect
        x={layout.x}
        y={layout.y}
        width={layout.w}
        height={layout.h}
        rx={2}
        fill={base}
        fillOpacity={fillOpacity}
        stroke={isSelected ? '#FFFFFF' : glow && urgency >= 2 ? glow.color : base}
        strokeWidth={isSelected ? 1.5 : 0.8}
        strokeOpacity={isSelected ? 1 : strokeOpacity}
        style={{ transition: 'all 0.15s ease' }}
      />

      {/* Room code label */}
      <text
        x={layout.x + layout.w / 2}
        y={layout.y + (isTiny ? layout.h / 2 + 3 : 16)}
        textAnchor="middle"
        fill={isUtility ? '#404040' : '#FFFFFF'}
        fontSize={isTiny ? 6.5 : layout.w > 90 ? 11 : layout.w > 65 ? 9 : 8}
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

      {/* Strain pills (max 3 for wide rooms, 1 for narrow) */}
      {!isUtility && !isTiny && strains.length > 0 && layout.w >= 60 && (() => {
        const maxPills = layout.w > 90 ? 3 : 1;
        const pills = strains.slice(0, maxPills);
        const pillW = layout.w > 90 ? 30 : Math.min(layout.w - 12, 40);
        const pillGap = 3;
        const totalW = pills.length === 1 ? pillW : pills.length * (pillW + pillGap) - pillGap;
        const startX = layout.x + (layout.w - totalW) / 2;
        const pillY = layout.y + 44;

        return pills.map((s, i) => (
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
              fontSize={7}
              fontFamily="'JetBrains Mono', monospace"
              fontWeight={600}
            >
              {s}
            </text>
          </g>
        ));
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
            fontSize={7}
            fontFamily="'JetBrains Mono', monospace"
          >
            {tasksDone}/{tasksTotal}
          </text>
        </g>
      )}

      {/* Empty state */}
      {isEmpty && !isTiny && layout.h >= 100 && (
        <text
          x={layout.x + layout.w / 2}
          y={layout.y + layout.h / 2 + 6}
          textAnchor="middle"
          fill="#404040"
          fontSize={8}
          fontFamily="system-ui"
          fontStyle="italic"
          opacity={0.35}
        >
          Empty
        </text>
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
