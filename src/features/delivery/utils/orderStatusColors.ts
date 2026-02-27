export interface OrderStatusStyle {
  bg: string;
  text: string;
  border: string;
  label: string;
}

const ORDER_STATUS_COLORS: Record<string, OrderStatusStyle> = {
  submitted: { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-600', label: 'Submitted' },
  accepted: { bg: 'bg-cyan-900/30', text: 'text-cyan-400', border: 'border-cyan-600', label: 'Accepted' },
  processing: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-600', label: 'Processing' },
  ready_for_delivery: { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-600', label: 'Ready' },
  completed: { bg: 'bg-emerald-900/30', text: 'text-emerald-400', border: 'border-emerald-600', label: 'Completed' },
  cancelled: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-600', label: 'Cancelled' },
};

const READY_STATUSES = new Set(['ready_for_delivery', 'completed']);

export function getOrderStatusStyle(status: string): OrderStatusStyle {
  return ORDER_STATUS_COLORS[status] || { bg: 'bg-cult-dark-gray/30', text: 'text-cult-silver', border: 'border-cult-medium-gray', label: status.replace(/_/g, ' ') };
}

export function isOrderReadyStatus(status: string): boolean {
  return READY_STATUSES.has(status);
}
