import { DollarSign, ShoppingCart, Users, TrendingUp, AlertTriangle, UserPlus } from 'lucide-react';
import { StatsCard } from '@/features/inventory/components/StatsCard';
import type { CRMDashboardStats } from '../types';

interface RevenueStatsCardsProps {
  stats: CRMDashboardStats;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function RevenueStatsCards({ stats }: RevenueStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatsCard
        label="Total Revenue"
        value={formatCurrency(stats.totalRevenue)}
        icon={<DollarSign className="w-5 h-5" />}
        subtitle="All time"
        accentColor="border-emerald-600/40"
      />
      <StatsCard
        label="This Month"
        value={formatCurrency(stats.monthlyRevenue)}
        icon={<TrendingUp className="w-5 h-5" />}
        subtitle={`${stats.ordersThisMonth} orders`}
        accentColor="border-emerald-600/40"
      />
      <StatsCard
        label="Avg Order"
        value={formatCurrency(stats.avgOrderValue)}
        icon={<ShoppingCart className="w-5 h-5" />}
        subtitle="This month"
        accentColor="border-sky-600/40"
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
