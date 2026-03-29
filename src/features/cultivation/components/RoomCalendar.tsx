import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Trash2, Save, Grid3X3, LayoutList, Plus, AlertCircle, Copy, Check } from 'lucide-react';
import { Button } from '@/shared/components';
import { useTaskSchedules } from '../hooks';
import { TASK_TYPE_CONFIG } from '../types';
import type { TaskType, RoomTaskSchedule, CreateTaskScheduleInput } from '../types';
import type { RoomType } from '../types';

interface RoomCalendarRoom {
  id: string;
  room_code: string;
  room_type: RoomType;
}

interface RoomCalendarProps {
  rooms: RoomCalendarRoom[];
}

const ROOM_TYPE_ORDER: Record<string, number> = { mother: 0, clone: 1, veg: 2, flower: 3, mixed: 4 };
const ROOM_TYPE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  mother: { label: 'Mother', color: '#D97706', bg: 'bg-amber-950/40', border: 'border-amber-700/40' },
  clone: { label: 'Clone', color: '#0EA5E9', bg: 'bg-sky-950/40', border: 'border-sky-700/40' },
  veg: { label: 'Vegetation', color: '#10B981', bg: 'bg-emerald-950/40', border: 'border-emerald-700/40' },
  flower: { label: 'Flower', color: '#F43F5E', bg: 'bg-rose-950/40', border: 'border-rose-700/40' },
  mixed: { label: 'Mixed', color: '#6B7280', bg: 'bg-gray-900/40', border: 'border-gray-600/40' },
};

const TASK_TYPES = Object.keys(TASK_TYPE_CONFIG) as TaskType[];
const RECURRENCE_OPTIONS = ['daily', 'weekly', 'biweekly', 'monthly'] as const;
const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function doesScheduleOccur(schedule: RoomTaskSchedule, date: Date): boolean {
  const start = new Date(schedule.start_date + 'T00:00:00');
  if (date < start) return false;
  if (schedule.end_date) {
    const end = new Date(schedule.end_date + 'T00:00:00');
    if (date > end) return false;
  }

  const dayOfWeek = date.getDay();
  const diffDays = Math.floor((date.getTime() - start.getTime()) / 86400000);

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

export function RoomCalendar({ rooms }: RoomCalendarProps) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [calendarMode, setCalendarMode] = useState<'gantt' | 'month'>('gantt');
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

  // Stats
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

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }
  function goToday() {
    setViewDate(new Date());
  }

  // Scroll to today column on mount
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }, [month, year]);

  // Filtered rooms when "unconfigured" filter is active
  const displayRooms = useMemo(() => {
    if (!filterUnconfigured) return sortedRooms;
    return sortedRooms.filter((r) => (schedulesByRoom.get(r.id) ?? []).length === 0);
  }, [sortedRooms, filterUnconfigured, schedulesByRoom]);

  // Group rooms by type for section headers
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
          <span className="text-2xl font-bold text-green-400 font-mono">{totalScheduleCount}</span>
          <span className="text-xs text-cult-medium-gray uppercase tracking-wider">Active Schedules</span>
        </div>
        {unconfiguredRooms > 0 && (
          <>
            <div className="w-px h-6 bg-cult-dark-gray" />
            <button
              type="button"
              onClick={() => setFilterUnconfigured((prev) => !prev)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-all ${
                filterUnconfigured
                  ? 'bg-amber-950/60 border border-amber-700/50'
                  : 'hover:bg-cult-charcoal/40'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400 font-semibold">
                {unconfiguredRooms} room{unconfiguredRooms !== 1 ? 's' : ''} with no schedule
              </span>
              {filterUnconfigured && (
                <X className="w-3 h-3 text-amber-400/60" />
              )}
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
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: TASK_TYPE_CONFIG[t].color }} />
                <span className="text-xs text-cult-medium-gray uppercase tracking-wider whitespace-nowrap">{TASK_TYPE_CONFIG[t].label}</span>
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
        />
      )}

      {/* ── Mobile legend ──────────────────────────────────── */}
      <div className="lg:hidden flex flex-wrap items-center gap-3 px-1">
        {TASK_TYPES.filter((t) => t !== 'custom').map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TASK_TYPE_CONFIG[t].color }} />
            <span className="text-xs text-cult-medium-gray">{TASK_TYPE_CONFIG[t].label}</span>
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

