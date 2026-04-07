import { DollarSign, TrendingUp, Truck, Package, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatCurrencyShort } from '@/shared/utils/format';
import type { RevenuePipelineData, WeekOutlook } from '../hooks/useRevenuePipeline';

// ─── Revenue Pipeline Bar ───────────────────────────────────────────────────

interface Props {
  data: RevenuePipelineData;
  weekOutlook: WeekOutlook[];
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  weekLabel: string;
  weekRange: string;
}

const segments = [
  { key: 'delivered' as const, label: 'Delivered', color: 'bg-cult-success', textColor: 'text-cult-success', icon: TrendingUp },
  { key: 'readyForDelivery' as const, label: 'Staged', color: 'bg-cyan-500', textColor: 'text-cyan-400', icon: Truck },
  { key: 'packaging' as const, label: 'Packaging', color: 'bg-cult-warning', textColor: 'text-cult-warning', icon: Package },
  { key: 'notStarted' as const, label: 'Not Started', color: 'bg-gray-600', textColor: 'text-gray-400', icon: Clock },
];

export function RevenuePipeline({ data, weekOutlook, weekOffset, onWeekChange, weekLabel, weekRange }: Props) {
  const { target, total, pct } = data;
  const overTarget = total > target;
  const denominator = Math.max(target, total);

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-cult p-5">
      {/* Header row with week navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-cult bg-cult-success-muted border border-cult-success/20">
            <DollarSign className="w-4 h-4 text-cult-success" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Weekly Revenue Target</span>
              <span className="text-xs text-gray-600">·</span>
              <span className="text-xs text-gray-500">{weekRange}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold tabular-nums ${overTarget ? 'text-cult-success' : 'text-white'}`}>
                {formatCurrencyShort(total)}
              </span>
              <span className="text-sm text-gray-500">of {formatCurrencyShort(target)}</span>
              <span className={`text-sm font-semibold ${
                pct >= 100 ? 'text-cult-success' : pct >= 75 ? 'text-cyan-400' : pct >= 50 ? 'text-cult-warning' : 'text-cult-danger'
              }`}>
                {pct}%
              </span>
            </div>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onWeekChange(Math.max(0, weekOffset - 1))}
            disabled={weekOffset === 0}
            className={`p-1.5 rounded-cult border transition-colors ${
              weekOffset === 0
                ? 'border-transparent text-gray-700 cursor-not-allowed'
                : 'border-cult-medium-gray/50 text-gray-400 hover:text-white hover:bg-cult-dark-gray'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-white px-2 min-w-[90px] text-center">{weekLabel}</span>
          <button
            onClick={() => onWeekChange(Math.min(2, weekOffset + 1))}
            disabled={weekOffset >= 2}
            className={`p-1.5 rounded-cult border transition-colors ${
              weekOffset >= 2
                ? 'border-transparent text-gray-700 cursor-not-allowed'
                : 'border-cult-medium-gray/50 text-gray-400 hover:text-white hover:bg-cult-dark-gray'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stacked progress bar */}
      <div className="relative h-6 bg-gray-800/60 rounded-full overflow-hidden border border-gray-700/50">
        <div className="absolute inset-0 flex">
          {segments.map(seg => {
            const value = data[seg.key];
            if (value <= 0) return null;
            const widthPct = (value / denominator) * 100;
            return (
              <div
                key={seg.key}
                className={`${seg.color} h-full transition-all duration-500 ease-cult first:rounded-l-full last:rounded-r-full`}
                style={{ width: `${widthPct}%` }}
                title={`${seg.label}: ${formatCurrency(value)}`}
              />
            );
          })}
        </div>
        {overTarget && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
            style={{ left: `${(target / denominator) * 100}%` }}
            title={`Target: ${formatCurrency(target)}`}
          />
        )}
      </div>

      {/* Bottom row: segment labels left, week outlook right */}
      <div className="flex items-start justify-between mt-3">
        {/* Segment labels */}
        <div className="flex items-center gap-5">
          {segments.map(seg => {
            const value = data[seg.key];
            if (value <= 0) return null;
            const Icon = seg.icon;
            return (
              <div key={seg.key} className="flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 ${seg.textColor}`} />
                <span className="text-xs text-gray-500">{seg.label}</span>
                <span className={`text-xs font-semibold ${seg.textColor}`}>{formatCurrencyShort(value)}</span>
              </div>
            );
          })}
        </div>

        {/* Week outlook mini-strip */}
        <div className="flex items-center gap-2">
          {weekOutlook.map(week => {
            const isSelected = week.weekOffset === weekOffset;
            const barFill = Math.min(week.pctOfTarget, 100);
            const fillColor = week.pctOfTarget >= 100 ? 'bg-cult-success' :
              week.pctOfTarget >= 75 ? 'bg-cyan-500' :
              week.pctOfTarget >= 50 ? 'bg-cult-warning' : 'bg-cult-danger';

            return (
              <button
                key={week.weekOffset}
                onClick={() => onWeekChange(week.weekOffset)}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-cult border transition-all ${
                  isSelected
                    ? 'border-white/20 bg-white/5'
                    : 'border-transparent hover:border-cult-medium-gray/50 hover:bg-cult-dark-gray/50'
                }`}
                title={`${week.label}: ${formatCurrencyShort(week.totalRevenue)} (${week.orderCount} orders, ${week.routeCount} routes)`}
              >
                <span className={`text-[10px] font-medium uppercase tracking-wider ${
                  isSelected ? 'text-white' : 'text-gray-600'
                }`}>
                  {week.weekOffset === 0 ? 'This' : week.weekOffset === 1 ? 'Next' : '+2'}
                </span>
                {/* Mini progress bar */}
                <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${fillColor}`}
                    style={{ width: `${barFill}%` }}
                  />
                </div>
                <span className={`text-[10px] font-semibold tabular-nums ${
                  isSelected ? 'text-white' : 'text-gray-500'
                }`}>
                  {formatCurrencyShort(week.totalRevenue)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
