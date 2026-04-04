import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { doesScheduleFireOnDate } from '../utils/scheduleResolution';
import type { RoomTaskSchedule } from '../types';

export interface GenerateTasksResult {
  created: number;
  skipped: number;
}

export interface ProjectedTaskEntry {
  scheduleId: string;
  roomId: string;
  taskType: string;
  dateStr: string;
  /** Estimated labor hours — from schedule default_config or task-type default */
  estimatedHours: number;
}

/** Default labor-hour estimates for task types without explicit duration config */
const TASK_TYPE_DEFAULT_HOURS: Record<string, number> = {
  harvest: 6,
  defoliation: 3,
  lollipop: 3,
  transplant: 3,
  ipm_spray: 2,
  training: 1.5,
  clone_cutting: 2,
  cleaning: 1.5,
  scouting: 1,
  batch_tank_mix: 1,
  saturation_check: 0.5,
  irrigation_audit: 1,
  maintenance: 1.5,
  concentrate_mix: 1,
  custom: 1,
};

function estimateScheduleHours(schedule: RoomTaskSchedule): number {
  const configDur = (schedule.default_config as Record<string, unknown>)?.estimated_duration;
  if (typeof configDur === 'string' && configDur) {
    const lower = configDur.toLowerCase().trim();
    const minMatch = lower.match(/^([\d.]+)\s*m(?:in)?$/);
    if (minMatch) return parseFloat(minMatch[1]) / 60;
    const hrMatch = lower.match(/^([\d.]+)\s*h/);
    if (hrMatch) return parseFloat(hrMatch[1]);
    const bare = parseFloat(lower.replace(/[^0-9.]/g, ''));
    if (!isNaN(bare)) return bare;
  }
  return TASK_TYPE_DEFAULT_HOURS[schedule.task_type] ?? 1;
}

/** Build room → earliest flip_date map for phase_day schedule resolution */
async function loadFlipDatesByRoom(schedules: RoomTaskSchedule[]): Promise<Map<string, string | null>> {
  const flipDateByRoom = new Map<string, string | null>();
  const phaseRoomIds = [
    ...new Set(schedules.filter((s) => s.scheduling_mode === 'phase_day').map((s) => s.room_id)),
  ];
  if (phaseRoomIds.length === 0) return flipDateByRoom;

  const { data: roomTables } = await supabase
    .from('room_tables')
    .select('id, room_id')
    .in('room_id', phaseRoomIds);

  const tableIds = (roomTables ?? []).map((t) => t.id as string);
  const tableToRoom = new Map((roomTables ?? []).map((t) => [t.id as string, t.room_id as string]));

  if (tableIds.length > 0) {
    const { data: sections } = await supabase
      .from('room_sections')
      .select('room_table_id, flip_date')
      .in('room_table_id', tableIds)
      .not('flip_date', 'is', null);

    for (const sec of sections ?? []) {
      const roomId = tableToRoom.get(sec.room_table_id as string);
      if (!roomId) continue;
      const existing = flipDateByRoom.get(roomId);
      if (!existing || (sec.flip_date as string) < existing) {
        flipDateByRoom.set(roomId, sec.flip_date as string);
      }
    }
  }
  return flipDateByRoom;
}

/**
 * Hook that generates daily_task_instances from active room_task_schedules
 * for a given date. Skips instances that already exist (keyed by schedule_id
 * + task_date). Safe to call repeatedly — idempotent.
 *
 * Also exposes `projectDays` — a read-only projection over a date range
 * that computes which schedules fire without writing to the DB.
 */
