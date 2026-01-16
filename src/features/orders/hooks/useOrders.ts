import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ordersService } from '../services/ordersService';
import type { Order, OrderItem, Product, FulfillmentChecklist, Allocation, WorkflowSummary } from '../types';

const LOADING_TIMEOUT_MS = 30000;

export function useOrders(includeArchived: boolean = false) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadOrders = useCallback(async (preserveState = false) => {
    if (!isMountedRef.current) return;

    try {
      if (!preserveState) {
        setLoading(true);
        setError(null);
      }

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      loadingTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          console.warn('[useOrders] Loading timeout exceeded');
          setLoading(false);
          setError(new Error('Loading orders took too long. Please refresh the page.'));
        }
      }, LOADING_TIMEOUT_MS);

      const data = await ordersService.fetchOrders(includeArchived);

      if (!isMountedRef.current) return;

      setOrders(data);
      setError(null);
    } catch (err) {
      console.error('[useOrders] Error loading orders:', err);
      if (isMountedRef.current) {
        setError(err as Error);
        setOrders([]);
      }
    } finally {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [includeArchived]);

  const debouncedLoadOrders = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      loadOrders(true);
    }, 500);
  }, [loadOrders]);

  useEffect(() => {
    isMountedRef.current = true;
    loadOrders(false);

    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (isMountedRef.current) {
          debouncedLoadOrders();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        if (isMountedRef.current) {
          debouncedLoadOrders();
        }
      })
      .subscribe();

    return () => {
      isMountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [loadOrders, debouncedLoadOrders]);

  return { orders, loading, error, reload: loadOrders };
}

export function useOrderDetails(orderId: string | null) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [checklists, setChecklists] = useState<FulfillmentChecklist[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [workflowSummary, setWorkflowSummary] = useState<WorkflowSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadDetails = async (force = false) => {
    if (!orderId) return;
    if (!force && orderItems.length > 0) return;

    try {
      setLoading(true);
      const data = await ordersService.fetchOrderDetails(orderId);
      setOrderItems(data.items);
      setChecklists(data.checklists);
      setAllocations(data.allocations);
      setWorkflowSummary(data.workflowSummary);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading order details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      loadDetails();
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-details-${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => loadDetails(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_fulfillment_checklist' }, () => loadDetails(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_item_allocations' }, () => loadDetails(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return {
    orderItems,
    checklists,
    allocations,
    workflowSummary,
    loading,
    error,
    reload: () => loadDetails(true)
  };
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await ordersService.fetchProducts();
        setProducts(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Error loading products:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  return { products, loading, error };
}
