/**
 * SalesPipeline — Phase 6 "SKU Yield Unification"
 *
 * Migrated from runway-based depletion model to SKU yield projections.
 * Now shares the same data model as ProductionQueue (useSkuYield).
 *
 * Keeps demand overlay (useStrainDemandPressure) since Leo needs
 * to see committed orders alongside projected inventory.
 *
 * Click a strain  → see its batches + BatchAllocationPanel
 * Summary charts → SKU projections + demand vs. capacity
 */

import { useState, useMemo } from 'react';
import {
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Package,
  Leaf,
  Loader2,
  Search,
  X,
  BarChart3,
  ShoppingCart,
  AlertTriangle,
} from 'lucide-react';
import {
  useSimplifiedInventory,
  type StrainSummary,
} from '../../hooks/useSimplifiedInventory';
import {
  useStrainDemandPressure,
  type StrainDemandPressure,
} from '@/features/orders/hooks/useStrainInventory';
import {
  useSkuYield,
  AGE_STYLES,
  type StrainAllocation,
  type AgePressure,
} from '@/shared/hooks/useSkuYield';
import { LoadingSpinner } from '@/shared/components';
import {
  StageBar,
  BatchCard,
  SKU_COLORS,
  fmtGrams as fmt,
  type BatchSummary,
} from '@/shared/components/inventory';
import { BatchAllocationPanel } from '@/features/production-queue/components/BatchAllocationPanel';
import { formatWeight } from '@/shared/utils/format';

/* ────────────────────────────────────────────── *
 *  SummaryCharts — SKU yield projections          *
 * ────────────────────────────────────────────── */

