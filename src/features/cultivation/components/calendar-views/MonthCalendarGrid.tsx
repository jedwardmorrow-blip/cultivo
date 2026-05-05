import { useState } from 'react';
import type { TaskType, RoomTaskSchedule } from '../../types';
import { getTaskTypeConfig } from '../../types';
import { getDaysInMonth, toIsoDate, doesScheduleOccur, DAY_NAMES } from '../../utils/roomCalendarUtils';
import type { RoomCalendarRoom } from '../../utils/roomCalendarUtils';
import { DayDetailPanel } from './DayDetailPanel';

interface MonthCalendarGridProps {
  year: number;
  month: number;
  today: string;
  rooms: RoomCalendarRoom[];
  schedulesByRoom: Map<string, RoomTaskSchedule[]>;
  onEditRoom?: (roomId: string, roomCode: string) => void;
}

export function MonthCalendarGrid({ year, month, today, rooms, schedulesByRoom, onEditRoom }: MonthCalendarGridProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const daysCount = getDaysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const cells: (null | { num: number; date: Date; iso: string })[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysCount; d++) {
    const date = new Date(year, month, d);
    cells.push({ num: d, date, iso: toIsoDate(date) });
  }

  // Split cells into rows of 7 for inline panel insertion
  const rows: (null | { num: number; date: Date; iso: string })[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  function getTaskTypesForDay(date: Date): TaskType[] {
    const types = new Set<TaskType>();
    for (const room of rooms) {
      const roomSchedules = schedulesByRoom.get(room.id) ?? [];
      for (const s of roomSchedules) {
        if (doesScheduleOccur(s, date)) types.add(s.task_type);
      }
    }
    return Array.from(types);
  }

  function getRoomCountForDay(date: Date): number {
    let count = 0;
    for (const room of rooms) {
      const roomSchedules = schedulesByRoom.get(room.id) ?? [];
      if (roomSchedules.some((s) => doesScheduleOccur(s, date))) count++;
    }
    return count;
  }

  function getRoomBreakdownForDay(date: Date): { room: RoomCalendarRoom; taskTypes: TaskType[]; schedules: RoomTaskSchedule[] }[] {
    const result: { room: RoomCalendarRoom; taskTypes: TaskType[]; schedules: RoomTaskSchedule[] }[] = [];
    for (const room of rooms) {
      const roomSchedules = schedulesByRoom.get(room.id) ?? [];
      const active = roomSchedules.filter((s) => doesScheduleOccur(s, date));
      if (active.length > 0) {
        const types = Array.from(new Set(active.map((s) => s.task_type)));
        result.push({ room, taskTypes: types, schedules: active });
      }
    }
    return result;
  }

  // Find which row the selected day is in
  const selectedRowIdx = selectedDay !== null
    ? rows.findIndex((row) => row.some((c) => c?.num === selectedDay))
    : -1;

  const selectedDate = selectedDay !== null ? new Date(year, month, selectedDay) : null;

  return (
    <div className="border border-cult-surface/50 rounded-sm overflow-hidden">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 bg-cult-surface-raised/30 border-b border-cult-surface/50">
        {DAY_NAMES.map((name) => (
          <div key={name} className="py-2.5 text-center text-[10px] sm:text-xs text-cult-border uppercase tracking-wider font-semibold">
            {name.charAt(0)}<span className="hidden sm:inline">{name.slice(1)}</span>
          </div>
        ))}
      </div>

      {/* Calendar rows with inline expand panel */}
      {rows.map((row, rowIdx) => (
        <div key={rowIdx}>
          <div className="grid grid-cols-7">
            {row.map((cell, colIdx) => {
              if (!cell) {
                return <div key={`blank-${rowIdx}-${colIdx}`} className="min-h-[56px] sm:min-h-[90px] border-b border-r border-cult-surface/20 bg-cult-surface/50" />;
              }
              const isToday = cell.iso === today;
              const taskTypes = getTaskTypesForDay(cell.date);
              const roomCount = taskTypes.length > 0 ? getRoomCountForDay(cell.date) : 0;
              const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
              const isSelected = selectedDay === cell.num;

              return (
                <div
                  key={cell.num}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDay(isSelected ? null : cell.num)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDay(isSelected ? null : cell.num); } }}
                  className={`min-h-[56px] sm:min-h-[90px] border-b border-r border-cult-surface/20 p-1 sm:p-2 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-cult-success-muted ring-1 ring-inset ring-cult-success/40'
                      : isToday
                        ? 'bg-cult-success-muted hover:bg-cult-success-muted'
                        : isWeekend
                          ? 'bg-cult-surface-raised/5 hover:bg-cult-surface-raised/25'
                          : 'hover:bg-cult-surface-raised/25'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-mono font-bold ${
                        isToday
                          ? 'bg-cult-success text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs'
                          : 'text-cult-text-muted text-[10px] sm:text-xs'
                      }`}
                    >
                      {cell.num}
                    </span>
                    {roomCount > 0 && (
                      <span className="text-xs text-cult-border font-mono">
                        {roomCount} <span className="text-cult-surface">rm</span>
                      </span>
                    )}
                  </div>
                  {taskTypes.length > 0 && (
                    <>
                      {/* Mobile: labeled pill badges */}
                      <div className="flex flex-wrap gap-1 mt-1 sm:hidden">
                        {taskTypes.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-0.5 px-1 py-[1px] text-[9px] font-bold rounded-sm"
                            style={{ backgroundColor: `${getTaskTypeConfig(t).color}18`, color: getTaskTypeConfig(t).color }}
                          >
                            {getTaskTypeConfig(t).label.charAt(0)}
                          </span>
                        ))}
                      </div>
                      {/* Desktop: labeled chips */}
                      <div className="hidden sm:flex flex-wrap gap-1 mt-1">
                        {taskTypes.slice(0, 6).map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-0.5 px-1.5 py-[2px] text-xs font-bold uppercase tracking-wider rounded-sm"
                            style={{ backgroundColor: `${getTaskTypeConfig(t).color}18`, color: getTaskTypeConfig(t).color }}
                            title={getTaskTypeConfig(t).label}
                          >
                            <span
                              className="w-[5px] h-[5px] rounded-full flex-shrink-0"
                              style={{ backgroundColor: getTaskTypeConfig(t).color }}
                            />
                            {getTaskTypeConfig(t).label.slice(0, 4)}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Inline Day Detail Panel (appears below the row containing the selected day) */}
          {selectedRowIdx === rowIdx && selectedDate && (
            <DayDetailPanel
              date={selectedDate}
              breakdown={getRoomBreakdownForDay(selectedDate)}
              onClose={() => setSelectedDay(null)}
              onEditRoom={onEditRoom}
            />
          )}
        </div>
      ))}
    </div>
  );
}
