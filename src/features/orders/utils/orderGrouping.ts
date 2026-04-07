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

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    submitted: 'bg-blue-900/30 text-blue-400 border-blue-600',
    accepted: 'bg-cyan-900/30 text-cyan-400 border-cyan-600',
    processing: 'bg-yellow-900/30 text-yellow-400 border-yellow-600',
    ready_for_delivery: 'bg-green-900/30 text-green-400 border-green-600',
    completed: 'bg-emerald-900/30 text-emerald-400 border-emerald-600',
    delivered: 'bg-teal-900/30 text-teal-400 border-teal-600',
    cancelled: 'bg-red-900/30 text-red-400 border-red-600',
  };
  return colors[status] || colors.submitted;
}

export function getFulfillmentColor(percentage: number): string {
  if (percentage === 0) return 'bg-cult-danger-muted text-cult-danger border-cult-danger';
  if (percentage < 50) return 'bg-cult-warning-muted text-cult-warning border-cult-warning';
  if (percentage < 100) return 'bg-cult-warning-muted text-cult-warning border-cult-warning';
  return 'bg-cult-success-muted text-cult-success border-cult-success';
}

export function getStatusColorMap(status: string): string {
  const statusColorMap: Record<string, string> = {
    submitted: 'border-blue-600 bg-blue-900/10',
    accepted: 'border-cyan-600 bg-cyan-900/10',
    processing: 'border-yellow-600 bg-yellow-900/10',
    ready_for_delivery: 'border-green-600 bg-green-900/10',
    completed: 'border-emerald-600 bg-emerald-900/10',
    delivered: 'border-teal-600 bg-teal-900/10',
    cancelled: 'border-red-600 bg-red-900/10'
  };
  return statusColorMap[status] || 'border-cult-medium-gray bg-cult-dark-gray';
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
