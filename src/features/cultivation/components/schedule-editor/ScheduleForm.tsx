import { useState, useCallback } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components';
import { TASK_TYPE_CONFIG, getTaskTypeConfig } from '../../types';
import type { TaskType, RoomTaskSchedule, CreateTaskScheduleInput, SchedulingMode } from '../../types';
import { PRIORITY_COLOR } from '../../constants/taskColors';
import { TASK_TYPES, RECURRENCE_OPTIONS, PRIORITY_OPTIONS, DAY_NAMES, toIsoDate } from '../../utils/roomCalendarUtils';

interface ScheduleFormProps {
  roomId: string;
  initial?: RoomTaskSchedule;
  onSave: (input: Partial<RoomTaskSchedule> & { room_id: string; task_type: TaskType; recurrence: string; start_date: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

export function ScheduleForm({ roomId, initial, onSave, onDelete, onCancel }: ScheduleFormProps) {
  const [taskType, setTaskType] = useState<TaskType>(initial?.task_type ?? 'batch_tank_mix');
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>(initial?.scheduling_mode ?? 'calendar');
  const [recurrence, setRecurrence] = useState(initial?.recurrence ?? 'weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number[]>(initial?.day_of_week ?? []);
  const [intervalDays, setIntervalDays] = useState<string>(initial?.interval_days?.toString() ?? '');
  const [phaseDayStart, setPhaseDayStart] = useState<string>(initial?.phase_day_start?.toString() ?? '');
  const [phaseDayEnd, setPhaseDayEnd] = useState<string>(initial?.phase_day_end?.toString() ?? '');
  const [priority, setPriority] = useState(initial?.priority ?? 'medium');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [startDate] = useState(initial?.start_date ?? toIsoDate(new Date()));
  const [endDate, setEndDate] = useState(initial?.end_date ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showDayPicker = schedulingMode === 'calendar' && (recurrence === 'weekly' || recurrence === 'biweekly');
  const isSingleDay = schedulingMode === 'phase_day' && phaseDayStart && phaseDayEnd && phaseDayStart === phaseDayEnd;

  const toggleDay = useCallback((d: number) => {
    setDayOfWeek((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        room_id: roomId,
        task_type: taskType,
        recurrence: schedulingMode === 'phase_day' ? 'daily' : recurrence,
        start_date: startDate,
        end_date: schedulingMode === 'calendar' && endDate ? endDate : null,
        day_of_week: showDayPicker ? dayOfWeek : null,
        scheduling_mode: schedulingMode,
        interval_days: intervalDays ? parseInt(intervalDays, 10) : null,
        phase_day_start: phaseDayStart ? parseInt(phaseDayStart, 10) : null,
        phase_day_end: phaseDayEnd ? parseInt(phaseDayEnd, 10) : null,
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

  const selectedConfig = getTaskTypeConfig(taskType);

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
            const cfg = getTaskTypeConfig(t);
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

      {/* Scheduling Mode Toggle */}
      <div>
        <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1.5 font-semibold">Scheduling Mode</label>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setSchedulingMode('calendar')}
            className={`flex-1 py-2.5 min-h-[44px] text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors ${
              schedulingMode === 'calendar'
                ? 'bg-cult-charcoal text-cult-white border border-cult-medium-gray'
                : 'text-cult-medium-gray border border-cult-dark-gray/50 hover:border-cult-medium-gray'
            }`}
          >
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setSchedulingMode('phase_day')}
            className={`flex-1 py-2.5 min-h-[44px] text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors ${
              schedulingMode === 'phase_day'
                ? 'bg-violet-950/60 text-violet-400 border border-violet-700/50'
                : 'text-cult-medium-gray border border-cult-dark-gray/50 hover:border-cult-medium-gray'
            }`}
          >
            Phase Day
          </button>
        </div>
        <p className="mt-1 text-[10px] text-cult-dark-gray">
          {schedulingMode === 'calendar'
            ? 'Schedule by day of week or fixed interval'
            : 'Schedule relative to batch stage entry (e.g., day 21 of flower)'}
        </p>
      </div>

      {/* Calendar mode fields */}
      {schedulingMode === 'calendar' && (
        <>
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
              <div className="flex gap-1 mb-2">
                {([
                  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
                  { label: 'Weekends', days: [0, 6] },
                  { label: 'Daily', days: [0, 1, 2, 3, 4, 5, 6] },
                  { label: 'MWF', days: [1, 3, 5] },
                ] as const).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDayOfWeek([...preset.days])}
                    className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider bg-cult-charcoal/50 border border-cult-dark-gray/50 text-cult-medium-gray hover:border-cult-medium-gray hover:text-cult-white transition-colors rounded-sm"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
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

          {recurrence === 'daily' && (
            <div>
              <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1.5 font-semibold">
                Repeat Every <span className="text-cult-dark-gray font-normal">(days, optional)</span>
              </label>
              <input
                type="number"
                value={intervalDays}
                onChange={(e) => setIntervalDays(e.target.value)}
                placeholder="Leave blank for every day"
                min="1"
                className="w-full bg-cult-charcoal/40 border border-cult-dark-gray/50 text-cult-white text-xs py-2.5 px-2.5 rounded-sm focus:outline-none focus:border-cult-medium-gray min-h-[44px] placeholder:text-cult-dark-gray"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1.5 font-semibold">
              Stop After Date <span className="text-cult-dark-gray font-normal">(optional)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="flex-1 bg-cult-charcoal/40 border border-cult-dark-gray/50 text-cult-white text-xs py-2.5 px-2.5 rounded-sm focus:outline-none focus:border-cult-medium-gray min-h-[44px]"
              />
              {endDate && (
                <button
                  type="button"
                  onClick={() => setEndDate('')}
                  className="px-2.5 py-2.5 min-h-[44px] text-xs text-cult-medium-gray hover:text-cult-danger border border-cult-dark-gray/50 hover:border-cult-danger/30 rounded-sm transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            {endDate && (
              <p className="mt-1 text-[10px] text-cult-dark-gray">
                Tasks will stop generating after {new Date(endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        </>
      )}

      {/* Phase-day mode fields */}
      {schedulingMode === 'phase_day' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1.5 font-semibold">Start Day</label>
              <input
                type="number"
                value={phaseDayStart}
                onChange={(e) => setPhaseDayStart(e.target.value)}
                placeholder="1"
                min="1"
                className="w-full bg-cult-charcoal/40 border border-cult-dark-gray/50 text-cult-white text-xs py-2.5 px-2.5 rounded-sm focus:outline-none focus:border-violet-600 min-h-[44px] placeholder:text-cult-dark-gray"
              />
            </div>
            <div>
              <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1.5 font-semibold">
                End Day <span className="text-cult-dark-gray font-normal">(opt.)</span>
              </label>
              <input
                type="number"
                value={phaseDayEnd}
                onChange={(e) => setPhaseDayEnd(e.target.value)}
                placeholder="∞"
                min={phaseDayStart || '1'}
                className="w-full bg-cult-charcoal/40 border border-cult-dark-gray/50 text-cult-white text-xs py-2.5 px-2.5 rounded-sm focus:outline-none focus:border-violet-600 min-h-[44px] placeholder:text-cult-dark-gray"
              />
            </div>
          </div>

          {!isSingleDay && (
            <div>
              <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1.5 font-semibold">
                Repeat Every <span className="text-cult-dark-gray font-normal">(days)</span>
              </label>
              <input
                type="number"
                value={intervalDays}
                onChange={(e) => setIntervalDays(e.target.value)}
                placeholder="Leave blank for every day"
                min="1"
                className="w-full bg-cult-charcoal/40 border border-cult-dark-gray/50 text-cult-white text-xs py-2.5 px-2.5 rounded-sm focus:outline-none focus:border-violet-600 min-h-[44px] placeholder:text-cult-dark-gray"
              />
            </div>
          )}

          <div className="rounded-sm bg-violet-950/20 border border-violet-800/20 p-2.5">
            <p className="text-[11px] text-violet-300/80">
              {isSingleDay
                ? `One-time task on day ${phaseDayStart} of the stage`
                : intervalDays
                  ? `Every ${intervalDays} days${phaseDayStart ? `, starting day ${phaseDayStart}` : ''}${phaseDayEnd ? ` through day ${phaseDayEnd}` : ''}`
                  : `Daily${phaseDayStart ? ` from day ${phaseDayStart}` : ''}${phaseDayEnd ? ` through day ${phaseDayEnd}` : ''}`
              }
            </p>
          </div>
        </>
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
                  ? PRIORITY_COLOR[p]?.active ?? 'bg-cult-charcoal text-cult-white border border-cult-medium-gray'
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
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-cult-danger hover:bg-cult-danger-muted active:bg-cult-danger-muted rounded-sm transition-colors"
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
