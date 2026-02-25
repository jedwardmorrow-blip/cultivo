import { RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '@/shared/components';
import { useCRMDashboard } from '../hooks';
import { RevenueStatsCards } from './RevenueStatsCards';
import { TopAccountsTable } from './TopAccountsTable';
import { AtRiskAccounts } from './AtRiskAccounts';
import { SKUPerformanceGrid } from './SKUPerformanceGrid';
import { DashboardQuickActions } from './DashboardQuickActions';

interface CRMDashboardProps {
  onViewChange: (view: string) => void;
  onSelectAccount?: (accountId: string) => void;
  onCreateOrder?: (customerId?: string) => void;
}

export function CRMDashboard({ onViewChange, onSelectAccount, onCreateOrder }: CRMDashboardProps) {
  const { stats, topAccounts, atRiskAccounts, topSKUs, loading, reload, monthlyRevenueMap } = useCRMDashboard();

  const handleSelectAccount = (accountId: string) => {
    if (onSelectAccount) {
      onSelectAccount(accountId);
    }
    onViewChange(`crm-account-detail:${accountId}`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">Sales Dashboard</h1>
          <p className="text-cult-light-gray mt-1">Account performance and revenue analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onViewChange('crm-accounts')}
            className="px-4 py-2 text-sm font-medium text-cult-white bg-cult-dark-gray border border-cult-medium-gray rounded-lg hover:bg-cult-charcoal transition-colors"
          >
            View All Accounts
          </button>
          <button
            onClick={reload}
            className="p-2 text-cult-silver hover:text-cult-white bg-cult-dark-gray border border-cult-medium-gray rounded-lg hover:bg-cult-charcoal transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {stats && <RevenueStatsCards stats={stats} />}

      {onCreateOrder && (
        <DashboardQuickActions
          onCreateOrder={() => onCreateOrder()}
          onViewChange={onViewChange}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TopAccountsTable accounts={topAccounts} onSelectAccount={handleSelectAccount} monthlyRevenueMap={monthlyRevenueMap} />
        </div>
        <div>
          <AtRiskAccounts
            accounts={atRiskAccounts}
            onSelectAccount={handleSelectAccount}
            onCreateOrder={onCreateOrder}
            onViewChange={onViewChange}
          />
        </div>
      </div>

      <SKUPerformanceGrid skus={topSKUs} />
    </div>
  );
}
