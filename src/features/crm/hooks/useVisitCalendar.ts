import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { VisitSchedule, VisitScheduleInput } from '../types';
import { getVisitsForMonth, scheduleVisit, rescheduleVisit, completeVisit, cancelVisit } from '../services/visits.service';

export function useVisitCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visits, setVisits] = useState<VisitSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchVisits = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getVisitsForMonth(year, month);
      if (result.data) setVisits(result.data);
      if (result.error) setError('Failed to load visits');
    } catch (err: any) {
      setError(err.message || 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchVisits();

    const channel = supabase
      .channel('crm-visits-calendar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_visit_schedule' }, () => {
        fetchVisits();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchVisits]);

  const navigateMonth = (delta: number) => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const visitsByDate = visits.reduce<Record<string, VisitSchedule[]>>((acc, visit) => {
    const dateKey = visit.visit_date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(visit);
    return acc;
  }, {});

  const scheduledCount = visits.filter((v) => v.status === 'scheduled').length;
  const completedCount = visits.filter((v) => v.status === 'completed').length;

  return {
    visits,
    visitsByDate,
    currentDate,
    year,
    month,
    loading,
    error,
    scheduledCount,
    completedCount,
    navigateMonth,
    reload: fetchVisits,
    actions: {
      schedule: async (input: VisitScheduleInput) => { await scheduleVisit(input); await fetchVisits(); },
      reschedule: async (visitId: string, newDate: string) => { await rescheduleVisit(visitId, newDate); await fetchVisits(); },
      complete: async (visitId: string, notes: string) => { await completeVisit(visitId, notes); await fetchVisits(); },
      cancel: async (visitId: string) => { await cancelVisit(visitId); await fetchVisits(); },
    },
  };
}
