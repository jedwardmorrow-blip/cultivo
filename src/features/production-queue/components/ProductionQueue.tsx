import { useState, Fragment, useMemo } from 'react';
import { RefreshCw, AlertTriangle, Package, ClipboardList, ChevronDown, ChevronRight, Calendar, Hammer, Layers } from 'lucide-react';
import { PageSkeleton } from '@/shared/components';
import { useProductionQueue } from '../hooks/useProductionQueue';
import { useRevenuePipeline } from '../hooks/useRevenuePipeline';
import { useAllBatches } from '../hooks/useAllBatches';
import { useSkuYield, type StrainAllocation, type BatchYield } from '@/shared/hooks/useSkuYield';
import { RevenuePipeline } from './RevenuePipeline';
import { DeliveryLoadBalancer } from './DeliveryLoadBalancer';
import LaborView from './LaborView';
import BatchesView from './BatchesView';
import { formatDateShort, formatWeight, todayIso } from '@/shared/utils/format';
import type { ProductionQueueTab, ProductCategory, StrainFormatRow, OrderLineItem, Urgency } from '../types';

// ─── Shared Badges ──────────────────────────────────────────────────────────

function urgencyBadge(urgency: Urgency) {
  const styles: Record<Urgency, string> = {
    overdue: 'bg-red-500/20 text-red-400 border-red-500/30',
    urgent: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    soon: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    normal: 'bg-green-500/20 text-green-400 border-green-500/30',
    no_date: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  const labels: Record<Urgency, string> = {
    overdue: 'Overdue',
    urgent: 'Urgent',
    soon: 'Soon',
    normal: 'On Track',
    no_date: 'No Date',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${styles[urgency]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        urgency === 'overdue' ? 'bg-red-400' :
        urgency === 'urgent' ? 'bg-amber-400' :
        urgency === 'soon' ? 'bg-yellow-400' :
        urgency === 'normal' ? 'bg-green-400' : 'bg-gray-400'
      }`} />
      {labels[urgency]}
    </span>
  );
}

// ─── Stage badge for batch processing stage ────────────────────────────────

const STAGE_STYLES: Record<string, string> = {
  'Packaged': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Trimming': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Bulk Available': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Bucked': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Bucking': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Binned': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'Trimmed': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

function stageBadge(stage: string) {
  const style = STAGE_STYLES[stage] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${style}`}>
      {stage}
    </span>
  );
}

// ─── Batch Inventory Snippet (inline on order rows) ────────────────────────

function BatchInventorySnippet({ batch }: { batch: BatchYield | undefined }) {
  if (!batch) return null;

  const stages = [
    batch.packaged_g > 0 && { label: 'pkgd', value: formatWeight(batch.packaged_g), color: 'text-emerald-400' },
    (batch.bulk_flower_g + batch.bulk_smalls_g) > 0 && { label: 'bulk', value: formatWeight(batch.bulk_flower_g + batch.bulk_smalls_g), color: 'text-cyan-400' },
    (batch.bucked_flower_g + batch.bucked_smalls_g) > 0 && { label: 'bucked', value: formatWeight(batch.bucked_flower_g + batch.bucked_smalls_g), color: 'text-blue-400' },
    batch.binned_g > 0 && { label: 'binned', value: formatWeight(batch.binned_g), color: 'text-indigo-400' },
    batch.trim_g > 0 && { label: 'trim', value: formatWeight(batch.trim_g), color: 'text-amber-400/70' },
  ].filter(Boolean) as { label: string; value: string; color: string }[];

  if (stages.length === 0) return <span className="text-xs text-gray-600">depleted</span>;

  return (
    <span className="inline-flex items-center gap-2 text-xs">
      {stages.map(s => (
        <span key={s.label} className="inline-flex items-center gap-0.5">
          <span className={`font-semibold tabular-nums ${s.color}`}>{s.value}</span>
          <span className="text-gray-600">{s.label}</span>
        </span>
      ))}
    </span>
  );
}

