import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Trash2, Save } from 'lucide-react';
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

const ROOM_TYPE_ORDER: Record<string, number> = { mother: 0, veg: 1, flower: 2, clone: 3, mixed: 4 };
const ROOM_TYPE_DOT: Record<string, string> = {
  mother: 'border-l-amber-600',
  veg: 'border-l-green-600',
  flower: 'border-l-rose-600',
  clone: 'border-l-sky-600',
  mixed: 'border-l-cult-medium-gray',
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
  const [editorState, setEditorState] = useState<{ roomId: string; roomCode: string } | null>(null);

  const { schedules, createSchedule, updateSchedule, deleteSchedule } = useTaskSchedules();

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
      return { num: i + 1, date: d, iso: toIsoDate(d), dayOfWeek: DAY_NAMES[d.getDay()] };
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={prevMonth} className="p-1 hover:bg-cult-charcoal rounded-sm transition-colors">
            <ChevronLeft className="w-5 h-5 text-cult-light-gray" />
          </button>
          <h2 className="text-lg font-semibold text-cult-white min-w-[180px] text-center">{monthLabel}</h2>
          <button type="button" onClick={nextMonth} className="p-1 hover:bg-cult-charcoal rounded-sm transition-colors">
            <ChevronRight className="w-5 h-5 text-cult-light-gray" />
          </button>
        </div>
        <button
          type="button"
          onClick={goToday}
          className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cult-light-gray border border-cult-medium-gray hover:bg-cult-charcoal rounded-sm transition-colors"
        >
          Today
        </button>
      </div>

      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-cult-black text-left px-3 py-2 text-[10px] text-cult-medium-gray uppercase tracking-wider font-semibold w-24">
                Room
              </th>
              {days.map((d) => (
                <th
                  key={d.num}
                  className={`px-0.5 py-2 text-center text-[10px] uppercase tracking-wider font-semibold min-w-[28px] ${
                    d.iso === today ? 'text-cult-accent' : 'text-cult-medium-gray'
                  }`}
                >
                  <div>{d.dayOfWeek}</div>
                  <div className="text-[11px]">{d.num}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRooms.map((room) => (
              <tr key={room.id} className="border-t border-cult-dark-gray/50 hover:bg-cult-charcoal/20">
                <td className={`sticky left-0 z-10 bg-cult-black px-3 py-2 font-mono text-xs font-bold text-cult-white border-l-2 ${ROOM_TYPE_DOT[room.room_type] ?? ''}`}>
                  {room.room_code}
                </td>
                {days.map((d) => {
                  const dots = getDotsForCell(room.id, d.date);
                  const isToday = d.iso === today;
                  return (
                    <td
                      key={d.num}
                      className={`px-0.5 py-1.5 text-center cursor-pointer hover:bg-cult-charcoal/40 transition-colors ${
                        isToday ? 'bg-cult-accent/5' : ''
                      }`}
                      onClick={() => setEditorState({ roomId: room.id, roomCode: room.room_code })}
                    >
                      {dots.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-[2px]">
                          {dots.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="block w-[6px] h-[6px] rounded-full"
                              style={{ backgroundColor: TASK_TYPE_CONFIG[t].color }}
                              title={TASK_TYPE_CONFIG[t].label}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
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
        />
      )}
    </div>
  );
}

interface ScheduleEditorDrawerProps {
  roomId: string;
  roomCode: string;
  schedules: RoomTaskSchedule[];
  onClose: () => void;
  onCreate: (input: CreateTaskScheduleInput) => Promise<RoomTaskSchedule>;
  onUpdate: (id: string, input: Partial<RoomTaskSchedule>) => Promise<RoomTaskSchedule>;
  onDelete: (id: string) => Promise<void>;
}

function ScheduleEditorDrawer({ roomId, roomCode, schedules, onClose, onCreate, onUpdate, onDelete }: ScheduleEditorDrawerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

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
      <div className="relative ml-auto bg-cult-near-black border-l border-cult-medium-gray w-full max-w-md h-full flex flex-col overflow-hidden animate-slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-cult-medium-gray flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">Schedules</h3>
            <span className="text-xs text-cult-light-gray font-mono">{roomCode}</span>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-cult-charcoal rounded-sm">
            <X className="w-4 h-4 text-cult-medium-gray" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {schedules.length === 0 && !isNew && (
            <p className="text-xs text-cult-medium-gray text-center py-6">No schedules for this room</p>
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

        {!isNew && editingId === null && (
          <div className="px-5 py-3 border-t border-cult-dark-gray flex-shrink-0">
            <Button onClick={startNew} className="w-full">Add Schedule</Button>
          </div>
        )}
      </div>
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
      className="w-full text-left bg-cult-charcoal/40 border border-cult-dark-gray hover:border-cult-medium-gray p-3 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span
          className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-sm"
          style={{ backgroundColor: `${config.color}20`, color: config.color }}
        >
          {config.label}
        </span>
        <span className="text-[10px] text-cult-medium-gray uppercase">{schedule.recurrence}</span>
        {schedule.priority !== 'medium' && (
          <span className={`text-[10px] uppercase font-semibold ${schedule.priority === 'high' ? 'text-red-400' : 'text-cult-medium-gray'}`}>
            {schedule.priority}
          </span>
        )}
      </div>
      {schedule.day_of_week && schedule.day_of_week.length > 0 && (
        <div className="mt-1 text-[10px] text-cult-light-gray">
          {schedule.day_of_week.map((d) => DAY_NAMES[d]).join(', ')}
        </div>
      )}
      {schedule.notes && (
        <div className="mt-1 text-[10px] text-cult-medium-gray truncate">{schedule.notes}</div>
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
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-cult-charcoal/40 border border-cult-medium-gray p-4 space-y-3">
      <div>
        <label className="block text-[10px] text-cult-light-gray uppercase tracking-wider mb-1">Task Type</label>
        <select
          value={taskType}
          onChange={(e) => setTaskType(e.target.value as TaskType)}
          className="w-full bg-cult-charcoal border border-cult-medium-gray text-cult-white text-xs py-1.5 px-2 rounded-sm focus:outline-none focus:border-cult-accent"
        >
          {TASK_TYPES.map((t) => (
            <option key={t} value={t}>{TASK_TYPE_CONFIG[t].label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] text-cult-light-gray uppercase tracking-wider mb-1">Recurrence</label>
        <select
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value)}
          className="w-full bg-cult-charcoal border border-cult-medium-gray text-cult-white text-xs py-1.5 px-2 rounded-sm focus:outline-none focus:border-cult-accent"
        >
          {RECURRENCE_OPTIONS.map((r) => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
      </div>

      {showDayPicker && (
        <div>
          <label className="block text-[10px] text-cult-light-gray uppercase tracking-wider mb-1">Days</label>
          <div className="flex gap-1">
            {DAY_NAMES.map((name, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleDay(idx)}
                className={`flex-1 py-1 text-[10px] font-semibold rounded-sm transition-colors ${
                  dayOfWeek.includes(idx)
                    ? 'bg-cult-accent text-white'
                    : 'bg-cult-charcoal text-cult-medium-gray border border-cult-dark-gray hover:border-cult-medium-gray'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-[10px] text-cult-light-gray uppercase tracking-wider mb-1">Priority</label>
        <div className="flex gap-1">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`flex-1 py-1 text-[10px] font-semibold uppercase rounded-sm transition-colors ${
                priority === p
                  ? p === 'high' ? 'bg-red-900 text-red-300 border border-red-700' : 'bg-cult-charcoal text-cult-white border border-cult-medium-gray'
                  : 'bg-transparent text-cult-medium-gray border border-cult-dark-gray hover:border-cult-medium-gray'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[10px] text-cult-light-gray uppercase tracking-wider mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-cult-charcoal border border-cult-medium-gray text-cult-white text-xs py-1.5 px-2 rounded-sm resize-none focus:outline-none focus:border-cult-accent"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          <Save className="w-3 h-3 mr-1" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
        {initial && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-red-400 hover:bg-red-950 rounded-sm transition-colors"
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
