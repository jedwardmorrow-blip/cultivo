import { useState } from 'react';
import { Building2, MapPin, Phone, Mail, FileText, Shield, Package, Truck, Network, ShoppingCart, Gift, Pencil, ChevronDown } from 'lucide-react';
import type { AccountSummary, AccountHealthScore, PipelineStage } from '../types';
import { AccountHealthBadge } from './AccountHealthBadge';
import { RevenueSparkline } from '@/shared/components';
import { updatePipelineStage } from '../services/crm.service';

interface AccountHeaderProps {
  account: AccountSummary;
  healthScore?: AccountHealthScore | null;
  monthlyRevenue?: number[];
  onCreateOrder?: () => void;
  onCreateSampleOrder?: () => void;
  onEdit?: () => void;
  onAccountUpdated?: () => void;
}

const PIPELINE_STAGES: { key: PipelineStage; label: string; color: string }[] = [
  { key: 'lead', label: 'Lead', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  { key: 'contacted', label: 'Contacted', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  { key: 'meeting_set', label: 'Meeting Set', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  { key: 'sample_sent', label: 'Sample Sent', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { key: 'negotiating', label: 'Negotiating', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { key: 'closed_won', label: 'Closed Won', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { key: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

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

export function AccountHeader({ account, healthScore, monthlyRevenue, onCreateOrder, onCreateSampleOrder, onEdit, onAccountUpdated }: AccountHeaderProps) {
  const isHubParent = account.account_type === 'hub_parent';
  const isProspect = account.account_status === 'prospect';
  const chainRevenue = Number(account.total_revenue) + (account.child_total_revenue || 0);
  const chainOrders = account.order_count + (account.child_total_orders || 0);
  const [showPipelineMenu, setShowPipelineMenu] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);

  const currentPipelineStage = PIPELINE_STAGES.find((s) => s.key === account.pipeline_stage);

  const handlePipelineChange = async (stage: PipelineStage) => {
    setUpdatingStage(true);
    setShowPipelineMenu(false);
    await updatePipelineStage(account.id, stage);
    onAccountUpdated?.();
    setUpdatingStage(false);
  };

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <Building2 className="w-6 h-6 text-cult-silver flex-shrink-0" />
            <h1 className="text-2xl font-bold text-cult-white truncate">{account.name}</h1>
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 text-cult-medium-gray hover:text-cult-white hover:bg-cult-dark-gray rounded transition-all"
                title="Edit account info"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <span className="text-sm font-mono text-cult-light-gray bg-cult-dark-gray px-2 py-0.5 rounded">
              {account.dispensary_code}
            </span>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase border ${getStatusColor(account.account_status)}`}>
              {account.account_status}
            </span>
            {isHubParent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-sky-500/20 text-sky-400 rounded border border-sky-500/30">
                <Network className="w-3.5 h-3.5" />
                CHAIN
              </span>
            )}
            {isHubParent && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded border ${
                account.delivery_model === 'hub_and_spoke'
                  ? 'bg-teal-500/15 text-teal-400 border-teal-500/30'
                  : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
              }`}>
                {account.delivery_model === 'hub_and_spoke' ? (
                  <><Package className="w-3.5 h-3.5" /> Hub & Spoke</>
                ) : (
                  <><Truck className="w-3.5 h-3.5" /> Direct to Each</>
                )}
              </span>
            )}
            {healthScore && <AccountHealthBadge healthScore={healthScore} size="md" />}
            {isProspect && currentPipelineStage && (
              <div className="relative">
                <button
                  onClick={() => setShowPipelineMenu(!showPipelineMenu)}
                  disabled={updatingStage}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border transition-all ${currentPipelineStage.color} ${updatingStage ? 'opacity-50' : 'hover:opacity-80 cursor-pointer'}`}
                >
                  {updatingStage ? 'Updating...' : currentPipelineStage.label}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showPipelineMenu && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-cult-near-black border border-cult-medium-gray rounded-lg shadow-xl p-1.5 min-w-[160px]">
                    <p className="px-2 py-1 text-xs text-cult-silver uppercase tracking-wider">Pipeline Stage</p>
                    {PIPELINE_STAGES.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => handlePipelineChange(s.key)}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                          s.key === account.pipeline_stage
                            ? `${s.color} font-bold`
                            : 'text-cult-light-gray hover:bg-cult-dark-gray hover:text-cult-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                <span key={tag} className="px-2 py-0.5 text-xs font-medium bg-cult-dark-gray text-cult-silver rounded-full border border-cult-charcoal">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-4 lg:flex-shrink-0">
          <div className="flex items-center gap-2">
            {onCreateSampleOrder && (
              <button
                onClick={onCreateSampleOrder}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/50 rounded-lg hover:bg-amber-500/30 transition-all text-sm font-bold"
              >
                <Gift className="w-4 h-4" />
                Send Sample
              </button>
            )}
            {onCreateOrder && (
              <button
                onClick={onCreateOrder}
                className="flex items-center gap-2 px-4 py-2.5 bg-cult-green text-cult-black rounded-lg hover:bg-cult-green-bright transition-all text-sm font-bold shadow-lg hover:shadow-cult-green/20"
              >
                <ShoppingCart className="w-4 h-4" />
                New Order
              </button>
            )}
          </div>
          {monthlyRevenue && monthlyRevenue.some((v) => v > 0) && (
            <div className="bg-cult-dark-gray/50 rounded-lg p-3 border border-cult-charcoal/50 w-full">
              <p className="text-xs font-medium uppercase tracking-wider text-cult-silver mb-2">6-Month Revenue Trend</p>
              <RevenueSparkline data={monthlyRevenue} width={200} height={40} />
            </div>
          )}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {isHubParent ? (
            <>
              <MetricBlock label="Chain Revenue" value={formatCurrency(chainRevenue)} accent="emerald" />
              <MetricBlock label="Chain Orders" value={String(chainOrders)} />
              <MetricBlock label="Direct Revenue" value={formatCurrency(Number(account.total_revenue))} />
              <MetricBlock
                label="Last Order"
                value={account.days_since_last_order !== null ? `${account.days_since_last_order}d ago` : 'Never'}
                accent={account.days_since_last_order !== null && account.days_since_last_order > 30 ? 'amber' : undefined}
              />
            </>
          ) : (
            <>
              <MetricBlock label="Lifetime Revenue" value={formatCurrency(Number(account.total_revenue))} accent="emerald" />
              <MetricBlock label="Total Orders" value={String(account.order_count)} />
              <MetricBlock label="Avg Order" value={formatCurrency(Number(account.avg_order_value))} />
              <MetricBlock
                label="Last Order"
                value={account.days_since_last_order !== null ? `${account.days_since_last_order}d ago` : 'Never'}
                accent={account.days_since_last_order !== null && account.days_since_last_order > 30 ? 'amber' : undefined}
              />
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

function MetricBlock({ label, value, accent }: { label: string; value: string; accent?: 'emerald' | 'amber' }) {
  const valueColor = accent === 'emerald' ? 'text-emerald-400' : accent === 'amber' ? 'text-amber-400' : 'text-cult-white';
  return (
    <div className="bg-cult-dark-gray/50 rounded-lg p-3 border border-cult-charcoal/50">
      <p className="text-xs font-medium uppercase tracking-wider text-cult-silver mb-1">{label}</p>
      <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
