import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Package, TrendingUp, DollarSign } from 'lucide-react';
import type { DashboardSummary, SupplyHealthStatus } from '../types';
import { SUPPLY_HEALTH_COLORS } from '../types';
import { formatNumber, formatCurrency } from '@/shared/utils/format';

interface HeroCardsProps {
  summary: DashboardSummary;
}

const HEALTH_ORDER: SupplyHealthStatus[] = ['healthy', 'warning', 'low', 'critical'];

export function HeroCards({ summary }: HeroCardsProps) {
  const { totals, health_distribution } = summary;

  const healthData = HEALTH_ORDER.map((key) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: health_distribution[key],
    color: SUPPLY_HEALTH_COLORS[key],
  })).filter((d) => d.value > 0);

  const totalStrains = Object.values(health_distribution).reduce((a, b) => a + b, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-5 relative overflow-hidden group hover:border-green-500/30 transition-colors duration-200">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />
        <div className="flex items-start justify-between">
          <div className="pl-3">
            <span className="text-caption uppercase tracking-wider text-cult-text-muted block mb-1">Ready to Sell</span>
            <div className="text-3xl font-bold text-cult-text-primary">
              {formatNumber(Math.round(totals.total_sellable_grams))}
              <span className="text-sm font-normal text-cult-text-muted ml-1">g</span>
            </div>
            <div className="text-xs text-cult-text-muted mt-1.5">
              {formatNumber(totals.packaged_units)} packaged units
            </div>
          </div>
          <div className="p-2 rounded-lg bg-green-500/10">
            <Package className="w-5 h-5 text-green-400" />
          </div>
        </div>
      </div>

      <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-5 relative overflow-hidden group hover:border-blue-500/30 transition-colors duration-200">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
        <div className="flex items-start justify-between">
          <div className="pl-3">
            <span className="text-caption uppercase tracking-wider text-cult-text-muted block mb-1">In Pipeline</span>
            <div className="text-3xl font-bold text-cult-text-primary">
              {formatNumber(Math.round(totals.pipeline_grams))}
              <span className="text-sm font-normal text-cult-text-muted ml-1">g</span>
            </div>
            <div className="text-xs text-cult-text-muted mt-1.5">
              Material being processed
            </div>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10">
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
        </div>
      </div>

      <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-5 relative overflow-hidden group hover:border-cult-border-strong transition-colors duration-200">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-cult-text-primary" />
        <div className="flex items-start justify-between">
          <div className="pl-3">
            <span className="text-caption uppercase tracking-wider text-cult-text-muted block mb-1">Active Demand</span>
            <div className="text-3xl font-bold text-cult-text-primary">
              {formatCurrency(totals.active_demand_revenue)}
            </div>
            <div className="text-xs text-cult-text-muted mt-1.5">
              {formatNumber(totals.active_orders)} active orders
            </div>
          </div>
          <div className="p-2 rounded-lg bg-white/5">
            <DollarSign className="w-5 h-5 text-cult-text-secondary" />
          </div>
        </div>
      </div>

      <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-5 group hover:border-cult-border-strong transition-colors duration-200">
        <span className="text-caption uppercase tracking-wider text-cult-text-muted block mb-2">Supply Health</span>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={22}
                  outerRadius={36}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {healthData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1">
            {healthData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-cult-text-muted">{entry.name}</span>
                </div>
                <span className="font-medium text-cult-text-primary tabular-nums">
                  {entry.value}
                  <span className="text-cult-text-faint ml-0.5">/{totalStrains}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
