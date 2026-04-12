/**
 * GradeDonut — mini SVG donut chart showing grade distribution.
 * Spec §5.2: `<GradeDonut size="sm|md">` — consumes quality_grades.color_class
 */

const COLOR_MAP: Record<string, string> = {
  emerald: '#10B981',
  sky: '#0EA5E9',
  amber: '#F59E0B',
  rose: '#F43F5E',
  purple: '#8B5CF6',
  indigo: '#6366F1',
  slate: '#94A3B8',
};

export interface DonutSegment {
  code: string;
  label: string;
  colorClass: string;
  grams: number;
}

interface GradeDonutProps {
  segments: DonutSegment[];
  ungradedGrams?: number;
  size?: 'sm' | 'md';
}

export function GradeDonut({ segments, ungradedGrams = 0, size = 'sm' }: GradeDonutProps) {
  const dim = size === 'sm' ? 36 : 52;
  const stroke = size === 'sm' ? 5 : 7;
  const r = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const cx = dim / 2;
  const cy = dim / 2;

  const total = segments.reduce((s, seg) => s + seg.grams, 0) + ungradedGrams;
  if (total === 0) {
    return (
      <svg width={dim} height={dim} className="shrink-0">
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}
        />
      </svg>
    );
  }

  // Build arcs
  let offset = 0;
  const arcs = segments.map((seg) => {
    const pct = seg.grams / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const arc = {
      key: seg.code,
      color: COLOR_MAP[seg.colorClass] ?? '#666',
      dasharray: `${dash} ${gap}`,
      offset: -offset,
    };
    offset += dash;
    return arc;
  });

  if (ungradedGrams > 0) {
    const pct = ungradedGrams / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    arcs.push({
      key: 'ungraded',
      color: '#404040',
      dasharray: `${dash} ${gap}`,
      offset: -offset,
    });
  }

  return (
    <svg width={dim} height={dim} className="shrink-0 -rotate-90">
      {/* Background track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke}
      />
      {arcs.map((arc) => (
        <circle
          key={arc.key}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={stroke}
          strokeDasharray={arc.dasharray}
          strokeDashoffset={arc.offset}
          strokeLinecap="round"
          opacity={0.85}
        />
      ))}
    </svg>
  );
}
