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
  default: '',
  accent: 'shadow-glow',
  success: 'shadow-glow-success',
  danger: 'shadow-glow-danger',
};

const variantBorders: Record<string, string> = {
  default: 'border-white/[0.08]',
  accent: 'border-white/[0.12]',
  success: 'border-cult-success/30',
  danger: 'border-cult-danger/30',
};

export function StatCard({
  label, value, subtitle, icon, trend, variant = 'default', className = '',
}: StatCardProps) {
  return (
    <div className={`glass-card border ${variantBorders[variant]} p-5 transition-all duration-300 ease-cult hover:bg-white/[0.09] hover:border-white/[0.14] hover:scale-[1.01] ${variantStyles[variant]} ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-caption uppercase tracking-wider text-cult-text-muted">{label}</span>
        {icon && <span className="text-cult-text-muted">{icon}</span>}
      </div>
      <div className="text-h2 text-cult-text-primary font-semibold tabular-nums">{value}</div>
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
