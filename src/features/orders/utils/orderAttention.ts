import { parseDeliveryDate } from '@/lib/utils';
import type { Order } from '../types';

export interface AttentionFlag {
  type: 'overdue' | 'awaiting_acceptance' | 'delivery_soon' | 'unfulfilled';
  label: string;
  severity: 'high' | 'medium';
}

const FLAG_PRIORITY: Record<AttentionFlag['type'], number> = {
  overdue: 0,
  awaiting_acceptance: 1,
  delivery_soon: 2,
  unfulfilled: 3,
};

export function getAttentionFlags(order: Order): AttentionFlag[] {
  const flags: AttentionFlag[] = [];
  const now = new Date();
  const status = order.status || 'submitted';
  const createdAt = order.created_at ? new Date(order.created_at) : now;
  const deliveryDateStr = order.scheduled_delivery_date || order.requested_delivery_date;
  const parsedDelivery = parseDeliveryDate(deliveryDateStr);
  const deliveryTime = parsedDelivery ? parsedDelivery.getTime() : null;
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

  if (flags.length <= 1) return flags;
  flags.sort((a, b) => FLAG_PRIORITY[a.type] - FLAG_PRIORITY[b.type]);
  return [flags[0]];
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

/**
 * Calculate the number of days between order creation and delivery date.
 * Uses COALESCE(scheduled_delivery_date, requested_delivery_date) per canonical revenue definitions.
 */
export function getTurnaroundDays(createdAt: string | null, deliveryDateStr: string | null | undefined): number | null {
  if (!createdAt || !deliveryDateStr) return null;
  const created = new Date(createdAt);
  const delivery = parseDeliveryDate(deliveryDateStr);
  if (!delivery) return null;
  // Use date-only comparison (strip time)
  const createdDate = new Date(created.getFullYear(), created.getMonth(), created.getDate());
  const deliveryDate = new Date(delivery.getFullYear(), delivery.getMonth(), delivery.getDate());
  return Math.round((deliveryDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get color class for turnaround days based on 7-10 day SLA target.
 * < 7 days = green (ahead of schedule)
 * 7-10 days = amber (within window)
 * > 10 days = red (over target)
 */
export function getTurnaroundColor(days: number | null): string {
  if (days === null) return 'text-cult-text-muted';
  if (days < 7) return 'text-emerald-400';
  if (days <= 10) return 'text-amber-400';
  return 'text-red-400';
}

/**
 * Get background color class for turnaround badge.
 */
export function getTurnaroundBgColor(days: number | null): string {
  if (days === null) return 'bg-cult-surface-raised/50';
  if (days < 7) return 'bg-emerald-500/10';
  if (days <= 10) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}
