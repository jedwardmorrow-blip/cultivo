import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { VisitSchedule, VisitScheduleInput, CRMCalendarOrder } from '../types';
import { getVisitsForMonth, scheduleVisit, rescheduleVisit, completeVisit, cancelVisit, getOrdersForCRMCalendar } from '../services/visits.service';

export function useVisitCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visits, setVisits] = useState<VisitSchedule[]>([]);
  const [orders, setOrders] = useState<CRMCalendarOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [visitResult, orderResult] = await Promise.all([
        getVisitsForMonth(year, month),
        getOrdersForCRMCalendar(year, month),
      ]);
      if (visitResult.data) setVisits(visitResult.data);
      if (visitResult.error) setError('Failed to load visits');
      setOrders(orderResult.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchData();

    const visitChannel = supabase
      .channel('crm-visits-calendar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_visit_schedule' }, () => {
        fetchData();
      })
      .subscribe();

    const orderChannel = supabase
      .channel('crm-calendar-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(visitChannel);
      supabase.removeChannel(orderChannel);
    };
  }, [fetchData]);

  const navigateMonth = (delta: number) => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const visitsByDate = useMemo(() => {
    return visits.reduce<Record<string, VisitSchedule[]>>((acc, visit) => {
      const dateKey = visit.visit_date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(visit);
      return acc;
    }, {});
  }, [visits]);

  const ordersByDate = useMemo(() => {
    return orders.reduce<Record<string, CRMCalendarOrder[]>>((acc, order) => {
      const dateKey = order.requested_delivery_date;
      if (!dateKey) return acc;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(order);
      return acc;
    }, {});
  }, [orders]);

  const scheduledCount = visits.filter((v) => v.status === 'scheduled').length;
  const completedCount = visits.filter((v) => v.status === 'completed').length;
  const deliveryCount = orders.length;

  return {
    visits,
    visitsByDate,
    orders,
    ordersByDate,
    currentDate,
    year,
    month,
    loading,
    error,
    scheduledCount,
    completedCount,
    deliveryCount,
    navigateMonth,
    reload: fetchData,
    actions: {
      schedule: async (input: VisitScheduleInput) => { await scheduleVisit(input); await fetchData(); },
      reschedule: async (visitId: string, newDate: string) => { await rescheduleVisit(visitId, newDate); await fetchData(); },
      complete: async (visitId: string, notes: string) => { await completeVisit(visitId, notes); await fetchData(); },
      cancel: async (visitId: string) => { await cancelVisit(visitId); await fetchData(); },
    },
  };
}
