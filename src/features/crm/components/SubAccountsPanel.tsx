import { Building2, ChevronRight, MapPin, Package, Truck, TrendingUp } from 'lucide-react';
import type { AccountSummary, ChainLocationPerformance, DeliveryModel } from '../types';

interface SubAccountsPanelProps {
  parentName: string;
  childAccounts: AccountSummary[];
  chainPerformance: ChainLocationPerformance[];
  deliveryModel: DeliveryModel;
  onSelectAccount: (accountId: string) => void;
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function getHealthColor(label: string): string {
  switch (label) {
    case 'healthy': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'cooling': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'at_risk': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'dormant': return 'bg-cult-medium-gray/30 text-cult-silver border-cult-medium-gray/30';
    case 'no_orders': return 'bg-cult-medium-gray/20 text-cult-medium-gray border-cult-medium-gray/20';
    default: return 'bg-cult-medium-gray/20 text-cult-medium-gray border-cult-medium-gray/20';
  }
}

function getHealthLabel(label: string): string {
  switch (label) {
    case 'healthy': return 'Healthy';
    case 'cooling': return 'Cooling';
    case 'at_risk': return 'At Risk';
    case 'dormant': return 'Dormant';
    case 'no_orders': return 'No Orders';
    default: return label;
  }
}

export function SubAccountsPanel({
  parentName,
  childAccounts,
  chainPerformance,
  deliveryModel,
  onSelectAccount,
}: SubAccountsPanelProps) {
  if (childAccounts.length === 0) return null;

  const totalChildRevenue = chainPerformance.reduce((sum, c) => sum + Number(c.revenue), 0);
  const totalChildOrders = chainPerformance.reduce((sum, c) => sum + c.order_count, 0);

  const perfByChildId = new Map(chainPerformance.map((p) => [p.child_id, p]));

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-cult-charcoal">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">
              Hub Locations
            </h3>
            <span className="px-1.5 py-0.5 text-xs font-bold bg-sky-500/20 text-sky-400 rounded">
              {childAccounts.length}
            </span>
            <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded border ${
              deliveryModel === 'hub_and_spoke'
                ? 'bg-teal-500/15 text-teal-400 border-teal-500/30'
                : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
            }`}>
              {deliveryModel === 'hub_and_spoke' ? (
                <><Package className="w-3 h-3" /> Hub & Spoke</>
              ) : (
                <><Truck className="w-3 h-3" /> Direct to Each</>
              )}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-cult-light-gray">
            <span>{totalChildOrders} orders</span>
            <span className="text-emerald-400 font-semibold">{formatCurrency(totalChildRevenue)}</span>
          </div>
        </div>
        <p className="text-xs text-cult-light-gray mt-1">
          Delivery locations under {parentName}
        </p>
      </div>

      <div className="divide-y divide-cult-charcoal/50">
        {childAccounts.map((child) => {
          const perf = perfByChildId.get(child.id);
          const revenueSharePct = perf?.revenue_share_pct ?? 0;

          return (
            <div
              key={child.id}
              onClick={() => onSelectAccount(child.id)}
              className="px-5 py-3 hover:bg-cult-dark-gray/50 cursor-pointer transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-cult-white">{child.name}</span>
                    <span className="text-xs font-mono text-cult-light-gray">{child.dispensary_code}</span>
                    {perf && (
                      <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full border ${getHealthColor(perf.health_label)}`}>
                        {getHealthLabel(perf.health_label)}
                      </span>
                    )}
                  </div>
                  {child.city && (
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-cult-light-gray">
                      <MapPin className="w-3 h-3 text-cult-medium-gray" />
                      <span>{[child.city, child.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6">
                  {perf && (
                    <div className="hidden sm:flex items-center gap-4">
                      <div className="w-24">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-cult-silver">Share</span>
                          <span className="text-cult-white font-semibold">{revenueSharePct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-cult-charcoal rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full transition-all"
                            style={{ width: `${Math.min(revenueSharePct, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${Number(perf.revenue) > 0 ? 'text-emerald-400' : 'text-cult-medium-gray'}`}>
                          {Number(perf.revenue) > 0 ? formatCurrency(Number(perf.revenue)) : '-'}
                        </p>
                        <p className="text-xs text-cult-silver">{perf.order_count} orders</p>
                      </div>
                    </div>
                  )}
                  {!perf && (
                    <div className="text-right hidden sm:block">
                      <p className={`text-sm font-semibold ${Number(child.total_revenue) > 0 ? 'text-emerald-400' : 'text-cult-medium-gray'}`}>
                        {Number(child.total_revenue) > 0 ? formatCurrency(Number(child.total_revenue)) : '-'}
                      </p>
                      <p className="text-xs text-cult-silver">{child.order_count} orders</p>
                    </div>
                  )}
                  <div className="text-right hidden md:block">
                    <p className={`text-xs ${
                      child.days_since_last_order !== null && child.days_since_last_order > 30
                        ? 'text-amber-400'
                        : 'text-cult-light-gray'
                    }`}>
                      {child.days_since_last_order !== null ? `${child.days_since_last_order}d ago` : 'No orders'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-cult-medium-gray group-hover:text-cult-white transition-colors" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {chainPerformance.length > 0 && (
        <div className="px-5 py-3 border-t border-cult-charcoal bg-cult-dark-gray/30">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-cult-silver">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Top performer:</span>
              <span className="text-cult-white font-medium">{chainPerformance[0].child_name}</span>
            </div>
            <span className="text-emerald-400 font-semibold">
              {formatCurrency(Number(chainPerformance[0].revenue))}
              <span className="text-cult-silver font-normal ml-1">
                ({chainPerformance[0].revenue_share_pct.toFixed(0)}% of chain)
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
