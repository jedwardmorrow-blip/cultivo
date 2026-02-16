import type { Order } from '../types';

export interface AttentionFlag {
  type: 'overdue' | 'awaiting_acceptance' | 'delivery_soon' | 'unfulfilled';
  label: string;
  severity: 'high' | 'medium';
}

export function getAttentionFlags(order: Order): AttentionFlag[] {
  const flags: AttentionFlag[] = [];
  const now = new Date();
  const status = order.status || 'submitted';
  const createdAt = order.created_at ? new Date(order.created_at) : now;
  const deliveryDate = order.scheduled_delivery_date || order.requested_delivery_date;
  const deliveryTime = deliveryDate ? new Date(deliveryDate).getTime() : null;
  const hoursOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  const hoursUntilDelivery = deliveryTime
    ? (deliveryTime - now.getTime()) / (1000 * 60 * 60)
    : null;

  const terminalStatuses = ['completed', 'cancelled', 'delivered'];
  if (terminalStatuses.includes(status)) return flags;

  if (status === 'submitted' && hoursOld > 24) {
    flags.push({
      type: 'awaiting_acceptance',
      label: 'Awaiting acceptance',
      severity: hoursOld > 72 ? 'high' : 'medium',
    });
  }

  if (
    deliveryTime &&
    hoursUntilDelivery !== null &&
    hoursUntilDelivery < 0 &&
    !terminalStatuses.includes(status)
  ) {
    flags.push({
      type: 'overdue',
      label: 'Overdue',
      severity: 'high',
    });
  }

  if (
    deliveryTime &&
    hoursUntilDelivery !== null &&
    hoursUntilDelivery >= 0 &&
    hoursUntilDelivery <= 48 &&
    !['ready_for_delivery', 'completed', 'delivered'].includes(status)
  ) {
    flags.push({
      type: 'delivery_soon',
      label: 'Delivery soon',
      severity: 'medium',
    });
  }

  if (
    ['accepted', 'processing'].includes(status) &&
    (order.item_count || 0) > 0
  ) {
    flags.push({
      type: 'unfulfilled',
      label: 'Needs fulfillment',
      severity: 'medium',
    });
  }

  return flags;
}

export function hasAttentionFlags(order: Order): boolean {
  return getAttentionFlags(order).length > 0;
}

export function getOrderAge(createdAt: string | null): string {
  if (!createdAt) return '';
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1d ago';
  return `${diffDays}d ago`;
}

export function getOrderAgeColor(createdAt: string | null, status: string | null): string {
  if (!createdAt) return 'text-cult-silver';
  const now = new Date();
  const created = new Date(createdAt);
  const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  if (status === 'submitted' && diffHours > 72) return 'text-red-400';
  if (status === 'submitted' && diffHours > 24) return 'text-amber-400';
  return 'text-cult-silver';
}
