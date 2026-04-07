export interface OrderStatusStyle {
  bg: string;
  text: string;
  border: string;
  label: string;
}

const ORDER_STATUS_COLORS: Record<string, OrderStatusStyle> = {
  submitted: { bg: 'bg-cult-info/15', text: 'text-cult-info', border: 'border-cult-info', label: 'Submitted' },
  accepted: { bg: 'bg-cyan-900/30', text: 'text-cyan-400', border: 'border-cyan-600', label: 'Accepted' },
  processing: { bg: 'bg-cult-warning/15', text: 'text-cult-warning', border: 'border-cult-warning', label: 'Processing' },
  ready_for_delivery: { bg: 'bg-cult-success/15', text: 'text-cult-success', border: 'border-cult-success', label: 'Ready' },
  completed: { bg: 'bg-cult-success/15', text: 'text-cult-success', border: 'border-cult-success', label: 'Completed' },
  delivered: { bg: 'bg-teal-900/30', text: 'text-teal-400', border: 'border-teal-600', label: 'Delivered' },
  cancelled: { bg: 'bg-cult-danger/15', text: 'text-cult-danger', border: 'border-cult-danger', label: 'Cancelled' },
};

const READY_STATUSES = new Set(['ready_for_delivery', 'completed', 'delivered']);

export function getOrderStatusStyle(status: string): OrderStatusStyle {
  return ORDER_STATUS_COLORS[status] || { bg: 'bg-cult-dark-gray/30', text: 'text-cult-silver', border: 'border-cult-medium-gray', label: status.replace(/_/g, ' ') };
}

export function isOrderReadyStatus(status: string): boolean {
  return READY_STATUSES.has(status);
}
