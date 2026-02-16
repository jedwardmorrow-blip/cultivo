import { useMemo } from 'react';
import { hasAttentionFlags } from '../utils/orderAttention';
import type { Order } from '../types';
import type { OrderFilterState } from '../components/OrderFilterBar';

export function useAdvancedFilteredOrders(
  orders: Order[],
  filters: OrderFilterState,
) {
  return useMemo(() => {
    return orders.filter(order => {
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const matchesSearch =
          (order.order_number || '').toLowerCase().includes(term) ||
          (order.customer_name || '').toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      if (filters.status === 'attention') {
        if (!hasAttentionFlags(order)) return false;
      } else if (filters.status && filters.status !== 'all') {
        if (order.status !== filters.status) return false;
      }

      if (filters.customerName) {
        if (order.customer_name !== filters.customerName) return false;
      }

      if (filters.priority) {
        if ((order.priority || 'normal') !== filters.priority) return false;
      }

      if (filters.dateFrom || filters.dateTo) {
        const deliveryDate = order.scheduled_delivery_date || order.requested_delivery_date;
        if (!deliveryDate) return false;
        const dateStr = deliveryDate.substring(0, 10);
        if (filters.dateFrom && dateStr < filters.dateFrom) return false;
        if (filters.dateTo && dateStr > filters.dateTo) return false;
      }

      return true;
    });
  }, [orders, filters]);
}
