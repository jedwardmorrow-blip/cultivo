import type { RevenueGoal } from '../hooks/useDashboardData';

interface Props {
  data: RevenueGoal;
}

function fmt(n: number): string {
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
  return '$' + n.toLocaleString();
}

export function RevenueGoalBanner({ data }: Props) {
  const onPace = data.pct >= (data.dayPct - 10);
  const paceLabel = onPace ? 'on pace' : 'behind pace';

  return (
    <div className="bg-cult-surface-raised border border-cult-stage-harvest rounded-cult p-4 px-6 mb-6 flex items-center justify-between gap-8 animate-fade-in">
      {/* Left: Target */}
      <div className="flex-shrink-0">
        <div className="text-[0.6875rem] uppercase tracking-[1.5px] text-cult-text-secondary font-semibold">
          Monthly Revenue Target
        </div>
        <div className="text-[1.75rem] font-bold text-cult-stage-harvest leading-tight">
          {fmt(data.target)}
        </div>
      </div>

      {/* Center: Progress bar */}
      <div className="flex-1 max-w-[360px]">
        <div className="flex justify-between text-[0.6875rem] text-cult-text-muted font-medium mb-1.5">
          <span>MTD: ${data.mtd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <span>Target: {fmt(data.target)}</span>
        </div>
        <div className="h-1.5 bg-cult-surface-overlay rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-cult"
            style={{
              width: `${Math.min(data.pct, 100)}%`,
              background: 'linear-gradient(90deg, #F59E0B, #10B981)',
            }}
          />
        </div>
        <div className="flex justify-between text-[0.6875rem] text-cult-text-muted font-medium mt-1">
          <span className={onPace ? 'text-cult-success-bright' : 'text-cult-stage-harvest'}>
            {data.pct.toFixed(0)}% — {paceLabel}
          </span>
          <span>
            {data.dayOfMonth} of {data.daysInMonth} days ({data.dayPct.toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* Right: Context */}
      <div className="text-[0.75rem] font-light text-cult-text-secondary max-w-[400px] flex-shrink-0">
        Rolling avg: ~{fmt(data.rollingAvg)}/mo. Best month: {fmt(data.bestMonth)}.
        Pipeline active with {fmt(data.openPipeline)} in {data.openOrderCount} open orders.
      </div>
    </div>
  );
}
