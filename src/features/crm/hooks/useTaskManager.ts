import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CRMTask, CRMTaskInput } from '../types';
import { getTasks, createTask, completeTask, snoozeTask, cancelTask, updateTask } from '../services/tasks.service';

export function useTaskManager(filters?: {
  status?: string;
  customerId?: string;
  priority?: string;
}) {
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getTasks(filters);
      if (result.data) setTasks(result.data);
      if (result.error) setError('Failed to load tasks');
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.customerId, filters?.priority]);

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel('crm-tasks-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    reload: fetchTasks,
    actions: {
      create: async (input: CRMTaskInput) => { await createTask(input); await fetchTasks(); },
      complete: async (taskId: string) => { await completeTask(taskId); await fetchTasks(); },
      snooze: async (taskId: string, days: number) => { await snoozeTask(taskId, days); await fetchTasks(); },
      cancel: async (taskId: string) => { await cancelTask(taskId); await fetchTasks(); },
      update: async (taskId: string, updates: Partial<CRMTask>) => { await updateTask(taskId, updates); await fetchTasks(); },
    },
  };
}
