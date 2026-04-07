import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Package, Layers } from 'lucide-react';
import { formatWeight, formatDateShort } from '@/shared/utils/format';
import type { BatchPlanData, Urgency } from '../types';
import { BatchStageBar } from './BatchStageBar';

// ─── Batches View ──────────────────────────────────────────────────────────
// Tab 2: Batch-specific view — "Which batches have material to work with?"
// Groups batches by strain, shows stage breakdown, allocations, and capacity.

type SortKey = 'weight' | 'strain' | 'demand' | 'allocated';

const URGENCY_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  overdue: { bg: 'bg-cult-danger-muted',    text: 'text-cult-danger',    dot: 'bg-cult-danger',    label: 'Overdue' },
  urgent:  { bg: 'bg-cult-warning-muted',  text: 'text-cult-warning',  dot: 'bg-cult-warning',  label: 'Urgent' },
  soon:    { bg: 'bg-sky-500/20',    text: 'text-sky-400',    dot: 'bg-sky-400',    label: 'Soon' },
  normal:  { bg: 'bg-cult-success-muted',  text: 'text-cult-success',  dot: 'bg-cult-success',  label: 'On Track' },
  no_date: { bg: 'bg-cult-medium-gray/20', text: 'text-cult-silver', dot: 'bg-cult-silver', label: 'No Demand' },
};

const URGENCY_RANK: Record<string, number> = {
  overdue: 0, urgent: 1, soon: 2, normal: 3, no_date: 4,
};

interface StrainBatchGroup {
  strainId: string;
  strainName: string;
  urgency: Urgency | 'no_date';
  totalWeightG: number;
  totalDemandG: number;
  totalAllocatedG: number;
  orderCount: number;
  batches: BatchPlanData[];
}

function groupByStrain(batches: BatchPlanData[]): StrainBatchGroup[] {
  const map = new Map<string, StrainBatchGroup>();

  for (const b of batches) {
    const key = b.strain_id;
    let group = map.get(key);
    if (!group) {
      group = {
        strainId: b.strain_id,
        strainName: b.strain_name,
        urgency: b.strain_urgency || 'no_date',
        totalWeightG: 0,
        totalDemandG: b.strain_demand_g,
        totalAllocatedG: 0,
        orderCount: b.strain_order_count,
        batches: [],
      };
      map.set(key, group);
    }
    group.totalWeightG += b.total_available_g;
    group.totalAllocatedG += b.total_allocated_g;
    group.batches.push(b);
  }

  return Array.from(map.values());
}

function sortGroups(groups: StrainBatchGroup[], sortBy: SortKey): StrainBatchGroup[] {
  return [...groups].sort((a, b) => {
    if (sortBy === 'weight') return b.totalWeightG - a.totalWeightG;
    if (sortBy === 'strain') return a.strainName.localeCompare(b.strainName);
    if (sortBy === 'demand') return b.totalDemandG - a.totalDemandG;
    if (sortBy === 'allocated') return b.totalAllocatedG - a.totalAllocatedG;
    return 0;
  });
}

// ── Dominant stage label ──
function dominantStage(b: BatchPlanData): { label: string; colorClass: string } {
  const stages = [
    { key: 'binned_g', label: 'Binned', colorClass: 'text-orange-400', value: b.binned_g },
    { key: 'bucked_g', label: 'Bucked', colorClass: 'text-cult-warning', value: b.bucked_g },
    { key: 'trim_g', label: 'Trim', colorClass: 'text-cult-warning', value: b.trim_g },
    { key: 'bulk_g', label: 'Bulk', colorClass: 'text-sky-400', value: b.bulk_g },
    { key: 'packaged_g', label: 'Packaged', colorClass: 'text-cult-success', value: b.packaged_g },
  ];
  const top = stages.reduce((a, c) => c.value > a.value ? c : a, stages[0]);
  return { label: top.label, colorClass: top.colorClass };
}