// ─── Strain Inventory Summary (shown when unassigned orders exist) ──────────

function StrainInventorySummary({ formats }: { formats: StrainFormatRow[] }) {
  const f = formats[0];
  if (!f) return null;

  const items = [
    f.already_packaged_units > 0 && { value: `${f.already_packaged_units} units`, label: 'packaged', color: 'text-emerald-400' },
    f.ready_flower_g > 0 && { value: formatWeight(f.ready_flower_g), label: 'flower ready', color: 'text-emerald-400' },
    f.ready_smalls_g > 0 && { value: formatWeight(f.ready_smalls_g), label: 'smalls ready', color: 'text-cyan-400' },
    f.pipeline_bucked_g > 0 && { value: formatWeight(f.pipeline_bucked_g), label: 'bucked', color: 'text-blue-400' },
    f.pipeline_binned_g > 0 && { value: formatWeight(f.pipeline_binned_g), label: 'binned', color: 'text-indigo-400' },
  ].filter(Boolean) as { value: string; label: string; color: string }[];

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-cult bg-cult-dark-gray/40 border border-cult-medium-gray/30 mb-3">
      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold shrink-0">Available Stock</span>
      <div className="flex items-center gap-3 text-xs flex-wrap">
        {items.map(item => (
          <span key={item.label} className="inline-flex items-center gap-1">
            <span className={`font-semibold tabular-nums ${item.color}`}>{item.value}</span>
            <span className="text-gray-600">{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Stock Status Indicator (strain header) ─────────────────────────────────

function stockStatusIndicator(formats: StrainFormatRow[]) {
  const f = formats[0];
  if (!f) return null;

  const hasPackaged = f.already_packaged_units > 0;
  const hasReady = f.ready_flower_g > 0 || f.ready_smalls_g > 0;

  const label = hasPackaged ? 'Has stock' : hasReady ? 'Needs packaging' : 'Needs processing';
  const dotColor = hasPackaged ? 'bg-emerald-400' : hasReady ? 'bg-amber-400' : 'bg-red-400';
  const textColor = hasPackaged ? 'text-emerald-400' : hasReady ? 'text-amber-400' : 'text-red-400';

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span className={`text-xs font-medium ${textColor}`}>{label}</span>
    </span>
  );
}

// ─── Product Category Filter ────────────────────────────────────────────────

function ProductCategoryStrip({
  value, onChange, counts,
}: {
  value: ProductCategory;
  onChange: (c: ProductCategory) => void;
  counts: Record<string, { lines: number; lbs: number }>;
}) {
  const categories: ProductCategory[] = ['All', 'Flower', 'Smalls', 'Fresh Frozen'];
  return (
    <div className="flex items-center gap-2">
      <Package className="w-4 h-4 text-gray-500" />
      {categories.map(cat => {
        const count = cat === 'All'
          ? { lines: Object.values(counts).reduce((s, c) => s + c.lines, 0), lbs: Object.values(counts).reduce((s, c) => s + c.lbs, 0) }
          : counts[cat] || { lines: 0, lbs: 0 };
        if (cat !== 'All' && count.lines === 0) return null;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`px-3 py-1.5 rounded-cult text-sm font-medium transition-colors ${
              value === cat
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
            title={`${count.lines} items · ${count.lbs.toFixed(1)} lbs`}
          >
            {cat}
            {value === cat && cat !== 'All' && (
              <span className="ml-1.5 text-xs text-gray-400 font-normal">{count.lbs.toFixed(1)} lbs</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Simplified By Strain View ──────────────────────────────────────────────
// Strain header → expand → orders grouped by delivery day with inline batch inventory

function SimplifiedByStrainView({
  byStrain,
  byOrder,
  selectedDeliveryDate,
  skuByStrain,
}: {
  byStrain: StrainFormatRow[];
  byOrder: OrderLineItem[];
  selectedDeliveryDate: string | null;
  skuByStrain: Map<string, StrainAllocation>;
}) {
  const [expandedStrains, setExpandedStrains] = useState<Set<string>>(new Set());
  const today = useMemo(() => todayIso(), []);

  // Group format rows by strain_id
  const strainFormats = useMemo(() => {
    const map = new Map<string, StrainFormatRow[]>();
    byStrain.forEach(row => {
      const key = row.strain_id || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    });
    return map;
  }, [byStrain]);

  // Group orders by strain
  const strainOrders = useMemo(() => {
    const map = new Map<string, OrderLineItem[]>();
    byOrder.forEach(o => {
      const key = o.strain_id || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    });
    return map;
  }, [byOrder]);

  // Build a batch lookup from skuByStrain for quick access
  const batchLookup = useMemo(() => {
    const map = new Map<string, BatchYield>();
    skuByStrain.forEach(alloc => {
      alloc.batches.forEach(b => {
        map.set(b.batch_number, b);
      });
    });
    return map;
  }, [skuByStrain]);

  // Filter strains by selected delivery date
  const filteredStrainIds = useMemo(() => {
    if (!selectedDeliveryDate) return Array.from(strainFormats.keys());
    return Array.from(strainFormats.keys()).filter(strainId => {
      const orders = strainOrders.get(strainId) || [];
      return orders.some(o => (o.scheduled_delivery_date || o.requested_delivery_date) === selectedDeliveryDate);
    });
  }, [strainFormats, strainOrders, selectedDeliveryDate]);

  // Sort strains by worst urgency, then demand
  const sortedStrainIds = useMemo(() => {
    const urgencyRank: Record<string, number> = { overdue: 0, urgent: 1, soon: 2, normal: 3, no_date: 4 };
    return [...filteredStrainIds].sort((a, b) => {
      const aOrders = strainOrders.get(a) || [];
      const bOrders = strainOrders.get(b) || [];
      const aWorst = Math.min(...aOrders.map(o => urgencyRank[o.urgency] ?? 4));
      const bWorst = Math.min(...bOrders.map(o => urgencyRank[o.urgency] ?? 4));
      if (aWorst !== bWorst) return aWorst - bWorst;
      const aDemand = aOrders.reduce((s, o) => s + (o.units_remaining ?? o.quantity), 0);
      const bDemand = bOrders.reduce((s, o) => s + (o.units_remaining ?? o.quantity), 0);
      return bDemand - aDemand;
    });
  }, [filteredStrainIds, strainOrders]);

  function toggleStrain(strainId: string) {
    setExpandedStrains(prev => {
      const next = new Set(prev);
      if (next.has(strainId)) next.delete(strainId);
      else next.add(strainId);
      return next;
    });
  }

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-cult overflow-hidden">
      {/* Column headers */}
      <div className="flex items-center gap-0 px-5 py-2.5 border-b border-cult-medium-gray">
        <div className="w-8" />
        <div className="w-60 text-xs uppercase tracking-wider text-gray-500 font-semibold">Strain</div>
        <div className="w-36 text-xs uppercase tracking-wider text-gray-500 font-semibold">Stock Status</div>
        <div className="w-24 text-right text-xs uppercase tracking-wider text-gray-500 font-semibold">Demand</div>
        <div className="w-20 text-right text-xs uppercase tracking-wider text-gray-500 font-semibold">Weight</div>
        <div className="w-20 text-right text-xs uppercase tracking-wider text-gray-500 font-semibold">Orders</div>
        <div className="w-28 text-right text-xs uppercase tracking-wider text-gray-500 font-semibold" />
      </div>

      {/* Strain rows */}
      {sortedStrainIds.map(strainId => {
        const formats = strainFormats.get(strainId) || [];
        const orders = strainOrders.get(strainId) || [];
        const isExpanded = expandedStrains.has(strainId);
        const strainName = formats[0]?.strain_name || orders[0]?.strain_name || 'Unknown';

        const totalUnits = orders.reduce((s, o) => s + (o.units_remaining ?? o.quantity), 0);
        const totalDemandG = formats.reduce((s, f) => s + f.total_demand_g, 0);
        const orderCount = new Set(orders.map(o => o.order_id)).size;
        const unassignedCount = orders.filter(o => !o.batch_number).length;

        const urgencyRank: Record<string, number> = { overdue: 0, urgent: 1, soon: 2, normal: 3, no_date: 4 };
        const worstUrgency = orders.reduce((worst, o) =>
          (urgencyRank[o.urgency] ?? 4) < (urgencyRank[worst] ?? 4) ? o.urgency : worst
        , 'no_date' as Urgency);

        // Group orders by delivery date for expansion
        const ordersByDate = (() => {
          if (!isExpanded) return [];
          const map = new Map<string, OrderLineItem[]>();
          orders.forEach(o => {
            const date = o.scheduled_delivery_date || o.requested_delivery_date || 'No Date';
            if (!map.has(date)) map.set(date, []);
            map.get(date)!.push(o);
          });
          return Array.from(map.entries()).sort(([a], [b]) => {
            if (a === 'No Date') return 1;
            if (b === 'No Date') return -1;
            return a.localeCompare(b);
          });
        })();

        return (
          <Fragment key={strainId}>
            {/* ── Strain header row ──────────────────────────────────── */}
            <button
              onClick={() => toggleStrain(strainId)}
              className="w-full flex items-center gap-0 px-5 py-3.5 text-left border-b border-cult-medium-gray/50 hover:bg-cult-dark-gray/30 transition-colors cursor-pointer"
            >
              <div className="w-8 shrink-0 flex justify-center">
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-gray-500" />
                  : <ChevronRight className="w-4 h-4 text-gray-500" />}
              </div>
              <div className="w-60 shrink-0 flex items-center gap-2.5">
                <span className="font-semibold text-white text-sm">{strainName}</span>
                {urgencyBadge(worstUrgency)}
              </div>
              <div className="w-36 shrink-0">
                {stockStatusIndicator(formats)}
              </div>
              <div className="w-24 shrink-0 text-right">
                <span className="font-semibold text-white tabular-nums text-sm">{totalUnits.toLocaleString()}</span>
                <span className="text-gray-600 text-xs ml-1">units</span>
              </div>
              <div className="w-20 shrink-0 text-right">
                <span className="text-gray-300 tabular-nums text-sm">{formatWeight(totalDemandG)}</span>
              </div>
              <div className="w-20 shrink-0 text-right">
                <span className="text-gray-400 tabular-nums text-sm">{orderCount}</span>
                <span className="text-gray-600 text-xs ml-1">orders</span>
              </div>
              <div className="w-28 shrink-0 text-right">
                {unassignedCount > 0 && (
                  <span className="text-xs text-amber-400/70 font-medium">{unassignedCount} unassigned</span>
                )}
              </div>
            </button>

            {/* ── Expanded: orders by delivery day ───────────────────── */}
            {isExpanded && (
              <div className="px-5 pb-5 pt-3 border-b border-cult-medium-gray/50" style={{ paddingLeft: '3.25rem' }}>
                {/* Strain inventory context for unassigned orders */}
                {unassignedCount > 0 && <StrainInventorySummary formats={formats} />}

                {/* Day groups */}
                <div className="space-y-2.5">
                  {ordersByDate.map(([date, dayOrders]) => {
                    const isDateToday = date === today;
                    const isPast = date < today && date !== 'No Date';
                    const totalUnitsDay = dayOrders.reduce((s, o) => s + o.quantity, 0);
                    const totalRevenue = dayOrders.reduce((s, o) => s + (o.subtotal || 0), 0);
                    const dayUrgency = dayOrders[0]?.urgency || 'normal';

                    return (
                      <div
                        key={date}
                        className={`rounded-cult border overflow-hidden ${
                          isDateToday ? 'border-sky-500/30 bg-sky-500/[0.03]' :
                          isPast ? 'border-red-500/20 bg-red-500/[0.02]' :
                          'border-cult-medium-gray/30 bg-cult-dark-gray/20'
                        }`}
                      >
                        {/* Day header */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-cult-medium-gray/20">
                          <div className="flex items-center gap-2.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-600" />
                            <span className={`text-sm font-semibold ${
                              isDateToday ? 'text-sky-400' : isPast ? 'text-red-400' : 'text-gray-300'
                            }`}>
                              {date === 'No Date' ? 'No Date' : (() => {
                                const d = new Date(date + 'T12:00:00');
                                return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                              })()}
                            </span>
                            {isDateToday && <span className="text-xs text-sky-400/80 font-medium">Today</span>}
                            {urgencyBadge(dayUrgency)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="tabular-nums">{totalUnitsDay} units</span>
                            {totalRevenue > 0 && (
                              <span className="tabular-nums font-medium text-gray-400">
                                ${totalRevenue.toLocaleString()}
                              </span>
                            )}
                            <span>{dayOrders.length} line{dayOrders.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Order rows */}
                        <div className="py-1 px-1">
                          {dayOrders.map((o, i) => {
                            const assigned = o.units_assigned || 0;
                            const remaining = o.units_remaining ?? o.quantity;
                            const pct = o.assignment_pct || 0;
                            const isFullyAssigned = remaining <= 0;
                            const hasAssignment = assigned > 0;
                            const batchData = o.batch_number ? batchLookup.get(o.batch_number) : undefined;

                            return (
                              <div
                                key={`${o.order_item_id}-${i}`}
                                className={`flex items-center gap-0 py-2 px-3 rounded-cult text-sm transition-colors ${
                                  isFullyAssigned ? 'bg-emerald-500/5' :
                                  hasAssignment ? 'bg-amber-500/5' :
                                  'hover:bg-white/[0.02]'
                                }`}
                              >
                                {/* Order number */}
                                <div className="w-28 shrink-0">
                                  <span className="text-xs text-gray-500 font-mono">{o.order_number}</span>
                                </div>
                                {/* Customer */}
                                <div className="w-40 shrink-0 truncate text-gray-300 text-sm">
                                  {o.customer_name}
                                </div>
                                {/* Format */}
                                <div className="w-24 shrink-0">
                                  <span className="text-xs text-gray-400">{o.format_label}</span>
                                </div>
                                {/* Qty */}
                                <div className="w-14 shrink-0 text-right">
                                  <span className="text-white tabular-nums font-medium">{o.quantity}</span>
                                </div>
                                {/* Assignment progress */}
                                <div className="w-24 shrink-0 flex items-center gap-1.5 justify-center">
                                  {(hasAssignment || isFullyAssigned) ? (
                                    <>
                                      <div className="w-12 h-1 bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                          style={{ width: `${Math.min(pct, 100)}%` }}
                                        />
                                      </div>
                                      <span className={`text-xs tabular-nums font-medium ${
                                        isFullyAssigned ? 'text-emerald-400' : 'text-amber-400'
                                      }`}>
                                        {assigned}/{o.quantity}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-gray-700">—</span>
                                  )}
                                </div>
                                {/* Batch + stage + inventory */}
                                <div className="flex-1 min-w-0 flex items-center gap-2 pl-3">
                                  {o.batch_number ? (
                                    <>
                                      <span className="text-xs text-gray-500 font-mono shrink-0">{o.batch_number}</span>
                                      {o.batch_stage_label && stageBadge(o.batch_stage_label)}
                                      <span className="text-gray-700 text-xs">·</span>
                                      <BatchInventorySnippet batch={batchData} />
                                    </>
                                  ) : (
                                    <span className="text-xs text-gray-600 italic">No batch assigned</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Fragment>
        );
      })}

      {sortedStrainIds.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          {selectedDeliveryDate
            ? 'No strains needed for this delivery date.'
            : 'No open orders in the production queue.'}
        </div>
      )}
    </div>
  );
}

// ─── By Order Tab ───────────────────────────────────────────────────────────

function ByOrderView({ byOrder }: { byOrder: OrderLineItem[] }) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const orderGroups = new Map<string, OrderLineItem[]>();
  byOrder.forEach(row => {
    if (!orderGroups.has(row.order_id)) orderGroups.set(row.order_id, []);
    orderGroups.get(row.order_id)!.push(row);
  });

  function toggleOrder(orderId: string) {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-cult overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cult-medium-gray text-left">
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 w-8"></th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400">Order</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400">Customer</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400">Delivery</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400">Urgency</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-right">Line Items</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-right">Total Demand</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(orderGroups.entries()).map(([orderId, items]) => {
            const isExpanded = expandedOrders.has(orderId);
            const first = items[0];
            const totalDemandG = items.reduce((s, i) => s + Number(i.line_demand_g), 0);
            const worstUrgency = items.reduce((worst, i) => {
              const order: Urgency[] = ['overdue', 'urgent', 'soon', 'normal', 'no_date'];
              return order.indexOf(i.urgency) < order.indexOf(worst) ? i.urgency : worst;
            }, 'no_date' as Urgency);

            return (
              <Fragment key={orderId}>
                <tr
                  className="border-b border-cult-medium-gray/50 hover:bg-cult-dark-gray/50 cursor-pointer"
                  onClick={() => toggleOrder(orderId)}
                >
                  <td className="px-4 py-3 text-gray-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {first.order_number}
                    {first.is_sample && (
                      <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">Sample</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{first.customer_name}</td>
                  <td className="px-4 py-3 text-gray-300">{formatDateShort(first.requested_delivery_date)}</td>
                  <td className="px-4 py-3">{urgencyBadge(worstUrgency)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{items.length}</td>
                  <td className="px-4 py-3 text-right text-white">{formatWeight(totalDemandG)}</td>
                </tr>

                {isExpanded && items.map(item => (
                  <tr key={item.order_item_id} className="border-b border-cult-medium-gray/30 bg-cult-black/30">
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2">
                      <div className="text-gray-300">{item.strain_name}</div>
                    </td>
                    <td className="px-4 py-2 text-gray-400">{item.format_label}</td>
                    <td className="px-4 py-2 text-gray-400">{item.quantity} units</td>
                    <td className="px-4 py-2 text-center">
                      {item.batch_number
                        ? <span className="text-xs text-green-400">✓ {item.batch_stage_label}</span>
                        : <span className="text-xs text-gray-600">No batch</span>}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300">{formatWeight(item.line_demand_g)}</td>
                  </tr>
                ))}

                {isExpanded && first.delivery_notes && (
                  <tr className="border-b border-cult-medium-gray/30 bg-cult-black/50">
                    <td colSpan={7} className="px-8 py-2">
                      <span className="text-xs text-gray-500">Notes: </span>
                      <span className="text-xs text-gray-400">{first.delivery_notes}</span>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {orderGroups.size === 0 && (
        <div className="p-8 text-center text-gray-500">No open orders in the production queue.</div>
      )}
    </div>
  );
}

// ─── Main Production Queue Component ────────────────────────────────────────

export function ProductionQueue() {
  const { strainSummary, byStrain, byOrder, loading, error, stats, refresh } = useProductionQueue();
  const {
    pipeline, deliveryDays, weekOutlook,
    weekOffset, setWeekOffset,
    selectedWeekLabel, selectedWeekRange,
    loading: revenueLoading,
  } = useRevenuePipeline();
  const { byStrain: skuByStrain, summary: skuSummary } = useSkuYield();
  const { batches: allBatches, loading: batchesLoading } = useAllBatches();
  const [activeTab, setActiveTab] = useState<ProductionQueueTab>('orders');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory>('All');
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState<string | null>(null);
  const [lossPct, setLossPct] = useState(15);

  // Apply product category filter
  const categoryCounts: Record<string, { lines: number; lbs: number }> = {};
  byOrder.forEach(o => {
    const cat = o.product_category || 'Flower';
    if (!categoryCounts[cat]) categoryCounts[cat] = { lines: 0, lbs: 0 };
    categoryCounts[cat].lines += 1;
    categoryCounts[cat].lbs += o.line_demand_g / 454;
  });

  const filteredByOrder = categoryFilter === 'All'
    ? byOrder
    : byOrder.filter(o => (o.product_category || 'Flower') === categoryFilter);
  const filteredByStrain = categoryFilter === 'All'
    ? byStrain
    : byStrain.filter(r => (r.product_category || 'Flower') === categoryFilter);

  if (loading && revenueLoading) {
    return (
      <div className="p-6 max-w-[1800px] mx-auto">
        <PageSkeleton variant="table" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-[1800px] mx-auto">
        <div className="bg-red-500/10 border border-red-500/30 rounded-cult p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <div className="text-red-400 font-medium">Failed to load production queue</div>
          <div className="text-gray-400 text-sm mt-1">{error}</div>
          <button onClick={refresh} className="mt-4 px-4 py-2 bg-cult-near-black border border-cult-medium-gray rounded-cult hover:bg-cult-dark-gray text-sm text-white">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const tabs: { id: ProductionQueueTab; label: string; icon: typeof Package }[] = [
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'batches', label: 'Batches', icon: Layers },
    { id: 'labor', label: 'Labor', icon: Hammer },
  ];

  return (
    <div className="p-6 max-w-[1800px] mx-auto space-y-5">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Production Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.totalOrders} open orders · {stats.totalStrains} strains · {selectedWeekLabel} at {pipeline.pct}% of target
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-cult-near-black border border-cult-medium-gray rounded-cult hover:bg-cult-dark-gray text-gray-300"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* ── Revenue Pipeline ──────────────────────────────────────────────── */}
      <RevenuePipeline
        data={pipeline}
        weekOutlook={weekOutlook}
        weekOffset={weekOffset}
        onWeekChange={setWeekOffset}
        weekLabel={selectedWeekLabel}
        weekRange={selectedWeekRange}
      />

      {/* ── Delivery Load Balancer ────────────────────────────────────────── */}
      <DeliveryLoadBalancer
        days={deliveryDays}
        selectedDate={selectedDeliveryDate}
        onSelectDate={setSelectedDeliveryDate}
        weekLabel={selectedWeekLabel}
      />

      {/* ── Filters + Tabs Row ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-cult-medium-gray pb-0">
        <div className="flex items-center gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-white text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'labor' && (
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-gray-500 font-medium">Loss</label>
              <input
                type="range"
                min={5}
                max={35}
                step={1}
                value={lossPct}
                onChange={e => setLossPct(Number(e.target.value))}
                className="w-16 accent-amber-400"
              />
              <span className="text-xs font-semibold text-amber-400 min-w-[28px]">{lossPct}%</span>
            </div>
          )}
          {(activeTab === 'orders' || activeTab === 'labor') && (
            <ProductCategoryStrip value={categoryFilter} onChange={setCategoryFilter} counts={categoryCounts} />
          )}
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────────── */}
      <div key={activeTab} className="animate-fade-in">
        {activeTab === 'orders' && <ByOrderView byOrder={filteredByOrder} />}
        {activeTab === 'batches' && <BatchesView batches={allBatches} />}
        {activeTab === 'labor' && (
          <LaborView
            byStrain={filteredByStrain}
            byOrder={filteredByOrder}
            loading={loading}
            mode="labor"
            lossPct={lossPct}
          />
        )}
      </div>
    </div>
  );
}
