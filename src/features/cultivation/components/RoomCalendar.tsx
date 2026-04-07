import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, AlertCircle, Settings, Grid3X3, LayoutList } from 'lucide-react';
import { useTaskSchedules } from '../hooks';
import { TASK_TYPE_CONFIG, getTaskTypeConfig } from '../types';
import type { TaskType, RoomTaskSchedule } from '../types';
import { ROOM_TYPE_META } from '../constants/taskColors';
import {
  ROOM_TYPE_ORDER,
  TASK_TYPES,
  DAY_NAMES,
  getDaysInMonth,
  toIsoDate,
  doesScheduleOccur,
} from '../utils/roomCalendarUtils';
import type { RoomCalendarRoom } from '../utils/roomCalendarUtils';
import { GanttView } from './calendar-views/GanttView';
import { MonthCalendarGrid } from './calendar-views/MonthCalendarGrid';
import { ScheduleEditorDrawer } from './schedule-editor/ScheduleEditorDrawer';

export type { RoomCalendarRoom };
export { RoomSetupPanel } from './room-setup/RoomSetupPanel';

interface RoomCalendarProps {
  rooms: RoomCalendarRoom[];
  onEditRoom?: (roomId: string, roomCode: string) => void;
  onSwitchToSetup?: () => void;
}

