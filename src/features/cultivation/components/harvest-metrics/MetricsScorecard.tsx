import { Wheat, Droplets, Scale, Users, Clock, Trash2 } from 'lucide-react';
import { StatCard } from '@/shared/components';
import { formatWeight } from '../../utils';
import type { HarvestTotals } from '../../hooks/useHarvestMetrics';

interface MetricsScorecardProps {
  totals: HarvestTotals;
}

export function MetricsScorecard({ totals }: MetricsScorecardProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Harvests Completed"
          value={totals.harvest_count}
          icon={<Wheat className="w-4 h-4" />}
        />
        <StatCard
          label="Total Plants"
          value={totals.total_plants.toLocaleString()}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Total Wet Weight"
          value={formatWeight(totals.total_wet_grams)}
          icon={<Droplets className="w-4 h-4" />}
          subtitle={`Avg ${formatWeight(totals.avg_wet_per_plant)}/plant`}
        />
        <StatCard
          label="Total Dry Weight"
          value={totals.total_dry_grams > 0 ? formatWeight(totals.total_dry_grams) : '—'}
          icon={<Scale className="w-4 h-4" />}
          subtitle={totals.avg_dry_per_plant ? `Avg ${formatWeight(totals.avg_dry_per_plant)}/plant` : undefined}
          variant={totals.total_dry_grams > 0 ? 'accent' : 'default'}
        />
        <StatCard
          label="Avg Yield"
          value={totals.avg_yield_pct != null ? `${totals.avg_yield_pct}%` : '—'}
          icon={<Scale className="w-4 h-4" />}
          subtitle="Dry / Wet ratio"
          variant={totals.avg_yield_pct != null ? 'accent' : 'default'}
        />
        <StatCard
          label="Avg Days in Dry"
          value={totals.avg_days_in_dry != null ? `${totals.avg_days_in_dry}d` : '—'}
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      {totals.total_waste_grams > 0 && (
        <div className="flex items-center gap-3 bg-cult-near-black border border-cult-dark-gray px-4 py-3">
          <Trash2 className="w-4 h-4 text-cult-medium-gray flex-shrink-0" />
          <span className="text-sm text-cult-light-gray">
            Total waste: <span className="text-cult-white font-mono">{formatWeight(totals.total_waste_grams)}</span>
            {totals.total_wet_grams > 0 && (
              <span className="text-cult-medium-gray ml-2">
                ({Math.round((totals.total_waste_grams / totals.total_wet_grams) * 100)}% of wet weight)
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
