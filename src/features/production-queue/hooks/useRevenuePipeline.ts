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

export interface WeekOutlook {
  weekOffset: number; // 0 = this week, 1 = next, 2 = week after
  label: string; // "This Week", "Next Week", "Apr 7–11"
  dateRange: string; // "Mar 24 – 28"
  totalRevenue: number;
  orderCount: number;
  routeCount: number;
  pctOfTarget: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWeekDatesForOffset(weekOffset: number): string[] {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + mondayOffset + weekOffset * 7
  );

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

function formatWeekLabel(weekOffset: number, dates: string[]): string {
  if (weekOffset === 0) return 'This Week';
  if (weekOffset === 1) return 'Next Week';
  const d = new Date(dates[0] + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' week';
}

function formatDateRange(dates: string[]): string {
  const start = new Date(dates[0] + 'T12:00:00');
  const end = new Date(dates[dates.length - 1] + 'T12:00:00');
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useRevenuePipeline(weeklyTarget = 45000) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [allOrderData, setAllOrderData] = useState<(DeliveryOrderSummary & { deliveryDate: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Compute date ranges for this week + 2 future weeks (for outlook)
  const allWeeks = useMemo(() => {
    return [0, 1, 2].map(offset => {
      const dates = getWeekDatesForOffset(offset);
      return {
        offset,
        dates,
        start: dates[0],
        end: dates[dates.length - 1],
        label: formatWeekLabel(offset, dates),
        dateRange: formatDateRange(dates),
      };
    });
  }, []);

  // The selected week
  const selectedWeek = allWeeks[weekOffset] || allWeeks[0];

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch orders spanning all 3 weeks in one query
    const globalStart = allWeeks[0].start;
    const globalEnd = allWeeks[allWeeks.length - 1].end;

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
      .or(`scheduled_delivery_date.gte.${globalStart},requested_delivery_date.gte.${globalStart}`)
      .or(`scheduled_delivery_date.lte.${globalEnd},requested_delivery_date.lte.${globalEnd}`);

    if (error || !rows) {
      console.error('Revenue pipeline fetch error:', error);
      setAllOrderData([]);
      setLoading(false);
      return;
    }

    const summaries: (DeliveryOrderSummary & { deliveryDate: string })[] = [];

    rows.forEach((row: any) => {
      const effectiveDate = row.scheduled_delivery_date || row.requested_delivery_date;
      if (!effectiveDate) return;

      // Only include orders within our 3-week window
      if (effectiveDate < globalStart || effectiveDate > globalEnd) return;

      const revenue = (row.order_items || []).reduce(
        (sum: number, oi: { quantity: number; unit_price: number }) =>
          sum + (oi.quantity * oi.unit_price),
        0
      );

      const customerName = row.customer?.name || 'Unknown';

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

    setAllOrderData(summaries);
    setLoading(false);
  }, [allWeeks]);

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

  // ─── Filter order data for the selected week ──────────────────────────

  const weekOrderData = useMemo(() => {
    return allOrderData.filter(
      o => o.deliveryDate >= selectedWeek.start && o.deliveryDate <= selectedWeek.end
    );
  }, [allOrderData, selectedWeek]);

  // ─── Revenue Pipeline Segments (for selected week) ────────────────────

  const pipeline: RevenuePipelineData = useMemo(() => {
    let delivered = 0;
    let readyForDelivery = 0;
    let packaging = 0;
    let notStarted = 0;

    weekOrderData.forEach(o => {
      switch (o.status) {
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
  }, [weekOrderData, weeklyTarget]);

  // ─── Delivery Load by Day (for selected week) ────────────────────────

  const deliveryDays: DeliveryDayData[] = useMemo(() => {
    const today = todayIso();
    const weekDates = selectedWeek.dates;

    const byDate = new Map<string, DeliveryOrderSummary[]>();
    weekOrderData.forEach(o => {
      if (!byDate.has(o.deliveryDate)) byDate.set(o.deliveryDate, []);
      byDate.get(o.deliveryDate)!.push(o);
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
  }, [weekOrderData, selectedWeek]);

  // ─── Week Outlook (all 3 weeks at a glance) ──────────────────────────

  const weekOutlook: WeekOutlook[] = useMemo(() => {
    return allWeeks.map(week => {
      const orders = allOrderData.filter(
        o => o.deliveryDate >= week.start && o.deliveryDate <= week.end
      );
      const totalRevenue = orders.reduce((s, o) => s + o.revenue, 0);
      const uniqueOrders = new Set(orders.map(o => o.orderId));
      const uniqueCustomers = new Set(orders.map(o => o.customerName));

      return {
        weekOffset: week.offset,
        label: week.label,
        dateRange: week.dateRange,
        totalRevenue,
        orderCount: uniqueOrders.size,
        routeCount: uniqueCustomers.size,
        pctOfTarget: weeklyTarget > 0 ? Math.round((totalRevenue / weeklyTarget) * 100) : 0,
      };
    });
  }, [allOrderData, allWeeks, weeklyTarget]);

  return {
    pipeline,
    deliveryDays,
    weekOutlook,
    weekOffset,
    setWeekOffset,
    selectedWeekLabel: selectedWeek.label,
    selectedWeekRange: selectedWeek.dateRange,
    loading,
    refresh: fetchData,
  };
}
