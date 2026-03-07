import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DailyTaskInstance, TaskStatus } from '../types';

export function useDailyTasks(taskDate: string) {
  const [tasks, setTasks] = useState<DailyTaskInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('daily_task_instances')
        .select('*')
        .eq('task_date', taskDate)
        .order('created_at', { ascending: true });
      if (err) throw err;
      setTasks((data ?? []) as DailyTaskInstance[]);
    } catch {
      setError('Failed to load daily tasks');
    } finally {
      setLoading(false);
    }
  }, [taskDate]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, status: TaskStatus): Promise<DailyTaskInstance> {
    const updates: Record<string, unknown> = { status };
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    const { data, error: err } = await supabase
      .from('daily_task_instances')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as DailyTaskInstance;
  }

  async function assignWorker(id: string, staffId: string): Promise<DailyTaskInstance> {
    const { data, error: err } = await supabase
      .from('daily_task_instances')
      .update({ assigned_to: staffId })
      .eq('id', id)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as DailyTaskInstance;
  }

  return { tasks, loading, error, refetch: load, updateStatus, assignWorker };
}
