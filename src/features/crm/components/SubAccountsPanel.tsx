import { Building2, ChevronRight, MapPin } from 'lucide-react';
import type { AccountSummary } from '../types';

interface SubAccountsPanelProps {
  parentName: string;
  childAccounts: AccountSummary[];
  onSelectAccount: (accountId: string) => void;
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function SubAccountsPanel({ parentName, childAccounts, onSelectAccount }: SubAccountsPanelProps) {
  if (childAccounts.length === 0) return null;

  const totalChildRevenue = childAccounts.reduce((sum, c) => sum + Number(c.total_revenue), 0);
  const totalChildOrders = childAccounts.reduce((sum, c) => sum + c.order_count, 0);

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-cult-charcoal">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">
              Hub Locations
            </h3>
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-sky-500/20 text-sky-400 rounded">
              {childAccounts.length}
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
        {childAccounts.map((child) => (
          <div
            key={child.id}
            onClick={() => onSelectAccount(child.id)}
            className="px-5 py-3 flex items-center justify-between hover:bg-cult-dark-gray/50 cursor-pointer transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-cult-white">{child.name}</span>
                <span className="text-[10px] font-mono text-cult-light-gray">{child.dispensary_code}</span>
              </div>
              {child.city && (
                <div className="flex items-center gap-1 mt-0.5 text-xs text-cult-light-gray">
                  <MapPin className="w-3 h-3 text-cult-medium-gray" />
                  <span>{[child.city, child.state].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className={`text-sm font-semibold ${Number(child.total_revenue) > 0 ? 'text-emerald-400' : 'text-cult-medium-gray'}`}>
                  {Number(child.total_revenue) > 0 ? formatCurrency(Number(child.total_revenue)) : '-'}
                </p>
                <p className="text-[10px] text-cult-silver">{child.order_count} orders</p>
              </div>
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
        ))}
      </div>
    </div>
  );
}
