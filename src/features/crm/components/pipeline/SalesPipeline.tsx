/**
 * SalesPipeline — Phase 5 "Inventory Simplification"
 *
 * Replaces the previous dense 7-column pipeline grid with a clean
 * strain → batch → stage drill-down.
 *
 * Click a strain  → see its batches
 * Each batch card → horizontal stage bar + qty labels
 *
 * v2 — search filter + summary charts (pure CSS, zero deps)
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
} from 'lucide-react';
import {
  useSimplifiedInventory,
  type StrainSummary,
} from '../../hooks/useSimplifiedInventory';
import {
  useStrainDemandPressure,
  type StrainDemandPressure,
} from '@/features/orders/hooks/useStrainInventory';
import { LoadingSpinner } from '@/shared/components';
import {
  StageBar,
  BatchCard,
  fmtGrams as fmt,
  type BatchSummary,
} from '@/shared/components/inventory';

/* ────────────────────────────────────────────── *
 *  Constants                                      *
 * ────────────────────────────────────────────── */

/* STAGE_COLORS now imported from @/shared/components/inventory */

const HEALTH_STYLES: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  healthy: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  low: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  warning: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    dot: 'bg-orange-400',
  },
  critical: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    dot: 'bg-red-400',
  },
};

const HEALTH_HEX: Record<string, string> = {
  healthy: '#10b981',
  low: '#f59e0b',
  warning: '#f97316',
  critical: '#ef4444',
};

const HEALTH_DESCRIPTIONS: Record<string, string> = {
  healthy: 'Good supply — sellable stock on hand or 10kg+ in the pipeline',
  low: 'Running low — under 500g sellable with little or no pipeline to replenish',
  warning: 'Watch closely — low sellable stock, but some pipeline inventory is in progress',
  critical: 'Out of stock — open demand with zero sellable and zero pipeline inventory',
};

/* ────────────────────────────────────────────── *
 *  Helpers                                        *
 * ────────────────────────────────────────────── */

/* fmt() now imported as fmtGrams from @/shared/components/inventory */

/* ────────────────────────────────────────────── *
 *  SummaryCharts                                  *
 * ────────────────────────────────────────────── */

