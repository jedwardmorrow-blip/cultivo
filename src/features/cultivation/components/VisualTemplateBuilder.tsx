/**
 * Visual Template Builder — weekly timeline for task scheduling
 *
 * Design: Task blocks on a Mon-Sun lane grid. Tap to add/remove.
 * Stagger toggle for multi-room application.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Check, Layers, Shuffle, Save } from 'lucide-react';
import { useScheduleTemplates } from '../hooks/useScheduleTemplates';
import type { ScheduleTemplate, TemplateScheduleItem } from '../hooks/useScheduleTemplates';
import { useGrowRooms } from '../hooks/useGrowRooms';
import { getTaskTypeConfig } from '../types';
import type { TaskType } from '../types';

const GLASS = 'rounded-2xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]';
const GLASS_ELEVATED = 'rounded-2xl border border-white/[0.12] bg-white/[0.09] backdrop-blur-2xl shadow-[0_12px_48px_rgba(0,0,0,0.6)]';
const GOLD = '#D4A843';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_INDEX: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
const ROOM_TYPES = ['flower', 'veg', 'clone', 'mother'] as const;

const AVAILABLE_TASKS: TaskType[] = [
  'batch_tank_mix', 'ipm_spray', 'scouting', 'defoliation', 'cleaning',
  'training', 'saturation_check', 'irrigation_audit', 'maintenance', 'custom',
];

// Map schedule items to which days they appear on
function getTaskDays(item: TemplateScheduleItem): string[] {
  if (item.recurrence === 'daily') return [...DAYS];
  if (item.day_of_week && item.day_of_week.length > 0) {
    return item.day_of_week.map(d => DAYS[d === 0 ? 6 : d - 1]).filter(Boolean);
  }
  return [];
}

interface VisualTemplateBuilderProps {
  inline?: boolean;
}

export function VisualTemplateBuilder({ inline }: VisualTemplateBuilderProps) {
  const { templates, loading, updateTemplate, createTemplate, applyTemplateToRooms } = useScheduleTemplates();
  const { rooms } = useGrowRooms();

  const [selectedType, setSelectedType] = useState<string>('flower');
  const [editingSchedules, setEditingSchedules] = useState<TemplateScheduleItem[] | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [stagger, setStagger] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const template = useMemo(() => {
    return templates.find(t => t.room_type === selectedType && t.is_default) ?? templates.find(t => t.room_type === selectedType) ?? null;
  }, [templates, selectedType]);

  const schedules = editingSchedules ?? template?.schedules ?? [];

  // Build a grid: day → tasks on that day
  const dayGrid = useMemo(() => {
    const grid: Record<string, Array<{ item: TemplateScheduleItem; index: number }>> = {};
    for (const day of DAYS) grid[day] = [];

    schedules.forEach((item, index) => {
      const days = getTaskDays(item);
      days.forEach(day => {
        grid[day]?.push({ item, index });
      });
    });
    return grid;
  }, [schedules]);

  const roomsOfType = useMemo(() => rooms.filter(r => r.room_type === selectedType && r.is_active), [rooms, selectedType]);

  function startEditing() {
    setEditingSchedules([...(template?.schedules ?? [])]);
  }

  function addTask(taskType: TaskType, days: number[]) {
    if (!editingSchedules) startEditing();
    const newItem: TemplateScheduleItem = {
      task_type: taskType,
      recurrence: days.length === 7 ? 'daily' : 'weekly',
      day_of_week: days.length === 7 ? undefined : days,
      priority: 'medium',
    };
    setEditingSchedules(prev => [...(prev ?? template?.schedules ?? []), newItem]);
  }

  function removeTask(index: number) {
    if (!editingSchedules) startEditing();
    setEditingSchedules(prev => {
      const list = [...(prev ?? template?.schedules ?? [])];
      list.splice(index, 1);
      return list;
    });
  }

  async function handleSave() {
    if (!editingSchedules) return;
    setSaving(true);
    try {
      if (template) {
        await updateTemplate(template.id, { schedules: editingSchedules });
      } else {
        await createTemplate({
          name: `Standard ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`,
          room_type: selectedType,
          schedules: editingSchedules,
          is_default: true,
        });
      }
      setEditingSchedules(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleApply() {
    if (!template || selectedRoomIds.size === 0) return;
    setSaving(true);
    try {
      await applyTemplateToRooms(template.id, [...selectedRoomIds], stagger);
      setShowApply(false);
      setSelectedRoomIds(new Set());
    } finally {
      setSaving(false);
    }
  }

  function toggleRoom(roomId: string) {
    setSelectedRoomIds(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }

  if (loading) {
    return <div className={`${GLASS} p-6 animate-pulse h-64`} />;
  }

  return (
    <div className="space-y-5">
      {/* Room type tabs */}
      <div className="flex gap-2">
        {ROOM_TYPES.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => { setSelectedType(type); setEditingSchedules(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-medium uppercase tracking-wider transition-all active:scale-95 ${
              selectedType === type
                ? 'bg-white/10 text-white border border-white/15'
                : 'text-white/30 hover:text-white/50 hover:bg-white/5 border border-transparent'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Weekly timeline */}
      <div className={`${GLASS} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">
            {template?.name ?? `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Template`}
          </h3>
          <div className="flex gap-2">
            {editingSchedules && (
              <>
                <button
                  type="button"
                  onClick={() => setEditingSchedules(null)}
                  className="text-xs px-3 py-1.5 rounded-lg text-white/40 hover:text-white/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors active:scale-95"
                >
                  <Save className="w-3 h-3" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
            {!editingSchedules && template && (
              <button
                type="button"
                onClick={() => setShowApply(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors active:scale-95"
              >
                <Layers className="w-3 h-3" />
                Apply to Rooms
              </button>
            )}
          </div>
        </div>

        {/* Day columns */}
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map(day => (
            <div key={day} className="space-y-2">
              <div className="text-center text-[10px] text-white/25 uppercase tracking-wider font-medium py-1">
                {day}
              </div>
              <div className="space-y-1.5 min-h-[120px]">
                {dayGrid[day].map(({ item, index }) => {
                  const config = getTaskTypeConfig(item.task_type);
                  return (
                    <motion.div
                      key={`${item.task_type}-${index}`}
                      layout
                      className="relative group"
                    >
                      <div
                        className="px-2 py-1.5 rounded-lg text-[10px] font-medium truncate border border-white/5"
                        style={{
                          backgroundColor: `${config.color}15`,
                          color: `${config.color}cc`,
                        }}
                      >
                        {config.label}
                      </div>
                      {editingSchedules && (
                        <button
                          type="button"
                          onClick={() => removeTask(index)}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}

                {/* Add task to this day */}
                {editingSchedules && (
                  <AddTaskButton
                    day={day}
                    onAdd={(taskType) => addTask(taskType, [DAY_INDEX[day]])}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Edit mode toggle */}
        {!editingSchedules && (
          <button
            type="button"
            onClick={startEditing}
            className="mt-4 w-full py-2.5 rounded-xl border border-dashed border-white/10 text-xs text-white/25 hover:text-white/40 hover:border-white/20 transition-colors"
          >
            Tap to edit template
          </button>
        )}

        {/* Add daily task shortcut */}
        {editingSchedules && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-[10px] text-white/20 uppercase tracking-wider mb-2">Add daily task</p>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TASKS.map(type => {
                const config = getTaskTypeConfig(type);
                const alreadyDaily = schedules.some(s => s.task_type === type && s.recurrence === 'daily');
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addTask(type, [0, 1, 2, 3, 4, 5, 6])}
                    disabled={alreadyDaily}
                    className="px-2.5 py-1 rounded-lg text-[10px] border border-white/5 transition-all active:scale-95 disabled:opacity-20"
                    style={{
                      backgroundColor: alreadyDaily ? 'transparent' : `${config.color}10`,
                      color: `${config.color}99`,
                    }}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Apply to Rooms panel */}
      <AnimatePresence>
        {showApply && template && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={`${GLASS} p-5 space-y-4`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Apply "{template.name}" to rooms</h3>
                <button type="button" onClick={() => setShowApply(false)} className="p-1.5 hover:bg-white/10 rounded-lg">
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>

              {/* Room selection */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {roomsOfType.map(room => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => toggleRoom(room.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all active:scale-95 ${
                      selectedRoomIds.has(room.id)
                        ? 'bg-white/10 border-white/20'
                        : 'bg-white/[0.03] border-white/5 hover:bg-white/5'
                    }`}
                  >
                    {selectedRoomIds.has(room.id) && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    <span className="text-xs font-mono text-white/70">{room.room_code}</span>
                  </button>
                ))}
                {roomsOfType.length === 0 && (
                  <p className="text-xs text-white/20 col-span-full">No active {selectedType} rooms</p>
                )}
              </div>

              {/* Stagger toggle */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Shuffle className="w-4 h-4 text-white/30" />
                  <div>
                    <p className="text-xs text-white/60">Stagger heavy tasks</p>
                    <p className="text-[10px] text-white/25">Offset task days per room so no two rooms share the same heavy day</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStagger(!stagger)}
                  className={`w-10 h-5 rounded-full transition-colors ${stagger ? 'bg-emerald-500' : 'bg-white/10'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${stagger ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Apply button */}
              <button
                type="button"
                onClick={handleApply}
                disabled={saving || selectedRoomIds.size === 0}
                className="w-full py-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-30 transition-colors active:scale-[0.98]"
              >
                {saving ? 'Applying...' : `Apply to ${selectedRoomIds.size} room${selectedRoomIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Small popover for adding a task to a specific day
function AddTaskButton({ day, onAdd }: { day: string; onAdd: (type: TaskType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full py-1 rounded-lg border border-dashed border-white/[0.06] text-white/15 hover:text-white/30 hover:border-white/15 transition-colors flex items-center justify-center"
      >
        <Plus className="w-3 h-3" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`absolute top-full left-0 mt-1 z-20 w-36 ${GLASS_ELEVATED} p-1.5 space-y-0.5`}
          >
            {AVAILABLE_TASKS.map(type => {
              const config = getTaskTypeConfig(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => { onAdd(type); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] text-white/60 hover:bg-white/10 transition-colors text-left"
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
                  {config.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
