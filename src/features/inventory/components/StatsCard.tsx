import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
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
  accentColor = 'border-cult-medium-gray',
}: StatsCardProps) {
  return (
    <div className={`relative bg-cult-near-black rounded-lg border ${accentColor} overflow-hidden transition-all duration-200 hover:border-cult-lighter-gray hover:scale-[1.01] group`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-cult-silver mb-2">{label}</p>
            <p className="text-2xl font-bold text-cult-white tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-sm text-cult-lighter-gray mt-1.5">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${
                trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-amber-400'
              }`}>
                {trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {trend === 'down' && <TrendingDown className="w-3 h-3" />}
                {trend === 'neutral' && <Minus className="w-3 h-3" />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0 p-2.5 rounded-lg bg-cult-dark-gray/80 text-cult-silver group-hover:text-cult-white transition-colors">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
