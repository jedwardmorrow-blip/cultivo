import { useState, useMemo } from 'react';
import { Building2, ChevronRight, TrendingDown, Network, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { RevenueSparkline } from '@/shared/components';
import { formatCurrencyShort } from '@/shared/utils/format';
import type { TopAccountByRange } from '../types';

type SortKey = 'revenue' | 'orders' | 'avg_order' | 'last_order';
type SortDir = 'asc' | 'desc';

interface TopAccountsTableProps {
  accounts: TopAccountByRange[];
  onSelectAccount: (id: string) => void;
  monthlyRevenueMap?: Map<string, number[]>;
  periodLabel?: string;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-cult-success-muted text-cult-success';
    case 'prospect': return 'bg-cyan-500/20 text-cyan-400';
    case 'inactive': return 'bg-cult-border/30 text-cult-text-secondary';
    case 'churned': return 'bg-cult-danger-muted text-cult-danger';
    default: return 'bg-cult-border/30 text-cult-text-secondary';
  }
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 text-cult-border" />;
  return dir === 'desc'
    ? <ArrowDown className="w-3 h-3 text-cult-success" />
    : <ArrowUp className="w-3 h-3 text-cult-success" />;
}

export function TopAccountsTable({ accounts, onSelectAccount, monthlyRevenueMap, periodLabel }: TopAccountsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    const list = [...accounts];
    const dir = sortDir === 'desc' ? -1 : 1;
    list.sort((a, b) => {
      switch (sortKey) {
        case 'revenue': {
          const aRev = a.period_revenue + a.child_period_revenue;
          const bRev = b.period_revenue + b.child_period_revenue;
          return (aRev - bRev) * dir;
        }
        case 'orders': {
          const aOrd = a.period_orders + a.child_period_orders;
          const bOrd = b.period_orders + b.child_period_orders;
          return (aOrd - bOrd) * dir;
        }
        case 'avg_order':
          return (a.period_avg_order - b.period_avg_order) * dir;
        case 'last_order': {
          const aD = a.days_since_last_order ?? 99999;
          const bD = b.days_since_last_order ?? 99999;
          return (aD - bD) * dir;
        }
        default:
          return 0;
      }
    });
    return list;
  }, [accounts, sortKey, sortDir]);

  return (
    <div className="bg-cult-surface border border-cult-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-cult-surface-raised flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-cult-text-secondary" />
          <h3 className="text-sm font-semibold text-cult-text-primary uppercase tracking-wider">Top Accounts</h3>
          {periodLabel && (
            <span className="text-xs text-cult-text-muted bg-cult-surface px-2 py-0.5 rounded-full">
              {periodLabel}
            </span>
          )}
        </div>
        <span className="text-xs text-cult-text-muted">{accounts.length} accounts</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cult-surface-raised">
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-secondary uppercase tracking-wider">Account</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-secondary uppercase tracking-wider hidden sm:table-cell">Code</th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-cult-text-secondary uppercase tracking-wider cursor-pointer hover:text-cult-text-primary transition-colors select-none"
                onClick={() => handleSort('revenue')}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Revenue <SortIcon active={sortKey === 'revenue'} dir={sortDir} />
                </span>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-cult-text-secondary uppercase tracking-wider hidden lg:table-cell">Trend</th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-cult-text-secondary uppercase tracking-wider hidden md:table-cell cursor-pointer hover:text-cult-text-primary transition-colors select-none"
                onClick={() => handleSort('orders')}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Orders <SortIcon active={sortKey === 'orders'} dir={sortDir} />
                </span>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-cult-text-secondary uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:text-cult-text-primary transition-colors select-none"
                onClick={() => handleSort('avg_order')}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Avg Order <SortIcon active={sortKey === 'avg_order'} dir={sortDir} />
                </span>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-cult-text-secondary uppercase tracking-wider hidden md:table-cell cursor-pointer hover:text-cult-text-primary transition-colors select-none"
                onClick={() => handleSort('last_order')}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Last Order <SortIcon active={sortKey === 'last_order'} dir={sortDir} />
                </span>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-cult-text-secondary uppercase tracking-wider hidden sm:table-cell">Status</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-surface-raised/50">
            {sorted.map((account) => {
              const isHub = account.account_type === 'hub_parent';
              const combinedRevenue = account.period_revenue + account.child_period_revenue;
              const combinedOrders = account.period_orders + account.child_period_orders;
              const isAtRisk = account.days_since_last_order !== null && account.days_since_last_order > 30;
              const sparklineData = monthlyRevenueMap?.get(account.id);

              return (
                <tr
                  key={account.id}
                  onClick={() => onSelectAccount(account.id)}
                  className="hover:bg-cult-surface/50 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-cult-text-primary font-medium truncate max-w-[200px]">
                        {account.name}
                      </span>
                      {isHub && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold bg-sky-500/20 text-sky-400 rounded">
                          <Network className="w-3 h-3" />
                          CHAIN
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs font-mono text-cult-text-muted">{account.dispensary_code}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div>
                      <span className="text-sm font-semibold text-cult-success">
                        {formatCurrencyShort(isHub ? combinedRevenue : account.period_revenue)}
                      </span>
                      {isHub && account.period_revenue > 0 && account.child_period_revenue > 0 && (
                        <p className="text-xs text-cult-text-secondary">{formatCurrencyShort(account.period_revenue)} direct</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex justify-center">
                      {sparklineData && sparklineData.some(v => v > 0) ? (
                        <RevenueSparkline data={sparklineData} width={80} height={24} />
                      ) : (
                        <span className="text-xs text-cult-border">--</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <div>
                      <span className="text-sm text-cult-text-muted">{isHub ? combinedOrders : account.period_orders}</span>
                      {isHub && account.period_orders > 0 && account.child_period_orders > 0 && (
                        <p className="text-xs text-cult-text-secondary">{account.period_orders} direct</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    <span className="text-sm text-cult-text-muted">
                      {formatCurrencyShort(account.period_avg_order)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <div className="flex items-center justify-end gap-1.5">
                      {isAtRisk && <TrendingDown className="w-3.5 h-3.5 text-cult-warning" />}
                      <span className={`text-xs ${isAtRisk ? 'text-cult-warning' : 'text-cult-text-muted'}`}>
                        {account.days_since_last_order !== null ? `${account.days_since_last_order}d ago` : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full uppercase ${getStatusColor(account.account_status)}`}>
                      {account.account_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="w-4 h-4 text-cult-border group-hover:text-cult-text-primary transition-colors" />
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
