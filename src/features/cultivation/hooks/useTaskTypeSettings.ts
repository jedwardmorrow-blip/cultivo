import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface TaskTypeSetting {
  id: string;
  task_key: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  fields: string[];
  is_enabled: boolean;
  sort_order: number;
  is_builtin: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskTypeInput {
  task_key: string;
  label: string;
  description?: string;
  color?: string;
  icon?: string;
  fields?: string[];
  sort_order?: number;
}

export interface UpdateTaskTypeInput {
  label?: string;
  description?: string;
  color?: string;
  icon?: string;
  fields?: string[];
  is_enabled?: boolean;
  sort_order?: number;
}

export function useTaskTypeSettings() {
  const [settings, setSettings] = useState<TaskTypeSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('task_type_settings')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[useTaskTypeSettings] fetch error:', error.message);
      return;
    }
    setSettings((data ?? []) as TaskTypeSetting[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const createTaskType = useCallback(async (input: CreateTaskTypeInput) => {
    const maxOrder = settings.reduce((max, s) => Math.max(max, s.sort_order), 0);
    const { error } = await supabase
      .from('task_type_settings')
      .insert({
        task_key: input.task_key,
        label: input.label,
        description: input.description ?? '',
        color: input.color ?? '#A6A6A6',
        icon: input.icon ?? 'Wrench',
        fields: input.fields ?? [],
        sort_order: input.sort_order ?? maxOrder + 10,
        is_builtin: false,
      });
    if (error) {
      console.error('[useTaskTypeSettings] create error:', error.message);
      throw error;
    }
    await fetch();
  }, [fetch, settings]);

  const updateTaskType = useCallback(async (id: string, input: UpdateTaskTypeInput) => {
    const { error } = await supabase
      .from('task_type_settings')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('[useTaskTypeSettings] update error:', error.message);
      throw error;
    }
    await fetch();
  }, [fetch]);

  const deleteTaskType = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('task_type_settings')
      .delete()
      .eq('id', id)
      .eq('is_builtin', false); // only allow deleting user-created types
    if (error) {
      console.error('[useTaskTypeSettings] delete error:', error.message);
      throw error;
    }
    await fetch();
  }, [fetch]);

  return { settings, loading, refetch: fetch, createTaskType, updateTaskType, deleteTaskType };
}
