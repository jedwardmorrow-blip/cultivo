import { ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { formatWeight } from '../../utils';
import type { StrainAggregate, HarvestMetricRow } from '../../hooks/useHarvestMetrics';

type SortField = 'strain_name' | 'harvest_count' | 'total_plants' | 'total_wet_grams' | 'total_dry_grams' | 'avg_yield_pct' | 'avg_dry_per_plant';

interface StrainBreakdownProps {
  strainAggregates: StrainAggregate[];
  rows: HarvestMetricRow[];
}

export function StrainBreakdown({ strainAggregates, rows }: StrainBreakdownProps) {
  const [sortField, setSortField] = useState<SortField>('total_dry_grams');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedStrain, setExpandedStrain] = useState<string | null>(null);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  const sorted = [...strainAggregates].sort((a, b) => {
    const aVal = a[sortField] ?? 0;
    const bVal = b[sortField] ?? 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const maxDry = Math.max(...strainAggregates.map((s) => s.total_dry_grams || s.total_wet_grams), 1);

  function SortButton({ field, label }: { field: SortField; label: string }) {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1 text-left ${isActive ? 'text-cult-white' : 'text-cult-medium-gray hover:text-cult-light-gray'}`}
      >
        {label}
        {isActive && <ArrowUpDown className="w-3 h-3" />}
      </button>
    );
  }

  if (strainAggregates.length === 0) {
    return (
      <div className="bg-cult-near-black border border-cult-medium-gray p-8 text-center">
        <p className="text-cult-medium-gray text-sm uppercase tracking-wider">No completed harvests to analyze</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cult-dark-gray text-xs uppercase tracking-wider">
              <th className="text-left py-3 px-3"><SortButton field="strain_name" label="Strain" /></th>
              <th className="text-right py-3 px-3"><SortButton field="harvest_count" label="Harvests" /></th>
              <th className="text-right py-3 px-3"><SortButton field="total_plants" label="Plants" /></th>
              <th className="text-right py-3 px-3"><SortButton field="total_wet_grams" label="Wet" /></th>
              <th className="text-right py-3 px-3"><SortButton field="total_dry_grams" label="Dry" /></th>
              <th className="text-right py-3 px-3"><SortButton field="avg_yield_pct" label="Yield %" /></th>
              <th className="text-right py-3 px-3"><SortButton field="avg_dry_per_plant" label="Dry/Plant" /></th>
              <th className="py-3 px-3 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((strain) => {
              const isExpanded = expandedStrain === strain.strain_name;
              const strainRows = rows.filter(
                (r) => r.strain_name === strain.strain_name && r.harvest_status === 'completed'
              );
              const barWidth = ((strain.total_dry_grams || strain.total_wet_grams) / maxDry) * 100;

              return (
                <StrainRow
                  key={strain.strain_name}
                  strain={strain}
                  barWidth={barWidth}
                  isExpanded={isExpanded}
                  strainRows={strainRows}
                  onToggle={() => setExpandedStrain(isExpanded ? null : strain.strain_name)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface StrainRowProps {
  strain: StrainAggregate;
  barWidth: number;
  isExpanded: boolean;
  strainRows: HarvestMetricRow[];
  onToggle: () => void;
}

function StrainRow({ strain, barWidth, isExpanded, strainRows, onToggle }: StrainRowProps) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-cult-dark-gray hover:bg-cult-near-black cursor-pointer transition-colors group"
      >
        <td className="py-3 px-3">
          <div className="flex items-center gap-2">
            <span className="text-cult-white font-semibold">{strain.strain_name}</span>
            {strain.strain_abbreviation && (
              <span className="text-[10px] text-cult-medium-gray font-mono border border-cult-dark-gray px-1">
                {strain.strain_abbreviation}
              </span>
            )}
          </div>
        </td>
        <td className="text-right py-3 px-3 text-cult-light-gray font-mono">{strain.harvest_count}</td>
        <td className="text-right py-3 px-3 text-cult-light-gray font-mono">{strain.total_plants}</td>
        <td className="text-right py-3 px-3 text-cult-light-gray font-mono">{formatWeight(strain.total_wet_grams)}</td>
        <td className="text-right py-3 px-3 text-cult-white font-mono font-semibold">
          {strain.total_dry_grams > 0 ? formatWeight(strain.total_dry_grams) : '—'}
        </td>
        <td className="text-right py-3 px-3">
          {strain.avg_yield_pct != null ? (
            <span className="text-green-400 font-mono font-semibold">{strain.avg_yield_pct}%</span>
          ) : (
            <span className="text-cult-medium-gray">—</span>
          )}
        </td>
        <td className="text-right py-3 px-3 text-cult-light-gray font-mono">
          {strain.avg_dry_per_plant != null ? formatWeight(strain.avg_dry_per_plant) : '—'}
        </td>
        <td className="py-3 px-3">
          <div className="w-full bg-cult-dark-gray h-2 overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all"
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </td>
      </tr>

      {isExpanded && strainRows.length > 0 && (
        <tr>
          <td colSpan={8} className="bg-cult-black px-3 py-3">
            <div className="space-y-2 pl-4 border-l-2 border-cult-dark-gray">
              <div className="flex items-center gap-4 text-xs text-cult-medium-gray uppercase tracking-wider mb-2">
                <span className="w-24">Date</span>
                <span className="w-20">Room</span>
                <span className="w-16 text-right">Wet</span>
                <span className="w-16 text-right">Dry</span>
                <span className="w-14 text-right">Yield</span>
                <span className="w-12 text-right">Plants</span>
                <span className="w-16 text-right">Dry/Plant</span>
              </div>
              {strainRows.map((row) => (
                <div key={row.harvest_session_id} className="flex items-center gap-4 text-xs">
                  <span className="w-24 text-cult-light-gray">{new Date(row.harvest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span className="w-20 font-mono text-cult-light-gray">{row.grow_room_code ?? '—'}</span>
                  <span className="w-16 text-right font-mono text-cult-light-gray">{formatWeight(row.effective_wet_weight_grams)}</span>
                  <span className="w-16 text-right font-mono text-cult-white">{row.dry_weight_grams != null ? formatWeight(row.dry_weight_grams) : '—'}</span>
                  <span className="w-14 text-right font-mono">
                    {row.yield_percentage != null ? (
                      <span className="text-green-400">{row.yield_percentage}%</span>
                    ) : '—'}
                  </span>
                  <span className="w-12 text-right font-mono text-cult-light-gray">{row.plant_count_harvested}</span>
                  <span className="w-16 text-right font-mono text-cult-light-gray">
                    {row.avg_dry_per_plant != null ? formatWeight(row.avg_dry_per_plant) : '—'}
                  </span>
                </div>
              ))}

              {strain.best_yield_pct != null && strain.worst_yield_pct != null && strain.best_yield_pct !== strain.worst_yield_pct && (
                <div className="flex items-center gap-4 mt-2 pt-2 border-t border-cult-dark-gray text-xs">
                  <div className="flex items-center gap-1.5 text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    Best: {strain.best_yield_pct}%
                  </div>
                  <div className="flex items-center gap-1.5 text-red-400">
                    <TrendingDown className="w-3 h-3" />
                    Worst: {strain.worst_yield_pct}%
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
