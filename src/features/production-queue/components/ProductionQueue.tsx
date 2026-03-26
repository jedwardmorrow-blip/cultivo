import { useState, Fragment, useMemo } from 'react';
import { RefreshCw, AlertTriangle, Package, ClipboardList, BarChart3, ChevronDown, ChevronRight, Zap, Calendar } from 'lucide-react';
import { PageSkeleton } from '@/shared/components';
import { useProductionQueue } from '../hooks/useProductionQueue';
import { useRevenuePipeline } from '../hooks/useRevenuePipeline';
import { useSkuYield, type StrainAllocation } from '@/shared/hooks/useSkuYield';
import { RevenuePipeline } from './RevenuePipeline';
import { DeliveryLoadBalancer } from './DeliveryLoadBalancer';
import { BatchAllocationPanel } from './BatchAllocationPanel';
import { formatDateShort } from '@/shared/utils/format';
import type { ProductionQueueTab, ProductCategory, StrainFormatRow, OrderLineItem, Urgency, StockStatus, StrainSummary } from '../types';

// ─── Shared Badges & Formatters ─────────────────────────────────────────────

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
    normal: 'Normal',
    no_date: 'No Date',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[urgency]}`}>
      {labels[urgency]}
    </span>
  );
}

function stockBadge(status: StockStatus) {
  const styles: Record<StockStatus, string> = {
    ready: 'bg-green-500/20 text-green-400',
    needs_processing: 'bg-amber-500/20 text-amber-400',
    no_stock: 'bg-red-500/20 text-red-400',
    can_fill: 'bg-green-500/20 text-green-400',
    available: 'bg-green-500/20 text-green-400',
    partial: 'bg-amber-500/20 text-amber-400',
  };
  const labels: Record<StockStatus, string> = {
    ready: 'Ready',
    needs_processing: 'Needs Processing',
    no_stock: 'No Stock',
    can_fill: 'Can Fill',
    available: 'Available',
    partial: 'Partial',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function formatWeight(grams: number) {
  if (grams >= 454) return `${(grams / 454).toFixed(1)} lbs`;
  return `${grams.toFixed(1)}g`;
}

function batchStageBadge(item: OrderLineItem) {
  if (!item.batch_number) return null;
  const stageColors: Record<string, string> = {
    'Created': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    'Pre-Harvest': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'Bucking': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Bucked': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Bulk Available': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'Trimming': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    'Packaging': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Packaged': 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  const stageLabel = item.batch_stage_label || item.batch_lifecycle_state || 'Unknown';
  const stageStyle = stageColors[stageLabel] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';

  const gradeColors: Record<string, string> = {
    emerald: 'text-emerald-400', sky: 'text-sky-400', amber: 'text-amber-400',
    rose: 'text-rose-400', gray: 'text-gray-400',
  };
  const gradeTextColor = item.batch_grade_color ? (gradeColors[item.batch_grade_color] || 'text-gray-400') : '';

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 font-mono">{item.batch_number}</span>
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${stageStyle}`}>
        {stageLabel}
      </span>
      {item.batch_quality_grade && item.batch_quality_grade !== 'Ungraded' && (
        <span className={`text-xs font-medium ${gradeTextColor}`}>{item.batch_quality_grade}</span>
      )}
      {item.batch_quarantined && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
          Quarantined
        </span>
      )}
    </div>
  );
}

// ─── SKU Projection Badge (replaces RunwayBadge) ────────────────────────────

