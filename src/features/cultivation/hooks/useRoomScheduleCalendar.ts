import { useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { todayIso } from '../utils/dateUtils';
import { doesScheduleFireOnDate } from '../utils/scheduleResolution';
import { useTaskSchedules } from './useTaskSchedules';
import type { RoomTaskSchedule, TaskType } from '../types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const CYCLE_DAYS: Record<string, number> = {
  flower: 63,
  veg: 42,
  clone: 21,
  mother: 42,
  mixed: 42,
};

export interface CalendarMilestone {
  scheduleId: string;
  taskType: string;
  phaseDay: number;
  realDate: string;
  status: 'past' | 'today' | 'future';
}

export interface UseRoomScheduleCalendarReturn {
  schedules: RoomTaskSchedule[];
  milestones: CalendarMilestone[];
  totalCycleDays: number;
  currentPhaseDay: number | null;
  currentWeek: number;
  totalWeeks: number;
  getTasksForDate: (dateStr: string) => Array<{ scheduleId: string; taskType: string; fromSchedule: boolean }>;
  rescheduleTask: (taskId: string, newDate: string) => Promise<void>;
  addMilestone: (taskType: TaskType, phaseDay: number) => Promise<void>;
  removeMilestone: (scheduleId: string) => Promise<void>;
  loading: boolean;
}

export function useRoomScheduleCalendar(
  roomId: string | undefined,
  flipDate: string | null,
  roomType: string,
): UseRoomScheduleCalendarReturn {
  const { schedules, loading, refetch } = useTaskSchedules(roomId);

  const totalCycleDays = CYCLE_DAYS[roomType] ?? 42;

  const currentPhaseDay = useMemo(() => {
    if (!flipDate) return null;
    const today = new Date(todayIso() + 'T00:00:00Z');
    const flip = new Date(flipDate + 'T00:00:00Z');
    return Math.floor((today.getTime() - flip.getTime()) / MS_PER_DAY) + 1;
  }, [flipDate]);

  const currentWeek = Math.ceil((currentPhaseDay ?? 1) / 7);
  const totalWeeks = Math.ceil(totalCycleDays / 7);

  const milestones = useMemo<CalendarMilestone[]>(() => {
    if (!flipDate) return [];
    const today = todayIso();
    return schedules
      .filter((s) => s.scheduling_mode === 'phase_day')
      .map((s) => {
        const phaseDay = s.phase_day_start ?? 1;
        const flipMs = new Date(flipDate + 'T00:00:00Z').getTime();
        const realDate = new Date(flipMs + (phaseDay - 1) * MS_PER_DAY)
          .toISOString()
          .slice(0, 10);
        let status: CalendarMilestone['status'];
        if (realDate < today) status = 'past';
        else if (realDate === today) status = 'today';
        else status = 'future';
        return {
          scheduleId: s.id,
          taskType: s.task_type,
          phaseDay,
          realDate,
          status,
        };
      });
  }, [schedules, flipDate]);

  const getTasksForDate = useCallback(
    (dateStr: string) => {
      return schedules
        .filter((s) => doesScheduleFireOnDate(s, dateStr, flipDate))
        .map((s) => ({
          scheduleId: s.id,
          taskType: s.task_type,
          fromSchedule: true,
        }));
    },
    [schedules, flipDate],
  );

  const rescheduleTask = useCallback(async (taskId: string, newDate: string) => {
    await supabase
      .from('daily_task_instances')
      .update({ task_date: newDate })
      .eq('id', taskId);
  }, []);

  const addMilestone = useCallback(
    async (taskType: TaskType, phaseDay: number) => {
      if (!roomId) return;
      const today = todayIso();
      await supabase.from('room_task_schedules').insert({
        room_id: roomId,
        task_type: taskType,
        recurrence: 'daily',
        scheduling_mode: 'phase_day' as const,
        phase_day_start: phaseDay,
        phase_day_end: phaseDay,
        interval_days: 1,
        start_date: today,
        is_active: true,
        scope: 'full_room',
        priority: 'medium',
        default_config: {},
      });
      await refetch();
    },
    [roomId, refetch],
  );

  const removeMilestone = useCallback(
    async (scheduleId: string) => {
      await supabase
        .from('room_task_schedules')
        .update({ is_active: false })
        .eq('id', scheduleId);
      await refetch();
    },
    [refetch],
  );

  return {
    schedules,
    milestones,
    totalCycleDays,
    currentPhaseDay,
    currentWeek,
    totalWeeks,
    getTasksForDate,
    rescheduleTask,
    addMilestone,
    removeMilestone,
    loading,
  };
}
