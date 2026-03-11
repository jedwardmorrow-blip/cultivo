import { DollarSign, ShoppingCart, Users, TrendingUp, AlertTriangle, UserPlus, CalendarRange } from 'lucide-react';
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
        icon={<DollarSign className="w-5 h-5" />}
        subtitle={periodLabel}
        accentColor="border-emerald-600/40"
        trend={revTrend?.trend}
        trendValue={revTrend?.value}
      />
      {showProjected && (
        <StatsCard
          label="Month Projected"
          value={formatCurrencyShort(stats.projectedMonthRevenue)}
          icon={<CalendarRange className="w-5 h-5" />}
          subtitle={`${stats.projectedMonthOrders} orders scheduled`}
          accentColor="border-emerald-600/20"
        />
      )}
      <StatsCard
        label="Orders"
        value={stats.periodOrders}
        icon={<TrendingUp className="w-5 h-5" />}
        subtitle={`${stats.uniqueCustomersInPeriod} customers`}
        accentColor="border-emerald-600/40"
        trend={orderTrend?.trend}
        trendValue={orderTrend?.value}
      />
      <StatsCard
        label="Avg Order"
        value={formatCurrencyShort(stats.periodAvgOrder)}
        icon={<ShoppingCart className="w-5 h-5" />}
        subtitle={periodLabel}
        accentColor="border-sky-600/40"
        trend={avgTrend?.trend}
        trendValue={avgTrend?.value}
      />
      <StatsCard
        label="Active Accounts"
        value={stats.activeAccounts}
        icon={<Users className="w-5 h-5" />}
        subtitle={`${stats.totalAccounts} total`}
        accentColor="border-sky-600/40"
      />
      <StatsCard
        label="At Risk"
        value={stats.atRiskCount}
        icon={<AlertTriangle className="w-5 h-5" />}
        subtitle="30+ days silent"
        accentColor={stats.atRiskCount > 0 ? 'border-amber-600/40' : 'border-cult-medium-gray'}
      />
      <StatsCard
        label="Prospects"
        value={stats.prospectCount}
        icon={<UserPlus className="w-5 h-5" />}
        subtitle="No orders yet"
        accentColor="border-cyan-600/40"
      />
    </div>
  );
}
