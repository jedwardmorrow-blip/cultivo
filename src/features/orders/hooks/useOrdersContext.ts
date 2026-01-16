import { useContext } from 'react';
import { OrdersContext } from '../context/OrdersContext';

export function useOrdersContext() {
  const context = useContext(OrdersContext);

  if (!context) {
    throw new Error('useOrdersContext must be used within OrdersProvider');
  }

  return context;
}

export function useOrderList() {
  const { orders, loading, error } = useOrdersContext();

  return {
    orders,
    loading: loading.orders,
    error: error.orders,
  };
}

export function useOrderDetails(orderId: string) {
  const { orderDetails, workflowSummaries, loading, error, actions } = useOrdersContext();

  return {
    items: orderDetails.get(orderId) || [],
    workflowSummary: workflowSummaries.get(orderId) || null,
    loading: loading.orderDetails.has(orderId),
    error: error.orderDetails.get(orderId) || null,
    refresh: () => actions.loadOrderDetails(orderId, true),
  };
}

export function useOrderExpansion() {
  const { expansion, actions } = useOrdersContext();

  return {
    expandedMonths: expansion.expandedMonths,
    expandedStatuses: expansion.expandedStatuses,
    expandedOrders: expansion.expandedOrders,
    toggleMonth: actions.toggleMonth,
    toggleStatus: actions.toggleStatus,
    toggleOrder: actions.toggleOrder,
  };
}

export function useOrderActions() {
  const { actions, products } = useOrdersContext();

  return {
    ...actions,
    products,
  };
}

export function useProducts() {
  const { products, loading, error } = useOrdersContext();

  return {
    products,
    loading: loading.products,
    error: error.products,
  };
}
