interface WeightBarProps {
  total: number;
  remaining: number;
  color?: string;
}

function getBarColor(pct: number): string {
  if (pct > 50) return '#F59E0B';
  if (pct > 20) return '#EAB308';
  return '#EF4444';
}

export function WeightBar({ total, remaining, color }: WeightBarProps) {
  const pct = total > 0 ? Math.min(100, (remaining / total) * 100) : 0;
  const barColor = color ?? getBarColor(pct);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-cult-text-primary tabular-nums" style={{ minWidth: 44, textAlign: 'right' }}>
        {remaining.toLocaleString()}g
      </span>
      <div
        className="rounded-full overflow-hidden flex-shrink-0"
        style={{ width: 60, height: 6, backgroundColor: '#1C1C1C' }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: barColor, transition: 'width 0.2s' }}
        />
      </div>
    </div>
  );
}
