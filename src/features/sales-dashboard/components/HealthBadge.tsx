import type { SupplyHealthStatus } from '../types';
import { SUPPLY_HEALTH_COLORS } from '../types';

interface HealthBadgeProps {
  status: SupplyHealthStatus;
  size?: 'sm' | 'md';
}

const LABELS: Record<SupplyHealthStatus, string> = {
  critical: 'Critical',
  low: 'Low',
  warning: 'Warning',
  healthy: 'Healthy',
};

export function HealthBadge({ status, size = 'sm' }: HealthBadgeProps) {
  const color = SUPPLY_HEALTH_COLORS[status];
  const label = LABELS[status];
  const sizeClasses = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[10px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider ${sizeClasses}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}30`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