function SummaryCharts({
  strains,
  demandMap,
  skuStrains,
  summary,
}: {
  strains: StrainSummary[];
  demandMap: Map<string, StrainDemandPressure>;
  skuStrains: StrainAllocation[];
  summary: { total_proj_3_5g: number; total_proj_14g: number; total_proj_1lb: number; total_proj_preroll: number; total_proj_trim_g: number; total_batches: number; aging_batches: number; total_remaining_g: number };
}) {
  /* ── Age pressure distribution ── */
  const ageCounts = useMemo(() => {
    const c = { fresh: 0, normal: 0, watch: 0, aging: 0 };
    skuStrains.forEach(s => {
      s.batches.forEach(b => { c[b.age_pressure]++; });
    });
    return c;
  }, [skuStrains]);
  const totalBatches = summary.total_batches || 1;

  /* ── Demand vs. projected capacity ── */
  const demandVsCapacity = useMemo(() => {
    let committedGrams = 0;
    strains.forEach(s => {
      const d = demandMap.get(s.strain);
      if (d) committedGrams += d.total_committed_weight_grams;
    });
    const projectedGrams =
      summary.total_proj_3_5g * 3.5 +
      summary.total_proj_14g * 14 +
      summary.total_proj_1lb * 454;
    return { committedGrams, projectedGrams };
  }, [strains, demandMap, summary]);

  /* ── Top 5 by projected yield ── */
  const top5 = useMemo(() => {
    return [...skuStrains]
      .sort((a, b) => {
        const aTotal = a.total_proj_3_5g + a.total_proj_14g + a.total_proj_1lb;
        const bTotal = b.total_proj_3_5g + b.total_proj_14g + b.total_proj_1lb;
        return bTotal - aTotal;
      })
      .slice(0, 5);
  }, [skuStrains]);
  const maxUnits = top5[0] ? (top5[0].total_proj_3_5g + top5[0].total_proj_14g + top5[0].total_proj_1lb) : 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
      {/* ── Batch Health (Age Pressure) ── */}
      <div className="rounded-xl border border-cult-medium-gray/20 bg-cult-black p-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
          Batch Health
        </h4>
        <div className="space-y-1.5">
          {([
            { key: 'aging' as const, hex: '#ef4444' },
            { key: 'watch' as const, hex: '#f59e0b' },
            { key: 'normal' as const, hex: '#9ca3af' },
            { key: 'fresh' as const, hex: '#10b981' },
          ]).map(({ key, hex }) => {
            const n = ageCounts[key];
            if (n === 0) return null;
            const pct = (n / totalBatches) * 100;
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs w-14 text-neutral-500 capitalize">{AGE_STYLES[key].label}</span>
                <div className="flex-1 h-2.5 rounded-full bg-neutral-900 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: hex }}
                  />
                </div>
                <span className="text-xs w-5 text-right font-bold text-neutral-400 tabular-nums">{n}</span>
              </div>
            );
          })}
          {summary.aging_batches > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-cult-medium-gray/10 text-center">
              <span className="text-xs text-cult-danger font-semibold">
                {summary.aging_batches} batch{summary.aging_batches !== 1 ? 'es' : ''} aging — process ASAP
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── SKU Projections ── */}
      <div className="rounded-xl border border-cult-medium-gray/20 bg-cult-black p-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
          Projected Output
        </h4>
        <div className="space-y-1.5">
          {([
            { label: '3.5g Jars', v: summary.total_proj_3_5g, hex: SKU_COLORS['3.5g'].hex, display: summary.total_proj_3_5g.toLocaleString() },
            { label: '14g Mylars', v: summary.total_proj_14g, hex: SKU_COLORS['14g'].hex, display: summary.total_proj_14g.toLocaleString() },
            { label: '1lb Bags', v: summary.total_proj_1lb, hex: SKU_COLORS['1lb'].hex, display: summary.total_proj_1lb.toLocaleString() },
            { label: 'Prerolls', v: summary.total_proj_preroll, hex: SKU_COLORS['preroll'].hex, display: summary.total_proj_preroll.toLocaleString() },
            { label: 'Trim', v: summary.total_proj_trim_g, hex: SKU_COLORS['trim'].hex, display: formatWeight(summary.total_proj_trim_g) },
          ]).filter(r => r.v > 0).map(({ label, v, hex, display }) => {
            const maxVal = Math.max(summary.total_proj_3_5g, summary.total_proj_14g, summary.total_proj_1lb, summary.total_proj_preroll, summary.total_proj_trim_g, 1);
            const pct = (v / maxVal) * 100;
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xs w-16 text-neutral-500">{label}</span>
                <div className="flex-1 h-2.5 rounded-full bg-neutral-900 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: hex }}
                  />
                </div>
                <span className="text-xs w-12 text-right font-bold text-neutral-400 tabular-nums">
                  {display}
                </span>
              </div>
            );
          })}
          {demandVsCapacity.committedGrams > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-cult-medium-gray/10 flex items-center gap-2">
              <ShoppingCart className="w-3 h-3 text-cyan-400" />
              <span className="text-xs text-cyan-400">
                {fmt(demandVsCapacity.committedGrams)} committed
              </span>
              <span className="text-xs text-neutral-600">vs.</span>
              <span className="text-xs text-neutral-400">
                {fmt(demandVsCapacity.projectedGrams)} projected
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Top 5 Strains (by projected units) ── */}
      <div className="rounded-xl border border-cult-medium-gray/20 bg-cult-black p-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
          Top 5 Strains
        </h4>
        <div className="space-y-1.5">
          {top5.map((s) => {
            const totalUnits = s.total_proj_3_5g + s.total_proj_14g + s.total_proj_1lb;
            const pct = (totalUnits / maxUnits) * 100;
            // Color: use the dominant SKU type
            const hex = s.total_proj_3_5g >= s.total_proj_14g && s.total_proj_3_5g >= s.total_proj_1lb
              ? SKU_COLORS['3.5g'].hex
              : s.total_proj_14g >= s.total_proj_1lb
                ? SKU_COLORS['14g'].hex
                : SKU_COLORS['1lb'].hex;

            return (
              <div key={s.strain} className="flex items-center gap-2">
                <span className="text-xs w-16 text-neutral-400 truncate" title={s.strain}>
                  {s.strain}
                </span>
                <div className="flex-1 h-2.5 rounded-full bg-neutral-900 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: hex }}
                  />
                </div>
                <span className="text-xs w-12 text-right font-bold text-neutral-400 tabular-nums">
                  {totalUnits.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────── *
 *  Sub-components                                 *
 * ────────────────────────────────────────────── */

function AgePressureDot({ allocation }: { allocation: StrainAllocation | undefined }) {
  if (!allocation) return null;

  // Show the worst age pressure across batches
  const worstPressure: AgePressure =
    allocation.aging_batches > 0 ? 'aging' :
    allocation.batches.some(b => b.age_pressure === 'watch') ? 'watch' :
    allocation.batches.some(b => b.age_pressure === 'normal') ? 'normal' : 'fresh';

  const style = AGE_STYLES[worstPressure];

  return (
    <div className="relative group/age">
      <div
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${style.bg} border ${style.border} cursor-default ${
          worstPressure === 'aging' ? 'animate-pulse' : ''
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        <span className={`text-xs font-bold tabular-nums ${style.text}`}>
          {allocation.oldest_age_days}d
        </span>
      </div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 invisible group-hover/age:opacity-100 group-hover/age:visible transition-all duration-200 z-50 pointer-events-none max-w-xs">
        Oldest batch: {allocation.oldest_age_days} days ({style.label})
        {allocation.aging_batches > 0 && ` · ${allocation.aging_batches} aging`}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}

function SkuProjectionBadge({ allocation }: { allocation: StrainAllocation | undefined }) {
  if (!allocation) return null;

  const { total_proj_3_5g, total_proj_14g, total_proj_1lb, total_proj_preroll, total_proj_trim_g } = allocation;
  const hasProjections = total_proj_3_5g > 0 || total_proj_14g > 0 || total_proj_1lb > 0 || total_proj_preroll > 0 || total_proj_trim_g > 0;

  if (!hasProjections) {
    return (
      <span className="text-xs text-gray-500" title="No projections — inventory may be unprocessed">
        —
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {total_proj_3_5g > 0 && (
        <span className={`text-[11px] tabular-nums ${SKU_COLORS['3.5g'].text}`} title={`${total_proj_3_5g} × 3.5g jars projected`}>
          <span className="font-semibold">{total_proj_3_5g}</span>
          <span className="text-gray-600 ml-0.5">3.5g</span>
        </span>
      )}
      {total_proj_14g > 0 && (
        <span className={`text-[11px] tabular-nums ${SKU_COLORS['14g'].text}`} title={`${total_proj_14g} × 14g mylars projected`}>
          <span className="font-semibold">{total_proj_14g}</span>
          <span className="text-gray-600 ml-0.5">14g</span>
        </span>
      )}
      {total_proj_1lb > 0 && (
        <span className={`text-[11px] tabular-nums ${SKU_COLORS['1lb'].text}`} title={`${total_proj_1lb} × 1lb bags projected`}>
          <span className="font-semibold">{total_proj_1lb}</span>
          <span className="text-gray-600 ml-0.5">1lb</span>
        </span>
      )}
      {total_proj_preroll > 0 && (
        <span className={`text-[11px] tabular-nums ${SKU_COLORS['preroll'].text}`} title={`${total_proj_preroll} × 1g prerolls`}>
          <span className="font-semibold">{total_proj_preroll}</span>
          <span className="text-gray-600 ml-0.5">pre</span>
        </span>
      )}
      {total_proj_trim_g > 0 && (
        <span className={`text-[11px] tabular-nums ${SKU_COLORS['trim'].text}`} title={`${formatWeight(total_proj_trim_g)} trim projected`}>
          <span className="font-semibold">{formatWeight(total_proj_trim_g)}</span>
          <span className="text-gray-600 ml-0.5">trim</span>
        </span>
      )}
    </div>
  );
}

/* StageBar & BatchCard now imported from @/shared/components/inventory */

function StrainRow({
  strain,
  isExpanded,
  onToggle,
  batches,
  batchesLoading,
  demand,
  allocation,
}: {
  strain: StrainSummary;
  isExpanded: boolean;
  onToggle: () => void;
  batches: BatchSummary[];
  batchesLoading: boolean;
  demand?: StrainDemandPressure;
  allocation?: StrainAllocation;
}) {
  const Chevron = isExpanded ? ChevronDown : ChevronRight;
  const committedWeight = demand?.total_committed_weight_grams || 0;
  const orderCount = demand?.pending_order_count || 0;

  return (
    <div className="border border-cult-medium-gray/20 rounded-xl overflow-hidden">
      {/* Strain header — clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cult-medium-gray/5 transition-colors"
      >
        <Chevron className="w-4 h-4 text-neutral-600 flex-shrink-0" />
        <Leaf className="w-4 h-4 text-cult-success/60 flex-shrink-0" />
        <span className="text-sm font-bold text-neutral-200 flex-1 text-left truncate">
          {strain.strain}
        </span>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* SKU projection badge */}
          <SkuProjectionBadge allocation={allocation} />

          {/* Committed demand */}
          {committedWeight > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10">
              <ShoppingCart className="w-3 h-3 text-cyan-400" />
              <span className="text-xs font-semibold text-cyan-400 tabular-nums">
                {fmt(committedWeight)}
              </span>
              <span className="text-xs text-cyan-400/60 hidden sm:inline">
                · {orderCount} order{orderCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Weight + aging alert */}
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-neutral-300 tabular-nums">
              {formatWeight(allocation?.total_remaining_g ?? strain.totalGrams)}
            </div>
            {allocation && allocation.aging_batches > 0 && (
              <div className="flex items-center gap-1 justify-end">
                <AlertTriangle className="w-3 h-3 text-cult-danger" />
                <span className="text-xs text-cult-danger">{allocation.aging_batches} aging</span>
              </div>
            )}
          </div>
          <div className="text-right sm:hidden">
            <div className="text-xs font-bold text-neutral-300 tabular-nums">
              {formatWeight(allocation?.total_remaining_g ?? strain.totalGrams)}
            </div>
          </div>

          {/* Age pressure dot (replaces RunwayDot / HealthDot) */}
          <AgePressureDot allocation={allocation} />
        </div>
      </button>

      {/* Expanded batch list */}
      {isExpanded && (
        <div className="border-t border-cult-medium-gray/10">
          {/* Demand detail banner */}
          {demand && demand.pending_order_details.length > 0 && (
            <div className="mx-4 mt-3 mb-2 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/15">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                  Open Demand — {fmt(committedWeight)} across {orderCount} order{orderCount !== 1 ? 's' : ''}
                </span>
              </div>
              {/* Size breakdown chips */}
              {demand.size_breakdown.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {demand.size_breakdown.map((s) => (
                    <span
                      key={s.size_label}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-[11px] text-cyan-300 tabular-nums"
                    >
                      <span className="font-semibold">{s.unit_count}×</span>
                      <span>{s.size_label}</span>
                      <span className="text-cyan-400/50">({fmt(s.weight_grams)})</span>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {demand.pending_order_details.map((d, i) => (
                  <span key={i} className="text-xs text-neutral-400">
                    <span className="text-neutral-300 font-medium">{d.customer_name}</span>
                    <span className="text-neutral-600 mx-1">·</span>
                    <span className="tabular-nums">{d.quantity} {d.size_label}</span>
                    <span className="text-neutral-600 ml-1">({fmt(d.weight_grams)})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* BatchAllocationPanel — conversion funnel + SKU yield projections */}
          <BatchAllocationPanel allocation={allocation} strainName={strain.strain} />

          {/* Batch cards (legacy view for stage detail) */}
          <div className="px-4 pb-3">
            {batchesLoading ? (
              <div className="flex items-center gap-2 py-6 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                <span className="text-xs text-neutral-500">
                  Loading batches…
                </span>
              </div>
            ) : batches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-3">
                {batches.map((b) => (
                  <BatchCard key={b.batchNumber} batch={b} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────── *
 *  Main component                                 *
 * ────────────────────────────────────────────── */

export function SalesPipeline() {
  const {
    strains,
    loading,
    error,
    expandedStrain,
    toggleStrain,
    batches,
    batchesLoading,
    refresh,
  } = useSimplifiedInventory();

  const { demandMap } = useStrainDemandPressure();
  const { byStrain: skuByStrain, strains: skuStrains, summary: skuSummary, loading: skuLoading } = useSkuYield();

  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCharts, setShowCharts] = useState(true);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  /* filtered strains */
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return strains;
    const q = searchTerm.toLowerCase();
    return strains.filter((s) => s.strain.toLowerCase().includes(q));
  }, [strains, searchTerm]);

  /* ── Loading state ── */
  if (loading && skuLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-cult-danger text-sm mb-2">Error loading inventory</p>
        <p className="text-neutral-600 text-xs mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="text-xs text-cult-info hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-neutral-500" />
          <h2 className="text-lg font-bold text-neutral-200">Inventory</h2>
          <span className="text-xs text-neutral-600 ml-1">
            {filtered.length === strains.length
              ? `${strains.length} strains`
              : `${filtered.length} / ${strains.length} strains`}
          </span>
          {skuSummary.total_batches > 0 && (
            <span className="text-xs text-neutral-600">
              · {skuSummary.total_batches} batches · {formatWeight(skuSummary.total_remaining_g)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowCharts((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              showCharts
                ? 'text-neutral-200 border-cult-medium-gray/40 bg-cult-medium-gray/10'
                : 'text-neutral-500 border-cult-medium-gray/20 hover:text-neutral-300 hover:border-cult-medium-gray/40'
            }`}
            title="Toggle charts"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Charts</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200 border border-cult-medium-gray/30 hover:border-cult-medium-gray/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search strains…"
            className="w-full bg-cult-black border border-cult-medium-gray/20 rounded-xl pl-9 pr-9 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-cult-medium-gray/50 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Charts */}
      {showCharts && strains.length > 0 && (
        <SummaryCharts
          strains={strains}
          demandMap={demandMap}
          skuStrains={skuStrains}
          summary={skuSummary}
        />
      )}

      {/* Strain list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-neutral-600">
            <Search className="w-5 h-5 mb-2 opacity-40" />
            <span className="text-sm">
              {searchTerm
                ? `No strains matching "${searchTerm}"`
                : 'No inventory data available'}
            </span>
          </div>
        ) : (
          filtered.map((s) => (
            <StrainRow
              key={s.strain}
              strain={s}
              isExpanded={expandedStrain === s.strain}
              onToggle={() => toggleStrain(s.strain)}
              batches={expandedStrain === s.strain ? batches : []}
              batchesLoading={
                expandedStrain === s.strain ? batchesLoading : false
              }
              demand={demandMap.get(s.strain)}
              allocation={skuByStrain.get(s.strain)}
            />
          ))
        )}
      </div>
    </div>
  );
}
