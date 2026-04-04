import type { RoomTaskSchedule } from '../types';

/**
 * Returns true if the given schedule should fire on the target date.
 * Used by useGenerateTasksFromSchedules to determine which schedules
 * produce a daily_task_instances row for a given day.
 *
 * @param schedule  Active room_task_schedules row
 * @param targetDateStr  ISO date (YYYY-MM-DD)
 * @param roomFlipDate  Earliest flip_date for the room — required for phase_day mode
 */
export function doesScheduleFireOnDate(
  schedule: RoomTaskSchedule,
  targetDateStr: string,
  roomFlipDate?: string | null,
): boolean {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  // Normalize to midnight UTC to avoid DST edge cases
  const target = new Date(targetDateStr + 'T00:00:00Z');
  const startDate = new Date(schedule.start_date + 'T00:00:00Z');

  if (target < startDate) return false;
  if (schedule.end_date) {
    const endDate = new Date(schedule.end_date + 'T00:00:00Z');
    if (target > endDate) return false;
  }

  if (schedule.scheduling_mode === 'phase_day') {
    if (!roomFlipDate) return false;
    const flipDate = new Date(roomFlipDate + 'T00:00:00Z');
    if (target < flipDate) return false;

    // Phase day is 1-based: flip day is day 1
    const phaseDay = Math.round((target.getTime() - flipDate.getTime()) / MS_PER_DAY) + 1;
    const start = schedule.phase_day_start ?? 1;
    const end = schedule.phase_day_end ?? null;

    if (phaseDay < start) return false;
    if (end !== null && phaseDay > end) return false;

    if (schedule.interval_days && schedule.interval_days > 1) {
      return (phaseDay - start) % schedule.interval_days === 0;
    }
    return true;
  }

  // Calendar mode
  return firesByCalendar(schedule, target, startDate, MS_PER_DAY);
}

function firesByCalendar(
  schedule: RoomTaskSchedule,
  target: Date,
  startDate: Date,
  msPerDay: number,
): boolean {
  const recurrence = schedule.recurrence;
  // Use local weekday (display matches what the manager configured)
  const dayOfWeek = new Date(target.toISOString().slice(0, 10) + 'T12:00:00').getDay();

  if (recurrence === 'daily') {
    if (schedule.interval_days && schedule.interval_days > 1) {
      const daysDiff = Math.round((target.getTime() - startDate.getTime()) / msPerDay);
      return daysDiff >= 0 && daysDiff % schedule.interval_days === 0;
    }
    return true;
  }

  if (recurrence === 'weekly') {
    if (!schedule.day_of_week || schedule.day_of_week.length === 0) return false;
    return schedule.day_of_week.includes(dayOfWeek);
  }

  if (recurrence === 'biweekly') {
    if (!schedule.day_of_week || schedule.day_of_week.length === 0) return false;
    if (!schedule.day_of_week.includes(dayOfWeek)) return false;
    const msPerWeek = 7 * msPerDay;
    const weeksDiff = Math.floor((target.getTime() - startDate.getTime()) / msPerWeek);
    return weeksDiff >= 0 && weeksDiff % 2 === 0;
  }

  if (recurrence === 'monthly') {
    const startDay = new Date(startDate.toISOString().slice(0, 10) + 'T12:00:00').getDate();
    const targetDay = new Date(target.toISOString().slice(0, 10) + 'T12:00:00').getDate();
    return targetDay === startDay;
  }

  return false;
}
