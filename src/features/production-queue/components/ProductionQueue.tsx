import { useState, useCallback, Fragment } from 'react';
import { RefreshCw, AlertTriangle, Package, ClipboardList, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { PageSkeleton } from '@/shared/components';
import { useProductionQueue } from '../hooks/useProductionQueue';
import { BatchAssignPanel } from './BatchAssignPanel';
import { BatchPlanExpansion } from './BatchPlanExpansion';
import type { ProductionQueueTab, DeliveryDateFilter, ProductCategory, StrainSummary, StrainFormatRow, OrderLineItem, Urgency, StockStatus, BatchAssignContext } from '../types';
import { Calendar } from 'lucide-react';

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
    // v3 statuses
    ready: 'bg-green-500/20 text-green-400',
    needs_processing: 'bg-amber-500/20 text-amber-400',
    no_stock: 'bg-red-500/20 text-red-400',
    // v2 legacy (still used by summary view)
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

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeight(grams: number) {
  if (grams >= 454) {
    return `${(grams / 454).toFixed(1)} lbs`;
  }
  return `${grams.toFixed(1)}g`;
}

// ─── Batch stage badge ──────────────────────────────────────────────────────

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
    emerald: 'text-emerald-400',
    sky: 'text-sky-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    gray: 'text-gray-400',
  };
  const gradeTextColor = item.batch_grade_color ? (gradeColors[item.batch_grade_color] || 'text-gray-400') : '';

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 font-mono">{item.batch_number}</span>
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${stageStyle}`}>
        {stageLabel}
      </span>
      {item.batch_quality_grade && item.batch_quality_grade !== 'Ungraded' && (
        <span className={`text-[10px] font-medium ${gradeTextColor}`}>
          {item.batch_quality_grade}
        </span>
      )}
      {item.batch_quarantined && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/30">
          Quarantined
        </span>
      )}
    </div>
  );
}

// ─── Date range filter helpers ──────────────────────────────────────────────

function getWeekBounds(offsetWeeks: number): [Date, Date] {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset + offsetWeeks * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [monday, sunday];
}

function dateInRange(dateStr: string | null, filter: DeliveryDateFilter): boolean {
  if (filter === 'all') return true;
  if (!dateStr) return filter === 'overdue'; // null dates show under overdue (no date = risky)
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (filter === 'overdue') {
    return d < today;
  }
  const weekOffset = filter === 'this-week' ? 0 : 1;
  const [start, end] = getWeekBounds(weekOffset);
  return d >= start && d <= end;
}

function filterByDeliveryDate<T extends { requested_delivery_date?: string | null; earliest_delivery_date?: string | null; earliest_delivery?: string | null }>(
  rows: T[],
  filter: DeliveryDateFilter,
): T[] {
  if (filter === 'all') return rows;
  return rows.filter(r => {
    const dateField = r.requested_delivery_date ?? r.earliest_delivery_date ?? r.earliest_delivery ?? null;
    return dateInRange(dateField, filter);
  });
}

// ─── Date Filter Strip ──────────────────────────────────────────────────────

function DateFilterStrip({ value, onChange }: { value: DeliveryDateFilter; onChange: (f: DeliveryDateFilter) => void }) {
  const [thisWeekStart, thisWeekEnd] = getWeekBounds(0);
  const [nextWeekStart, nextWeekEnd] = getWeekBounds(1);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const options: { id: DeliveryDateFilter; label: string; sublabel?: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'this-week', label: 'This Week', sublabel: `${fmt(thisWeekStart)} – ${fmt(thisWeekEnd)}` },
    { id: 'next-week', label: 'Next Week', sublabel: `${fmt(nextWeekStart)} – ${fmt(nextWeekEnd)}` },
  ];

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-gray-500" />
      <span className="text-xs text-gray-500 uppercase tracking-wider mr-1">Delivery</span>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            value === opt.id
              ? 'bg-white/10 text-white border border-white/20'
              : 'text-gray-500 hover:text-gray-300 border border-transparent'
          }`}
          title={opt.sublabel}
        >
          {opt.label}
          {opt.sublabel && value === opt.id && (
            <span className="ml-1.5 text-xs text-gray-400 font-normal">{opt.sublabel}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Product Category Filter Strip ──────────────────────────────────────────

function ProductCategoryStrip({
  value,
  onChange,
  counts,
}: {
  value: ProductCategory;
  onChange: (c: ProductCategory) => void;
  counts: Record<string, { lines: number; lbs: number }>;
}) {
  const categories: ProductCategory[] = ['All', 'Flower', 'Smalls', 'Fresh Frozen'];

  return (
    <div className="flex items-center gap-2">
      <Package className="w-4 h-4 text-gray-500" />
      <span className="text-xs text-gray-500 uppercase tracking-wider mr-1">Product</span>
      {categories.map(cat => {
        const count = cat === 'All'
          ? { lines: Object.values(counts).reduce((s, c) => s + c.lines, 0), lbs: Object.values(counts).reduce((s, c) => s + c.lbs, 0) }
          : counts[cat] || { lines: 0, lbs: 0 };

        // Skip categories with 0 lines (except All)
        if (cat !== 'All' && count.lines === 0) return null;

        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              value === cat
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
            title={`${count.lines} line items · ${count.lbs.toFixed(1)} lbs`}
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

// ─── Stats Strip ────────────────────────────────────────────────────────────

function StatsStrip({ stats }: { stats: { totalStrains: number; totalOrders: number; overdueOrders: number; stockAlerts: number } }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Strains</div>
        <div className="text-2xl font-bold text-white">{stats.totalStrains}</div>
      </div>
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Open Orders</div>
        <div className="text-2xl font-bold text-white">{stats.totalOrders}</div>
      </div>
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Overdue</div>
        <div className={`text-2xl font-bold ${stats.overdueOrders > 0 ? 'text-red-400' : 'text-green-400'}`}>
          {stats.overdueOrders}
        </div>
      </div>
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Stock Alerts</div>
        <div className={`text-2xl font-bold ${stats.stockAlerts > 0 ? 'text-amber-400' : 'text-green-400'}`}>
          {stats.stockAlerts}
        </div>
      </div>
    </div>
  );
}

// ─── By Strain Tab (View 1 — expandable rows) ──────────────────────────────

function ByStrainView({ byStrain, byOrder }: { byStrain: StrainFormatRow[]; byOrder: OrderLineItem[] }) {
  const [expandedStrains, setExpandedStrains] = useState<Set<string>>(new Set());
  // Track which format row has the batch assign panel open: "strainId|formatLabel"
  const [assigningFormat, setAssigningFormat] = useState<string | null>(null);
  // Track which strain has the batch planning expansion open
  const [planningStrain, setPlanningStrain] = useState<string | null>(null);

  // Group by strain_id
  const strainGroups = new Map<string, StrainFormatRow[]>();
  byStrain.forEach(row => {
    const key = row.strain_id || 'unknown';
    if (!strainGroups.has(key)) strainGroups.set(key, []);
    strainGroups.get(key)!.push(row);
  });

  function toggleStrain(strainId: string) {
    setExpandedStrains(prev => {
      const next = new Set(prev);
      if (next.has(strainId)) next.delete(strainId);
      else next.add(strainId);
      return next;
    });
  }

  // Get order detail for a strain
  function getOrdersForStrain(strainId: string | null) {
    return byOrder.filter(o => o.strain_id === strainId);
  }

  // Get orders for a specific strain + format combo
  const getOrdersForStrainFormat = useCallback((strainId: string | null, formatLabel: string) => {
    return byOrder.filter(o => o.strain_id === strainId && o.format_label === formatLabel);
  }, [byOrder]);

  // Toggle the batch assign panel for a format row
  function toggleAssignPanel(strainId: string, formatLabel: string) {
    const key = `${strainId}|${formatLabel}`;
    setAssigningFormat(prev => prev === key ? null : key);
  }

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cult-medium-gray text-left">
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 w-8"></th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400">Strain</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400">Format</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-right">Units</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-right">Demand</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-right">Ready</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-right">Pipeline</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400">Stock</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400">Urgency</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-right">Orders</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400"></th>
          </tr>
        </thead>
        <tbody>
          {Array.from(strainGroups.entries()).map(([strainId, formats]) => {
            const isExpanded = expandedStrains.has(strainId);
            const strainName = formats[0].strain_name;
            const worstUrgency = formats.reduce((worst, f) => {
              const order: Urgency[] = ['overdue', 'urgent', 'soon', 'normal', 'no_date'];
              return order.indexOf(f.urgency) < order.indexOf(worst) ? f.urgency : worst;
            }, 'no_date' as Urgency);

            return (
              <Fragment key={strainId}>
                {/* Strain header row — clickable to expand */}
                <tr
                  className="border-b border-cult-medium-gray/50 hover:bg-cult-dark-gray/50 cursor-pointer"
                  onClick={() => toggleStrain(strainId)}
                >
                  <td className="px-4 py-3 text-gray-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{strainName}</td>
                  <td className="px-4 py-3 text-gray-400">{formats.length} format{formats.length > 1 ? 's' : ''}</td>
                  <td className="px-4 py-3 text-right text-white">
                    {formats.reduce((sum, f) => sum + f.total_units_needed, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    {formatWeight(formats.reduce((sum, f) => sum + f.total_demand_g, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    <div>{formats[0].ready_lbs.toFixed(1)} lbs</div>
                    <div className="text-[10px] text-gray-500">
                      F:{formatWeight(formats[0].ready_flower_g)} · S:{formatWeight(formats[0].ready_smalls_g)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {formats[0].pipeline_lbs > 0 ? (
                      <div>
                        <div>{formats[0].pipeline_lbs.toFixed(1)} lbs</div>
                        <div className="text-[10px] text-gray-500">
                          {formats[0].pipeline_bucked_g > 0 && `Bucked: ${formatWeight(formats[0].pipeline_bucked_g)}`}
                          {formats[0].pipeline_bucked_g > 0 && formats[0].pipeline_binned_g > 0 && ' · '}
                          {formats[0].pipeline_binned_g > 0 && `Binned: ${formatWeight(formats[0].pipeline_binned_g)}`}
                        </div>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">{stockBadge(formats[0].stock_status)}</td>
                  <td className="px-4 py-3">{urgencyBadge(worstUrgency)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {new Set(formats.flatMap(f => Array(f.order_count))).size > 0 ? formats[0].order_count : '—'}
                  </td>
                  <td className="px-2 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlanningStrain(prev => prev === strainId ? null : strainId);
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                        planningStrain === strainId
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20'
                      }`}
                    >
                      {planningStrain === strainId ? 'Close Plan' : 'Plan Batches'}
                    </button>
                  </td>
                </tr>

                {/* Expanded: format breakdown */}
                {isExpanded && formats.map((f, i) => {
                  const formatKey = `${strainId}|${f.format_label}`;
                  const isAssigning = assigningFormat === formatKey;
                  return (
                    <Fragment key={`${strainId}-${i}`}>
                      <tr className="border-b border-cult-medium-gray/30 bg-cult-black/30">
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2 text-gray-300 pl-8">
                          {f.format_label}
                          {f.product_category && f.product_category !== 'Flower' && (
                            <span className="ml-1.5 text-[10px] text-gray-500">{f.product_category}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-300">{f.total_units_needed.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-gray-300">{formatWeight(f.total_demand_g)}</td>
                        <td className="px-4 py-2 text-right text-gray-400">
                          {f.already_packaged_units > 0 && (
                            <span className="text-[10px] text-green-400">{f.already_packaged_units} pkgd</span>
                          )}
                        </td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2">
                          {/* Assign button */}
                          {f.total_units_needed > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAssignPanel(strainId, f.format_label);
                              }}
                              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                                isAssigning
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'
                              }`}
                            >
                              {isAssigning ? 'Close' : 'Assign'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2">{urgencyBadge(f.urgency)}</td>
                        <td className="px-4 py-2 text-right text-gray-400">{f.order_count}</td>
                        <td className="px-2 py-2"></td>
                      </tr>

                      {/* Batch Assign Panel — inline below format row */}
                      {isAssigning && (
                        <tr className="border-b border-cult-medium-gray/30">
                          <td colSpan={11} className="p-0">
                            <BatchAssignPanel
                              context={{
                                strainId: f.strain_id,
                                strainName: f.strain_name,
                                formatLabel: f.format_label,
                                productCategory: f.product_category,
                                orderItems: getOrdersForStrainFormat(f.strain_id, f.format_label),
                              }}
                              onClose={() => setAssigningFormat(null)}
                              onCommitComplete={() => {
                                setAssigningFormat(null);
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

                {/* Batch Planning Expansion — between format rows and order detail */}
                {isExpanded && planningStrain === strainId && (
                  <tr className="border-b border-cult-medium-gray/30">
                    <td colSpan={11} className="p-2">
                      <BatchPlanExpansion
                        strainId={strainId}
                        strainName={strainName}
                        orderItems={getOrdersForStrain(formats[0].strain_id)}
                        onClose={() => setPlanningStrain(null)}
                      />
                    </td>
                  </tr>
                )}

                {/* Expanded: order detail */}
                {isExpanded && (
                  <tr className="border-b border-cult-medium-gray/30 bg-cult-black/50">
                    <td colSpan={11} className="px-8 py-3">
                      <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Contributing Orders</div>
                      <div className="space-y-1">
                        {getOrdersForStrain(formats[0].strain_id).map(o => (
                          <div key={o.order_item_id} className="flex items-center gap-4 text-sm text-gray-300">
                            <span className="text-gray-500 w-20">{o.order_number}</span>
                            <span className="w-40 truncate">{o.customer_name}</span>
                            <span className="w-28">{o.format_label}</span>
                            <span className="w-16 text-right">{o.quantity} units</span>
                            <span className="w-20 text-right">{formatWeight(o.line_demand_g)}</span>
                            <span className="w-20">{formatDate(o.requested_delivery_date)}</span>
                            {urgencyBadge(o.urgency)}
                            {o.batch_number && batchStageBadge(o)}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {strainGroups.size === 0 && (
        <div className="p-8 text-center text-gray-500">No open orders in the production queue.</div>
      )}
    </div>
  );
}

// ─── By Order Tab (View 2) ──────────────────────────────────────────────────

function ByOrderView({ byOrder }: { byOrder: OrderLineItem[] }) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Group by order_id
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
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg overflow-hidden">
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
                  <td className="px-4 py-3 text-gray-300">{formatDate(first.requested_delivery_date)}</td>
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
                      {item.batch_number && (
                        <div className="mt-1">{batchStageBadge(item)}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-400">{item.format_label}</td>
                    <td className="px-4 py-2 text-gray-400">{item.quantity} units</td>
                    <td className="px-4 py-2 text-center">
                      {item.batch_number
                        ? <span className="text-[10px] text-green-400">✓ Batch</span>
                        : <span className="text-[10px] text-gray-600">No batch</span>}
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

// ─── Summary Tab (View 3 — strain-level fill rates) ─────────────────────────

function SummaryView({ strainSummary }: { strainSummary: StrainSummary[] }) {
  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg overflow-hidden">
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
              <td className="px-4 py-3 text-gray-300">{formatDate(s.earliest_delivery)}</td>
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
  const [activeTab, setActiveTab] = useState<ProductionQueueTab>('by-strain');
  const [dateFilter, setDateFilter] = useState<DeliveryDateFilter>('this-week');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory>('All');

  // Apply delivery-date filter to all three data sets
  const dateFilteredByOrder = filterByDeliveryDate(byOrder, dateFilter);
  const dateFilteredByStrain = filterByDeliveryDate(byStrain, dateFilter);
  const filteredSummary = filterByDeliveryDate(strainSummary, dateFilter);

  // Compute category counts from date-filtered data (so counts update with date filter)
  const categoryCounts: Record<string, { lines: number; lbs: number }> = {};
  dateFilteredByOrder.forEach(o => {
    const cat = o.product_category || 'Flower';
    if (!categoryCounts[cat]) categoryCounts[cat] = { lines: 0, lbs: 0 };
    categoryCounts[cat].lines += 1;
    categoryCounts[cat].lbs += o.line_demand_g / 454;
  });

  // Apply product category filter
  const filteredByOrder = categoryFilter === 'All'
    ? dateFilteredByOrder
    : dateFilteredByOrder.filter(o => (o.product_category || 'Flower') === categoryFilter);
  const filteredByStrain = categoryFilter === 'All'
    ? dateFilteredByStrain
    : dateFilteredByStrain.filter(r => (r.product_category || 'Flower') === categoryFilter);

  // Recompute stats from filtered data
  const filteredStats = dateFilter === 'all' ? stats : {
    totalStrains: new Set(filteredSummary.map(s => s.strain_id || s.strain_name)).size,
    totalOrders: new Set(filteredByOrder.map(o => o.order_id)).size,
    overdueOrders: new Set(filteredByOrder.filter(o => o.urgency === 'overdue').map(o => o.order_id)).size,
    stockAlerts: filteredSummary.filter(s => s.stock_status !== 'can_fill' && s.stock_status !== 'ready').length,
  };

  if (loading) {
    return (
      <div className="p-6 max-w-[1800px] mx-auto">
        <PageSkeleton variant="table" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-[1800px] mx-auto">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <div className="text-red-400 font-medium">Failed to load production queue</div>
          <div className="text-gray-400 text-sm mt-1">{error}</div>
          <button onClick={refresh} className="mt-4 px-4 py-2 bg-cult-near-black border border-cult-medium-gray rounded hover:bg-cult-dark-gray text-sm text-white">
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

  // Stock alerts strip
  const alerts = filteredSummary.filter(s => s.stock_status !== 'can_fill' && s.stock_status !== 'ready');

  return (
    <div className="p-6 max-w-[1800px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Production Queue</h1>
          <p className="text-sm text-gray-400 mt-1">What to package — aggregated demand across all open orders</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-cult-near-black border border-cult-medium-gray rounded-lg hover:bg-cult-dark-gray text-gray-300"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <DateFilterStrip value={dateFilter} onChange={setDateFilter} />
        {activeTab !== 'summary' && (
          <ProductCategoryStrip value={categoryFilter} onChange={setCategoryFilter} counts={categoryCounts} />
        )}
      </div>

      {/* Stats */}
      <StatsStrip stats={filteredStats} />

      {/* Stock alerts */}
      {alerts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-400 font-medium text-sm mb-2">
            <AlertTriangle className="w-4 h-4" />
            Stock Alerts
          </div>
          <div className="flex flex-wrap gap-3">
            {alerts.map(a => (
              <div key={a.strain_id || a.strain_name} className="flex items-center gap-2 text-sm">
                <span className="text-white font-medium">{a.strain_name}</span>
                <span className="text-gray-400">—</span>
                <span className={a.stock_status === 'no_stock' ? 'text-red-400' : 'text-amber-400'}>
                  {a.stock_status === 'no_stock' ? 'No stock' : `${a.fill_rate_pct}% fill`}
                </span>
                <span className="text-gray-500">({a.total_demand_lbs} lbs needed)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-cult-medium-gray">
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

      {/* Tab content */}
      {activeTab === 'by-strain' && <ByStrainView byStrain={filteredByStrain} byOrder={filteredByOrder} />}
      {activeTab === 'by-order' && <ByOrderView byOrder={filteredByOrder} />}
      {activeTab === 'summary' && <SummaryView strainSummary={filteredSummary} />}
    </div>
  );
}
