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
  const trendTone = trend
    ? trend.value > 0 ? 'positive' : trend.value < 0 ? 'negative' : 'neutral'
    : null;
  const trendGlyph = trend
    ? trend.value > 0 ? '▲' : trend.value < 0 ? '▼' : '–'
    : null;
  return (
    <div className={`bg-cult-surface border ${variantBorders[variant]} rounded p-5 transition-colors hover:bg-cult-surface-raised hover:border-cult-border-strong ${className}`}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="font-mono uppercase tracking-[0.14em] text-[11px] text-cult-text-muted">{label}</span>
        <span className="flex items-center gap-2">
          {trend && (
            <span className={`cult-mono-pill cult-mono-pill--${trendTone}`}>
              <span className="cult-mono-pill-glyph" aria-hidden="true">{trendGlyph}</span>
              {trend.value >= 0 ? '+' : ''}{trend.value}%
              {trend.label && <span className="opacity-70 ml-1">{trend.label}</span>}
            </span>
          )}
          {icon && <span className="text-cult-text-muted">{icon}</span>}
        </span>
      </div>
      <div className="text-h2 text-cult-text-primary font-semibold tabular-nums">{value}</div>
      {subtitle && <p className="font-mono uppercase tracking-[0.12em] text-[11px] text-cult-text-muted mt-1">{subtitle}</p>}
    </div>
  );
}
