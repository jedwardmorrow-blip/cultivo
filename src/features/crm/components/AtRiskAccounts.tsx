import { AlertTriangle, Clock, ChevronRight, Network } from 'lucide-react';
import type { AccountSummary } from '../types';

interface AtRiskAccountsProps {
  accounts: AccountSummary[];
  onSelectAccount: (id: string) => void;
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function AtRiskAccounts({ accounts, onSelectAccount }: AtRiskAccountsProps) {
  if (accounts.length === 0) {
    return (
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-cult-silver" />
          <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">At-Risk Accounts</h3>
        </div>
        <p className="text-sm text-cult-light-gray">All active accounts have ordered within the last 30 days.</p>
      </div>
    );
  }

  return (
    <div className="bg-cult-near-black border border-amber-600/30 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-cult-charcoal flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">At-Risk Accounts</h3>
        </div>
        <span className="text-xs font-semibold text-amber-400">{accounts.length} accounts</span>
      </div>

      <div className="divide-y divide-cult-charcoal/50">
        {accounts.map((account) => {
          const isHub = account.account_type === 'hub_parent';
          const combinedRevenue = isHub
            ? Number(account.total_revenue) + (account.child_total_revenue || 0)
            : Number(account.total_revenue);

          return (
            <div
              key={account.id}
              onClick={() => onSelectAccount(account.id)}
              className="px-5 py-3 flex items-center justify-between hover:bg-cult-dark-gray/50 cursor-pointer transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-cult-white truncate">{account.name}</p>
                  {isHub && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold bg-sky-500/20 text-sky-400 rounded">
                      <Network className="w-3 h-3" />
                      CHAIN
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-cult-light-gray font-mono">{account.dispensary_code}</span>
                  <span className="text-xs text-cult-light-gray">
                    {formatCurrency(combinedRevenue)} lifetime
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-amber-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-sm font-semibold">{account.days_since_last_order}d</span>
                  </div>
                  <span className="text-[10px] text-cult-light-gray">since last order</span>
                </div>
                <ChevronRight className="w-4 h-4 text-cult-medium-gray group-hover:text-cult-white transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
