import { DollarSign, TrendingUp, Truck, Package, Clock } from 'lucide-react';
import { formatCurrency, formatCurrencyShort } from '@/shared/utils/format';
import type { RevenuePipelineData } from '../hooks/useRevenuePipeline';

// ─── Revenue Pipeline Bar ───────────────────────────────────────────────────
// Shows progress toward weekly $45K delivery target as a stacked bar.
// Segments: Delivered → Ready for Delivery → Packaging → Not Started

interface Props {
  data: RevenuePipelineData;
}

const segments = [
  { key: 'delivered' as const, label: 'Delivered', color: 'bg-emerald-500', textColor: 'text-emerald-400', icon: TrendingUp },
  { key: 'readyForDelivery' as const, label: 'Staged', color: 'bg-cyan-500', textColor: 'text-cyan-400', icon: Truck },
  { key: 'packaging' as const, label: 'Packaging', color: 'bg-amber-500', textColor: 'text-amber-400', icon: Package },
  { key: 'notStarted' as const, label: 'Not Started', color: 'bg-gray-600', textColor: 'text-gray-400', icon: Clock },
];

export function RevenuePipeline({ data }: Props) {
  const { target, total, pct } = data;
  const overTarget = total > target;

  // Calculate segment widths as percentage of target (capped at 100% total)
  const denominator = Math.max(target, total);

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-cult p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-cult bg-emerald-500/10 border border-emerald-500/20">
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Weekly Revenue Target</div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold tabular-nums ${overTarget ? 'text-emerald-400' : 'text-white'}`}>
                {formatCurrencyShort(total)}
              </span>
              <span className="text-sm text-gray-500">of {formatCurrencyShort(target)}</span>
              <span className={`text-sm font-semibold ${
                pct >= 100 ? 'text-emerald-400' : pct >= 75 ? 'text-cyan-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {pct}%
              </span>
            </div>
          </div>
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

        {/* Target marker line */}
        {overTarget && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
            style={{ left: `${(target / denominator) * 100}%` }}
            title={`Target: ${formatCurrency(target)}`}
          />
        )}
      </div>

      {/* Segment labels */}
      <div className="flex items-center gap-5 mt-3">
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
    </div>
  );
}
