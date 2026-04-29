/**
 * Tiny SVG sparkline. No library — 30-line path generator.
 * Uses opacity-50 stroke at the design system accent color so it reads as a
 * secondary signal under the primary KPI value, not a chart in its own right.
 *
 * Per CLAUDE.md instrument-vs-interpretation principle: sparklines are
 * instrument-grade time-domain context, never editorial trend lines.
 */
interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  /** Color override; defaults to var(--accent) at 0.5 opacity. */
  color?: string;
  /** Stroke width in px. */
  stroke?: number;
}

export function Sparkline({
  values,
  width = 84,
  height = 18,
  color = 'var(--accent)',
  stroke = 1.2,
}: SparklineProps) {
  if (!values?.length || values.every((v) => v === 0)) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="var(--op-line)"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;

  // Generate the polyline path
  const path = values
    .map((v, i) => {
      const x = i * step;
      // Y axis is inverted in SVG; high values render at low y
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // Highlight the last point as a small dot
  const lastX = (values.length - 1) * step;
  const lastY = height - ((values[values.length - 1] - min) / range) * (height - 2) - 1;

  return (
    <svg
      width={width}
      height={height}
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.55}
      />
      <circle
        cx={lastX}
        cy={lastY}
        r={1.6}
        fill={color}
        opacity={0.85}
      />
    </svg>
  );
}
