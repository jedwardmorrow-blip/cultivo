import { AlertTriangle, Clock, ChevronRight, Network, Phone, Calendar, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyShort } from '@/shared/utils/format';
import type { AccountSummary } from '../types';

interface AtRiskAccountsProps {
  accounts: AccountSummary[];
  onSelectAccount: (id: string) => void;
  onCreateOrder?: (customerId: string) => void;
}

export function AtRiskAccounts({ accounts, onSelectAccount, onCreateOrder }: AtRiskAccountsProps) {
  const navigate = useNavigate();
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
    <div className="bg-cult-near-black border border-cult-warning/30 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-cult-charcoal flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-cult-warning" />
          <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">At-Risk Accounts</h3>
        </div>
        <span className="text-xs font-semibold text-cult-warning">{accounts.length} accounts</span>
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
              className="px-5 py-3 flex items-center justify-between hover:bg-cult-dark-gray/50 transition-colors group"
            >
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onSelectAccount(account.id)}
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-cult-white truncate">{account.name}</p>
                  {isHub && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold bg-cult-info-muted text-cult-info rounded">
                      <Network className="w-3 h-3" />
                      CHAIN
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-cult-light-gray font-mono">{account.dispensary_code}</span>
                  <span className="text-xs text-cult-light-gray">
                    {formatCurrencyShort(combinedRevenue)} lifetime
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {account.phone && (
                    <a
                      href={`tel:${account.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded hover:bg-cult-info-muted text-cult-medium-gray hover:text-cult-info transition-colors"
                      title={`Call ${account.phone}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/crm-visit-calendar'); }}
                    className="p-1.5 rounded hover:bg-cult-success-muted text-cult-medium-gray hover:text-cult-success transition-colors"
                    title="Schedule visit"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                  </button>
                  {onCreateOrder && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onCreateOrder(account.id); }}
                      className="p-1.5 rounded hover:bg-cult-success-muted text-cult-medium-gray hover:text-cult-success transition-colors"
                      title="Create order"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 text-cult-warning">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-sm font-semibold">{account.days_since_last_order}d</span>
                  </div>
                  <span className="text-xs text-cult-light-gray">since last order</span>
                </div>
                <ChevronRight
                  className="w-4 h-4 text-cult-medium-gray group-hover:text-cult-white transition-colors cursor-pointer flex-shrink-0"
                  onClick={() => onSelectAccount(account.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