/* ═══════════════════════════════════════════════════════════════
   Gantt / Timeline View — Redesigned
   ═══════════════════════════════════════════════════════════════ */

interface GanttViewProps {
  days: { num: number; date: Date; iso: string; dayOfWeek: string; isWeekend: boolean }[];
  today: string;
  roomsByType: { type: string; meta: { label: string; color: string; bg: string; border: string }; rooms: RoomCalendarRoom[] }[];
  schedulesByRoom: Map<string, RoomTaskSchedule[]>;
  getDotsForCell: (roomId: string, date: Date) => TaskType[];
  onOpenEditor: (state: { roomId: string; roomCode: string }) => void;
  todayRef: React.RefObject<HTMLTableCellElement | null>;
}

function GanttView({ days, today, roomsByType, schedulesByRoom, getDotsForCell, onOpenEditor, todayRef }: GanttViewProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide rounded-sm border border-cult-dark-gray/50">
      <table className="w-full border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-cult-charcoal/30">
            <th className="sticky left-0 z-20 bg-cult-near-black text-left px-4 py-2.5 text-xs text-cult-medium-gray uppercase tracking-wider font-semibold w-32 border-r border-cult-dark-gray/50">
              Room
            </th>
            {days.map((d) => {
              const isToday = d.iso === today;
              return (
                <th
                  key={d.num}
                  ref={isToday ? todayRef : undefined}
                  className={`px-0 py-2 text-center min-w-[32px] transition-colors ${
                    isToday
                      ? 'bg-green-950/40'
                      : d.isWeekend
                        ? 'bg-cult-charcoal/15'
                        : ''
                  }`}
                >
                  <div className={`text-xs uppercase tracking-wider font-semibold ${
                    isToday ? 'text-green-400' : d.isWeekend ? 'text-cult-dark-gray' : 'text-cult-medium-gray'
                  }`}>
                    {d.dayOfWeek}
                  </div>
                  <div className={`text-xs font-mono font-bold ${
                    isToday ? 'text-green-400' : 'text-cult-medium-gray'
                  }`}>
                    {d.num}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {roomsByType.map((group) => (
            <>
              {/* Room type section header */}
              <tr key={`header-${group.type}`}>
                <td
                  colSpan={days.length + 1}
                  className={`px-4 py-1.5 ${group.bg} border-y ${group.border}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: group.meta.color }}
                    />
                    <span className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: group.meta.color }}>
                      {group.meta.label}
                    </span>
                    <span className="text-xs text-cult-medium-gray">
                      {group.rooms.length} room{group.rooms.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </td>
              </tr>

              {group.rooms.map((room) => {
                const roomSchedules = schedulesByRoom.get(room.id) ?? [];
                const hasSchedules = roomSchedules.length > 0;

                return (
                  <tr
                    key={room.id}
                    className="group border-b border-cult-dark-gray/30 hover:bg-cult-charcoal/25 cursor-pointer transition-colors"
                    onClick={() => onOpenEditor({ roomId: room.id, roomCode: room.room_code })}
                  >
                    <td className="sticky left-0 z-10 bg-cult-near-black group-hover:bg-cult-charcoal/60 px-4 py-2 border-r border-cult-dark-gray/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cult-white">
                            {room.room_code}
                          </span>
                          {!hasSchedules && (
                            <span className="text-xs text-amber-500/80 font-semibold uppercase tracking-wider">
                              No tasks
                            </span>
                          )}
                        </div>
                        <Plus className="w-3 h-3 text-cult-dark-gray group-hover:text-cult-medium-gray transition-colors" />
                      </div>
                      {hasSchedules && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {Array.from(new Set(roomSchedules.map(s => s.task_type))).slice(0, 5).map(t => (
                            <span
                              key={t}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: TASK_TYPE_CONFIG[t]?.color ?? '#666' }}
                            />
                          ))}
                          <span className="text-xs text-cult-dark-gray ml-0.5">
                            {roomSchedules.length}
                          </span>
                        </div>
                      )}
                    </td>

                    {days.map((d) => {
                      const dots = getDotsForCell(room.id, d.date);
                      const isToday = d.iso === today;

                      return (
                        <td
                          key={d.num}
                          className={`px-0 py-1 text-center transition-colors ${
                            isToday
                              ? 'bg-green-950/25'
                              : d.isWeekend
                                ? 'bg-cult-charcoal/10'
                                : ''
                          }`}
                        >
                          {dots.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-[2px] px-0.5">
                              {dots.slice(0, 4).map((t) => {
                                const cfg = TASK_TYPE_CONFIG[t];
                                const initial = cfg.label.charAt(0).toUpperCase();
                                return (
                                  <span
                                    key={t}
                                    className="flex items-center justify-center w-[14px] h-[14px] rounded-sm text-[8px] font-bold leading-none"
                                    style={{ backgroundColor: `${cfg.color}25`, color: cfg.color }}
                                    title={cfg.label}
                                  >
                                    {initial}
                                  </span>
                                );
                              })}
                            </div>
                          ) : hasSchedules ? (
                            /* Room has schedules but none fire on this day — subtle dash */
                            <span className="block mx-auto w-2 h-px bg-cult-dark-gray/40" />
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Month Calendar Grid
   ═══════════════════════════════════════════════════════════════ */

interface MonthCalendarGridProps {
  year: number;
  month: number;
  today: string;
  rooms: RoomCalendarRoom[];
  schedulesByRoom: Map<string, RoomTaskSchedule[]>;
}

function MonthCalendarGrid({ year, month, today, rooms, schedulesByRoom }: MonthCalendarGridProps) {
  const daysCount = getDaysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const cells: (null | { num: number; date: Date; iso: string })[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysCount; d++) {
    const date = new Date(year, month, d);
    cells.push({ num: d, date, iso: toIsoDate(date) });
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

  return (
    <div className="border border-cult-dark-gray/50 rounded-sm overflow-hidden">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 bg-cult-charcoal/30 border-b border-cult-dark-gray/50">
        {DAY_NAMES.map((name) => (
          <div key={name} className="py-2.5 text-center text-[10px] sm:text-xs text-cult-medium-gray uppercase tracking-wider font-semibold">
            {name.charAt(0)}<span className="hidden sm:inline">{name.slice(1)}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div key={`blank-${idx}`} className="min-h-[56px] sm:min-h-[90px] border-b border-r border-cult-dark-gray/20 bg-cult-near-black/50" />;
          }
          const isToday = cell.iso === today;
          const taskTypes = getTaskTypesForDay(cell.date);
          const roomCount = taskTypes.length > 0 ? getRoomCountForDay(cell.date) : 0;
          const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;

          return (
            <div
              key={cell.num}
              className={`min-h-[56px] sm:min-h-[90px] border-b border-r border-cult-dark-gray/20 p-1 sm:p-2 transition-colors hover:bg-cult-charcoal/25 ${
                isToday ? 'bg-green-950/20' : isWeekend ? 'bg-cult-charcoal/5' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-mono font-bold ${
                    isToday
                      ? 'bg-green-600 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs'
                      : 'text-cult-light-gray text-[10px] sm:text-xs'
                  }`}
                >
                  {cell.num}
                </span>
                {roomCount > 0 && (
                  <span className="text-xs text-cult-medium-gray font-mono">
                    {roomCount} <span className="text-cult-dark-gray">rm</span>
                  </span>
                )}
              </div>
              {taskTypes.length > 0 && (
                <>
                  {/* Mobile: dots only */}
                  <div className="flex flex-wrap gap-1 mt-1 sm:hidden">
                    {taskTypes.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="block w-[6px] h-[6px] rounded-full"
                        style={{ backgroundColor: TASK_TYPE_CONFIG[t].color }}
                        title={TASK_TYPE_CONFIG[t].label}
                      />
                    ))}
                  </div>
                  {/* Desktop: labeled chips */}
                  <div className="hidden sm:flex flex-wrap gap-1 mt-1">
                    {taskTypes.slice(0, 6).map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-0.5 px-1.5 py-[2px] text-xs font-bold uppercase tracking-wider rounded-sm"
                        style={{ backgroundColor: `${TASK_TYPE_CONFIG[t].color}18`, color: TASK_TYPE_CONFIG[t].color }}
                        title={TASK_TYPE_CONFIG[t].label}
                      >
                        <span
                          className="w-[5px] h-[5px] rounded-full flex-shrink-0"
                          style={{ backgroundColor: TASK_TYPE_CONFIG[t].color }}
                        />
                        {TASK_TYPE_CONFIG[t].label.slice(0, 4)}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Schedule Editor Drawer
   ═══════════════════════════════════════════════════════════════ */

interface ScheduleEditorDrawerProps {
  roomId: string;
  roomCode: string;
  schedules: RoomTaskSchedule[];
  onClose: () => void;
  onCreate: (input: CreateTaskScheduleInput) => Promise<RoomTaskSchedule>;
  onUpdate: (id: string, input: Partial<RoomTaskSchedule>) => Promise<RoomTaskSchedule>;
  onDelete: (id: string) => Promise<void>;
  onCopyFromRoom: (sourceRoomId: string, targetRoomId: string) => Promise<number>;
  allRooms: RoomCalendarRoom[];
  schedulesByRoom: Map<string, RoomTaskSchedule[]>;
}

function ScheduleEditorDrawer({ roomId, roomCode, schedules, onClose, onCreate, onUpdate, onDelete, onCopyFromRoom, allRooms, schedulesByRoom }: ScheduleEditorDrawerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [showCopyPicker, setShowCopyPicker] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  function startNew() {
    setEditingId(null);
    setIsNew(true);
  }

  function startEdit(id: string) {
    setIsNew(false);
    setEditingId(id);
  }

  function stopEdit() {
    setEditingId(null);
    setIsNew(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative ml-auto bg-cult-near-black border-l border-cult-dark-gray w-full max-w-md h-full flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cult-dark-gray flex-shrink-0 bg-cult-charcoal/20">
          <div>
            <span className="text-xs text-cult-medium-gray uppercase tracking-wider">Room Schedule</span>
            <h3 className="text-base font-bold text-cult-white font-mono mt-0.5">{roomCode}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2.5 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-cult-charcoal active:bg-cult-charcoal/60 rounded-lg transition-colors">
            <X className="w-4 h-4 text-cult-medium-gray" />
          </button>
        </div>

        {/* Schedule count */}
        <div className="px-5 py-2.5 border-b border-cult-dark-gray/50 flex items-center justify-between">
          <span className="text-xs text-cult-medium-gray uppercase tracking-wider">
            {schedules.length} active schedule{schedules.length !== 1 ? 's' : ''}
          </span>
          {!isNew && editingId === null && !showCopyPicker && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowCopyPicker(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-950/40 border border-sky-800/40 hover:bg-sky-950/60 rounded-sm transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
              <button
                type="button"
                onClick={startNew}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-green-400 bg-green-950/40 border border-green-800/40 hover:bg-green-950/60 rounded-sm transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {schedules.length === 0 && !isNew && !showCopyPicker && (
            <div className="text-center py-10">
              <div className="w-12 h-12 mx-auto rounded-full bg-cult-charcoal/40 flex items-center justify-center mb-3">
                <AlertCircle className="w-5 h-5 text-cult-dark-gray" />
              </div>
              <p className="text-sm text-cult-medium-gray">No schedules configured</p>
              <p className="text-xs text-cult-dark-gray mt-1">Add a schedule or copy from another room</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCopyPicker(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-950/40 border border-sky-800/40 hover:bg-sky-950/60 rounded-sm transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy from Room
                </button>
                <button
                  type="button"
                  onClick={startNew}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-green-400 bg-green-950/40 border border-green-800/40 hover:bg-green-950/60 rounded-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Manually
                </button>
              </div>
            </div>
          )}

          {showCopyPicker && (
            <CopyFromRoomPicker
              targetRoomId={roomId}
              targetRoomCode={roomCode}
              allRooms={allRooms}
              schedulesByRoom={schedulesByRoom}
              copying={copying}
              copySuccess={copySuccess}
              onCopy={async (sourceRoomId) => {
                setCopying(true);
                setCopySuccess(null);
                try {
                  const count = await onCopyFromRoom(sourceRoomId, roomId);
                  const sourceRoom = allRooms.find((r) => r.id === sourceRoomId);
                  setCopySuccess(`Copied ${count} schedule${count !== 1 ? 's' : ''} from ${sourceRoom?.room_code ?? 'room'}`);
                  setTimeout(() => {
                    setShowCopyPicker(false);
                    setCopySuccess(null);
                  }, 1500);
                } catch {
                  setCopySuccess('Failed to copy schedules');
                } finally {
                  setCopying(false);
                }
              }}
              onCancel={() => { setShowCopyPicker(false); setCopySuccess(null); }}
            />
          )}

          {schedules.map((s) => (
            <div key={s.id}>
              {editingId === s.id ? (
                <ScheduleForm
                  roomId={roomId}
                  initial={s}
                  onSave={async (input) => {
                    await onUpdate(s.id, input);
                    stopEdit();
                  }}
                  onDelete={async () => {
                    await onDelete(s.id);
                    stopEdit();
                  }}
                  onCancel={stopEdit}
                />
              ) : (
                <ScheduleRow schedule={s} onEdit={() => startEdit(s.id)} />
              )}
            </div>
          ))}

          {isNew && (
            <ScheduleForm
              roomId={roomId}
              onSave={async (input) => {
                await onCreate(input as CreateTaskScheduleInput);
                stopEdit();
              }}
              onCancel={stopEdit}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Copy from Room Picker
   ═══════════════════════════════════════════════════════════════ */

interface CopyFromRoomPickerProps {
  targetRoomId: string;
  targetRoomCode: string;
  allRooms: RoomCalendarRoom[];
  schedulesByRoom: Map<string, RoomTaskSchedule[]>;
  copying: boolean;
  copySuccess: string | null;
  onCopy: (sourceRoomId: string) => void;
  onCancel: () => void;
}

function CopyFromRoomPicker({ targetRoomId, targetRoomCode, allRooms, schedulesByRoom, copying, copySuccess, onCopy, onCancel }: CopyFromRoomPickerProps) {
  const roomsWithSchedules = allRooms.filter(
    (r) => r.id !== targetRoomId && (schedulesByRoom.get(r.id) ?? []).length > 0
  );

  if (copySuccess) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto rounded-full bg-green-950/60 flex items-center justify-center mb-3">
          <Check className="w-6 h-6 text-green-400" />
        </div>
        <p className="text-sm font-semibold text-green-400">{copySuccess}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-sky-400 uppercase tracking-wider">Copy schedules to {targetRoomCode}</p>
          <p className="text-xs text-cult-dark-gray mt-0.5">Select a source room below</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 text-xs text-cult-medium-gray hover:text-cult-light-gray transition-colors"
        >
          Cancel
        </button>
      </div>

      {roomsWithSchedules.length === 0 ? (
        <p className="text-xs text-cult-medium-gray py-4 text-center">No other rooms have schedules to copy from</p>
      ) : (
        <div className="space-y-1.5">
          {roomsWithSchedules.map((room) => {
            const roomSchedules = schedulesByRoom.get(room.id) ?? [];
            const meta = ROOM_TYPE_META[room.room_type] ?? ROOM_TYPE_META.mixed;
            return (
              <button
                key={room.id}
                type="button"
                disabled={copying}
                onClick={() => onCopy(room.id)}
                className="w-full text-left bg-cult-charcoal/30 border border-cult-dark-gray/60 hover:border-sky-700/60 hover:bg-sky-950/10 p-3 transition-all disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                    <span className="text-xs font-bold text-cult-white uppercase tracking-wider font-mono">{room.room_code}</span>
                    <span className={`px-1.5 py-0.5 text-xs uppercase tracking-wider rounded-sm ${meta.bg} ${meta.border} border`} style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                  <span className="text-xs text-cult-medium-gray">
                    {roomSchedules.length} schedule{roomSchedules.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {roomSchedules.map((s) => {
                    const cfg = TASK_TYPE_CONFIG[s.task_type] ?? TASK_TYPE_CONFIG.custom;
                    return (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-sm"
                        style={{ backgroundColor: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                        {cfg.label}
                        <span className="text-cult-dark-gray ml-0.5">{s.recurrence === 'daily' ? 'D' : s.recurrence === 'weekly' ? 'W' : s.recurrence === 'biweekly' ? 'B' : 'M'}</span>
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {copying && (
        <p className="text-xs text-sky-400 text-center animate-pulse">Copying schedules...</p>
      )}
    </div>
  );
}

interface ScheduleRowProps {
  schedule: RoomTaskSchedule;
  onEdit: () => void;
}

function ScheduleRow({ schedule, onEdit }: ScheduleRowProps) {
  const config = TASK_TYPE_CONFIG[schedule.task_type] ?? TASK_TYPE_CONFIG.custom;
  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full text-left bg-cult-charcoal/30 border border-cult-dark-gray/60 hover:border-cult-medium-gray p-3.5 transition-all hover:bg-cult-charcoal/50 group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-black/20"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-xs font-bold text-cult-white uppercase tracking-wider">{config.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-cult-medium-gray bg-cult-charcoal rounded-sm">
            {schedule.recurrence}
          </span>
          {schedule.priority === 'high' && (
            <span className="px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-red-400 bg-red-950/40 rounded-sm">
              High
            </span>
          )}
        </div>
      </div>
      {schedule.day_of_week && schedule.day_of_week.length > 0 && (
        <div className="mt-2 flex gap-1">
          {DAY_NAMES.map((name, idx) => (
            <span
              key={idx}
              className={`w-6 h-5 flex items-center justify-center text-xs font-bold uppercase rounded-sm ${
                schedule.day_of_week!.includes(idx)
                  ? 'text-cult-white bg-cult-charcoal'
                  : 'text-cult-dark-gray'
              }`}
            >
              {name.charAt(0)}
            </span>
          ))}
        </div>
      )}
      {schedule.notes && (
        <div className="mt-1.5 text-xs text-cult-medium-gray truncate">{schedule.notes}</div>
      )}
    </button>
  );
}

interface ScheduleFormProps {
  roomId: string;
  initial?: RoomTaskSchedule;
  onSave: (input: Partial<RoomTaskSchedule> & { room_id: string; task_type: TaskType; recurrence: string; start_date: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

function ScheduleForm({ roomId, initial, onSave, onDelete, onCancel }: ScheduleFormProps) {
  const [taskType, setTaskType] = useState<TaskType>(initial?.task_type ?? 'feeding');
  const [recurrence, setRecurrence] = useState(initial?.recurrence ?? 'weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number[]>(initial?.day_of_week ?? []);
  const [priority, setPriority] = useState(initial?.priority ?? 'medium');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [startDate] = useState(initial?.start_date ?? toIsoDate(new Date()));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showDayPicker = recurrence === 'weekly' || recurrence === 'biweekly';

  const toggleDay = useCallback((d: number) => {
    setDayOfWeek((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        room_id: roomId,
        task_type: taskType,
        recurrence,
        start_date: startDate,
        day_of_week: showDayPicker ? dayOfWeek : null,
        priority,
        notes: notes || null,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    const confirmed = window.confirm(
      'Delete this schedule? This will stop all future task generation for this room.'
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  const selectedConfig = TASK_TYPE_CONFIG[taskType];

  return (
    <div className="bg-cult-charcoal/30 border border-cult-medium-gray/60 p-4 space-y-3.5">
      {/* Visual preview of selected task type */}
      <div className="flex items-center gap-2 pb-2 border-b border-cult-dark-gray/50">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedConfig.color }} />
        <span className="text-xs font-bold text-cult-white uppercase tracking-wider">
          {initial ? 'Edit' : 'New'} — {selectedConfig.label}
        </span>
      </div>

      <div>
        <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1.5 font-semibold">Task Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {TASK_TYPES.map((t) => {
            const cfg = TASK_TYPE_CONFIG[t];
            const selected = taskType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTaskType(t)}
                className={`flex items-center gap-1.5 px-2 py-2.5 min-h-[44px] text-xs font-semibold uppercase tracking-wider rounded-sm transition-all ${
                  selected
                    ? 'text-white border'
                    : 'text-cult-medium-gray bg-cult-charcoal/40 border border-cult-dark-gray/50 hover:border-cult-medium-gray hover:text-cult-light-gray'
                }`}
                style={selected ? { backgroundColor: `${cfg.color}20`, borderColor: `${cfg.color}50`, color: cfg.color } : undefined}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                {cfg.label.length > 8 ? cfg.label.slice(0, 7) + '.' : cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1.5 font-semibold">Recurrence</label>
        <div className="flex gap-1.5">
          {RECURRENCE_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRecurrence(r)}
              className={`flex-1 py-2.5 min-h-[44px] text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors ${
                recurrence === r
                  ? 'bg-cult-charcoal text-cult-white border border-cult-medium-gray'
                  : 'text-cult-medium-gray border border-cult-dark-gray/50 hover:border-cult-medium-gray'
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {showDayPicker && (
        <div>
          <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1.5 font-semibold">Days</label>
          <div className="flex gap-1">
            {DAY_NAMES.map((name, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleDay(idx)}
                className={`flex-1 py-2.5 min-h-[44px] text-xs font-bold rounded-sm transition-all ${
                  dayOfWeek.includes(idx)
                    ? 'text-white'
                    : 'bg-cult-charcoal/40 text-cult-medium-gray border border-cult-dark-gray/50 hover:border-cult-medium-gray'
                }`}
                style={dayOfWeek.includes(idx) ? { backgroundColor: `${selectedConfig.color}30`, color: selectedConfig.color, borderWidth: '1px', borderColor: `${selectedConfig.color}50` } : undefined}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1.5 font-semibold">Priority</label>
        <div className="flex gap-1.5">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`flex-1 py-2.5 min-h-[44px] text-xs font-semibold uppercase rounded-sm transition-colors ${
                priority === p
                  ? p === 'high'
                    ? 'bg-red-950/60 text-red-400 border border-red-700/50'
                    : p === 'low'
                      ? 'bg-cult-charcoal text-cult-light-gray border border-cult-medium-gray'
                      : 'bg-cult-charcoal text-cult-white border border-cult-medium-gray'
                  : 'bg-transparent text-cult-medium-gray border border-cult-dark-gray/50 hover:border-cult-medium-gray'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1.5 font-semibold">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional instructions for this task..."
          className="w-full bg-cult-charcoal/40 border border-cult-dark-gray/50 text-cult-white text-xs py-2 px-2.5 rounded-sm resize-none focus:outline-none focus:border-cult-medium-gray placeholder:text-cult-dark-gray"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          <Save className="w-3 h-3 mr-1" />
          {saving ? 'Saving...' : initial ? 'Update' : 'Create'}
        </Button>
        {initial && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-400 hover:bg-red-950/40 active:bg-red-950/60 rounded-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-cult-medium-gray hover:text-cult-light-gray transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
