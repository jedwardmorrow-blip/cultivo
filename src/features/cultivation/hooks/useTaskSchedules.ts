import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RoomTaskSchedule, CreateTaskScheduleInput, UpdateTaskScheduleInput } from '../types';

export function useTaskSchedules(roomId?: string) {
  const [schedules, setSchedules] = useState<RoomTaskSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('room_task_schedules')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (roomId) {
        query = query.eq('room_id', roomId);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setSchedules((data ?? []) as RoomTaskSchedule[]);
    } catch {
      setError('Failed to load task schedules');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createSchedule(input: CreateTaskScheduleInput): Promise<RoomTaskSchedule> {
    const { data, error: err } = await supabase
      .from('room_task_schedules')
      .insert(input)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as RoomTaskSchedule;
  }

  async function updateSchedule(id: string, input: UpdateTaskScheduleInput): Promise<RoomTaskSchedule> {
    const { data, error: err } = await supabase
      .from('room_task_schedules')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as RoomTaskSchedule;
  }

  async function deleteSchedule(id: string): Promise<void> {
    const { error: err } = await supabase
      .from('room_task_schedules')
      .update({ is_active: false })
      .eq('id', id);
    if (err) throw err;
    await load();
  }

  return { schedules, loading, error, refetch: load, createSchedule, updateSchedule, deleteSchedule };
}
