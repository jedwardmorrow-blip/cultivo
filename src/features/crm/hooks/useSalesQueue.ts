import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { CRMTask, VisitSchedule } from '../types';
import { getOpenTasks, completeTask, snoozeTask, cancelTask, updateTask } from '../services/tasks.service';
import { getVisits, completeVisit } from '../services/visits.service';

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const priorityOrder: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function sortByPriorityThenDate(a: CRMTask, b: CRMTask): number {
  const pa = priorityOrder[a.priority] ?? 99;
  const pb = priorityOrder[b.priority] ?? 99;
  if (pa !== pb) return pa - pb;
  return a.due_date.localeCompare(b.due_date);
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

  // Categorize tasks with focus_today logic and priority sorting
  const overdueTasks = useMemo(
    () => tasks
      .filter((t) => t.due_date < today && !t.focus_today)
      .sort(sortByPriorityThenDate),
    [tasks, today]
  );

  const todayTasks = useMemo(
    () => tasks
      .filter((t) => t.due_date === today || t.focus_today)
      .sort(sortByPriorityThenDate),
    [tasks, today]
  );

  const upcomingTasks = useMemo(
    () => tasks
      .filter((t) => t.due_date > today && t.due_date <= weekEnd && !t.focus_today)
      .sort(sortByPriorityThenDate),
    [tasks, today, weekEnd]
  );

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
      completeTask: async (taskId: string, completionNotes?: string) => {
        await completeTask(taskId, completionNotes);
        await fetchData();
      },
      snoozeTask: async (taskId: string, days: number) => {
        await snoozeTask(taskId, days);
        await fetchData();
      },
      cancelTask: async (taskId: string) => {
        await cancelTask(taskId);
        await fetchData();
      },
      completeVisit: async (visitId: string, notes: string) => {
        await completeVisit(visitId, notes);
        await fetchData();
      },
      toggleFocusToday: async (taskId: string) => {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;
        await updateTask(taskId, { focus_today: !task.focus_today } as Partial<CRMTask>);
        await fetchData();
      },
      updateTask: async (taskId: string, updates: Partial<CRMTask>) => {
        await updateTask(taskId, updates);
        await fetchData();
      },
    },
  };
}
