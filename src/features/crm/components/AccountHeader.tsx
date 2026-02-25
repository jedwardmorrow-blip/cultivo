import { Building2, MapPin, Phone, Mail, FileText, Shield } from 'lucide-react';
import type { AccountSummary, AccountHealthScore } from '../types';
import { AccountHealthBadge } from './AccountHealthBadge';

interface AccountHeaderProps {
  account: AccountSummary;
  healthScore?: AccountHealthScore | null;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'prospect': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'inactive': return 'bg-cult-medium-gray/30 text-cult-silver border-cult-medium-gray/30';
    case 'churned': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-cult-medium-gray/30 text-cult-silver border-cult-medium-gray/30';
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

export function AccountHeader({ account, healthScore }: AccountHeaderProps) {
  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <Building2 className="w-6 h-6 text-cult-silver flex-shrink-0" />
            <h1 className="text-2xl font-bold text-cult-white truncate">{account.name}</h1>
            <span className="text-sm font-mono text-cult-light-gray bg-cult-dark-gray px-2 py-0.5 rounded">
              {account.dispensary_code}
            </span>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase border ${getStatusColor(account.account_status)}`}>
              {account.account_status}
            </span>
            {account.account_type === 'hub_parent' && (
              <span className="px-2 py-0.5 text-xs font-bold bg-sky-500/20 text-sky-400 rounded border border-sky-500/30">
                HUB PARENT
              </span>
            )}
            {healthScore && <AccountHealthBadge healthScore={healthScore} size="md" />}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {account.city && (
              <div className="flex items-center gap-2 text-sm text-cult-light-gray">
                <MapPin className="w-4 h-4 text-cult-medium-gray flex-shrink-0" />
                <span>{[account.city, account.state].filter(Boolean).join(', ')}</span>
              </div>
            )}
            {account.phone && (
              <div className="flex items-center gap-2 text-sm text-cult-light-gray">
                <Phone className="w-4 h-4 text-cult-medium-gray flex-shrink-0" />
                <a href={`tel:${account.phone}`} className="hover:text-cult-white transition-colors">{account.phone}</a>
              </div>
            )}
            {account.email && (
              <div className="flex items-center gap-2 text-sm text-cult-light-gray min-w-0">
                <Mail className="w-4 h-4 text-cult-medium-gray flex-shrink-0" />
                <span className="truncate">{account.email.split(',')[0].trim()}</span>
              </div>
            )}
            {account.license_number && (
              <div className="flex items-center gap-2 text-sm text-cult-light-gray">
                <Shield className="w-4 h-4 text-cult-medium-gray flex-shrink-0" />
                <span className="truncate">{account.license_number}</span>
              </div>
            )}
            {account.default_payment_terms && (
              <div className="flex items-center gap-2 text-sm text-cult-light-gray">
                <FileText className="w-4 h-4 text-cult-medium-gray flex-shrink-0" />
                <span>{account.default_payment_terms}</span>
              </div>
            )}
          </div>

          {account.tags.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {account.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 text-[10px] font-medium bg-cult-dark-gray text-cult-silver rounded-full border border-cult-charcoal">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:flex-shrink-0">
          <MetricBlock label="Lifetime Revenue" value={formatCurrency(Number(account.total_revenue))} accent="emerald" />
          <MetricBlock label="Total Orders" value={String(account.order_count)} />
          <MetricBlock label="Avg Order" value={formatCurrency(Number(account.avg_order_value))} />
          <MetricBlock
            label="Last Order"
            value={account.days_since_last_order !== null ? `${account.days_since_last_order}d ago` : 'Never'}
            accent={account.days_since_last_order !== null && account.days_since_last_order > 30 ? 'amber' : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function MetricBlock({ label, value, accent }: { label: string; value: string; accent?: 'emerald' | 'amber' }) {
  const valueColor = accent === 'emerald' ? 'text-emerald-400' : accent === 'amber' ? 'text-amber-400' : 'text-cult-white';
  return (
    <div className="bg-cult-dark-gray/50 rounded-lg p-3 border border-cult-charcoal/50">
      <p className="text-[10px] font-medium uppercase tracking-wider text-cult-silver mb-1">{label}</p>
      <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
