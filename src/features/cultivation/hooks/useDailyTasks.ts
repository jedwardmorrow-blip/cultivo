import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useTableSubscription } from '@/shared/hooks/useTableSubscription';
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

  // Live updates — refetch when any task row changes (debounced 500ms)
  useTableSubscription('daily_task_instances', load);

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

  async function completeWithLog(
    id: string,
    refTable: string,
    refId: string,
    durationEstimate?: string,
  ): Promise<DailyTaskInstance> {
    const { data, error: err } = await supabase
      .from('daily_task_instances')
      .update({
        status: 'completed' as TaskStatus,
        completed_at: new Date().toISOString(),
        completion_ref_table: refTable,
        completion_ref_id: refId,
        estimated_duration: durationEstimate ?? null,
      })
      .eq('id', id)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as DailyTaskInstance;
  }

  async function createTask(input: {
    room_id: string;
    task_type: string;
    task_date: string;
    assigned_to?: string | null;
    notes?: string | null;
  }): Promise<DailyTaskInstance> {
    const { data, error: err } = await supabase
      .from('daily_task_instances')
      .insert({
        room_id: input.room_id,
        task_type: input.task_type,
        task_date: input.task_date,
        assigned_to: input.assigned_to || null,
        notes: input.notes || null,
        status: 'pending' as TaskStatus,
        scope: 'single_day',
        progress_data: {},
        task_config: {},
      })
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as DailyTaskInstance;
  }

  return { tasks, loading, error, refetch: load, updateStatus, assignWorker, completeWithLog, createTask };
}
