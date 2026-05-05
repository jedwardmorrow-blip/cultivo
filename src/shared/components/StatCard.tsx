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

const variantBorders: Record<string, string> = {
  default: 'border-cult-border',
  accent: 'border-cult-border-strong',
  success: 'border-cult-success/40',
  danger: 'border-cult-danger/40',
};

export function StatCard({
  label, value, subtitle, icon, trend, variant = 'default', className = '',
}: StatCardProps) {
  return (
    <div className={`bg-cult-surface border ${variantBorders[variant]} rounded p-5 transition-colors hover:bg-cult-surface-raised hover:border-cult-border-strong ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono uppercase tracking-[0.14em] text-[10px] text-cult-text-muted">{label}</span>
        {icon && <span className="text-cult-text-muted">{icon}</span>}
      </div>
      <div className="text-h2 text-cult-text-primary font-semibold tabular-nums">{value}</div>
      {subtitle && <p className="font-mono uppercase tracking-[0.12em] text-[10px] text-cult-text-muted mt-1">{subtitle}</p>}
      {trend && (
        <div className="flex items-center gap-1 mt-2 font-mono">
          <span className={trend.value >= 0 ? 'text-cult-success text-[11px]' : 'text-cult-danger text-[11px]'}>
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          {trend.label && <span className="text-cult-text-faint text-[10px] uppercase tracking-[0.12em]">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}
