import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalyticsTimeRange, ThroughputBucket } from '../../types/rosin-lab.types';
import { getThroughputData } from '../../services/rosinLabService';
import { aggregateThroughput, CHART_THEME } from '../../utils/analyticsHelpers';

const CHART_HEIGHT = 300;
const PAD_LEFT = 52;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 40;
const BAR_RADIUS = 4;
const BAR_COLOR = '#6366F1';

interface TooltipData {
  x: number;
  y: number;
  bucket: ThroughputBucket;
}

interface ThroughputChartProps {
  dateFrom: string;
  dateTo: string;
  timeRange: AnalyticsTimeRange;
}

function roundedTopRect(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return '';
  const adjR = Math.min(r, w / 2, h);
  return [
    `M ${x + adjR} ${y}`,
    `H ${x + w - adjR}`,
    `Q ${x + w} ${y} ${x + w} ${y + adjR}`,
    `V ${y + h}`,
    `H ${x}`,
    `V ${y + adjR}`,
    `Q ${x} ${y} ${x + adjR} ${y}`,
    'Z',
  ].join(' ');
}

export const ThroughputChart: React.FC<ThroughputChartProps> = ({
  dateFrom,
  dateTo,
  timeRange,
}) => {
  const [buckets, setBuckets] = useState<ThroughputBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setLoading(true);
    getThroughputData(dateFrom, dateTo).then(({ data }) => {
      if (data) {
        setBuckets(aggregateThroughput(data, timeRange));
      } else {
        setBuckets([]);
      }
      setLoading(false);
    });
  }, [dateFrom, dateTo, timeRange]);

  const plotW = width - PAD_LEFT - PAD_RIGHT;
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const maxGrams = buckets.length > 0 ? Math.max(...buckets.map((b) => b.totalGrams)) : 100;
  const yMax = Math.ceil(maxGrams / 50) * 50 || 100;

  const gridCount = 5;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => (yMax / gridCount) * i);

  const toBarX = useCallback(
    (i: number, barWidth: number) =>
      PAD_LEFT + i * (plotW / buckets.length) + (plotW / buckets.length - barWidth) / 2,
    [buckets.length, plotW]
  );

  const barWidth = buckets.length > 0 ? Math.max(8, (plotW / buckets.length) * 0.6) : 40;

  const toY = useCallback(
    (val: number) => PAD_TOP + plotH - (val / yMax) * plotH,
    [plotH, yMax]
  );

  const handleMouseEnter = (idx: number, e: React.MouseEvent<SVGPathElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoveredIdx(idx);
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, bucket: buckets[idx] });
  };
  const handleMouseLeave = () => {
    setHoveredIdx(null);
    setTooltip(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: CHART_HEIGHT }}>
        <div className="w-6 h-6 border-2 border-cult-stage-rosin border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (buckets.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: CHART_HEIGHT }}>
        <p className="text-cult-text-muted text-sm">No output data for this period</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: CHART_HEIGHT }}>
      <svg width={width} height={CHART_HEIGHT} className="overflow-visible">
        {gridLines.map((val) => {
          const sy = toY(val);
          return (
            <g key={val}>
              <line
                x1={PAD_LEFT}
                y1={sy}
                x2={PAD_LEFT + plotW}
                y2={sy}
                stroke={CHART_THEME.gridColor}
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 6}
                y={sy + 4}
                textAnchor="end"
                fontSize={10}
                fill={CHART_THEME.axisTextColor}
              >
                {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(Math.round(val))}g
              </text>
            </g>
          );
        })}

        {buckets.map((bucket, i) => {
          const bx = toBarX(i, barWidth);
          const bh = (bucket.totalGrams / yMax) * plotH;
          const by = toY(bucket.totalGrams);
          const hovered = hoveredIdx === i;

          return (
            <g key={bucket.label}>
              <path
                d={roundedTopRect(bx, by, barWidth, bh, BAR_RADIUS)}
                fill={BAR_COLOR}
                opacity={hovered ? 1 : 0.8}
                style={{ cursor: 'pointer', transition: 'opacity 0.1s' }}
                onMouseEnter={(e) => handleMouseEnter(i, e)}
                onMouseLeave={handleMouseLeave}
              />
              <text
                x={bx + barWidth / 2}
                y={PAD_TOP + plotH + 20}
                textAnchor="middle"
                fontSize={10}
                fill={CHART_THEME.axisTextColor}
              >
                {bucket.label}
              </text>
            </g>
          );
        })}

        <line
          x1={PAD_LEFT}
          y1={PAD_TOP + plotH}
          x2={PAD_LEFT + plotW}
          y2={PAD_TOP + plotH}
          stroke={CHART_THEME.gridColor}
          strokeWidth={1}
        />
      </svg>

      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 rounded-[6px] border px-3 py-2 text-xs shadow-lg"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 70,
            background: CHART_THEME.tooltipBg,
            borderColor: CHART_THEME.tooltipBorder,
            color: CHART_THEME.tooltipText,
            minWidth: 140,
          }}
        >
          <p className="font-semibold text-white">{tooltip.bucket.label}</p>
          <p className="mt-1">
            Output:{' '}
            <span className="text-cult-stage-rosin font-semibold">
              {tooltip.bucket.totalGrams.toLocaleString()}g
            </span>
          </p>
          <p className="text-cult-text-secondary">{tooltip.bucket.runCount} run{tooltip.bucket.runCount !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
};
