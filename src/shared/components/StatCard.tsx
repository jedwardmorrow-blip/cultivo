import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label?: string };
  variant?: 'default' | 'accent' | 'success' | 'danger';
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'border-cult-border',
  accent: 'border-cult-accent',
  success: 'border-cult-success',
  danger: 'border-cult-danger',
};

export function StatCard({
  label, value, subtitle, icon, trend, variant = 'default', className = '',
}: StatCardProps) {
  return (
    <div className={`bg-cult-surface-raised border ${variantStyles[variant]} rounded-cult p-5 transition-all duration-200 ease-cult hover:bg-cult-surface-overlay hover:scale-[1.01] ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-caption uppercase tracking-wider text-cult-text-muted">{label}</span>
        {icon && <span className="text-cult-text-muted">{icon}</span>}
      </div>
      <div className="text-h2 text-cult-text-primary font-semibold">{value}</div>
      {subtitle && <p className="text-caption text-cult-text-muted mt-1">{subtitle}</p>}
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <span className={trend.value >= 0 ? 'text-cult-success text-caption' : 'text-cult-danger text-caption'}>
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          {trend.label && <span className="text-cult-text-faint text-caption">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}