export default function BatchesView({ batches }: { batches: BatchPlanData[] }) {
  const [sortBy, setSortBy] = useState<SortKey>('weight');
  const [expandedStrains, setExpandedStrains] = useState<Set<string>>(new Set());

  const groups = useMemo(() => groupByStrain(batches), [batches]);
  const sorted = useMemo(() => sortGroups(groups, sortBy), [groups, sortBy]);

  const toggleStrain = (id: string) => {
    setExpandedStrains(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Stats
  const totalBatches = batches.length;
  const withDemand = groups.filter(g => g.totalDemandG > 0).length;
  const unallocated = groups.filter(g => g.totalDemandG > 0 && g.totalAllocatedG === 0).length;

  return (
    <div>
      {/* Summary badges */}
      <div className="flex items-center gap-3 px-1 mb-3">
        <span className="text-sm text-cult-lighter-gray">{totalBatches} batches across {groups.length} strains</span>
        {withDemand > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-sky-900/60 text-sky-400">
            {withDemand} with demand
          </span>
        )}
        {unallocated > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-cult-warning-muted text-cult-warning">
            {unallocated} unallocated
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-cult-surface rounded-cult border border-cult-border/50 overflow-hidden">
        {/* Header */}
        <div
          className="grid gap-4 px-5 py-3 text-xs font-semibold text-cult-medium-gray uppercase tracking-wider border-b border-cult-border/40 select-none"
          style={{ gridTemplateColumns: '2fr 0.8fr 0.8fr 0.8fr 1fr' }}
        >
          <button onClick={() => setSortBy('strain')} className={`text-left transition-colors hover:text-cult-lighter-gray ${sortBy === 'strain' ? 'text-cult-text-primary' : ''}`}>
            Strain {sortBy === 'strain' && '↓'}
          </button>
          <button onClick={() => setSortBy('weight')} className={`text-left transition-colors hover:text-cult-lighter-gray ${sortBy === 'weight' ? 'text-cult-text-primary' : ''}`}>
            Inventory {sortBy === 'weight' && '↓'}
          </button>
          <button onClick={() => setSortBy('demand')} className={`text-left transition-colors hover:text-cult-lighter-gray ${sortBy === 'demand' ? 'text-cult-text-primary' : ''}`}>
            Demand {sortBy === 'demand' && '↓'}
          </button>
          <button onClick={() => setSortBy('allocated')} className={`text-left transition-colors hover:text-cult-lighter-gray ${sortBy === 'allocated' ? 'text-cult-text-primary' : ''}`}>
            Allocated {sortBy === 'allocated' && '↓'}
          </button>
          <div>Batches</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-cult-border/20">
          {sorted.map(group => {
            const isExpanded = expandedStrains.has(group.strainId);
            const u = URGENCY_STYLES[group.urgency] ?? URGENCY_STYLES.no_date;
            const hasDemand = group.totalDemandG > 0;
            const coverPct = hasDemand ? Math.min((group.totalWeightG / group.totalDemandG) * 100, 999) : 0;

            return (
              <div key={group.strainId}>
                {/* Strain row */}
                <div
                  onClick={() => toggleStrain(group.strainId)}
                  className={`grid gap-4 px-5 py-3.5 cursor-pointer transition-colors hover:bg-cult-surface-raised/50 ${
                    isExpanded ? 'bg-cult-surface-raised' : ''
                  } ${
                    hasDemand && group.totalAllocatedG === 0
                      ? 'border-l-[3px] border-l-cult-warning/40'
                      : hasDemand
                        ? 'border-l-[3px] border-l-cult-success/30'
                        : 'border-l-[3px] border-l-transparent'
                  }`}
                  style={{ gridTemplateColumns: '2fr 0.8fr 0.8fr 0.8fr 1fr' }}
                >
                  {/* Strain + urgency */}
                  <div className="flex items-center gap-2 min-w-0">
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-cult-medium-gray flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-cult-medium-gray flex-shrink-0" />
                    }
                    <span className="font-semibold text-cult-text-primary text-sm truncate">
                      {group.strainName}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${u.bg} ${u.text} text-[11px] font-semibold flex-shrink-0`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.dot}`} />
                      {u.label}
                    </span>
                  </div>

                  {/* Inventory */}
                  <div className="flex flex-col justify-center">
                    <div className="text-sm font-bold text-cult-text-primary">
                      {formatWeight(group.totalWeightG)}
                    </div>
                    {hasDemand && (
                      <div className={`text-xs ${coverPct >= 100 ? 'text-cult-success' : coverPct >= 50 ? 'text-cult-warning' : 'text-cult-danger'}`}>
                        {Math.round(coverPct)}% of demand
                      </div>
                    )}
                  </div>

                  {/* Demand */}
                  <div className="flex flex-col justify-center">
                    {hasDemand ? (
                      <>
                        <div className="text-sm font-bold text-cult-text-primary">
                          {formatWeight(group.totalDemandG)}
                        </div>
                        <div className="text-xs text-cult-medium-gray">
                          {group.orderCount} order{group.orderCount !== 1 ? 's' : ''}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-cult-medium-gray italic">No orders</span>
                    )}
                  </div>

                  {/* Allocated */}
                  <div className="flex flex-col justify-center">
                    {group.totalAllocatedG > 0 ? (
                      <div className="text-sm font-bold text-cult-success">
                        {formatWeight(group.totalAllocatedG)}
                      </div>
                    ) : hasDemand ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-cult-warning/15 text-cult-warning">
                        None
                      </span>
                    ) : (
                      <span className="text-xs text-cult-medium-gray">—</span>
                    )}
                  </div>

                  {/* Batch count */}
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cult-medium-gray" />
                    <span className="text-sm text-cult-lighter-gray">
                      {group.batches.length} batch{group.batches.length !== 1 ? 'es' : ''}
                    </span>
                  </div>
                </div>

                {/* Expanded batch cards */}
                {isExpanded && (
                  <div className="px-5 py-3 bg-cult-surface-raised/30 border-t border-cult-border/20">
                    <div className="flex flex-col gap-2">
                      {group.batches.map(batch => {
                        const dom = dominantStage(batch);
                        return (
                          <div
                            key={batch.batch_id}
                            className="flex items-center gap-4 px-4 py-3 rounded-cult bg-cult-surface border border-cult-border/40"
                          >
                            {/* Batch number */}
                            <div className="w-32 flex-shrink-0">
                              <div className="text-sm font-semibold text-cult-text-primary">
                                {batch.batch_number}
                              </div>
                              <div className={`text-xs ${dom.colorClass}`}>
                                Mostly {dom.label}
                              </div>
                            </div>

                            {/* Stage bar */}
                            <div className="flex-1 min-w-0">
                              <BatchStageBar batch={batch} height="h-2" />
                            </div>

                            {/* Weight */}
                            <div className="w-24 text-right flex-shrink-0">
                              <div className="text-sm font-bold text-cult-text-primary">
                                {formatWeight(batch.total_available_g)}
                              </div>
                              <div className="text-xs text-cult-medium-gray">available</div>
                            </div>

                            {/* Allocation */}
                            <div className="w-28 text-right flex-shrink-0">
                              {batch.allocated_order_items > 0 ? (
                                <>
                                  <div className="text-sm font-semibold text-cult-success">
                                    {formatWeight(batch.total_allocated_g)}
                                  </div>
                                  <div className="text-xs text-cult-medium-gray">
                                    {batch.allocated_order_items} order{batch.allocated_order_items !== 1 ? 's' : ''}
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-cult-medium-gray italic">Unallocated</span>
                              )}
                            </div>

                            {/* Capacity */}
                            {batch.bulk_g > 0 && (
                              <div className="w-28 text-right flex-shrink-0">
                                <div className="text-xs text-cult-medium-gray">Est. from bulk</div>
                                <div className="text-sm text-sky-400 font-semibold">
                                  {batch.est_lbs_from_bulk.toFixed(1)} lbs
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {batches.length === 0 && (
        <div className="p-8 text-center text-cult-medium-gray">No active batches in the system.</div>
      )}
    </div>
  );
}
