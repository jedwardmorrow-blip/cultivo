import { Building2, ChevronRight, TrendingDown, Network } from 'lucide-react';
import { RevenueSparkline } from '@/shared/components';
import type { AccountSummary } from '../types';

interface TopAccountsTableProps {
  accounts: AccountSummary[];
  onSelectAccount: (id: string) => void;
  monthlyRevenueMap?: Map<string, number[]>;
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-emerald-500/20 text-emerald-400';
    case 'prospect': return 'bg-cyan-500/20 text-cyan-400';
    case 'inactive': return 'bg-cult-medium-gray/30 text-cult-silver';
    case 'churned': return 'bg-red-500/20 text-red-400';
    default: return 'bg-cult-medium-gray/30 text-cult-silver';
  }
}

export function TopAccountsTable({ accounts, onSelectAccount, monthlyRevenueMap }: TopAccountsTableProps) {
  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-cult-charcoal flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-cult-silver" />
          <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">Top Accounts</h3>
        </div>
        <span className="text-xs text-cult-light-gray">{accounts.length} accounts</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cult-charcoal">
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">Account</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider hidden sm:table-cell">Code</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider">Revenue</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-cult-silver uppercase tracking-wider hidden lg:table-cell">Trend</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider hidden md:table-cell">Orders</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider hidden lg:table-cell">Avg Order</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider hidden md:table-cell">Last Order</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-cult-silver uppercase tracking-wider hidden sm:table-cell">Status</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-charcoal/50">
            {accounts.map((account) => {
              const isHub = account.account_type === 'hub_parent';
              const combinedRevenue = Number(account.total_revenue) + (account.child_total_revenue || 0);
              const combinedOrders = account.order_count + (account.child_total_orders || 0);
              const isAtRisk = account.days_since_last_order !== null && account.days_since_last_order > 30;
              const sparklineData = monthlyRevenueMap?.get(account.id);

              return (
                <tr
                  key={account.id}
                  onClick={() => onSelectAccount(account.id)}
                  className="hover:bg-cult-dark-gray/50 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-cult-white font-medium truncate max-w-[200px]">
                        {account.name}
                      </span>
                      {isHub && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-sky-500/20 text-sky-400 rounded">
                          <Network className="w-3 h-3" />
                          CHAIN
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs font-mono text-cult-light-gray">{account.dispensary_code}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div>
                      <span className="text-sm font-semibold text-emerald-400">
                        {formatCurrency(isHub ? combinedRevenue : Number(account.total_revenue))}
                      </span>
                      {isHub && Number(account.total_revenue) > 0 && (account.child_total_revenue || 0) > 0 && (
                        <p className="text-[10px] text-cult-silver">{formatCurrency(Number(account.total_revenue))} direct</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex justify-center">
                      {sparklineData && sparklineData.some(v => v > 0) ? (
                        <RevenueSparkline data={sparklineData} width={80} height={24} />
                      ) : (
                        <span className="text-[9px] text-cult-medium-gray">--</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <div>
                      <span className="text-sm text-cult-light-gray">{isHub ? combinedOrders : account.order_count}</span>
                      {isHub && account.order_count > 0 && (account.child_total_orders || 0) > 0 && (
                        <p className="text-[10px] text-cult-silver">{account.order_count} direct</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    <span className="text-sm text-cult-light-gray">
                      {formatCurrency(account.avg_order_value)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <div className="flex items-center justify-end gap-1.5">
                      {isAtRisk && <TrendingDown className="w-3.5 h-3.5 text-amber-400" />}
                      <span className={`text-xs ${isAtRisk ? 'text-amber-400' : 'text-cult-light-gray'}`}>
                        {account.days_since_last_order !== null ? `${account.days_since_last_order}d ago` : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase ${getStatusColor(account.account_status)}`}>
                      {account.account_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="w-4 h-4 text-cult-medium-gray group-hover:text-cult-white transition-colors" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
