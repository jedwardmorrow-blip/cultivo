import { RefreshCw, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DateRangeFilter, PageSkeleton } from '@/shared/components';
import { useCRMDashboard } from '../hooks';
import { RevenueStatsCards } from './RevenueStatsCards';
import { TopAccountsTable } from './TopAccountsTable';
import { AtRiskAccounts } from './AtRiskAccounts';
import { SKUPerformanceGrid } from './SKUPerformanceGrid';
import { DashboardQuickActions } from './DashboardQuickActions';

interface CRMDashboardProps {
  onSelectAccount?: (accountId: string) => void;
  onCreateOrder?: (customerId?: string) => void;
}

export function CRMDashboard({ onSelectAccount, onCreateOrder }: CRMDashboardProps) {
  const navigate = useNavigate();
  const {
    stats,
    topAccounts,
    atRiskAccounts,
    topSKUs,
    loading,
    isRefreshing,
    reload,
    monthlyRevenueMap,
    dateRange,
    setDateRange,
    compareEnabled,
    setCompareEnabled,
  } = useCRMDashboard();

  const handleSelectAccount = (accountId: string) => {
    if (onSelectAccount) {
      onSelectAccount(accountId);
    }
    navigate(`/crm-account-detail/${accountId}`);
  };

  if (loading) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <div className="space-y-6 pb-8 stagger-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono uppercase tracking-[0.18em] text-sm text-cult-text-primary">Sales Dashboard</h1>
          <p className="font-mono uppercase tracking-[0.12em] text-[10px] text-cult-text-muted mt-1.5">Account performance and revenue analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/crm-accounts')}
            className="px-4 py-2 font-mono uppercase tracking-[0.16em] text-[11px] text-cult-text-primary bg-cult-surface-inset border border-cult-border rounded hover:bg-cult-surface-raised hover:border-cult-border-strong transition-colors"
          >
            View All Accounts
          </button>
          <button
            onClick={reload}
            className="p-2 text-cult-text-muted hover:text-cult-text-primary bg-cult-surface-inset border border-cult-border rounded hover:bg-cult-surface-raised hover:border-cult-border-strong transition-colors"
            title="Refresh data"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <DateRangeFilter
        value={dateRange}
        onChange={setDateRange}
        showCompare
        compareEnabled={compareEnabled}
        onCompareToggle={setCompareEnabled}
      />

      {isRefreshing && (
        <div className="h-0.5 w-full bg-cult-surface rounded overflow-hidden">
          <div className="h-full bg-cult-success/60 rounded animate-pulse w-2/3" />
        </div>
      )}

      <div className={`transition-opacity duration-200 ${isRefreshing ? 'opacity-60' : 'opacity-100'}`}>
        {stats && (
          <RevenueStatsCards
            stats={stats}
            periodLabel={dateRange.label}
            compareEnabled={compareEnabled}
          />
        )}
      </div>

      {onCreateOrder && (
        <DashboardQuickActions
          onCreateOrder={() => onCreateOrder()}
        />
      )}

      <div className={`transition-opacity duration-200 ${isRefreshing ? 'opacity-60' : 'opacity-100'}`}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <TopAccountsTable
              accounts={topAccounts}
              onSelectAccount={handleSelectAccount}
              monthlyRevenueMap={monthlyRevenueMap}
              periodLabel={dateRange.label}
            />
          </div>
          <div>
            <AtRiskAccounts
              accounts={atRiskAccounts}
              onSelectAccount={handleSelectAccount}
              onCreateOrder={onCreateOrder}
            />
          </div>
        </div>
      </div>

      <div className={`transition-opacity duration-200 ${isRefreshing ? 'opacity-60' : 'opacity-100'}`}>
        <SKUPerformanceGrid skus={topSKUs} periodLabel={dateRange.label} />
      </div>
    </div>
  );
}