function SkuProjectionBadge({ allocation }: { allocation: StrainAllocation | undefined }) {
  if (!allocation) return <span className="text-xs text-gray-600">—</span>;

  const { total_proj_3_5g, total_proj_14g, total_proj_1lb } = allocation;
  const hasProjections = total_proj_3_5g > 0 || total_proj_14g > 0 || total_proj_1lb > 0;

  if (!hasProjections) {
    return (
      <span className="text-xs text-gray-500" title="No packaging projections — inventory may be trim-only or unprocessed">
        —
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {total_proj_3_5g > 0 && (
        <span className="text-[11px] tabular-nums text-emerald-400" title={`${total_proj_3_5g} × 3.5g jars projected`}>
          <span className="font-semibold">{total_proj_3_5g}</span>
          <span className="text-gray-600 ml-0.5">3.5g</span>
        </span>
      )}
      {total_proj_14g > 0 && (
        <span className="text-[11px] tabular-nums text-sky-400" title={`${total_proj_14g} × 14g mylars projected`}>
          <span className="font-semibold">{total_proj_14g}</span>
          <span className="text-gray-600 ml-0.5">14g</span>
        </span>
      )}
      {total_proj_1lb > 0 && (
        <span className="text-[11px] tabular-nums text-violet-400" title={`${total_proj_1lb} × 1lb bags projected`}>
          <span className="font-semibold">{total_proj_1lb}</span>
          <span className="text-gray-600 ml-0.5">1lb</span>
        </span>
      )}
    </div>
  );
}

// ─── Mini Week Heatmap (per strain row) ─────────────────────────────────────

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F'];

function getWeekDatesForHeatmap(): string[] {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

interface HeatmapCell {
  date: string;
  units: number;
  isToday: boolean;
}

function MiniWeekHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const maxUnits = Math.max(...cells.map(c => c.units), 1);
  const totalUnits = cells.reduce((s, c) => s + c.units, 0);

  return (
    <div className="flex items-center gap-1" title={`${totalUnits} units this week across ${cells.filter(c => c.units > 0).length} days`}>
      {cells.map((cell, i) => {
        const intensity = cell.units > 0 ? Math.max(cell.units / maxUnits, 0.25) : 0;
        return (
          <div key={cell.date} className="flex flex-col items-center gap-0.5" title={`${WEEKDAY_LABELS[i]}: ${cell.units} units`}>
            <span className={`text-[9px] leading-none ${cell.isToday ? 'text-sky-400 font-bold' : 'text-gray-600'}`}>
              {WEEKDAY_LABELS[i]}
            </span>
            <div
              className={`w-5 h-5 rounded-sm transition-colors flex items-center justify-center ${
                cell.units === 0
                  ? 'bg-gray-800/50'
                  : cell.isToday
                    ? 'bg-sky-500'
                    : 'bg-emerald-500'
              }`}
              style={cell.units > 0 ? { opacity: 0.3 + intensity * 0.7 } : undefined}
            >
              {cell.units > 0 && (
                <span className="text-[8px] font-bold text-white leading-none">{cell.units}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Product Category Filter (compact) ──────────────────────────────────────

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

// ─── Enhanced By Strain View ────────────────────────────────────────────────
// Strain-first with per-day demand heatmap, batch opportunity signals,
// and orders grouped by delivery day in expansion.

function EnhancedByStrainView({
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
  const weekDates = useMemo(() => getWeekDatesForHeatmap(), []);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Group by strain_id
  const strainGroups = useMemo(() => {
    const map = new Map<string, StrainFormatRow[]>();
    byStrain.forEach(row => {
      const key = row.strain_id || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    });
    return map;
  }, [byStrain]);

  // Pre-compute per-strain order data grouped by delivery date
  const strainOrdersByDay = useMemo(() => {
    const map = new Map<string, Map<string, OrderLineItem[]>>();

    byOrder.forEach(o => {
      const strainKey = o.strain_id || 'unknown';
      if (!map.has(strainKey)) map.set(strainKey, new Map());
      const byDay = map.get(strainKey)!;

      const deliveryDate = o.scheduled_delivery_date || o.requested_delivery_date || 'no-date';
      if (!byDay.has(deliveryDate)) byDay.set(deliveryDate, []);
      byDay.get(deliveryDate)!.push(o);
    });

    return map;
  }, [byOrder]);

  // Pre-compute heatmap data per strain
  const strainHeatmaps = useMemo(() => {
    const result = new Map<string, { cells: HeatmapCell[]; daysWithDemand: number }>();

    strainGroups.forEach((_, strainId) => {
      const byDay = strainOrdersByDay.get(strainId);
      let daysWithDemand = 0;

      const cells: HeatmapCell[] = weekDates.map(date => {
        const orders = byDay?.get(date) || [];
        const units = orders.reduce((s, o) => s + o.quantity, 0);
        if (units > 0) daysWithDemand++;
        return { date, units, isToday: date === today };
      });

      result.set(strainId, { cells, daysWithDemand });
    });

    return result;
  }, [strainGroups, strainOrdersByDay, weekDates, today]);

  function toggleStrain(strainId: string) {
    setExpandedStrains(prev => {
      const next = new Set(prev);
      if (next.has(strainId)) next.delete(strainId);
      else next.add(strainId);
      return next;
    });
  }

  // If a delivery date is selected, filter strain groups to only those with orders on that date
  const filteredStrainGroups = useMemo(() => {
    if (!selectedDeliveryDate) return strainGroups;
    const filtered = new Map<string, StrainFormatRow[]>();
    strainGroups.forEach((formats, strainId) => {
      const byDay = strainOrdersByDay.get(strainId);
      if (byDay?.has(selectedDeliveryDate)) {
        filtered.set(strainId, formats);
      }
    });
    return filtered;
  }, [strainGroups, strainOrdersByDay, selectedDeliveryDate]);

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-cult overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cult-medium-gray text-left">
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 w-8"></th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400">Strain</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-center" title="Projected SKU yield from remaining inventory">Projected SKUs</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-right">Units</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-right">Weight</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-right">Orders</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(filteredStrainGroups.entries()).map(([strainId, formats]) => {
            const isExpanded = expandedStrains.has(strainId);
            const strainName = formats[0].strain_name;
            const heatmap = strainHeatmaps.get(strainId);
            const hasBatchOpportunity = (heatmap?.daysWithDemand || 0) >= 2;

            const totalNeeded = formats.reduce((sum, f) => sum + f.total_units_needed, 0);
            const totalDemandG = formats.reduce((sum, f) => sum + f.total_demand_g, 0);

            // SKU yield allocation for this strain
            const allocation = skuByStrain.get(strainName);

            // Get all orders for this strain, optionally filtered by selected date
            const byDay = strainOrdersByDay.get(strainId);
            const allOrders: OrderLineItem[] = [];
            byDay?.forEach((orders) => allOrders.push(...orders));

            return (
              <Fragment key={strainId}>
                {/* Strain header row */}
                <tr
                  className={`border-b border-cult-medium-gray/50 hover:bg-cult-dark-gray/50 cursor-pointer transition-colors ${
                    hasBatchOpportunity ? 'bg-amber-500/[0.03]' : ''
                  }`}
                  onClick={() => toggleStrain(strainId)}
                >
                  <td className="px-4 py-3 text-gray-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{strainName}</span>
                      {allocation ? (
                        <span className="text-xs text-gray-600" title={`${allocation.batch_count} batches, ${formatWeight(allocation.total_remaining_g)} remaining`}>
                          {allocation.batch_count} batch{allocation.batch_count !== 1 ? 'es' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">
                          {formats.length} format{formats.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {allocation && allocation.aging_batches > 0 && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium"
                          title={`${allocation.aging_batches} batch${allocation.aging_batches !== 1 ? 'es' : ''} over 6 months old — cost clock critical`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {allocation.oldest_age_days}d oldest
                        </span>
                      )}
                      {hasBatchOpportunity && !(allocation?.aging_batches) && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-medium"
                          title={`This strain has orders on ${heatmap!.daysWithDemand} different days — consider batching the packaging work`}
                        >
                          <Zap className="w-3 h-3" />
                          {heatmap!.daysWithDemand}-day demand
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <SkuProjectionBadge allocation={allocation} />
                  </td>
                  <td className="px-4 py-3 text-right text-white tabular-nums">{totalNeeded.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-white tabular-nums">{formatWeight(totalDemandG)}</td>
                  <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                    {formats[0].order_count}
                  </td>
                </tr>

                {/* Expanded: Format breakdown */}
                {isExpanded && formats.map((f, i) => (
                  <tr key={`${strainId}-fmt-${i}`} className="border-b border-cult-medium-gray/30 bg-[#0D0D0D]" style={{ boxShadow: 'inset 3px 0 0 0 rgba(255,255,255,0.06)' }}>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 pl-8 text-gray-300">
                      <div className="flex items-center gap-2">
                        <span>{f.format_label}</span>
                        {f.product_category && f.product_category !== 'Flower' && (
                          <span className="text-xs text-gray-500">{f.product_category}</span>
                        )}
                        {f.already_packaged_units > 0 && (
                          <span className="text-xs text-green-400">{f.already_packaged_units} pkgd</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">{urgencyBadge(f.urgency)}</td>
                    <td className="px-4 py-2 text-right text-gray-300 tabular-nums">
                      {f.total_units_needed.toLocaleString()}
                      {f.total_units_assigned > 0 && (
                        <span className="text-xs text-green-400 ml-1">({f.total_units_assigned} assigned)</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300 tabular-nums">{formatWeight(f.total_demand_g)}</td>
                    <td className="px-4 py-2 text-right text-gray-400 tabular-nums">{f.order_count}</td>
                  </tr>
                ))}

                {/* Batch Allocation Panel — conversion funnel + SKU yield projections */}
                {isExpanded && (
                  <tr className="border-b border-cult-medium-gray/30 bg-[#0D0D0D]" style={{ boxShadow: 'inset 3px 0 0 0 rgba(255,255,255,0.06)' }}>
                    <td colSpan={6} className="p-0">
                      <BatchAllocationPanel allocation={allocation} strainName={strainName} />
                    </td>
                  </tr>
                )}

                {/* Expanded: Orders grouped by delivery day */}
                {isExpanded && (() => {
                  // Group orders by delivery date
                  const ordersByDate = new Map<string, OrderLineItem[]>();
                  allOrders.forEach(o => {
                    const date = o.scheduled_delivery_date || o.requested_delivery_date || 'No Date';
                    if (!ordersByDate.has(date)) ordersByDate.set(date, []);
                    ordersByDate.get(date)!.push(o);
                  });

                  // Sort dates chronologically
                  const sortedDates = Array.from(ordersByDate.keys()).sort((a, b) => {
                    if (a === 'No Date') return 1;
                    if (b === 'No Date') return -1;
                    return a.localeCompare(b);
                  });

                  return (
                    <tr className="border-b border-cult-medium-gray/30 bg-[#0D0D0D]" style={{ boxShadow: 'inset 3px 0 0 0 rgba(255,255,255,0.06)' }}>
                      <td colSpan={6} className="px-6 py-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs uppercase tracking-wider text-gray-500 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" />
                            Orders by Delivery Day
                          </div>
                          {/* Column guide */}
                          <div className="flex items-center gap-6 text-xs text-gray-600 uppercase tracking-wider">
                            <span className="w-20">Order</span>
                            <span className="w-32">Customer</span>
                            <span className="w-24">Format</span>
                            <span className="w-36">Packed</span>
                            <span>Source Batch</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {sortedDates.map(date => {
                            const dateOrders = ordersByDate.get(date)!;
                            const isToday = date === today;
                            const totalUnits = dateOrders.reduce((s, o) => s + o.quantity, 0);
                            const totalRevenue = dateOrders.reduce((s, o) => s + (o.subtotal || 0), 0);

                            return (
                              <div key={date} className={`rounded-cult border p-3 ${
                                isToday
                                  ? 'border-sky-500/30 bg-sky-500/5'
                                  : 'border-cult-medium-gray/30 bg-cult-dark-gray/30'
                              }`}>
                                {/* Day header */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-semibold ${isToday ? 'text-sky-400' : 'text-gray-400'}`}>
                                      {date === 'No Date' ? 'No Date' : (() => {
                                        const d = new Date(date + 'T12:00:00');
                                        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                      })()}
                                    </span>
                                    {isToday && <span className="text-xs text-sky-400 font-medium">Today</span>}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span>{totalUnits} units</span>
                                    {totalRevenue > 0 && <span>${totalRevenue.toLocaleString()}</span>}
                                    <span>{dateOrders.length} line{dateOrders.length !== 1 ? 's' : ''}</span>
                                  </div>
                                </div>

                                {/* Order rows */}
                                <div className="space-y-1.5">
                                  {dateOrders.map(o => {
                                    const assigned = o.units_assigned || 0;
                                    const remaining = o.units_remaining ?? o.quantity;
                                    const pct = o.assignment_pct || 0;
                                    const isFullyAssigned = remaining <= 0;
                                    const hasAssignment = assigned > 0;

                                    return (
                                      <div key={o.order_item_id} className={`flex items-center gap-3 text-sm rounded-cult px-2 py-1.5 ${
                                        isFullyAssigned ? 'bg-emerald-500/5' : hasAssignment ? 'bg-amber-500/5' : ''
                                      }`}>
                                        <span className="text-gray-500 font-mono w-20 flex-shrink-0">{o.order_number}</span>
                                        <span className="w-32 truncate flex-shrink-0 text-gray-300">{o.customer_name}</span>
                                        <span className="w-24 flex-shrink-0 text-gray-400">{o.format_label}</span>

                                        {/* Assignment progress — "Packed" = units assigned from packaged inventory */}
                                        <div
                                          className="w-36 flex-shrink-0 flex items-center gap-2"
                                          title={`${assigned} of ${o.quantity} units packed and assigned to this order`}
                                        >
                                          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all ${
                                                pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-gray-700'
                                              }`}
                                              style={{ width: `${Math.min(pct, 100)}%` }}
                                            />
                                          </div>
                                          <span className={`text-xs tabular-nums font-medium ${
                                            isFullyAssigned ? 'text-emerald-400' : hasAssignment ? 'text-amber-400' : 'text-gray-600'
                                          }`}>
                                            {assigned}/{o.quantity}
                                          </span>
                                        </div>

                                        {/* Source batch + stage */}
                                        {o.batch_number ? (
                                          <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <span className="text-xs text-gray-500 font-mono">{o.batch_number}</span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded border ${
                                              o.batch_stage_label === 'Packaged' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                              o.batch_stage_label === 'Trimming' || o.batch_stage_label === 'Bulk Available' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                                              o.batch_stage_label === 'Bucked' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                              'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                            }`}>
                                              {o.batch_stage_label}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-xs text-gray-600 flex-shrink-0">No batch</span>
                                        )}

                                        {urgencyBadge(o.urgency)}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })()}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {filteredStrainGroups.size === 0 && (
        <div className="p-8 text-center text-gray-500">
          {selectedDeliveryDate
            ? 'No strains needed for this delivery date.'
            : 'No open orders in the production queue.'}
        </div>
      )}
    </div>
  );
}

// ─── By Order Tab (kept for secondary view) ─────────────────────────────────

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
            const totalDemandG = items.reduce((s, i) => s + i.line_demand_g, 0);
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
                      {item.batch_number && <div className="mt-1">{batchStageBadge(item)}</div>}
                    </td>
                    <td className="px-4 py-2 text-gray-400">{item.format_label}</td>
                    <td className="px-4 py-2 text-gray-400">{item.quantity} units</td>
                    <td className="px-4 py-2 text-center">
                      {item.batch_number
                        ? <span className="text-xs text-green-400">✓ Batch</span>
                        : <span className="text-xs text-gray-600">No batch</span>}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300">{formatWeight(item.line_demand_g)}</td>
                  </tr>
                ))}

                {isExpanded && first.delivery_notes && (
                  <tr className="border-b border-cult-medium-gray/30 bg-cult-black/50">
                    <td colSpan={6} className="px-8 py-2">
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

// ─── Summary Tab ────────────────────────────────────────────────────────────

function SummaryView({ strainSummary }: { strainSummary: StrainSummary[] }) {
  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-cult overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cult-medium-gray text-left">
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400">Strain</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-right">Demand</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-right">Available</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-right">Fill Rate</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400">Stock</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400">Urgency</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-right">Orders</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400">Earliest Delivery</th>
          </tr>
        </thead>
        <tbody>
          {strainSummary.map(s => (
            <tr
              key={s.strain_id || s.strain_name}
              className={`border-b border-cult-medium-gray/50 ${
                s.stock_status === 'no_stock' ? 'bg-red-500/5' :
                s.stock_status === 'partial' ? 'bg-amber-500/5' : ''
              }`}
            >
              <td className="px-4 py-3 font-medium text-white">{s.strain_name}</td>
              <td className="px-4 py-3 text-right text-gray-300">
                <div>{s.total_demand_lbs} lbs</div>
                <div className="text-xs text-gray-500">{s.total_demand_g.toLocaleString()}g</div>
              </td>
              <td className="px-4 py-3 text-right text-gray-300">
                <div>{s.available_lbs} lbs</div>
                <div className="text-xs text-gray-500">{s.available_g.toLocaleString()}g</div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        s.fill_rate_pct >= 100 ? 'bg-green-500' :
                        s.fill_rate_pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(s.fill_rate_pct, 100)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium ${
                    s.fill_rate_pct >= 100 ? 'text-green-400' :
                    s.fill_rate_pct >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {s.fill_rate_pct}%
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">{stockBadge(s.stock_status)}</td>
              <td className="px-4 py-3">{urgencyBadge(s.urgency)}</td>
              <td className="px-4 py-3 text-right text-gray-300">{s.order_count}</td>
              <td className="px-4 py-3 text-gray-300">{formatDateShort(s.earliest_delivery)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {strainSummary.length === 0 && (
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
  const [activeTab, setActiveTab] = useState<ProductionQueueTab>('by-strain');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory>('All');
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState<string | null>(null);

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
    { id: 'by-strain', label: 'By Strain', icon: Package },
    { id: 'by-order', label: 'By Order', icon: ClipboardList },
    { id: 'summary', label: 'Summary', icon: BarChart3 },
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

      {/* ── Inventory Intelligence Bar ────────────────────────────────────── */}
      {(skuSummary.aging_batches > 0 || skuSummary.total_batches > 0) && (
        <div className="flex items-center gap-4 px-4 py-2.5 rounded-cult border border-cult-medium-gray/40 bg-cult-near-black">
          <span className="flex items-center gap-1.5 text-sm">
            <Package className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-bold text-white">{skuSummary.total_batches}</span>
            <span className="text-gray-500">batches</span>
          </span>
          <span className="border-l border-cult-medium-gray/40 h-4" />
          {skuSummary.total_proj_3_5g > 0 && (
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-bold text-emerald-400">{skuSummary.total_proj_3_5g.toLocaleString()}</span>
              <span className="text-gray-500">3.5g jars</span>
            </span>
          )}
          {skuSummary.total_proj_14g > 0 && (
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span className="font-bold text-sky-400">{skuSummary.total_proj_14g.toLocaleString()}</span>
              <span className="text-gray-500">14g mylars</span>
            </span>
          )}
          {skuSummary.total_proj_1lb > 0 && (
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="font-bold text-violet-400">{skuSummary.total_proj_1lb.toLocaleString()}</span>
              <span className="text-gray-500">1lb bags</span>
            </span>
          )}
          {skuSummary.aging_batches > 0 && (
            <>
              <span className="border-l border-cult-medium-gray/40 h-4" />
              <span className="flex items-center gap-1.5 text-sm" title={`${skuSummary.aging_batches} batches over 6 months old — cost clock critical`}>
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="font-bold text-red-400">{skuSummary.aging_batches}</span>
                <span className="text-gray-500">aging</span>
              </span>
            </>
          )}
          <span className="ml-auto text-xs text-gray-600">
            {skuSummary.total_strains} strains · {formatWeight(skuSummary.total_remaining_g)} total inventory
          </span>
        </div>
      )}

      {/* ── Filters + Tabs Row ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-cult-medium-gray pb-0">
        {/* Tabs */}
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

        {/* Category filter (right side) */}
        {activeTab !== 'summary' && (
          <ProductCategoryStrip value={categoryFilter} onChange={setCategoryFilter} counts={categoryCounts} />
        )}
      </div>

      {/* ── Tab Content (primary work surface) ────────────────────────────── */}
      {activeTab === 'by-strain' && (
        <EnhancedByStrainView
          byStrain={filteredByStrain}
          byOrder={filteredByOrder}
          selectedDeliveryDate={selectedDeliveryDate}
          skuByStrain={skuByStrain}
        />
      )}
      {activeTab === 'by-order' && <ByOrderView byOrder={filteredByOrder} />}
      {activeTab === 'summary' && <SummaryView strainSummary={strainSummary} />}
    </div>
  );
}
