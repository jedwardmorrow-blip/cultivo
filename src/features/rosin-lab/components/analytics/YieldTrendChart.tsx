import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { YieldTrendPoint } from '../../types/rosin-lab.types';
import { getYieldTrendData } from '../../services/rosinLabService';
import { CHART_THEME } from '../../utils/analyticsHelpers';

const CHART_HEIGHT = 300;
const PAD_LEFT = 48;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 36;

interface TooltipData {
  x: number;
  y: number;
  point: YieldTrendPoint;
}

interface YieldTrendChartProps {
  dateFrom: string;
  dateTo: string;
}

function formatAxisDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const YieldTrendChart: React.FC<YieldTrendChartProps> = ({ dateFrom, dateTo }) => {
  const [data, setData] = useState<YieldTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setLoading(true);
    getYieldTrendData(dateFrom, dateTo).then(({ data: d }) => {
      setData(d ?? []);
      setLoading(false);
    });
  }, [dateFrom, dateTo]);

  const plotW = width - PAD_LEFT - PAD_RIGHT;
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const yMin = 0;
  const yMax = data.length > 0 ? Math.ceil(Math.max(...data.map((d) => d.yield_percentage)) / 5) * 5 : 20;
  const avg =
    data.length > 0
      ? data.reduce((s, d) => s + d.yield_percentage, 0) / data.length
      : 0;

  const toSvgX = useCallback(
    (i: number) =>
      data.length < 2 ? PAD_LEFT + plotW / 2 : PAD_LEFT + (i / (data.length - 1)) * plotW,
    [data.length, plotW]
  );
  const toSvgY = useCallback(
    (val: number) => PAD_TOP + plotH - ((val - yMin) / (yMax - yMin)) * plotH,
    [plotH, yMin, yMax]
  );

  const gridLines: number[] = [];
  for (let y = 0; y <= yMax; y += 5) gridLines.push(y);

  const xTickEvery = Math.max(1, Math.floor(data.length / 8));

  const points = data.map((d, i) => `${toSvgX(i)},${toSvgY(d.yield_percentage)}`).join(' ');
  const areaBottom = `${toSvgX(data.length - 1)},${PAD_TOP + plotH} ${PAD_LEFT},${PAD_TOP + plotH}`;
  const polygonPoints = data.length > 0 ? `${points} ${areaBottom}` : '';

  const avgY = toSvgY(avg);

  const handleMouseEnter = (idx: number, e: React.MouseEvent<SVGCircleElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoveredIdx(idx);
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      point: data[idx],
    });
  };
  const handleMouseLeave = () => {
    setHoveredIdx(null);
    setTooltip(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: CHART_HEIGHT }}>
        <div className="w-6 h-6 border-2 border-cult-stage-press border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: CHART_HEIGHT }}>
        <p className="text-cult-text-muted text-sm">No press data for this period</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: CHART_HEIGHT }}>
      <svg width={width} height={CHART_HEIGHT} className="overflow-visible">
        <defs>
          <linearGradient id="yieldAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F97316" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((yVal) => {
          const sy = toSvgY(yVal);
          return (
            <g key={yVal}>
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
                {yVal}%
              </text>
            </g>
          );
        })}

        {data.length > 0 && (
          <>
            <line
              x1={PAD_LEFT}
              y1={avgY}
              x2={PAD_LEFT + plotW}
              y2={avgY}
              stroke={CHART_THEME.axisTextColor}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <text
              x={PAD_LEFT + plotW - 4}
              y={avgY - 5}
              textAnchor="end"
              fontSize={10}
              fill={CHART_THEME.axisTextColor}
            >
              Avg: {avg.toFixed(1)}%
            </text>
          </>
        )}

        {polygonPoints && (
          <polygon points={polygonPoints} fill="url(#yieldAreaGrad)" />
        )}

        {data.length > 1 && (
          <polyline
            points={points}
            fill="none"
            stroke="#F97316"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {data.map((d, i) => (
          <g key={d.id}>
            <circle
              cx={toSvgX(i)}
              cy={toSvgY(d.yield_percentage)}
              r={hoveredIdx === i ? 6 : 3}
              fill="#F97316"
              stroke="#0A0A0A"
              strokeWidth={1.5}
              style={{ cursor: 'pointer', transition: 'r 0.1s' }}
              onMouseEnter={(e) => handleMouseEnter(i, e)}
              onMouseLeave={handleMouseLeave}
            />
            <circle
              cx={toSvgX(i)}
              cy={toSvgY(d.yield_percentage)}
              r={14}
              fill="transparent"
              onMouseEnter={(e) => handleMouseEnter(i, e)}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: 'pointer' }}
            />
          </g>
        ))}

        {data.map((d, i) => {
          if (i % xTickEvery !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={`xt-${i}`}
              x={toSvgX(i)}
              y={PAD_TOP + plotH + 18}
              textAnchor="middle"
              fontSize={10}
              fill={CHART_THEME.axisTextColor}
            >
              {formatAxisDate(d.press_date)}
            </text>
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 rounded-[6px] border px-3 py-2 text-xs shadow-lg"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 60,
            background: CHART_THEME.tooltipBg,
            borderColor: CHART_THEME.tooltipBorder,
            color: CHART_THEME.tooltipText,
            minWidth: 160,
          }}
        >
          <p className="font-semibold text-white">{tooltip.point.strain_name}</p>
          <p className="text-cult-text-secondary">{formatAxisDate(tooltip.point.press_date)}</p>
          <p className="mt-1">
            Yield: <span className="text-cult-stage-press font-semibold">{tooltip.point.yield_percentage.toFixed(1)}%</span>
          </p>
          <p className="text-cult-text-secondary">
            In: {tooltip.point.input_weight_grams.toLocaleString()}g · Out: {tooltip.point.output_weight_grams.toLocaleString()}g
          </p>
        </div>
      )}
    </div>
  );
};
