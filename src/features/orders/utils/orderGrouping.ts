import type { Order, MonthGroup, StatusGroup } from '../types';

const STATUS_ORDER = ['submitted', 'accepted', 'processing', 'ready_for_delivery', 'completed', 'delivered', 'cancelled'];

const STATUS_NAMES: Record<string, string> = {
  submitted: 'Submitted',
  accepted: 'Accepted',
  processing: 'Processing',
  ready_for_delivery: 'Ready for Delivery',
  completed: 'Completed',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

export function groupOrdersByMonthAndStatus(orders: Order[]): MonthGroup[] {
  const monthGroups = new Map<string, Map<string, Order[]>>();
  const currentMonth = new Date().toISOString().substring(0, 7);

  orders.forEach(order => {
    // Match the database view logic: scheduled_delivery_date -> requested_delivery_date -> current month
    const deliveryDate = order.scheduled_delivery_date || order.requested_delivery_date || currentMonth;
    const month = deliveryDate.substring(0, 7);
    const status = order.status || 'submitted';

    if (!monthGroups.has(month)) {
      monthGroups.set(month, new Map());
    }

    const statusMap = monthGroups.get(month)!;
    if (!statusMap.has(status)) {
      statusMap.set(status, []);
    }

    statusMap.get(status)!.push(order);
  });

  const result: MonthGroup[] = [];

  Array.from(monthGroups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .forEach(([month, statusMap]) => {
      const [year, monthNum] = month.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const statusGroups: StatusGroup[] = STATUS_ORDER
        .filter(status => statusMap.has(status))
        .map(status => {
          const orders = statusMap.get(status)!;
          orders.sort((a, b) => {
            const dateA = a.scheduled_delivery_date || a.requested_delivery_date || a.created_at;
            const dateB = b.scheduled_delivery_date || b.requested_delivery_date || b.created_at;
            return new Date(dateA).getTime() - new Date(dateB).getTime();
          });

          return {
            status,
            statusName: STATUS_NAMES[status] || status,
            orders
          };
        });

      const allOrders = Array.from(statusMap.values()).flat();
      const totalOrders = allOrders.length;
      const totalAmount = allOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

      result.push({
        month,
        monthName,
        statusGroups,
        totalOrders,
        totalAmount,
        orders: allOrders
      });
    });

  return result;
}

// Working-instrument: status pills share a single neutral surface; identity
// comes from the label text (and from getStatusDotClass when a marker is needed).
// Status colors stay desaturated and never function as decorative fills.
export function getStatusColor(_status: string): string {
  return 'bg-cult-surface-inset text-cult-text-secondary border-cult-border-subtle';
}

export function getStatusDotClass(status: string): string {
  const dots: Record<string, string> = {
    submitted: 'bg-cult-info',
    accepted: 'bg-cult-info',
    processing: 'bg-cult-warning',
    ready_for_delivery: 'bg-cult-success',
    completed: 'bg-cult-text-faint',
    delivered: 'bg-cult-success',
    cancelled: 'bg-cult-danger',
  };
  return dots[status] || dots.submitted;
}

export function getFulfillmentColor(percentage: number): string {
  if (percentage === 0) return 'bg-cult-danger-muted text-cult-danger border-cult-danger';
  if (percentage < 50) return 'bg-cult-warning-muted text-cult-warning border-cult-warning';
  if (percentage < 100) return 'bg-cult-warning-muted text-cult-warning border-cult-warning';
  return 'bg-cult-success-muted text-cult-success border-cult-success';
}

export function getStatusColorMap(_status: string): string {
  // Lane backgrounds stay neutral. Status identity is conveyed via the dot.
  return 'border-cult-border-subtle bg-cult-surface-inset';
}

export function calculateMonthRevenue(orders: Order[], targetMonth: string): { count: number; revenue: number } {
  const currentMonth = new Date().toISOString().substring(0, 7);

  const ordersInMonth = orders.filter(order => {
    const deliveryDate = order.scheduled_delivery_date || order.requested_delivery_date || currentMonth;
    const month = deliveryDate.substring(0, 7);
    return month === targetMonth;
  });

  return {
    count: ordersInMonth.length,
    revenue: ordersInMonth.reduce((sum, order) => sum + (order.total_amount || 0), 0)
  };
}
