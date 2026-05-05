import { ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { useState, useMemo } from 'react';
import { formatWeight } from '../../utils';
import type { StrainAggregate, HarvestMetricRow } from '../../hooks/useHarvestMetrics';

/* ── Inline SVG Sparkline ─────────────────────────────────── */

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  avgColor?: string;
}

function YieldSparkline({ values, width = 120, height = 28, color = '#22c55e', avgColor = '#525252' }: SparklineProps) {
  if (values.length < 2) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center">
        <span className="text-xs text-cult-border">—</span>
      </div>
    );
  }

  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const min = Math.min(...values) * 0.9;
  const max = Math.max(...values) * 1.1 || 1;
  const range = max - min || 1;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * innerW;
    const y = padding + innerH - ((v - min) / range) * innerH;
    return `${x},${y}`;
  });

  const avgY = padding + innerH - ((avg - min) / range) * innerH;
  const lastVal = values[values.length - 1];
  const firstVal = values[0];
  const trending = lastVal >= firstVal;

  return (
    <svg width={width} height={height} className="block">
      {/* avg reference line */}
      <line x1={padding} y1={avgY} x2={width - padding} y2={avgY} stroke={avgColor} strokeWidth={0.5} strokeDasharray="2,2" />
      {/* sparkline path */}
      <polyline fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" points={points.join(' ')} />
      {/* end dot */}
      {values.length > 0 && (() => {
        const lx = padding + ((values.length - 1) / (values.length - 1)) * innerW;
        const ly = padding + innerH - ((lastVal - min) / range) * innerH;
        return <circle cx={lx} cy={ly} r={2} fill={trending ? '#22c55e' : '#ef4444'} />;
      })()}
    </svg>
  );
}

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

  // Pre-compute yield sparkline data per strain (sorted by date ascending)
  const yieldByStrain = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const strain of strainAggregates) {
      const sRows = rows
        .filter((r) => r.strain_name === strain.strain_name && r.harvest_status === 'completed' && r.yield_percentage != null)
        .sort((a, b) => a.harvest_date.localeCompare(b.harvest_date));
      map.set(strain.strain_name, sRows.map((r) => r.yield_percentage!));
    }
    return map;
  }, [strainAggregates, rows]);

  function SortButton({ field, label }: { field: SortField; label: string }) {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1 text-left ${isActive ? 'text-cult-text-primary' : 'text-cult-border hover:text-cult-text-muted'}`}
      >
        {label}
        {isActive && <ArrowUpDown className="w-3 h-3" />}
      </button>
    );
  }

  if (strainAggregates.length === 0) {
    return (
      <div className="bg-cult-surface border border-cult-border p-8 text-center">
        <p className="text-cult-border text-sm uppercase tracking-wider">No completed harvests to analyze</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cult-surface text-xs uppercase tracking-wider">
              <th className="text-left py-3 px-3"><SortButton field="strain_name" label="Strain" /></th>
              <th className="text-right py-3 px-3"><SortButton field="harvest_count" label="Harvests" /></th>
              <th className="text-right py-3 px-3"><SortButton field="total_plants" label="Plants" /></th>
              <th className="text-right py-3 px-3"><SortButton field="total_wet_grams" label="Wet" /></th>
              <th className="text-right py-3 px-3"><SortButton field="total_dry_grams" label="Dry" /></th>
              <th className="text-right py-3 px-3"><SortButton field="avg_yield_pct" label="Yield %" /></th>
              <th className="text-right py-3 px-3"><SortButton field="avg_dry_per_plant" label="Dry/Plant" /></th>
              <th className="py-3 px-3 w-32 text-right text-cult-border">Trend</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((strain) => {
              const isExpanded = expandedStrain === strain.strain_name;
              const strainRows = rows.filter(
                (r) => r.strain_name === strain.strain_name && r.harvest_status === 'completed'
              );
              return (
                <StrainRow
                  key={strain.strain_name}
                  strain={strain}
                  isExpanded={isExpanded}
                  strainRows={strainRows}
                  yieldValues={yieldByStrain.get(strain.strain_name) ?? []}
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
  isExpanded: boolean;
  strainRows: HarvestMetricRow[];
  yieldValues: number[];
  onToggle: () => void;
}

function StrainRow({ strain, isExpanded, strainRows, yieldValues, onToggle }: StrainRowProps) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-cult-surface hover:bg-cult-surface cursor-pointer transition-colors group"
      >
        <td className="py-3 px-3">
          <div className="flex items-center gap-2">
            <span className="text-cult-text-primary font-semibold">{strain.strain_name}</span>
            {strain.strain_abbreviation && (
              <span className="text-xs text-cult-border font-mono border border-cult-surface px-1">
                {strain.strain_abbreviation}
              </span>
            )}
          </div>
        </td>
        <td className="text-right py-3 px-3 text-cult-text-muted font-mono">{strain.harvest_count}</td>
        <td className="text-right py-3 px-3 text-cult-text-muted font-mono">{strain.total_plants}</td>
        <td className="text-right py-3 px-3 text-cult-text-muted font-mono">{formatWeight(strain.total_wet_grams)}</td>
        <td className="text-right py-3 px-3 text-cult-text-primary font-mono font-semibold">
          {strain.total_dry_grams > 0 ? formatWeight(strain.total_dry_grams) : '—'}
        </td>
        <td className="text-right py-3 px-3">
          {strain.avg_yield_pct != null ? (
            <span className="text-cult-success font-mono font-semibold">{strain.avg_yield_pct}%</span>
          ) : (
            <span className="text-cult-border">—</span>
          )}
        </td>
        <td className="text-right py-3 px-3 text-cult-text-muted font-mono">
          {strain.avg_dry_per_plant != null ? formatWeight(strain.avg_dry_per_plant) : '—'}
        </td>
        <td className="py-3 px-3 text-right">
          <YieldSparkline values={yieldValues} />
        </td>
      </tr>

      {isExpanded && strainRows.length > 0 && (
        <tr>
          <td colSpan={8} className="bg-cult-black px-3 py-3">
            <div className="space-y-2 pl-4 border-l-2 border-cult-surface">
              <div className="flex items-center gap-4 text-xs text-cult-border uppercase tracking-wider mb-2">
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
                  <span className="w-24 text-cult-text-muted">{new Date(row.harvest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span className="w-20 font-mono text-cult-text-muted">{row.grow_room_code ?? '—'}</span>
                  <span className="w-16 text-right font-mono text-cult-text-muted">{formatWeight(row.effective_wet_weight_grams)}</span>
                  <span className="w-16 text-right font-mono text-cult-text-primary">{row.dry_weight_grams != null ? formatWeight(row.dry_weight_grams) : '—'}</span>
                  <span className="w-14 text-right font-mono">
                    {row.yield_percentage != null ? (
                      <span className="text-cult-success">{row.yield_percentage}%</span>
                    ) : '—'}
                  </span>
                  <span className="w-12 text-right font-mono text-cult-text-muted">{row.plant_count_harvested}</span>
                  <span className="w-16 text-right font-mono text-cult-text-muted">
                    {row.avg_dry_per_plant != null ? formatWeight(row.avg_dry_per_plant) : '—'}
                  </span>
                </div>
              ))}

              {strain.best_yield_pct != null && strain.worst_yield_pct != null && strain.best_yield_pct !== strain.worst_yield_pct && (
                <div className="flex items-center gap-4 mt-2 pt-2 border-t border-cult-surface text-xs">
                  <div className="flex items-center gap-1.5 text-cult-success">
                    <TrendingUp className="w-3 h-3" />
                    Best: {strain.best_yield_pct}%
                  </div>
                  <div className="flex items-center gap-1.5 text-cult-danger">
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
