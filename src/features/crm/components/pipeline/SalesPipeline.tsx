/**
 * SalesPipeline — Phase 5 "Inventory Simplification"
 *
 * Replaces the previous dense 7-column pipeline grid with a clean
 * strain → batch → stage drill-down.
 *
 * Click a strain  → see its batches
 * Each batch card → horizontal stage bar + qty labels
 */

import { useState } from 'react';
import {
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Package,
  Leaf,
  Loader2,
} from 'lucide-react';
import {
  useSimplifiedInventory,
  type StrainSummary,
  type BatchSummary,
  type BatchStage,
} from '../../hooks/useSimplifiedInventory';
import { LoadingSpinner } from '@/shared/components';

/* ────────────────────────────────────────────── *
 *  Constants                                      *
 * ────────────────────────────────────────────── */

const STAGE_COLORS: Record<string, string> = {
  Binned: '#6366f1', // indigo
  Bucked: '#8b5cf6', // violet
  Bulk: '#10b981', // emerald
  Packaged: '#06b6d4', // cyan
  Trim: '#78716c', // stone
};

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

/* ────────────────────────────────────────────── *
 *  Helpers                                        *
 * ────────────────────────────────────────────── */

function fmt(g: number): string {
  if (g >= 1000) return (g / 1000).toFixed(1) + 'kg';
  return Math.round(g).toLocaleString() + 'g';
}

/* ────────────────────────────────────────────── *
 *  Sub-components                                 *
 * ────────────────────────────────────────────── */

function HealthDot({ status }: { status: string }) {
  const s = HEALTH_STYLES[status] || HEALTH_STYLES.healthy;
  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <span className={`text-[10px] font-semibold capitalize ${s.text}`}>
        {status}
      </span>
    </div>
  );
}

function StageBar({ stages }: { stages: BatchStage[] }) {
  const gramStages = stages.filter((s) => s.unit === 'g' && s.availableQty > 0);
  const total = gramStages.reduce((acc, s) => acc + s.availableQty, 0);
  if (total === 0 && stages.every((s) => s.availableQty === 0)) return null;

  return (
    <div>
      {total > 0 && (
        <div className="flex gap-[2px] h-2 rounded overflow-hidden mb-1.5">
          {gramStages.map((s) => {
            const pct = (s.availableQty / total) * 100;
            return (
              <div
                key={s.category}
                className="h-full rounded-sm transition-all"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  background: STAGE_COLORS[s.stageName] || '#525252',
                }}
              />
            );
          })}
        </div>
      )}
      <div className="flex gap-3 flex-wrap">
        {stages
          .filter((s) => s.availableQty > 0)
          .map((s) => (
            <div key={s.category} className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: STAGE_COLORS[s.stageName] || '#525252',
                }}
              />
              <span className="text-[10px] text-neutral-500">{s.stageName}</span>
              <span className="text-[10px] font-bold text-neutral-300 tabular-nums">
                {s.unit === 'unit'
                  ? s.availableQty.toLocaleString() + 'u'
                  : fmt(s.availableQty)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

function BatchCard({ batch }: { batch: BatchSummary }) {
  return (
    <div className="rounded-lg p-3 border border-cult-medium-gray/20 bg-cult-black hover:border-cult-medium-gray/40 transition-colors">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-neutral-300 font-mono tracking-wide">
          {batch.batchNumber}
        </span>
        <span className="text-xs font-bold text-neutral-400 tabular-nums">
          {fmt(batch.totalGrams)}
        </span>
      </div>
      <StageBar stages={batch.stages} />
    </div>
  );
}

function StrainRow({
  strain,
  isExpanded,
  onToggle,
  batches,
  batchesLoading,
}: {
  strain: StrainSummary;
  isExpanded: boolean;
  onToggle: () => void;
  batches: BatchSummary[];
  batchesLoading: boolean;
}) {
  const Chevron = isExpanded ? ChevronDown : ChevronRight;

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
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-neutral-300 tabular-nums">
              {fmt(strain.totalGrams)}
            </div>
            <div className="text-[9px] text-neutral-600">
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

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-neutral-500" />
          <h2 className="text-lg font-bold text-neutral-200">Inventory</h2>
          <span className="text-xs text-neutral-600 ml-1">
            {strains.length} strains
          </span>
        </div>
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

      {/* Strain list */}
      <div className="space-y-2">
        {strains.map((s) => (
          <StrainRow
            key={s.strain}
            strain={s}
            isExpanded={expandedStrain === s.strain}
            onToggle={() => toggleStrain(s.strain)}
            batches={expandedStrain === s.strain ? batches : []}
            batchesLoading={
              expandedStrain === s.strain ? batchesLoading : false
            }
          />
        ))}
      </div>

      {strains.length === 0 && (
        <div className="text-center py-12 text-neutral-600 text-sm">
          No inventory data available
        </div>
      )}
    </div>
  );
}
