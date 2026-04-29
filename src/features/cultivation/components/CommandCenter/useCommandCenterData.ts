// Adapter hook that maps production hooks into the prototype room shape.
// Keeps the new CommandCenter component free of supabase plumbing and
// gives a single place to evolve the data contract per the brief.

import { useMemo, useEffect, useRef } from 'react';
import { useRoomOperationalState } from '../../hooks/useRoomOperationalState';
import { useDailyTasks } from '../../hooks/useDailyTasks';
import { useGenerateTasksFromSchedules } from '../../hooks/useGenerateTasksFromSchedules';
import { CYCLE_DEFAULTS } from '../../constants/cyclePhaseMarkers';
import { getEnvTarget, type EnvTarget } from '../../constants/environmentalTargets';
import { todayIso } from '../../utils/dateUtils';
import type { DailyTaskInstance, TaskStatus } from '../../types';

export type RoomShape = {
  room_id: string;
  code: string;
  type: string;            // flower | veg | clone | mother | mixed
  plants: number;
  strains: string[];
  day: number | null;
  cycleDays: number;
  flipDate: string | null;
  harvestDate: string | null;
  harvestDays: number | null;
  urgency: number;
  empty: boolean;
  envTarget: EnvTarget;
};

export type TaskShape = {
  id: string;
  type: string;            // raw task_type
  status: TaskStatus;
  assignee: string | null;
  time: string | null;
  room_id: string | null;
  raw: DailyTaskInstance;
};

export function useCommandCenterData() {
  const { rooms: opsRooms, loading: roomsLoading } = useRoomOperationalState();
  const today = todayIso();
  const {
    tasks: rawTasks,
    loading: tasksLoading,
    updateStatus,
    completeWithLog,
    assignWorker,
    createTask,
    refetch: refetchTasks,
  } = useDailyTasks(today);

  // Auto-generate today's tasks from active schedules on first mount.
  // Same behavior as legacy: silent, idempotent (existing tasks ignored), one-shot per session.
  const { generate } = useGenerateTasksFromSchedules();
  const hasGeneratedRef = useRef(false);
  useEffect(() => {
    if (hasGeneratedRef.current || roomsLoading || tasksLoading) return;
    hasGeneratedRef.current = true;
    generate(today)
      .then(result => { if (result.created > 0) void refetchTasks(); })
      .catch(() => { /* silent — auto-gen is best-effort */ });
  }, [roomsLoading, tasksLoading, today, generate, refetchTasks]);

  const rooms = useMemo<RoomShape[]>(() => {
    return opsRooms.map(r => {
      const isFlower = r.room_type === 'flower';
      const day = isFlower ? r.days_since_flip : r.days_in_stage;
      const harvestDays = r.section_days_to_harvest ?? r.days_to_harvest;
      const harvestDate = r.section_projected_harvest ?? r.next_harvest_date ?? r.earliest_harvest_date;
      return {
        room_id: r.room_id,
        code: r.room_code,
        type: r.room_type,
        plants: r.total_plants,
        strains: r.strain_names ?? [],
        day,
        cycleDays: CYCLE_DEFAULTS[r.room_type] ?? CYCLE_DEFAULTS.mixed,
        flipDate: r.earliest_flip_date,
        harvestDate,
        harvestDays,
        urgency: r.urgency_score,
        empty: r.occupancy_status === 'empty',
        envTarget: getEnvTarget(r.room_type),
      };
    });
  }, [opsRooms]);

  const tasks = useMemo<TaskShape[]>(() => {
    return rawTasks.map(t => ({
      id: t.id,
      type: t.task_type,
      status: t.status,
      assignee: t.assigned_to,
      time: t.completed_at,
      room_id: t.room_id,
      raw: t,
    }));
  }, [rawTasks]);

  const tasksByRoom = useMemo(() => {
    const map = new Map<string, TaskShape[]>();
    for (const t of tasks) {
      if (!t.room_id) continue;
      const arr = map.get(t.room_id) ?? [];
      arr.push(t);
      map.set(t.room_id, arr);
    }
    return map;
  }, [tasks]);

  const totals = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'completed').length;
    const active = tasks.filter(t => t.status === 'in_progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const unassigned = tasks.filter(t => !t.assignee && t.status !== 'completed' && t.status !== 'skipped').length;
    return { total, done, active, pending, unassigned };
  }, [tasks]);

  return {
    rooms,
    tasks,
    tasksByRoom,
    totals,
    loading: roomsLoading || tasksLoading,
    updateStatus,
    completeWithLog,
    assignWorker,
    createTask,
    refetchTasks,
  };
}
