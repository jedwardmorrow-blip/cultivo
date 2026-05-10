import { useNavigate } from 'react-router-dom';
import { Sparkline } from './Sparkline';

export type CellMarker = 'ok' | 'warn' | 'bad' | null;

export interface CellProps {
  label: string;
  primary: string;
  secondary?: string;
  drillRoute?: string;
  marker?: CellMarker;
  projected?: boolean;
  spark?: number[] | null;
  /** When set, overrides auto-computed delta. tone defaults to positive when up, negative when down. */
  delta?: { value: string; direction: 'up' | 'down' | 'flat'; tone?: 'positive' | 'negative' | 'neutral' };
  onClick?: () => void;
}

function autoDelta(spark?: number[] | null): CellProps['delta'] | null {
  if (!spark || spark.length < 2) return null;
  const first = spark[0];
  const last = spark[spark.length - 1];
  if (first === 0 || !Number.isFinite(first) || !Number.isFinite(last)) return null;
  const pct = ((last - first) / Math.abs(first)) * 100;
  if (Math.abs(pct) < 0.5) {
    return { value: '0%', direction: 'flat', tone: 'neutral' };
  }
  const direction = pct > 0 ? 'up' : 'down';
  return {
    value: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
    direction,
    tone: direction === 'up' ? 'positive' : 'negative',
  };
}

export function Cell({
  label,
  primary,
  secondary,
  drillRoute,
  marker,
  projected,
  spark,
  delta,
  onClick,
}: CellProps) {
  const navigate = useNavigate();
  const handle = () => {
    if (onClick) onClick();
    else if (drillRoute) navigate(drillRoute);
  };
  const resolvedDelta = delta ?? autoDelta(spark);
  return (
    <button className="home-cell" onClick={handle} type="button">
      <span className="home-cell-label">
        {marker && <span className={`home-cell-marker ${marker}`} />}
        <span className="home-cell-label-text">{label}</span>
        {resolvedDelta && (
          <span className={`home-cell-delta ${resolvedDelta.tone ?? 'neutral'}`}>
            <span className={`home-cell-delta-glyph ${resolvedDelta.direction}`} aria-hidden="true">
              {resolvedDelta.direction === 'up' ? '▲' : resolvedDelta.direction === 'down' ? '▼' : '–'}
            </span>
            {resolvedDelta.value}
          </span>
        )}
      </span>
      <span className="home-cell-primary-row">
        <span className={`home-cell-primary${projected ? ' projected' : ''}`}>{primary}</span>
        {spark && spark.length > 0 && <Sparkline data={spark} marker={marker} />}
      </span>
      {secondary && <span className="home-cell-secondary">{secondary}</span>}
    </button>
  );
}
