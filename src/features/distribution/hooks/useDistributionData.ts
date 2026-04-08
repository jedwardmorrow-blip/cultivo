import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getEnrichedCalendarOrders,
  updateOrderDeliveryDate,
  type CalendarOrder,
} from '@/features/delivery/services/delivery.service';
import {
  getDispatchQueue,
  computeDocStatus,
  type DispatchOrderRow,
} from '@/features/delivery/services/dispatch.service';
import { getRouteZoneId } from '@/features/delivery/utils';
import type { OrderReadiness } from '../constants';

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useDistributionData() {
  const [allOrders, setAllOrders] = useState<CalendarOrder[]>([]);
  const [dispatchRows, setDispatchRows] = useState<DispatchOrderRow[]>([]);
  const [allocationMap, setAllocationMap] = useState<Map<string, { total: number; allocated: number }>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [ordersResult, dispatchResult] = await Promise.all([
        getEnrichedCalendarOrders(false),
        getDispatchQueue(),
      ]);

      setAllOrders(ordersResult.data);
      setDispatchRows(dispatchResult.data || []);

      // Fetch allocation counts in batch
      const orderIds = ordersResult.data.map((o) => o.id);
      if (orderIds.length > 0) {
        const [itemsRes, assignmentsRes] = await Promise.all([
          supabase
            .from('order_items')
            .select('order_id, id')
            .in('order_id', orderIds),
          supabase
            .from('package_assignments')
            .select('order_id, order_item_id')
            .in('order_id', orderIds)
            .eq('status', 'active'),
        ]);

        const totals = new Map<string, Set<string>>();
        const allocated = new Map<string, Set<string>>();

        (itemsRes.data || []).forEach((item: { order_id: string; id: string }) => {
          if (!totals.has(item.order_id)) totals.set(item.order_id, new Set());
          totals.get(item.order_id)!.add(item.id);
        });

        (assignmentsRes.data || []).forEach((a: { order_id: string; order_item_id: string }) => {
          if (!allocated.has(a.order_id)) allocated.set(a.order_id, new Set());
          allocated.get(a.order_id)!.add(a.order_item_id);
        });

        const map = new Map<string, { total: number; allocated: number }>();
        for (const [orderId, itemSet] of totals) {
          map.set(orderId, {
            total: itemSet.size,
            allocated: allocated.get(orderId)?.size ?? 0,
          });
        }
        setAllocationMap(map);
      }
    } catch (error) {
      console.error('useDistributionData error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel('distribution-orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAll]);

  // ─── Derived data ──────────────────────────────────────────────────────

  const scheduledOrders = useMemo(
    () => allOrders.filter((o) => o.requested_delivery_date),
    [allOrders],
  );

  const unscheduledOrders = useMemo(
    () => allOrders.filter((o) => !o.requested_delivery_date),
    [allOrders],
  );

  const ordersByDate = useMemo(() => {
    const map = new Map<string, CalendarOrder[]>();
    for (const order of scheduledOrders) {
      if (!order.requested_delivery_date) continue;
      const existing = map.get(order.requested_delivery_date) || [];
      existing.push(order);
      map.set(order.requested_delivery_date, existing);
    }
    return map;
  }, [scheduledOrders]);

  // Build dispatch lookup by order_id — only for orders we actually have (filters out delivered/completed)
  const dispatchByOrderId = useMemo(() => {
    const orderIdSet = new Set(allOrders.map((o) => o.id));
    const map = new Map<string, DispatchOrderRow>();
    for (const row of dispatchRows) {
      if (orderIdSet.has(row.order_id)) {
        map.set(row.order_id, row);
      }
    }
    return map;
  }, [dispatchRows, allOrders]);

  // Build readiness per order
  const readinessMap = useMemo(() => {
    const map = new Map<string, OrderReadiness>();
    for (const order of allOrders) {
      const alloc = allocationMap.get(order.id);
      const dispatch = dispatchByOrderId.get(order.id);

      const invoicePill = dispatch
        ? computeDocStatus('invoice', 'Invoice', dispatch.delivery_date, dispatch.invoice_lead_time_hours, dispatch.invoice_send)
        : null;
      const coaPill = dispatch
        ? computeDocStatus('coa', 'COA', dispatch.delivery_date, 24, dispatch.coa_send)
        : null;
      const manifestPill = dispatch
        ? computeDocStatus('manifest', 'Manifest', dispatch.delivery_date, 24, dispatch.manifest_send)
        : null;

      const invoiceSent = invoicePill?.state === 'sent';
      const coaSent = coaPill?.state === 'sent';
      const manifestSent = manifestPill?.state === 'sent';
      const hasOverdueDoc = [invoicePill, coaPill, manifestPill].some((p) => p?.state === 'overdue');

      map.set(order.id, {
        orderId: order.id,
        itemsTotal: alloc?.total ?? order.item_count,
        itemsAllocated: alloc?.allocated ?? 0,
        invoiceSent,
        coaSent,
        manifestSent,
        hasOverdueDoc,
        allDocsSent: invoiceSent && coaSent && manifestSent,
      });
    }
    return map;
  }, [allOrders, allocationMap, dispatchByOrderId]);

  // KPI values
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const shippingToday = useMemo(
    () => (ordersByDate.get(todayStr) || []).length,
    [ordersByDate, todayStr],
  );

  // Only count docs for open orders (not delivered/completed)
  const CLOSED_STATUSES = new Set(['delivered', 'completed']);

  const docsPending = useMemo(
    () => allOrders.filter((o) => {
      if (CLOSED_STATUSES.has(o.status)) return false;
      const r = readinessMap.get(o.id);
      return r && !r.allDocsSent;
    }).length,
    [allOrders, readinessMap],
  );

  const docsOverdue = useMemo(
    () => allOrders.filter((o) => {
      if (CLOSED_STATUSES.has(o.status)) return false;
      const r = readinessMap.get(o.id);
      return r && r.hasOverdueDoc;
    }).length,
    [allOrders, readinessMap],
  );

  const monthRevenue = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return scheduledOrders
      .filter((o) => {
        if (!o.requested_delivery_date) return false;
        const d = new Date(o.requested_delivery_date + 'T00:00:00');
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((sum, o) => sum + o.total_amount, 0);
  }, [scheduledOrders]);

  const todayZones = useMemo(() => {
    const todayOrders = ordersByDate.get(todayStr) || [];
    const zones = new Set<string>();
    todayOrders.forEach((o) => {
      zones.add(getRouteZoneId(o.customer_lat, o.customer_lon));
    });
    return zones;
  }, [ordersByDate, todayStr]);

  // Orders needing doc attention (for filter mode)
  const ordersNeedingDocs = useMemo(
    () => allOrders.filter((o) => {
      const r = readinessMap.get(o.id);
      return r && !r.allDocsSent;
    }),
    [allOrders, readinessMap],
  );

  const ordersWithOverdueDocs = useMemo(
    () => allOrders.filter((o) => {
      const r = readinessMap.get(o.id);
      return r && r.hasOverdueDoc;
    }),
    [allOrders, readinessMap],
  );

  return {
    allOrders,
    scheduledOrders,
    unscheduledOrders,
    ordersByDate,
    readinessMap,
    dispatchByOrderId,
    loading,
    reload: loadAll,
    updateDeliveryDate: updateOrderDeliveryDate,
    // KPIs
    shippingToday,
    docsPending,
    docsOverdue,
    monthRevenue,
    todayZones,
    todayStr,
    unscheduledCount: unscheduledOrders.length,
    // Filtered lists
    ordersNeedingDocs,
    ordersWithOverdueDocs,
  };
}
