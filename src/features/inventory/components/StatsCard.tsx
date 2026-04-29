import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accentColor?: string;
}

export function StatsCard({
  label,
  value,
  icon,
  subtitle,
  trend,
  trendValue,
  accentColor = 'border-cult-border',
}: StatsCardProps) {
  return (
    <div className={`relative bg-cult-surface rounded border ${accentColor} overflow-hidden transition-colors hover:border-cult-border-strong group`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-mono uppercase tracking-[0.14em] text-[10px] text-cult-text-muted mb-2">{label}</p>
            <p className="text-2xl font-semibold text-cult-text-primary tabular-nums">{value}</p>
            {subtitle && (
              <p className="text-sm text-cult-text-muted mt-1.5">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className={`flex items-center gap-1 mt-1.5 font-mono text-[11px] ${
                trend === 'up' ? 'text-cult-success' : trend === 'down' ? 'text-cult-danger' : 'text-cult-text-muted'
              }`}>
                {trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {trend === 'down' && <TrendingDown className="w-3 h-3" />}
                {trend === 'neutral' && <Minus className="w-3 h-3" />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="flex-shrink-0 text-cult-text-muted">
              {icon}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
