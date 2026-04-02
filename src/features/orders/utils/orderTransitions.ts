import type { OrderStatus } from '@/types/order.types';

const FORWARD_TRANSITIONS: Record<OrderStatus, OrderStatus | null> = {
  submitted: 'accepted',
  accepted: 'processing',
  processing: 'ready_for_delivery',
  ready_for_delivery: 'completed',
  completed: null,
  delivered: null,
  cancelled: null,
};

const BACKWARD_TRANSITIONS: Record<OrderStatus, OrderStatus | null> = {
  submitted: null,
  accepted: 'submitted',
  processing: 'accepted',
  ready_for_delivery: 'processing',
  completed: 'ready_for_delivery',
  delivered: null,
  cancelled: null,
};

const FORWARD_LABELS: Record<string, string> = {
  'submitted->accepted': 'Accept Order',
  'accepted->processing': 'Begin Processing',
  'processing->ready_for_delivery': 'Mark Ready for Delivery',
  'ready_for_delivery->completed': 'Complete Order',
};

const BACKWARD_LABELS: Record<string, string> = {
  'accepted->submitted': 'Revert to Submitted',
  'processing->accepted': 'Revert to Accepted',
  'ready_for_delivery->processing': 'Revert to Processing',
  'completed->ready_for_delivery': 'Revert to Ready',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  submitted: 'Submitted',
  accepted: 'Accepted',
  processing: 'Processing',
  ready_for_delivery: 'Ready for Delivery',
  completed: 'Completed',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function getNextStatus(current: string): OrderStatus | null {
  return FORWARD_TRANSITIONS[current as OrderStatus] ?? null;
}

export function getPreviousStatus(current: string): OrderStatus | null {
  return BACKWARD_TRANSITIONS[current as OrderStatus] ?? null;
}

export function canTransitionTo(from: string, to: string): boolean {
  if (to === 'cancelled' && from !== 'cancelled') return true;
  if (from === 'cancelled' && to === 'submitted') return true;

  const forward = FORWARD_TRANSITIONS[from as OrderStatus];
  if (forward === to) return true;

  const backward = BACKWARD_TRANSITIONS[from as OrderStatus];
  if (backward === to) return true;

  return false;
}

export function getTransitionLabel(from: string, to: string): string {
  if (to === 'cancelled') return 'Cancel Order';
  if (from === 'cancelled' && to === 'submitted') return 'Reopen Order';

  const forwardKey = `${from}->${to}`;
  if (FORWARD_LABELS[forwardKey]) return FORWARD_LABELS[forwardKey];
  if (BACKWARD_LABELS[forwardKey]) return BACKWARD_LABELS[forwardKey];

  return `Move to ${STATUS_LABELS[to as OrderStatus] || to}`;
}

export function isForwardTransition(from: string, to: string): boolean {
  return FORWARD_TRANSITIONS[from as OrderStatus] === to;
}

export function isBackwardTransition(from: string, to: string): boolean {
  if (from === 'cancelled' && to === 'submitted') return true;
  return BACKWARD_TRANSITIONS[from as OrderStatus] === to;
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status as OrderStatus] || status;
}

export function requiresDeliveryDate(from: string, to: string): boolean {
  return to === 'ready_for_delivery';
}

export function getCommonForwardTransitions(statuses: string[]): OrderStatus[] {
  if (statuses.length === 0) return [];

  const sets = statuses.map(s => {
    const next = getNextStatus(s);
    return next ? [next] : [];
  });

  if (sets.some(s => s.length === 0)) return [];

  const first = new Set(sets[0]);
  for (let i = 1; i < sets.length; i++) {
    const current = new Set(sets[i]);
    for (const val of first) {
      if (!current.has(val)) first.delete(val);
    }
  }
  return Array.from(first);
}

export function getCommonBackwardTransitions(statuses: string[]): OrderStatus[] {
  if (statuses.length === 0) return [];

  const sets = statuses.map(s => {
    const prev = getPreviousStatus(s);
    return prev ? [prev] : [];
  });

  if (sets.some(s => s.length === 0)) return [];

  const first = new Set(sets[0]);
  for (let i = 1; i < sets.length; i++) {
    const current = new Set(sets[i]);
    for (const val of first) {
      if (!current.has(val)) first.delete(val);
    }
  }
  return Array.from(first);
}
