import { useState, Fragment } from 'react';
import { RefreshCw, AlertTriangle, Package, ClipboardList, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { PageSkeleton } from '@/shared/components';
import { useProductionQueue } from '../hooks/useProductionQueue';
import type { ProductionQueueTab, StrainSummary, StrainFormatRow, OrderLineItem, Urgency, StockStatus } from '../types';

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
    can_fill: 'bg-green-500/20 text-green-400',
    available: 'bg-green-500/20 text-green-400',
    partial: 'bg-amber-500/20 text-amber-400',
    no_stock: 'bg-red-500/20 text-red-400',
  };
  const labels: Record<StockStatus, string> = {
    can_fill: 'Can Fill',
    available: 'Available',
    partial: 'Partial',
    no_stock: 'No Stock',
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
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-right">Available</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400">Stock</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400">Urgency</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-400 text-right">Orders</th>
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
                    {formatWeight(formats[0].strain_available_g)}
                  </td>
                  <td className="px-4 py-3">{stockBadge(formats[0].stock_status)}</td>
                  <td className="px-4 py-3">{urgencyBadge(worstUrgency)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {new Set(formats.flatMap(f => Array(f.order_count))).size > 0 ? formats[0].order_count : '—'}
                  </td>
                </tr>

                {/* Expanded: format breakdown */}
                {isExpanded && formats.map((f, i) => (
                  <tr key={`${strainId}-${i}`} className="border-b border-cult-medium-gray/30 bg-cult-black/30">
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 text-gray-300 pl-8">{f.format_label}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{f.total_units_needed.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{formatWeight(f.total_demand_g)}</td>
                    <td className="px-4 py-2 text-right text-gray-400">—</td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2">{urgencyBadge(f.urgency)}</td>
                    <td className="px-4 py-2 text-right text-gray-400">{f.order_count}</td>
                  </tr>
                ))}

                {/* Expanded: order detail */}
                {isExpanded && (
                  <tr className="border-b border-cult-medium-gray/30 bg-cult-black/50">
                    <td colSpan={9} className="px-8 py-3">
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
                    <td className="px-4 py-2 text-gray-300">{item.strain_name}</td>
                    <td className="px-4 py-2 text-gray-400">{item.format_label}</td>
                    <td className="px-4 py-2 text-gray-400">{item.quantity} units</td>
                    <td className="px-4 py-2"></td>
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
  const alerts = strainSummary.filter(s => s.stock_status !== 'can_fill');

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

      {/* Stats */}
      <StatsStrip stats={stats} />

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
      {activeTab === 'by-strain' && <ByStrainView byStrain={byStrain} byOrder={byOrder} />}
      {activeTab === 'by-order' && <ByOrderView byOrder={byOrder} />}
      {activeTab === 'summary' && <SummaryView strainSummary={strainSummary} />}
    </div>
  );
}