export function RoomCalendar({ rooms, onEditRoom, onSwitchToSetup }: RoomCalendarProps) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [calendarMode, setCalendarMode] = useState<'gantt' | 'month'>('month');
  const [editorState, setEditorState] = useState<{ roomId: string; roomCode: string } | null>(null);
  const [filterUnconfigured, setFilterUnconfigured] = useState(false);
  const todayRef = useRef<HTMLTableCellElement>(null);

  const { schedules, createSchedule, updateSchedule, deleteSchedule, copySchedulesFromRoom } = useTaskSchedules();

  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => (ROOM_TYPE_ORDER[a.room_type] ?? 9) - (ROOM_TYPE_ORDER[b.room_type] ?? 9)),
    [rooms]
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysCount = getDaysInMonth(year, month);
  const today = toIsoDate(new Date());
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const days = useMemo(() => {
    return Array.from({ length: daysCount }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return { num: i + 1, date: d, iso: toIsoDate(d), dayOfWeek: DAY_NAMES[d.getDay()], isWeekend: d.getDay() === 0 || d.getDay() === 6 };
    });
  }, [year, month, daysCount]);

  const schedulesByRoom = useMemo(() => {
    const map = new Map<string, RoomTaskSchedule[]>();
    for (const s of schedules) {
      const list = map.get(s.room_id) ?? [];
      list.push(s);
      map.set(s.room_id, list);
    }
    return map;
  }, [schedules]);

  const roomsWithSchedules = useMemo(() => {
    let count = 0;
    for (const room of rooms) {
      if ((schedulesByRoom.get(room.id) ?? []).length > 0) count++;
    }
    return count;
  }, [rooms, schedulesByRoom]);

  const totalScheduleCount = schedules.length;
  const unconfiguredRooms = rooms.length - roomsWithSchedules;

  function getDotsForCell(roomId: string, date: Date): TaskType[] {
    const roomSchedules = schedulesByRoom.get(roomId) ?? [];
    const types = new Set<TaskType>();
    for (const s of roomSchedules) {
      if (doesScheduleOccur(s, date)) types.add(s.task_type);
    }
    return Array.from(types);
  }

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }
  function goToday() { setViewDate(new Date()); }

  // Scroll to today column on mount
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }, [month, year]);

  const displayRooms = useMemo(() => {
    if (!filterUnconfigured) return sortedRooms;
    return sortedRooms.filter((r) => (schedulesByRoom.get(r.id) ?? []).length === 0);
  }, [sortedRooms, filterUnconfigured, schedulesByRoom]);

  const roomsByType = useMemo(() => {
    const groups: { type: string; meta: typeof ROOM_TYPE_META[string]; rooms: RoomCalendarRoom[] }[] = [];
    let currentType = '';
    for (const room of displayRooms) {
      if (room.room_type !== currentType) {
        currentType = room.room_type;
        groups.push({ type: currentType, meta: ROOM_TYPE_META[currentType] ?? ROOM_TYPE_META.mixed, rooms: [] });
      }
      groups[groups.length - 1].rooms.push(room);
    }
    return groups;
  }, [displayRooms]);

  return (
    <div className="space-y-5">
      {/* ── Summary Bar ────────────────────────────────────── */}
      <div className="flex items-center flex-wrap gap-3 sm:gap-6 px-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-cult-white font-mono">{rooms.length}</span>
          <span className="text-xs text-cult-medium-gray uppercase tracking-wider">Rooms</span>
        </div>
        <div className="w-px h-6 bg-cult-dark-gray" />
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-cult-success font-mono">{totalScheduleCount}</span>
          <span className="text-xs text-cult-medium-gray uppercase tracking-wider">Active Schedules</span>
        </div>
        {unconfiguredRooms > 0 && (
          <>
            <div className="w-px h-6 bg-cult-dark-gray" />
            <button
              type="button"
              onClick={() => {
                if (onSwitchToSetup) {
                  onSwitchToSetup();
                } else {
                  setFilterUnconfigured((prev) => !prev);
                }
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-all ${
                filterUnconfigured
                  ? 'bg-cult-warning-muted border border-cult-warning/30'
                  : 'hover:bg-cult-charcoal/40'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-cult-warning" />
              <span className="text-xs text-cult-warning font-semibold">
                {unconfiguredRooms} room{unconfiguredRooms !== 1 ? 's' : ''} with no schedule
              </span>
              {onSwitchToSetup ? (
                <Settings className="w-3 h-3 text-cult-warning/60" />
              ) : filterUnconfigured ? (
                <X className="w-3 h-3 text-cult-warning/60" />
              ) : null}
            </button>
          </>
        )}
      </div>

      {/* ── Controls Row ───────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={prevMonth} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-cult-charcoal active:bg-cult-charcoal/60 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-cult-light-gray" />
          </button>
          <h2 className="text-base sm:text-lg font-semibold text-cult-white min-w-[140px] sm:min-w-[180px] text-center">{monthLabel}</h2>
          <button type="button" onClick={nextMonth} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-cult-charcoal active:bg-cult-charcoal/60 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-cult-light-gray" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend (inline, compact) */}
          <div className="hidden lg:flex items-center gap-2.5 mr-2">
            {TASK_TYPES.filter((t) => t !== 'custom').map((t) => (
              <div key={t} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getTaskTypeConfig(t).color }} />
                <span className="text-xs text-cult-medium-gray uppercase tracking-wider whitespace-nowrap">{getTaskTypeConfig(t).label}</span>
              </div>
            ))}
          </div>

          <div className="flex border border-cult-dark-gray rounded-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setCalendarMode('gantt')}
              className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${calendarMode === 'gantt' ? 'bg-cult-charcoal text-cult-white' : 'text-cult-medium-gray hover:text-cult-light-gray'}`}
              title="Timeline view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCalendarMode('month')}
              className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${calendarMode === 'month' ? 'bg-cult-charcoal text-cult-white' : 'text-cult-medium-gray hover:text-cult-light-gray'}`}
              title="Month view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={goToday}
            className="px-3.5 py-2.5 min-h-[44px] text-xs font-semibold uppercase tracking-wider text-cult-light-gray border border-cult-dark-gray hover:bg-cult-charcoal hover:border-cult-medium-gray active:bg-cult-charcoal/60 rounded-sm transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* ── Calendar ───────────────────────────────────────── */}
      {calendarMode === 'gantt' ? (
        <GanttView
          days={days}
          today={today}
          roomsByType={roomsByType}
          schedulesByRoom={schedulesByRoom}
          getDotsForCell={getDotsForCell}
          onOpenEditor={setEditorState}
          todayRef={todayRef}
        />
      ) : (
        <MonthCalendarGrid
          year={year}
          month={month}
          today={today}
          rooms={sortedRooms}
          schedulesByRoom={schedulesByRoom}
          onEditRoom={onEditRoom}
        />
      )}

      {/* ── Mobile legend ──────────────────────────────────── */}
      <div className="lg:hidden flex flex-wrap items-center gap-3 px-1">
        {TASK_TYPES.filter((t) => t !== 'custom').map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getTaskTypeConfig(t).color }} />
            <span className="text-xs text-cult-medium-gray">{getTaskTypeConfig(t).label}</span>
          </div>
        ))}
      </div>

      {editorState && (
        <ScheduleEditorDrawer
          roomId={editorState.roomId}
          roomCode={editorState.roomCode}
          schedules={schedulesByRoom.get(editorState.roomId) ?? []}
          onClose={() => setEditorState(null)}
          onCreate={createSchedule}
          onUpdate={updateSchedule}
          onDelete={deleteSchedule}
          onCopyFromRoom={copySchedulesFromRoom}
          allRooms={sortedRooms}
          schedulesByRoom={schedulesByRoom}
        />
      )}
    </div>
  );
}
