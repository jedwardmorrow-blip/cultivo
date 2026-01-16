import { useMemo } from 'react';
import type { Order } from '../types';

export function useFilteredOrders(
  orders: Order[],
  searchTerm: string,
  filterStatus: string
) {
  return useMemo(() => {
    return orders.filter(order => {
      const matchesSearch =
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, filterStatus]);
}
