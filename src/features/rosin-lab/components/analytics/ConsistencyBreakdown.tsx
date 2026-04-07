import React, { useEffect, useState } from 'react';
import type { ConsistencyBreakdownItem } from '../../types/rosin-lab.types';
import { getConsistencyBreakdown } from '../../services/rosinLabService';
import { CONSISTENCY_COLORS, CONSISTENCY_LABELS } from '../../utils/analyticsHelpers';
import { formatWeight } from '@/shared/utils/format';

const OUTER_R = 95;
const STROKE_W = 50;
const CX = 120;
const CY = 120;
const CIRCUMFERENCE = 2 * Math.PI * OUTER_R;
const SVG_SIZE = 240;

interface ConsistencyBreakdownProps {
  dateFrom: string;
  dateTo: string;
}

interface SegmentProps {
  color: string;
  pct: number;
  offset: number;
  hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
}

function DonutSegment({ color, pct, offset, hovered, onEnter, onLeave }: SegmentProps) {
  const dash = (pct / 100) * CIRCUMFERENCE;
  const gap = CIRCUMFERENCE - dash;
  const rotation = (offset / 100) * 360 - 90;

  return (
    <circle
      cx={CX}
      cy={CY}
      r={OUTER_R}
      fill="none"
      stroke={color}
      strokeWidth={hovered ? STROKE_W + 4 : STROKE_W}
      strokeDasharray={`${dash} ${gap}`}
      strokeDashoffset={0}
      transform={`rotate(${rotation} ${CX} ${CY})`}
      style={{
        cursor: 'pointer',
        transition: 'stroke-width 0.15s, stroke-dasharray 0.4s ease',
        transformOrigin: `${CX}px ${CY}px`,
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    />
  );
}

export const ConsistencyBreakdown: React.FC<ConsistencyBreakdownProps> = ({
  dateFrom,
  dateTo,
}) => {
  const [items, setItems] = useState<ConsistencyBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDest, setHoveredDest] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getConsistencyBreakdown(dateFrom, dateTo).then(({ data }) => {
      setItems(data ?? []);
      setLoading(false);
    });
  }, [dateFrom, dateTo]);

  const totalWeight = items.reduce((s, i) => s + i.totalWeight, 0);

  const segments = items.map((item) => ({
    ...item,
    pct: totalWeight > 0 ? (item.totalWeight / totalWeight) * 100 : 0,
    color: CONSISTENCY_COLORS[item.destination] ?? '#666666',
    label: CONSISTENCY_LABELS[item.destination] ?? item.destination,
  }));

  let cumPct = 0;
  const segmentsWithOffset = segments.map((s) => {
    const result = { ...s, offset: cumPct };
    cumPct += s.pct;
    return result;
  });

  const totalLabel = formatWeight(totalWeight);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[240px]">
        <div className="w-6 h-6 border-2 border-cult-stage-hash border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px]">
        <p className="text-cult-text-muted text-sm">No rosin packages for this period</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6 p-4">
      <div className="flex-shrink-0" style={{ width: SVG_SIZE, height: SVG_SIZE }}>
        <svg width={SVG_SIZE} height={SVG_SIZE}>
          <circle
            cx={CX}
            cy={CY}
            r={OUTER_R}
            fill="none"
            stroke="#1C1C1C"
            strokeWidth={STROKE_W}
          />
          {segmentsWithOffset.map((s) => (
            <DonutSegment
              key={s.destination}
              color={s.color}
              pct={s.pct}
              offset={s.offset}
              hovered={hoveredDest === s.destination}
              onEnter={() => setHoveredDest(s.destination)}
              onLeave={() => setHoveredDest(null)}
            />
          ))}
          <text
            x={CX}
            y={CY - 6}
            textAnchor="middle"
            fontSize={14}
            fontWeight="bold"
            fill="#FFFFFF"
          >
            {totalLabel}
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize={10} fill="#666666">
            Total
          </text>
        </svg>
      </div>

      <div className="flex flex-col gap-3 min-w-0">
        {segmentsWithOffset.map((s) => (
          <div
            key={s.destination}
            className="flex items-center gap-2 cursor-pointer"
            onMouseEnter={() => setHoveredDest(s.destination)}
            onMouseLeave={() => setHoveredDest(null)}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: s.color, opacity: hoveredDest && hoveredDest !== s.destination ? 0.4 : 1 }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: hoveredDest === s.destination ? '#FFFFFF' : '#A6A6A6' }}
            >
              {s.label}
            </span>
            <span className="text-sm text-white font-semibold ml-auto pl-4">
              {Math.round(s.totalWeight).toLocaleString()}g
            </span>
            <span className="text-xs text-cult-text-muted w-10 text-right">
              {s.pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