function SummaryCharts({ strains, demandMap }: { strains: StrainSummary[]; demandMap: Map<string, StrainDemandPressure> }) {
  const total = strains.length || 1;

  /* health distribution */
  const healthCounts = useMemo(() => {
    const c: Record<string, number> = { healthy: 0, low: 0, warning: 0, critical: 0 };
    strains.forEach((s) => { c[s.healthStatus] = (c[s.healthStatus] || 0) + 1; });
    return c;
  }, [strains]);

  /* inventory breakdown (sellable / pipeline / byproduct) + committed demand in grams */
  const breakdown = useMemo(() => {
    let sellable = 0, pipeline = 0, byproduct = 0, committedGrams = 0;
    strains.forEach((s) => {
      sellable += s.sellableGrams;
      pipeline += s.pipelineGrams;
      byproduct += s.byproductGrams;
      const d = demandMap.get(s.strain);
      if (d) committedGrams += d.total_committed_weight_grams;
    });
    const grand = sellable + pipeline + byproduct || 1;
    return { sellable, pipeline, byproduct, committedGrams, grand };
  }, [strains, demandMap]);

  /* top 5 by weight */
  const top5 = useMemo(
    () => [...strains].sort((a, b) => b.totalGrams - a.totalGrams).slice(0, 5),
    [strains],
  );
  const maxW = top5[0]?.totalGrams || 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
      {/* ── Health ── */}
      <div className="rounded-xl border border-cult-medium-gray/20 bg-cult-black p-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
          Health
        </h4>
        <div className="space-y-1.5">
          {(['healthy', 'low', 'warning', 'critical'] as const).map((k) => {
            const n = healthCounts[k];
            const pct = (n / total) * 100;
            return (
              <div key={k} className="flex items-center gap-2">
                <span className="text-xs w-12 capitalize text-neutral-500">{k}</span>
                <div className="flex-1 h-2.5 rounded-full bg-neutral-900 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: HEALTH_HEX[k] }}
                  />
                </div>
                <span className="text-xs w-5 text-right font-bold text-neutral-400 tabular-nums">{n}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Breakdown ── */}
      <div className="rounded-xl border border-cult-medium-gray/20 bg-cult-black p-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
          Breakdown
        </h4>
        <div className="space-y-1.5">
          {([
            { label: 'Sellable', v: breakdown.sellable, c: '#06b6d4', isUnits: false },
            { label: 'Pipeline', v: breakdown.pipeline, c: '#8b5cf6', isUnits: false },
            { label: 'Byproduct', v: breakdown.byproduct, c: '#78716c', isUnits: false },
          ] as const).map(({ label, v, c }) => {
            const pct = (v / breakdown.grand) * 100;
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xs w-14 text-neutral-500">{label}</span>
                <div className="flex-1 h-2.5 rounded-full bg-neutral-900 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: c }}
                  />
                </div>
                <span className="text-xs w-12 text-right font-bold text-neutral-400 tabular-nums">
                  {fmt(v)}
                </span>
              </div>
            );
          })}
          {breakdown.committedGrams > 0 && (
            <div className="flex items-center gap-2 pt-1 mt-1 border-t border-cult-medium-gray/10">
              <span className="text-xs w-14 text-cyan-500">Committed</span>
              <div className="flex-1 h-2.5 rounded-full bg-neutral-900 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((breakdown.committedGrams / (breakdown.sellable || 1)) * 100, 100)}%`,
                    backgroundColor: '#22d3ee',
                  }}
                />
              </div>
              <span className="text-xs w-12 text-right font-bold text-cyan-400 tabular-nums">
                {fmt(breakdown.committedGrams)}
              </span>
            </div>
          )}
        </div>
        <div className="mt-2 pt-1.5 border-t border-cult-medium-gray/10 text-center text-xs text-neutral-600">
          Total <span className="text-neutral-400 font-bold">{fmt(breakdown.grand)}</span>
          {breakdown.committedGrams > 0 && (
            <span className="ml-2 text-cyan-500">
              · {fmt(breakdown.committedGrams)} committed
            </span>
          )}
        </div>
      </div>

      {/* ── Top 5 ── */}
      <div className="rounded-xl border border-cult-medium-gray/20 bg-cult-black p-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
          Top 5 Strains
        </h4>
        <div className="space-y-1.5">
          {top5.map((s) => {
            const pct = (s.totalGrams / maxW) * 100;
            return (
              <div key={s.strain} className="flex items-center gap-2">
                <span className="text-xs w-16 text-neutral-400 truncate" title={s.strain}>
                  {s.strain}
                </span>
                <div className="flex-1 h-2.5 rounded-full bg-neutral-900 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: HEALTH_HEX[s.healthStatus] }}
                  />
                </div>
                <span className="text-xs w-10 text-right font-bold text-neutral-400 tabular-nums">
                  {fmt(s.totalGrams)}
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

function HealthDot({ status }: { status: string }) {
  const s = HEALTH_STYLES[status] || HEALTH_STYLES.healthy;
  const desc = HEALTH_DESCRIPTIONS[status] || status;
  return (
    <div className="relative group/health">
      <div
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${s.bg} cursor-default`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        <span className={`text-xs font-semibold capitalize ${s.text}`}>
          {status}
        </span>
      </div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 invisible group-hover/health:opacity-100 group-hover/health:visible transition-all duration-200 z-50 pointer-events-none">
        {desc}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
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
}: {
  strain: StrainSummary;
  isExpanded: boolean;
  onToggle: () => void;
  batches: BatchSummary[];
  batchesLoading: boolean;
  demand?: StrainDemandPressure;
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
        <Leaf className="w-4 h-4 text-emerald-500/60 flex-shrink-0" />
        <span className="text-sm font-bold text-neutral-200 flex-1 text-left truncate">
          {strain.strain}
        </span>
        <div className="flex items-center gap-3 flex-shrink-0">
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
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-neutral-300 tabular-nums">
              {fmt(strain.totalGrams)}
            </div>
            <div className="text-xs text-neutral-600">
              {fmt(strain.sellableGrams)} sellable
            </div>
          </div>
          <div className="text-right sm:hidden">
            <div className="text-xs font-bold text-neutral-300 tabular-nums">
              {fmt(strain.totalGrams)}
            </div>
          </div>
          <HealthDot status={strain.healthStatus} />
        </div>
      </button>

      {/* Expanded batch list */}
      {isExpanded && (
        <div className="px-4 pb-3 border-t border-cult-medium-gray/10">
          {/* Demand detail banner */}
          {demand && demand.pending_order_details.length > 0 && (
            <div className="mt-3 mb-2 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/15">
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
          ) : (
            <div className="py-6 text-center text-xs text-neutral-600">
              No available inventory for this strain
            </div>
          )}
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
  if (loading) {
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
        <p className="text-red-400 text-sm mb-2">Error loading inventory</p>
        <p className="text-neutral-600 text-xs mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="text-xs text-blue-400 hover:underline"
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
      {showCharts && strains.length > 0 && <SummaryCharts strains={strains} demandMap={demandMap} />}

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
            />
          ))
        )}
      </div>
    </div>
  );
}