export function useGenerateTasksFromSchedules() {
  const [generating, setGenerating] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const [lastResult, setLastResult] = useState<GenerateTasksResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (targetDateStr: string): Promise<GenerateTasksResult> => {
    setGenerating(true);
    setError(null);
    try {
      // 1. Load all active schedules
      const { data: schedules, error: schedErr } = await supabase
        .from('room_task_schedules')
        .select('*')
        .eq('is_active', true);
      if (schedErr) throw schedErr;

      const allSchedules = (schedules ?? []) as RoomTaskSchedule[];
      if (allSchedules.length === 0) {
        const result = { created: 0, skipped: 0 };
        setLastResult(result);
        return result;
      }

      // 2. Build room → earliest flip_date map (needed for phase_day schedules)
      const phaseScheduleRoomIds = [
        ...new Set(
          allSchedules.filter((s) => s.scheduling_mode === 'phase_day').map((s) => s.room_id),
        ),
      ];

      const flipDateByRoom = new Map<string, string | null>();

      if (phaseScheduleRoomIds.length > 0) {
        // room_sections doesn't have room_id directly — must go through room_tables
        const { data: roomTables } = await supabase
          .from('room_tables')
          .select('id, room_id')
          .in('room_id', phaseScheduleRoomIds);

        const tableIds = (roomTables ?? []).map((t) => t.id as string);
        const tableToRoom = new Map(
          (roomTables ?? []).map((t) => [t.id as string, t.room_id as string]),
        );

        if (tableIds.length > 0) {
          const { data: sections } = await supabase
            .from('room_sections')
            .select('room_table_id, flip_date')
            .in('room_table_id', tableIds)
            .not('flip_date', 'is', null);

          for (const sec of sections ?? []) {
            const roomId = tableToRoom.get(sec.room_table_id as string);
            if (!roomId) continue;
            const existing = flipDateByRoom.get(roomId);
            if (!existing || (sec.flip_date as string) < existing) {
              flipDateByRoom.set(roomId, sec.flip_date as string);
            }
          }
        }
      }

      // 3. Determine which schedules fire on the target date
      const firingSchedules = allSchedules.filter((schedule) => {
        const flipDate = flipDateByRoom.get(schedule.room_id) ?? null;
        return doesScheduleFireOnDate(schedule, targetDateStr, flipDate);
      });

      if (firingSchedules.length === 0) {
        const result = { created: 0, skipped: 0 };
        setLastResult(result);
        return result;
      }

      // 4. Find which schedule_ids already have an instance for this date
      const firingIds = firingSchedules.map((s) => s.id);
      const { data: existing } = await supabase
        .from('daily_task_instances')
        .select('schedule_id')
        .eq('task_date', targetDateStr)
        .in('schedule_id', firingIds);

      const existingIds = new Set((existing ?? []).map((t) => t.schedule_id as string));

      // 5. Insert missing instances
      const toCreate = firingSchedules.filter((s) => !existingIds.has(s.id));

      if (toCreate.length > 0) {
        const rows = toCreate.map((schedule) => ({
          room_id: schedule.room_id,
          task_type: schedule.task_type,
          task_date: targetDateStr,
          schedule_id: schedule.id,
          status: 'pending',
          scope: schedule.scope ?? 'single_day',
          notes: schedule.notes ?? null,
          progress_data: {},
          task_config: schedule.default_config ?? {},
        }));

        const { error: insertErr } = await supabase
          .from('daily_task_instances')
          .insert(rows);
        if (insertErr) throw insertErr;
      }

      const result: GenerateTasksResult = {
        created: toCreate.length,
        skipped: firingSchedules.length - toCreate.length,
      };
      setLastResult(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate tasks';
      setError(msg);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  /** Client-side projection — no DB writes. Returns tasks that would fire
   *  across `days` days starting from `startDateStr`. */
  const projectDays = useCallback(async (startDateStr: string, days: number): Promise<ProjectedTaskEntry[]> => {
    setProjecting(true);
    setError(null);
    try {
      const { data: schedules, error: schedErr } = await supabase
        .from('room_task_schedules')
        .select('*')
        .eq('is_active', true);
      if (schedErr) throw schedErr;

      const allSchedules = (schedules ?? []) as RoomTaskSchedule[];
      if (allSchedules.length === 0) return [];

      const flipDateByRoom = await loadFlipDatesByRoom(allSchedules);

      const results: ProjectedTaskEntry[] = [];
      const MS_PER_DAY = 86400000;
      const start = new Date(startDateStr + 'T00:00:00Z');

      for (let i = 0; i < days; i++) {
        const dateStr = new Date(start.getTime() + i * MS_PER_DAY).toISOString().slice(0, 10);
        for (const schedule of allSchedules) {
          const flipDate = flipDateByRoom.get(schedule.room_id) ?? null;
          if (doesScheduleFireOnDate(schedule, dateStr, flipDate)) {
            results.push({
              scheduleId: schedule.id,
              roomId: schedule.room_id,
              taskType: schedule.task_type,
              dateStr,
              estimatedHours: estimateScheduleHours(schedule),
            });
          }
        }
      }
      return results;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to project tasks';
      setError(msg);
      throw err;
    } finally {
      setProjecting(false);
    }
  }, []);

  return { generate, generating, projectDays, projecting, lastResult, error };
}
