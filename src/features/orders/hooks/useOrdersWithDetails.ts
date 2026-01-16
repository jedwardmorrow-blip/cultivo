import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ordersService } from '../services/ordersService';
import type { Order, OrderItem, WorkflowSummary, Allocation } from '../types';

interface OrderDetailsCache {
  items: OrderItem[];
  allocationsMap: Map<string, Allocation[]>;
  workflowSummary: WorkflowSummary | null;
  loadedAt: number;
}

export function useOrdersWithDetails(includeArchived = false) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());

  const detailsCache = useRef<Map<string, OrderDetailsCache>>(new Map());
  const CACHE_TTL = 30000;

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ordersService.fetchOrders(includeArchived);
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  const loadOrderDetails = useCallback(async (orderId: string, force = false) => {
    const cached = detailsCache.current.get(orderId);
    const now = Date.now();

    if (!force && cached && (now - cached.loadedAt) < CACHE_TTL) {
      return cached;
    }

    if (loadingDetails.has(orderId)) {
      return null;
    }

    setLoadingDetails(prev => new Set(prev).add(orderId));

    try {
      const result = await ordersService.fetchOrderDetailsWithAllocations(orderId);
      const cacheEntry: OrderDetailsCache = {
        ...result,
        loadedAt: now
      };

      detailsCache.current.set(orderId, cacheEntry);
      return cacheEntry;
    } catch (err) {
      console.error('Error loading order details:', err);
      return null;
    } finally {
      setLoadingDetails(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }, [loadingDetails]);

  const toggleOrder = useCallback((orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
        loadOrderDetails(orderId);
      }
      return next;
    });
  }, [loadOrderDetails]);

  const invalidateOrderCache = useCallback((orderId: string) => {
    detailsCache.current.delete(orderId);
  }, []);

  const refreshOrderDetails = useCallback((orderId: string) => {
    invalidateOrderCache(orderId);
    return loadOrderDetails(orderId, true);
  }, [loadOrderDetails, invalidateOrderCache]);

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, (payload) => {
        const orderId = (payload.new as any)?.order_id || (payload.old as any)?.order_id;
        if (orderId) {
          invalidateOrderCache(orderId);
        }
        loadOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders, invalidateOrderCache]);

  return {
    orders,
    loading,
    error,
    expandedOrders,
    loadingDetails,
    detailsCache: detailsCache.current,
    toggleOrder,
    loadOrderDetails,
    refreshOrderDetails,
    reload: loadOrders,
  };
}
