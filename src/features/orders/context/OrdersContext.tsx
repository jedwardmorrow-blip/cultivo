import { createContext, useReducer, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { ordersDataService } from '../services/ordersService';
import { ordersCacheService } from '../services/orders-cache.service';
import { ordersReducer, initialState, type OrdersState, type OrdersAction } from './orders.reducer';
import type { Order, OrderItem, Product } from '../types';

interface OrdersContextValue extends OrdersState {
  dispatch: React.Dispatch<OrdersAction>;
  actions: {
    loadOrders: (force?: boolean) => Promise<void>;
    loadOrderDetails: (orderId: string, force?: boolean) => Promise<void>;
    loadProducts: () => Promise<void>;
    updateOrderStatus: (orderId: string, newStatus: string) => Promise<void>;
    updateItemStatus: (itemId: string, orderId: string, newStatus: string) => Promise<void>;
    updateItemQuantity: (itemId: string, orderId: string, newQuantity: number) => Promise<void>;
    updateItemPrice: (itemId: string, orderId: string, newPrice: number) => Promise<void>;
    updateItemBatch: (itemId: string, orderId: string, batchId: string | null, strain: string | null) => Promise<void>;
    deleteOrderItem: (itemId: string, orderId: string) => Promise<void>;
    deleteOrder: (orderId: string) => Promise<void>;
    addItemToOrder: (orderId: string, productId: string, quantity: number) => Promise<void>;
    updateDeliveryDate: (orderId: string, newDate: string) => Promise<void>;
    toggleMonth: (month: string) => void;
    toggleStatus: (monthStatus: string) => void;
    toggleOrder: (orderId: string) => void;
  };
}

export const OrdersContext = createContext<OrdersContextValue | null>(null);

interface OrdersProviderProps {
  children: ReactNode;
  includeArchived?: boolean;
}

export function OrdersProvider({ children, includeArchived = false }: OrdersProviderProps) {
  const [state, dispatch] = useReducer(ordersReducer, initialState);
  const isMountedRef = useRef(true);
  const loadingRequestsRef = useRef<Set<string>>(new Set());

  const loadOrders = useCallback(async (force = false) => {
    if (!isMountedRef.current) return;

    try {
      if (force || state.orders.length === 0) {
        dispatch({ type: 'SET_ORDERS_LOADING', payload: true });
      }

      const orders = await ordersDataService.fetchOrders(includeArchived);

      if (isMountedRef.current) {
        dispatch({ type: 'SET_ORDERS', payload: orders });
      }
    } catch (error) {
      console.error('[OrdersContext] Error loading orders:', error);
      if (isMountedRef.current) {
        dispatch({ type: 'SET_ORDERS_ERROR', payload: error as Error });
      }
    }
  }, [includeArchived, state.orders.length]);

  const loadOrderDetails = useCallback(async (orderId: string, force = false) => {
    if (!isMountedRef.current) return;

    if (loadingRequestsRef.current.has(orderId)) {
      return;
    }

    const cached = ordersCacheService.get(orderId);
    if (!force && cached) {
      dispatch({
        type: 'SET_ORDER_DETAILS',
        payload: {
          orderId,
          items: cached.items,
          workflowSummary: cached.workflowSummary,
        },
      });
      return;
    }

    loadingRequestsRef.current.add(orderId);
    dispatch({ type: 'SET_ORDER_DETAILS_LOADING', payload: { orderId, loading: true } });

    try {
      const result = await ordersDataService.fetchOrderDetails(orderId);

      if (isMountedRef.current) {
        ordersCacheService.set(orderId, result);

        dispatch({
          type: 'SET_ORDER_DETAILS',
          payload: {
            orderId,
            items: result.items,
            workflowSummary: result.workflowSummary,
          },
        });
      }
    } catch (error) {
      console.error('[OrdersContext] Error loading order details:', error);
      if (isMountedRef.current) {
        dispatch({
          type: 'SET_ORDER_DETAILS_ERROR',
          payload: { orderId, error: error as Error },
        });
      }
    } finally {
      loadingRequestsRef.current.delete(orderId);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    if (!isMountedRef.current || state.products.length > 0) return;

    try {
      dispatch({ type: 'SET_PRODUCTS_LOADING', payload: true });
      const products = await ordersDataService.fetchProducts();

      if (isMountedRef.current) {
        dispatch({ type: 'SET_PRODUCTS', payload: products });
      }
    } catch (error) {
      console.error('[OrdersContext] Error loading products:', error);
      if (isMountedRef.current) {
        dispatch({ type: 'SET_PRODUCTS_ERROR', payload: error as Error });
      }
    }
  }, [state.products.length]);

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
    await ordersDataService.updateOrderStatus(orderId, newStatus);
    ordersCacheService.invalidate(orderId);
    await loadOrders(true);
    await loadOrderDetails(orderId, true);
  }, [loadOrders, loadOrderDetails]);

  const updateItemStatus = useCallback(async (itemId: string, orderId: string, newStatus: string) => {
    await ordersDataService.updateItemStatus(itemId, newStatus);
    ordersCacheService.invalidate(orderId);
    await loadOrderDetails(orderId, true);
  }, [loadOrderDetails]);

  const updateItemQuantity = useCallback(async (itemId: string, orderId: string, newQuantity: number) => {
    await ordersDataService.updateItemQuantity(itemId, newQuantity);
    ordersCacheService.invalidate(orderId);
    await loadOrderDetails(orderId, true);
    await loadOrders(true);
  }, [loadOrderDetails, loadOrders]);

  const updateItemPrice = useCallback(async (itemId: string, orderId: string, newPrice: number) => {
    await ordersDataService.updateItemPrice(itemId, newPrice);
    ordersCacheService.invalidate(orderId);
    await loadOrderDetails(orderId, true);
    await loadOrders(true);
  }, [loadOrderDetails, loadOrders]);

  const updateItemBatch = useCallback(async (itemId: string, orderId: string, batchId: string | null, strain: string | null) => {
    await ordersDataService.updateItemBatch(itemId, batchId, strain);
    ordersCacheService.invalidate(orderId);
    await loadOrderDetails(orderId, true);
  }, [loadOrderDetails]);

  const deleteOrderItem = useCallback(async (itemId: string, orderId: string) => {
    await ordersDataService.deleteOrderItem(itemId);
    ordersCacheService.invalidate(orderId);
    await loadOrderDetails(orderId, true);
    await loadOrders(true);
  }, [loadOrderDetails, loadOrders]);

  const deleteOrder = useCallback(async (orderId: string) => {
    await ordersDataService.deleteOrder(orderId);
    ordersCacheService.invalidate(orderId);
    dispatch({ type: 'INVALIDATE_ORDER_DETAILS', payload: orderId });
    await loadOrders(true);
  }, [loadOrders]);

  const addItemToOrder = useCallback(async (orderId: string, productId: string, quantity: number) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) throw new Error('Product not found');

    await ordersDataService.addItemToOrder(orderId, productId, quantity, product.price_per_unit);
    ordersCacheService.invalidate(orderId);
    await loadOrderDetails(orderId, true);
    await loadOrders(true);
  }, [state.products, loadOrderDetails, loadOrders]);

  const updateDeliveryDate = useCallback(async (orderId: string, newDate: string) => {
    await ordersDataService.updateDeliveryDate(orderId, newDate);
    await loadOrders(true);
  }, [loadOrders]);

  const toggleMonth = useCallback((month: string) => {
    dispatch({ type: 'TOGGLE_MONTH', payload: month });
  }, []);

  const toggleStatus = useCallback((monthStatus: string) => {
    dispatch({ type: 'TOGGLE_STATUS', payload: monthStatus });
  }, []);

  const toggleOrder = useCallback((orderId: string) => {
    dispatch({ type: 'TOGGLE_ORDER', payload: orderId });

    const isExpanding = !state.expansion.expandedOrders.has(orderId);
    if (isExpanding) {
      loadOrderDetails(orderId);
    }
  }, [state.expansion.expandedOrders, loadOrderDetails]);

  useEffect(() => {
    isMountedRef.current = true;
    loadOrders();
    loadProducts();

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth();

    // Expand current month
    dispatch({ type: 'TOGGLE_MONTH', payload: currentMonth });

    // Also expand previous months with historical data (last 3 months)
    for (let i = 1; i <= 3; i++) {
      const date = new Date(currentYear, currentMonthNum - i, 1);
      const month = date.toISOString().slice(0, 7);
      dispatch({ type: 'TOGGLE_MONTH', payload: month });
    }

    // Expand default statuses for current month (including completed)
    const defaultStatuses = [
      `${currentMonth}-submitted`,
      `${currentMonth}-accepted`,
      `${currentMonth}-processing`,
      `${currentMonth}-ready_for_delivery`,
      `${currentMonth}-completed`
    ];
    defaultStatuses.forEach(status => {
      dispatch({ type: 'TOGGLE_STATUS', payload: status });
    });

    // Also expand completed status for previous months (to show historical orders)
    for (let i = 1; i <= 3; i++) {
      const date = new Date(currentYear, currentMonthNum - i, 1);
      const month = date.toISOString().slice(0, 7);
      dispatch({ type: 'TOGGLE_STATUS', payload: `${month}-completed` });
    }

    const ordersChannel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (isMountedRef.current) {
          loadOrders(true);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, (payload) => {
        if (isMountedRef.current) {
          const orderId = (payload.new as any)?.order_id || (payload.old as any)?.order_id;
          if (orderId) {
            ordersCacheService.invalidate(orderId);
            if (state.expansion.expandedOrders.has(orderId)) {
              loadOrderDetails(orderId, true);
            }
          }
          loadOrders(true);
        }
      })
      .subscribe();

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  const value: OrdersContextValue = {
    ...state,
    dispatch,
    actions: {
      loadOrders,
      loadOrderDetails,
      loadProducts,
      updateOrderStatus,
      updateItemStatus,
      updateItemQuantity,
      updateItemPrice,
      updateItemBatch,
      deleteOrderItem,
      deleteOrder,
      addItemToOrder,
      updateDeliveryDate,
      toggleMonth,
      toggleStatus,
      toggleOrder,
    },
  };

  return (
    <OrdersContext.Provider value={value}>
      {children}
    </OrdersContext.Provider>
  );
}
