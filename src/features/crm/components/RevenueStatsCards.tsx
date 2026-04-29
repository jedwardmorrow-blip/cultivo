import { StatsCard } from '@/features/inventory/components/StatsCard';
import { formatCurrencyShort } from '@/shared/utils/format';
import type { CRMDashboardStats } from '../types';

interface RevenueStatsCardsProps {
  stats: CRMDashboardStats;
  periodLabel: string;
  compareEnabled?: boolean;
}

function computeTrend(current: number, previous: number): { trend: 'up' | 'down' | 'neutral'; value: string } | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { trend: 'up', value: 'New' };
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 1) return { trend: 'neutral', value: '0%' };
  return {
    trend: pct > 0 ? 'up' : 'down',
    value: `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`,
  };
}

export function RevenueStatsCards({ stats, periodLabel, compareEnabled = false }: RevenueStatsCardsProps) {
  const revTrend = compareEnabled ? computeTrend(stats.periodRevenue, stats.prevPeriodRevenue) : null;
  const orderTrend = compareEnabled ? computeTrend(stats.periodOrders, stats.prevPeriodOrders) : null;
  const avgTrend = compareEnabled ? computeTrend(stats.periodAvgOrder, stats.prevPeriodAvgOrder) : null;

  // Show projected month card when projected differs from period actuals
  // (i.e. there are future-dated deliveries this month beyond the current range)
  const showProjected =
    stats.projectedMonthRevenue > 0 &&
    stats.projectedMonthRevenue !== stats.periodRevenue;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatsCard
        label="Revenue"
        value={formatCurrencyShort(stats.periodRevenue)}
        subtitle={periodLabel}
        trend={revTrend?.trend}
        trendValue={revTrend?.value}
      />
      {showProjected && (
        <StatsCard
          label="Month Projected"
          value={formatCurrencyShort(stats.projectedMonthRevenue)}
          subtitle={`${stats.projectedMonthOrders} orders scheduled`}
        />
      )}
      <StatsCard
        label="Orders"
        value={stats.periodOrders}
        subtitle={`${stats.uniqueCustomersInPeriod} customers`}
        trend={orderTrend?.trend}
        trendValue={orderTrend?.value}
      />
      <StatsCard
        label="Avg Order"
        value={formatCurrencyShort(stats.periodAvgOrder)}
        subtitle={periodLabel}
        trend={avgTrend?.trend}
        trendValue={avgTrend?.value}
      />
      <StatsCard
        label="Active Accounts"
        value={stats.activeAccounts}
        subtitle={`${stats.totalAccounts} total`}
      />
      <StatsCard
        label="At Risk"
        value={stats.atRiskCount}
        subtitle="30+ days silent"
        accentColor={stats.atRiskCount > 0 ? 'border-cult-warning/40' : 'border-cult-border'}
      />
      <StatsCard
        label="Prospects"
        value={stats.prospectCount}
        subtitle="No orders yet"
      />
    </div>
  );
}
