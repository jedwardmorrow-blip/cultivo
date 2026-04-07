import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export interface WorkerStats {
  streak: number;
  thisWeekCompleted: number;
  bestDayCount: number;
  bestDayDate: string | null;
  totalCompleted30d: number;
  loading: boolean;
}

const DEFAULTS: WorkerStats = {
  streak: 0,
  thisWeekCompleted: 0,
  bestDayCount: 0,
  bestDayDate: null,
  totalCompleted30d: 0,
  loading: false,
};

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function isWeekday(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

export function useWorkerStats(workerId: string | null): WorkerStats {
  const [rows, setRows] = useState<{ task_date: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workerId) {
      setRows([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    supabase
      .from('daily_task_instances')
      .select('task_date')
      .eq('assigned_to', workerId)
      .eq('status', 'completed')
      .gte('task_date', toISODate(thirtyDaysAgo))
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('useWorkerStats fetch error:', error);
          setRows([]);
        } else {
          setRows(data ?? []);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workerId]);

  const stats = useMemo<Omit<WorkerStats, 'loading'>>(() => {
    if (!rows.length) {
      return {
        streak: 0,
        thisWeekCompleted: 0,
        bestDayCount: 0,
        bestDayDate: null,
        totalCompleted30d: 0,
      };
    }

    // Build a set of dates that have completions and a count map
    const dateSet = new Set<string>();
    const countByDate = new Map<string, number>();
    for (const row of rows) {
      dateSet.add(row.task_date);
      countByDate.set(row.task_date, (countByDate.get(row.task_date) ?? 0) + 1);
    }

    // Streak: walk backwards from today, skipping weekends
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    // If today is a weekend, step back to Friday first
    while (!isWeekday(cursor)) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (true) {
      if (dateSet.has(toISODate(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
        // Skip weekends going backwards
        while (!isWeekday(cursor)) {
          cursor.setDate(cursor.getDate() - 1);
        }
      } else {
        break;
      }
    }

    // This week (Mon-Sun)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monday = getMonday(today);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const mondayStr = toISODate(monday);
    const sundayStr = toISODate(sunday);

    let thisWeekCompleted = 0;
    for (const row of rows) {
      if (row.task_date >= mondayStr && row.task_date <= sundayStr) {
        thisWeekCompleted++;
      }
    }

    // Best day this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = toISODate(monthStart);
    let bestDayCount = 0;
    let bestDayDate: string | null = null;
    for (const [date, count] of countByDate) {
      if (date >= monthStartStr && count > bestDayCount) {
        bestDayCount = count;
        bestDayDate = date;
      }
    }

    return {
      streak,
      thisWeekCompleted,
      bestDayCount,
      bestDayDate,
      totalCompleted30d: rows.length,
    };
  }, [rows]);

  if (!workerId) return DEFAULTS;

  return { ...stats, loading };
}
