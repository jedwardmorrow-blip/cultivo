import { Activity } from 'lucide-react';
import type { AccountHealthScore } from '../types';

interface AccountHealthBadgeProps {
  healthScore: AccountHealthScore | null;
  size?: 'sm' | 'md';
}

function getHealthStyle(label: string): { bg: string; text: string; border: string; ring: string } {
  switch (label) {
    case 'healthy':
      return { bg: 'bg-cult-success-muted', text: 'text-cult-success', border: 'border-cult-success/30', ring: 'ring-cult-success/20' };
    case 'cooling':
      return { bg: 'bg-cult-warning-muted', text: 'text-cult-warning', border: 'border-cult-warning/30', ring: 'ring-cult-warning/20' };
    case 'at_risk':
      return { bg: 'bg-cult-warning-muted', text: 'text-cult-warning', border: 'border-cult-warning/30', ring: 'ring-cult-warning/20' };
    case 'dormant':
      return { bg: 'bg-cult-danger-muted', text: 'text-cult-danger', border: 'border-cult-danger/30', ring: 'ring-cult-danger/20' };
    default:
      return { bg: 'bg-cult-medium-gray/30', text: 'text-cult-silver', border: 'border-cult-medium-gray/30', ring: 'ring-cult-medium-gray/20' };
  }
}

function getHealthLabel(label: string): string {
  switch (label) {
    case 'healthy': return 'Healthy';
    case 'cooling': return 'Cooling';
    case 'at_risk': return 'At Risk';
    case 'dormant': return 'Dormant';
    default: return label;
  }
}

export function AccountHealthBadge({ healthScore, size = 'sm' }: AccountHealthBadgeProps) {
  if (!healthScore) return null;

  const style = getHealthStyle(healthScore.health_label);

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${style.bg} ${style.text} ${style.border}`}>
        <Activity className="w-3 h-3" />
        {healthScore.health_score}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg border ${style.bg} ${style.border} ring-1 ${style.ring}`}>
      <div className="flex items-center gap-1.5">
        <Activity className={`w-4 h-4 ${style.text}`} />
        <span className={`text-lg font-bold ${style.text}`}>{healthScore.health_score}</span>
      </div>
      <div className="border-l border-current/20 pl-2.5">
        <p className={`text-xs font-semibold ${style.text}`}>{getHealthLabel(healthScore.health_label)}</p>
        <p className="text-xs text-cult-silver">{healthScore.revenue_trend}</p>
      </div>
    </div>
  );
}
