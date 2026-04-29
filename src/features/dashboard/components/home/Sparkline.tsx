import type { CellMarker } from './Cell';

export interface SparklineProps {
  data: number[];
  marker?: CellMarker;
  width?: number;
  height?: number;
}

const W_DEFAULT = 56;
const H_DEFAULT = 16;
const PAD = 1;

/**
 * 1px hairline sparkline. No fill, no axis, no labels.
 * Stroke uses --op-ink-3, now-dot uses --accent (or status color when marker set).
 * Per Cultivo working-instrument doctrine: motion via 1px lines, no decoration.
 */
export function Sparkline({ data, marker, width = W_DEFAULT, height = H_DEFAULT }: SparklineProps) {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const stepX = data.length > 1 ? (width - PAD * 2) / (data.length - 1) : 0;
  const yFor = (v: number) => height - PAD - ((v - min) / range) * (height - PAD * 2);
  const points = data.map((v, i) => `${PAD + i * stepX},${yFor(v)}`);

  const dotColor =
    marker === 'bad'
      ? 'var(--status-bad)'
      : marker === 'warn'
      ? 'var(--status-warn)'
      : marker === 'ok'
      ? 'var(--status-ok)'
      : 'var(--accent)';

  const lastX = PAD + (data.length - 1) * stepX;
  const lastY = yFor(data[data.length - 1]);

  return (
    <svg
      className="home-cell-spark"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      {data.length > 1 && (
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="var(--op-ink-3)"
          strokeWidth={1}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      <circle cx={lastX} cy={lastY} r={1.5} fill={dotColor} />
    </svg>
  );
}
