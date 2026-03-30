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

  async function copySchedulesFromRoom(sourceRoomId: string, targetRoomId: string): Promise<number> {
    const { data: sourceSchedules, error: fetchErr } = await supabase
      .from('room_task_schedules')
      .select('task_type, recurrence, day_of_week, default_config, scope, priority, notes, scheduling_mode, interval_days, phase_day_start, phase_day_end')
      .eq('room_id', sourceRoomId)
      .eq('is_active', true);
    if (fetchErr) throw fetchErr;
    if (!sourceSchedules || sourceSchedules.length === 0) return 0;

    const today = new Date().toISOString().slice(0, 10);
    const rows = sourceSchedules.map((s) => ({
      room_id: targetRoomId,
      task_type: s.task_type,
      recurrence: s.recurrence,
      day_of_week: s.day_of_week,
      default_config: s.default_config ?? {},
      scope: s.scope ?? 'single_day',
      priority: s.priority ?? 'medium',
      notes: s.notes,
      start_date: today,
      is_active: true,
      scheduling_mode: s.scheduling_mode ?? 'calendar',
      interval_days: s.interval_days ?? null,
      phase_day_start: s.phase_day_start ?? null,
      phase_day_end: s.phase_day_end ?? null,
    }));

    const { error: insertErr } = await supabase
      .from('room_task_schedules')
      .insert(rows);
    if (insertErr) throw insertErr;
    await load();
    return rows.length;
  }

  return { schedules, loading, error, refetch: load, createSchedule, updateSchedule, deleteSchedule, copySchedulesFromRoom };
}
