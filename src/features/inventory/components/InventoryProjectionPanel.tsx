import { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatWeightShort } from '@/shared/utils/format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StrainRunwayRow {
  strain_id: string;
  strain_name: string;
  binned_g: number;
  bucked_g: number;
  bulk_flower_g: number;
  bulk_smalls_g: number;
  trim_g: number;
  packaged_units: number;
  packaged_g: number;
  existing_bulk_g: number;
  pipeline_g: number;
  total_projected_bulk_g: number;
  total_projected_bulk_lbs: number;
  overall_conversion_pct: number;
  order_count: number;
  demand_units: number;
  demand_revenue: number;
  demand_g: number;
  bucking_flower_pct: number;
  bucking_smalls_pct: number;
  trimming_big_bud_pct: number;
  trimming_small_bud_pct: number;
  packaging_efficiency_pct: number;
  confidence: 'high' | 'medium' | 'low' | 'none';
  rate_source: string;
  flower_plants: number;
  veg_plants: number;
  next_harvest_date: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    high:   { label: 'High',    cls: 'bg-cult-success-muted text-cult-success border-cult-success/30' },
    medium: { label: 'Medium',  cls: 'bg-cult-warning-muted text-cult-warning border-cult-warning/30' },
    low:    { label: 'Low',     cls: 'bg-cult-danger-muted text-cult-danger border-cult-danger/30' },
    none:   { label: 'No data', cls: 'bg-cult-graphite text-cult-text-faint border-cult-dark-gray' },
  };
  const { label, cls } = map[confidence] ?? map.none;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${cls}`}>
      {label}
    </span>
  );
}

function GapBadge({ gapG }: { gapG: number }) {
  if (gapG > 500) {
    return (
      <span className="flex items-center gap-1 text-cult-success text-[11px] font-medium">
        <CheckCircle className="w-3 h-3" />
        +{formatWeightShort(gapG)}
      </span>
    );
  }
  if (gapG >= -200) {
    return (
      <span className="flex items-center gap-1 text-cult-warning text-[11px] font-medium">
        <AlertTriangle className="w-3 h-3" />
        {gapG >= 0 ? `+${formatWeightShort(gapG)}` : `-${formatWeightShort(Math.abs(gapG))}`}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-cult-danger text-[11px] font-medium">
      <AlertTriangle className="w-3 h-3" />
      -{formatWeightShort(Math.abs(gapG))}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4].map(i => (
        <tr key={i} className="animate-pulse">
          <td className="px-3 py-2.5"><div className="h-4 bg-cult-graphite rounded w-28" /></td>
          <td className="px-3 py-2.5"><div className="h-4 bg-cult-graphite rounded w-16" /></td>
          <td className="px-3 py-2.5"><div className="h-4 bg-cult-graphite rounded w-16" /></td>
          <td className="px-3 py-2.5"><div className="h-4 bg-cult-graphite rounded w-16" /></td>
          <td className="px-3 py-2.5"><div className="h-4 bg-cult-graphite rounded w-16" /></td>
          <td className="px-3 py-2.5"><div className="h-4 bg-cult-graphite rounded w-14" /></td>
          <td className="px-3 py-2.5"><div className="h-4 bg-cult-graphite rounded w-16" /></td>
        </tr>
      ))}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InventoryProjectionPanel() {
  const [rows, setRows] = useState<StrainRunwayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyWithDemand, setOnlyWithDemand] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('v_strain_runway')
        .select('*')
        .order('demand_g', { ascending: false });
      if (!mounted) return;
      setRows((data ?? []) as unknown as StrainRunwayRow[]);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const displayed = onlyWithDemand
    ? rows.filter(r => r.order_count > 0 || r.pipeline_g > 0)
    : rows;

  // Summary KPIs
  const totalPipeline = rows.reduce((s, r) => s + (r.pipeline_g ?? 0), 0);
  const totalProjected = rows.reduce((s, r) => s + (r.total_projected_bulk_g ?? 0), 0);
  const totalDemand = rows.reduce((s, r) => s + (r.demand_g ?? 0), 0);
  const strainsAtRisk = rows.filter(r => r.order_count > 0 && r.demand_g > r.total_projected_bulk_g).length;

  return (
    <div className="bg-cult-near-black border border-cult-dark-gray rounded-cult p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-label font-semibold text-cult-text-primary uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cult-success" />
          Inventory Projection
        </h2>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-[11px] text-cult-text-faint">Active only</span>
          <button
            onClick={() => setOnlyWithDemand(v => !v)}
            className={`relative w-8 h-4 rounded-full transition-colors ${
              onlyWithDemand ? 'bg-cult-success' : 'bg-cult-graphite'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                onlyWithDemand ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </label>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'In Pipeline', value: loading ? '—' : formatWeightShort(totalPipeline), sub: 'being processed' },
          { label: 'Projected Yield', value: loading ? '—' : formatWeightShort(totalProjected), sub: 'after conversion' },
          { label: 'Order Demand', value: loading ? '—' : formatWeightShort(totalDemand), sub: 'open orders' },
          {
            label: 'Strains at Risk',
            value: loading ? '—' : String(strainsAtRisk),
            sub: 'demand > projected',
            alert: strainsAtRisk > 0,
          },
        ].map(kpi => (
          <div
            key={kpi.label}
            className={`rounded-cult border p-3 ${
              kpi.alert
                ? 'bg-cult-danger-muted border-cult-danger/30'
                : 'bg-cult-graphite/40 border-cult-charcoal/50'
            }`}
          >
            <p className="text-[10px] text-cult-text-faint uppercase tracking-wider">{kpi.label}</p>
            <p className={`text-lg font-semibold mt-0.5 ${kpi.alert ? 'text-cult-danger' : 'text-cult-text-primary'}`}>
              {kpi.value}
            </p>
            <p className="text-[10px] text-cult-text-faint">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-cult-charcoal/60">
              {['Strain', 'Pipeline', 'Projected', 'Demand', 'Gap / Surplus', 'Confidence', 'Next Harvest'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-cult-text-faint uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-charcoal/30">
            {loading ? (
              <SkeletonRows />
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-cult-text-faint text-[12px]">
                  No strains with active pipeline or demand.
                </td>
              </tr>
            ) : (
              displayed.map(row => {
                const gap = (row.total_projected_bulk_g ?? 0) - (row.demand_g ?? 0);
                const hasRisk = row.order_count > 0 && gap < 0;
                return (
                  <tr
                    key={row.strain_id}
                    className={`transition-colors ${
                      hasRisk ? 'bg-cult-danger/10 hover:bg-cult-danger/15' : 'hover:bg-cult-graphite/20'
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-cult-text-primary font-medium whitespace-nowrap">
                          {row.strain_name}
                        </span>
                        {row.rate_source === 'global-default' && (
                          <span className="flex items-center gap-1 text-[9px] text-cult-text-faint">
                            <HelpCircle className="w-2.5 h-2.5" />
                            global rates
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-cult-text-secondary whitespace-nowrap">
                      {row.pipeline_g > 0 ? formatWeightShort(row.pipeline_g) : (
                        <span className="text-cult-text-faint">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-cult-text-primary font-medium whitespace-nowrap">
                      {formatWeightShort(row.total_projected_bulk_g ?? 0)}
                      <span className="text-cult-text-faint font-normal ml-1 text-[10px]">
                        ({(row.overall_conversion_pct ?? 0).toFixed(0)}%)
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {row.demand_g > 0 ? (
                        <span className="text-cult-text-secondary">{formatWeightShort(row.demand_g)}</span>
                      ) : (
                        <span className="text-cult-text-faint">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {row.order_count > 0 ? (
                        <GapBadge gapG={gap} />
                      ) : (
                        <span className="text-cult-text-faint text-[11px]">no orders</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <ConfidenceBadge confidence={row.confidence} />
                    </td>
                    <td className="px-3 py-2.5 text-cult-text-secondary whitespace-nowrap">
                      {row.next_harvest_date ? formatDate(row.next_harvest_date) : (
                        <span className="text-cult-text-faint">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && displayed.length > 0 && (
        <p className="text-[10px] text-cult-text-faint mt-3 pt-3 border-t border-cult-charcoal/40">
          Projection uses strain-specific conversion rates where available (≥3 sessions).
          Global defaults used for new strains — confidence shown above.
          Gap = Projected Yield − Open Order Demand.
        </p>
      )}
    </div>
  );
}
