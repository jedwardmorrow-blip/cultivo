import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { formatWeight } from '../../utils';
import type { StrainAggregate } from '../../hooks/useHarvestMetrics';

const MEDAL_COLORS = ['text-amber-400', 'text-cult-text-muted', 'text-amber-700'];

interface StrainLeaderboardProps {
  strainAggregates: StrainAggregate[];
}

export function StrainLeaderboard({ strainAggregates }: StrainLeaderboardProps) {
  const sorted = [...strainAggregates]
    .filter((s) => s.avg_yield_pct != null)
    .sort((a, b) => (b.avg_yield_pct ?? 0) - (a.avg_yield_pct ?? 0));

  if (sorted.length === 0) {
    return (
      <div className="bg-cult-surface border border-cult-border p-8 text-center">
        <p className="text-cult-border text-sm uppercase tracking-wider">No strain yield data available</p>
      </div>
    );
  }

  const maxYield = Math.max(...sorted.map((s) => s.avg_yield_pct ?? 0), 1);

  return (
    <div className="space-y-3">
      {sorted.map((strain, idx) => {
        const barWidth = ((strain.avg_yield_pct ?? 0) / maxYield) * 100;

        return (
          <div
            key={strain.strain_name}
            className="bg-cult-surface border border-cult-surface hover:border-cult-border transition-all"
          >
            <div className="flex items-center gap-4 px-4 py-3">
              <div className="w-8 flex-shrink-0 text-center">
                {idx < 3 ? (
                  <Trophy className={`w-5 h-5 mx-auto ${MEDAL_COLORS[idx]}`} />
                ) : (
                  <span className="text-cult-border font-mono text-sm">#{idx + 1}</span>
                )}
              </div>

              <div className="w-40 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-cult-text-primary font-semibold text-sm">{strain.strain_name}</span>
                  {strain.strain_abbreviation && (
                    <span className="text-xs text-cult-border font-mono border border-cult-surface px-1">
                      {strain.strain_abbreviation}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-6 text-xs">
                  <div className="w-20">
                    <span className="text-cult-border">Avg Yield </span>
                    <span className="text-cult-success font-mono font-bold text-sm">{strain.avg_yield_pct}%</span>
                  </div>
                  <div>
                    <span className="text-cult-border">Harvests </span>
                    <span className="text-cult-text-primary font-mono">{strain.harvest_count}</span>
                  </div>
                  <div>
                    <span className="text-cult-border">Plants </span>
                    <span className="text-cult-text-primary font-mono">{strain.total_plants}</span>
                  </div>
                  <div>
                    <span className="text-cult-border">Total Dry </span>
                    <span className="text-cult-text-primary font-mono font-semibold">
                      {strain.total_dry_grams > 0 ? formatWeight(strain.total_dry_grams) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-cult-border">Dry/Plant </span>
                    <span className="text-cult-text-muted font-mono">
                      {strain.avg_dry_per_plant != null ? formatWeight(strain.avg_dry_per_plant) : '—'}
                    </span>
                  </div>
                  {strain.best_yield_pct != null && strain.worst_yield_pct != null && strain.best_yield_pct !== strain.worst_yield_pct && (
                    <>
                      <div className="flex items-center gap-1 text-cult-success">
                        <TrendingUp className="w-3 h-3" />
                        {strain.best_yield_pct}%
                      </div>
                      <div className="flex items-center gap-1 text-cult-danger">
                        <TrendingDown className="w-3 h-3" />
                        {strain.worst_yield_pct}%
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-2 w-full bg-cult-surface h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-cult-success transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
