import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CRMTask, VisitSchedule } from '../types';
import { getOpenTasks, completeTask, snoozeTask, cancelTask } from '../services/tasks.service';
import { getVisits, completeVisit } from '../services/visits.service';

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useSalesQueue() {
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [upcomingVisits, setUpcomingVisits] = useState<VisitSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = formatDateLocal(new Date());
  const weekEnd = formatDateLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksResult, visitsResult] = await Promise.all([
        getOpenTasks(),
        getVisits({ status: 'scheduled', dateFrom: today, dateTo: weekEnd }),
      ]);

      if (tasksResult.data) setTasks(tasksResult.data);
      if (visitsResult.data) setUpcomingVisits(visitsResult.data);
      if (tasksResult.error || visitsResult.error) {
        setError('Some queue data failed to load');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, [today, weekEnd]);

  useEffect(() => {
    fetchData();

    const taskChannel = supabase
      .channel('crm-tasks-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_tasks' }, () => {
        fetchData();
      })
      .subscribe();

    const visitChannel = supabase
      .channel('crm-visits-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_visit_schedule' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(taskChannel);
      supabase.removeChannel(visitChannel);
    };
  }, [fetchData]);

  const overdueTasks = tasks.filter((t) => t.due_date < today);
  const todayTasks = tasks.filter((t) => t.due_date === today);
  const upcomingTasks = tasks.filter((t) => t.due_date > today && t.due_date <= weekEnd);

  const todayVisits = upcomingVisits.filter((v) => v.visit_date === today);
  const weekVisits = upcomingVisits.filter((v) => v.visit_date > today);

  return {
    overdueTasks,
    todayTasks,
    upcomingTasks,
    todayVisits,
    weekVisits,
    allTasks: tasks,
    allVisits: upcomingVisits,
    loading,
    error,
    reload: fetchData,
    actions: {
      completeTask: async (taskId: string) => { await completeTask(taskId); await fetchData(); },
      snoozeTask: async (taskId: string, days: number) => { await snoozeTask(taskId, days); await fetchData(); },
      cancelTask: async (taskId: string) => { await cancelTask(taskId); await fetchData(); },
      completeVisit: async (visitId: string, notes: string) => { await completeVisit(visitId, notes); await fetchData(); },
    },
  };
}
