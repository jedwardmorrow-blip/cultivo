import { TASK_TYPE_CONFIG } from '../types';
import type { TaskType, RoomTaskSchedule } from '../types';
import type { RoomType } from '../types';

// ── Shared domain type ───────────────────────────────────────────────────────

export interface RoomCalendarRoom {
  id: string;
  room_code: string;
  room_type: RoomType;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const ROOM_TYPE_ORDER: Record<string, number> = { mother: 0, clone: 1, veg: 2, flower: 3, mixed: 4 };

export const TASK_TYPES = Object.keys(TASK_TYPE_CONFIG) as TaskType[];
export const RECURRENCE_OPTIONS = ['daily', 'weekly', 'biweekly', 'monthly'] as const;
export const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Utility functions ─────────────────────────────────────────────────────────

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function doesScheduleOccur(schedule: RoomTaskSchedule, date: Date, phaseDay?: number): boolean {
  const start = new Date(schedule.start_date + 'T00:00:00');
  if (date < start) return false;
  if (schedule.end_date) {
    const end = new Date(schedule.end_date + 'T00:00:00');
    if (date > end) return false;
  }

  // Phase-day mode: check against the current batch's phase day
  if (schedule.scheduling_mode === 'phase_day') {
    if (phaseDay == null) return false; // no active batch in room, can't generate
    if (schedule.phase_day_start != null && phaseDay < schedule.phase_day_start) return false;
    if (schedule.phase_day_end != null && phaseDay > schedule.phase_day_end) return false;
    // Single-day event (start === end)
    if (schedule.phase_day_start != null && schedule.phase_day_end != null && schedule.phase_day_start === schedule.phase_day_end) {
      return phaseDay === schedule.phase_day_start;
    }
    // Interval-based: every N days within the phase-day range
    if (schedule.interval_days) {
      const offset = phaseDay - (schedule.phase_day_start ?? 1);
      return offset >= 0 && offset % schedule.interval_days === 0;
    }
    // Daily within phase-day range (no interval specified)
    return true;
  }

  // Calendar mode (existing behavior)
  const dayOfWeek = date.getDay();
  const diffDays = Math.floor((date.getTime() - start.getTime()) / 86400000);

  // Support interval_days in calendar mode too (e.g., "every 3 days")
  if (schedule.interval_days && schedule.recurrence === 'daily') {
    return diffDays % schedule.interval_days === 0;
  }

  switch (schedule.recurrence) {
    case 'daily':
      return true;
    case 'weekly':
      return schedule.day_of_week ? schedule.day_of_week.includes(dayOfWeek) : diffDays % 7 === 0;
    case 'biweekly':
      return schedule.day_of_week ? schedule.day_of_week.includes(dayOfWeek) && Math.floor(diffDays / 7) % 2 === 0 : diffDays % 14 === 0;
    case 'monthly':
      return date.getDate() === start.getDate();
    default:
      return false;
  }
}

export function formatScheduleFrequency(schedule: RoomTaskSchedule): string {
  if (schedule.scheduling_mode === 'phase_day') {
    const start = schedule.phase_day_start ?? 1;
    const end = schedule.phase_day_end;
    if (start === end) return `Day ${start} only`;
    if (schedule.interval_days) {
      const range = end ? `days ${start}–${end}` : `day ${start}+`;
      return `Every ${schedule.interval_days}d, ${range}`;
    }
    return end ? `Daily, days ${start}–${end}` : `Daily from day ${start}`;
  }
  // Calendar mode
  if (schedule.interval_days && schedule.recurrence === 'daily') {
    return `Every ${schedule.interval_days} days`;
  }
  if (schedule.recurrence === 'daily') return 'Every day';
  if (schedule.day_of_week && schedule.day_of_week.length > 0) {
    const dayLetters = schedule.day_of_week.map((d) => DAY_NAMES[d]?.slice(0, 2)).join(', ');
    return schedule.recurrence === 'biweekly' ? `${dayLetters} (biweekly)` : dayLetters;
  }
  if (schedule.recurrence === 'weekly') return 'Weekly';
  if (schedule.recurrence === 'biweekly') return 'Biweekly';
  if (schedule.recurrence === 'monthly') return 'Monthly';
  return schedule.recurrence;
}
