import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RevenuePipelineData {
  target: number;
  delivered: number;
  readyForDelivery: number;
  packaging: number;
  notStarted: number;
  total: number;
  pct: number;
}

export interface DeliveryDayData {
  date: string; // ISO date
  dayLabel: string; // "Mon", "Tue", etc.
  dateLabel: string; // "Mar 25"
  isToday: boolean;
  isPast: boolean;
  orders: DeliveryOrderSummary[];
  totalRevenue: number;
  routeCount: number; // distinct customers = proxy for delivery routes
}

export interface DeliveryOrderSummary {
  orderId: string;
  orderNumber: string;
  customerName: string;
  status: string;
  revenue: number;
  itemCount: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWeekDates(): string[] {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);

  const dates: string[] = [];
  for (let i = 0; i < 5; i++) { // Mon-Fri
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useRevenuePipeline(weeklyTarget = 45000) {
  const [orderData, setOrderData] = useState<DeliveryOrderSummary[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const weekDates = useMemo(() => getWeekDates(), []);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch all orders with delivery dates this week (including completed ones)
    const { data: rows, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        requested_delivery_date,
        scheduled_delivery_date,
        customer:customers!orders_customer_id_fkey(name),
        order_items(quantity, unit_price)
      `)
      .eq('archived', false)
      .eq('test_mode', false)
      .neq('status', 'cancelled')
      .or(`scheduled_delivery_date.gte.${weekStart},requested_delivery_date.gte.${weekStart}`)
      .or(`scheduled_delivery_date.lte.${weekEnd},requested_delivery_date.lte.${weekEnd}`);

    if (error || !rows) {
      console.error('Revenue pipeline fetch error:', error);
      setOrderData([]);
      setLoading(false);
      return;
    }

    const statusMap = new Map<string, string>();
    const summaries: (DeliveryOrderSummary & { deliveryDate: string })[] = [];

    rows.forEach((row: any) => {
      const effectiveDate = row.scheduled_delivery_date || row.requested_delivery_date;
      if (!effectiveDate) return;

      // Only include orders whose effective delivery date is within this week
      if (effectiveDate < weekStart || effectiveDate > weekEnd) return;

      const revenue = (row.order_items || []).reduce(
        (sum: number, oi: { quantity: number; unit_price: number }) =>
          sum + (oi.quantity * oi.unit_price),
        0
      );

      const customerName = row.customer?.name || 'Unknown';
      statusMap.set(row.id, row.status);

      summaries.push({
        orderId: row.id,
        orderNumber: row.order_number,
        customerName,
        status: row.status,
        revenue,
        itemCount: (row.order_items || []).length,
        deliveryDate: effectiveDate,
      });
    });

    setOrderData(summaries);
    setOrderStatuses(statusMap);
    setLoading(false);
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('revenue_pipeline_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'package_assignments' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // ─── Revenue Pipeline Segments ──────────────────────────────────────────

  const pipeline: RevenuePipelineData = useMemo(() => {
    let delivered = 0;
    let readyForDelivery = 0;
    let packaging = 0;
    let notStarted = 0;

    orderData.forEach(o => {
      const status = orderStatuses.get(o.orderId) || o.status;
      switch (status) {
        case 'delivered':
        case 'completed':
          delivered += o.revenue;
          break;
        case 'ready_for_delivery':
          readyForDelivery += o.revenue;
          break;
        case 'processing':
          packaging += o.revenue;
          break;
        default: // submitted, draft, confirmed
          notStarted += o.revenue;
          break;
      }
    });

    const total = delivered + readyForDelivery + packaging + notStarted;
    return {
      target: weeklyTarget,
      delivered,
      readyForDelivery,
      packaging,
      notStarted,
      total,
      pct: weeklyTarget > 0 ? Math.round((total / weeklyTarget) * 100) : 0,
    };
  }, [orderData, orderStatuses, weeklyTarget]);

  // ─── Delivery Load by Day ───────────────────────────────────────────────

  const deliveryDays: DeliveryDayData[] = useMemo(() => {
    const today = todayIso();

    // Group orders by delivery date
    const byDate = new Map<string, DeliveryOrderSummary[]>();
    orderData.forEach(o => {
      const date = (o as any).deliveryDate;
      if (!date) return;
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(o);
    });

    return weekDates.map((date, i) => {
      const orders = byDate.get(date) || [];
      const totalRevenue = orders.reduce((s, o) => s + o.revenue, 0);
      const uniqueCustomers = new Set(orders.map(o => o.customerName));

      const d = new Date(date + 'T12:00:00');
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      return {
        date,
        dayLabel: DAY_LABELS[i],
        dateLabel,
        isToday: date === today,
        isPast: date < today,
        orders,
        totalRevenue,
        routeCount: uniqueCustomers.size,
      };
    });
  }, [orderData, weekDates]);

  return {
    pipeline,
    deliveryDays,
    loading,
    refresh: fetchData,
  };
}
