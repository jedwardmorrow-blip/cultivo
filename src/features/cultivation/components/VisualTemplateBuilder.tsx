/**
 * Schedule Builder — Command Center quality page for task template management.
 *
 * Entry: 4 glass tiles (flower/veg/clone/mother) with mini weekly previews.
 * Expanded: Bento card swap — selected type fills main panel, others sidebar.
 * Edit mode: add/remove tasks per day. Apply mode: push to rooms + generate.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  LayoutGroup,
} from 'framer-motion';
import {
  Plus,
  X,
  Check,
  Shuffle,
  Save,
  ChevronDown,
  ChevronLeft,
  Pencil,
  Settings,
  Lock,
  ClipboardList,
  Wrench,
  Scissors,
  Droplets,
  Search,
  SprayCan,
  Sparkles,
  Wheat,
  Sprout,
  GitBranch,
  ArrowRightLeft,
  Beaker,
  Clock,
  Skull,
} from 'lucide-react';
import { useScheduleTemplates } from '../hooks/useScheduleTemplates';
import { useTaskTypeSettings } from '../hooks/useTaskTypeSettings';
import type { TaskTypeSetting, CreateTaskTypeInput, UpdateTaskTypeInput } from '../hooks/useTaskTypeSettings';
import type {
  ScheduleTemplate,
  TemplateScheduleItem,
} from '../hooks/useScheduleTemplates';
import { useGrowRooms } from '../hooks/useGrowRooms';
import { useGenerateTasksFromSchedules } from '../hooks/useGenerateTasksFromSchedules';
import { getTaskTypeConfig } from '../types';
import type { TaskType } from '../types';
import { todayIso } from '../utils/dateUtils';

/* ── constants ─────────────────────────────────────────────────────── */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_INDEX: Record<string, number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0,
};
const ROOM_TYPES = ['flower', 'veg', 'clone', 'mother'] as const;
type RoomTypeKey = (typeof ROOM_TYPES)[number];

const STAGE_COLORS: Record<RoomTypeKey, string> = {
  flower: '#F43F5E',
  veg: '#10B981',
  clone: '#0EA5E9',
  mother: '#F59E0B',
};

const AVAILABLE_TASKS: TaskType[] = [
  'batch_tank_mix', 'ipm_spray', 'scouting', 'defoliation', 'cleaning',
  'training', 'saturation_check', 'irrigation_audit', 'maintenance', 'custom',
];

type PageMode = 'templates' | 'task-types';

const ICON_MAP: Record<string, typeof Wrench> = {
  SprayCan, Scissors, ArrowRightLeft, Sparkles, Wheat,
  Droplets, Search, GitBranch, Sprout, Wrench, Beaker, Settings, Clock, Skull,
};
const AVAILABLE_ICONS = Object.keys(ICON_MAP);
const PRESET_COLORS = ['#0EA5E9', '#10B981', '#8B5CF6', '#6B7280', '#F43F5E', '#3B82F6', '#F59E0B', '#06B6D4', '#EC4899', '#14B8A6', '#6366F1', '#EF4444', '#A6A6A6'];

/* ── helpers ───────────────────────────────────────────────────────── */

function getTaskDays(item: TemplateScheduleItem): string[] {
  if (item.recurrence === 'daily') return [...DAYS];
  if (item.day_of_week && item.day_of_week.length > 0) {
    return item.day_of_week
      .map((d) => DAYS[d === 0 ? 6 : d - 1])
      .filter(Boolean);
  }
  return [];
}

function buildDayGrid(schedules: TemplateScheduleItem[]) {
  const grid: Record<string, Array<{ item: TemplateScheduleItem; index: number }>> = {};
  for (const day of DAYS) grid[day] = [];
  schedules.forEach((item, index) => {
    getTaskDays(item).forEach((day) => {
      grid[day]?.push({ item, index });
    });
  });
  return grid;
}

function taskCountForTemplate(t: ScheduleTemplate | null): number {
  if (!t) return 0;
  return t.schedules.reduce((acc, s) => acc + getTaskDays(s).length, 0);
}

/* ── animation variants ────────────────────────────────────────────── */

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
};

const springTransition = { type: 'spring' as const, stiffness: 300, damping: 28 };

/* ── main component ────────────────────────────────────────────────── */

export function ScheduleBuilder() {
  const navigate = useNavigate();
  const { templates, loading, updateTemplate, createTemplate, applyTemplateToRooms } =
    useScheduleTemplates();
  const { rooms } = useGrowRooms();
  const { generate } = useGenerateTasksFromSchedules();

  const [mode, setMode] = useState<PageMode>('templates');
  const [selectedType, setSelectedType] = useState<RoomTypeKey | null>(null);
  const [editingSchedules, setEditingSchedules] = useState<TemplateScheduleItem[] | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [stagger, setStagger] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [applySuccess, setApplySuccess] = useState<{ rooms: number; tasks: number } | null>(null);

  /* derived data */
  const templateForType = useCallback(
    (type: RoomTypeKey) =>
      templates.find((t) => t.room_type === type && t.is_default) ??
      templates.find((t) => t.room_type === type) ??
      null,
    [templates],
  );

  const template = selectedType ? templateForType(selectedType) : null;
  const schedules = editingSchedules ?? template?.schedules ?? [];
  const dayGrid = useMemo(() => buildDayGrid(schedules), [schedules]);

  const roomsOfType = useMemo(
    () =>
      selectedType
        ? rooms.filter((r) => r.room_type === selectedType && r.is_active)
        : [],
    [rooms, selectedType],
  );

  const isEditing = editingSchedules !== null;

  /* ── actions ─────────────────────────────────────────────────────── */

  function startEditing() {
    setEditingSchedules([...(template?.schedules ?? [])]);
  }

  function cancelEditing() {
    setEditingSchedules(null);
  }

  function addTask(taskType: TaskType, days: number[]) {
    if (!editingSchedules) startEditing();
    const newItem: TemplateScheduleItem = {
      task_type: taskType,
      recurrence: days.length === 7 ? 'daily' : 'weekly',
      day_of_week: days.length === 7 ? undefined : days,
      priority: 'medium',
    };
    setEditingSchedules((prev) => [...(prev ?? template?.schedules ?? []), newItem]);
  }

  function removeTask(index: number) {
    if (!editingSchedules) startEditing();
    setEditingSchedules((prev) => {
      const list = [...(prev ?? template?.schedules ?? [])];
      list.splice(index, 1);
      return list;
    });
  }

  async function handleSave() {
    if (!editingSchedules || !selectedType) return;
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
      const result = await applyTemplateToRooms(template.id, [...selectedRoomIds], todayIso(), stagger);
      const genResult = await generate(todayIso());
      setApplySuccess({
        rooms: result.appliedRoomCount,
        tasks: genResult.created,
      });
    } catch {
      // error handled by hooks
    } finally {
      setSaving(false);
    }
  }

  function toggleRoom(roomId: string) {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }

  function goBack() {
    setSelectedType(null);
    setEditingSchedules(null);
    setShowApply(false);
    setApplySuccess(null);
    setSelectedRoomIds(new Set());
  }

  /* ── page header with mode toggle (shared across all views) ──────── */

  const pageHeader = (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
          Templates & Tasks
        </h1>
        <p className="text-xs text-white/40 mt-1">
          {mode === 'templates' ? 'Schedule templates by room type' : 'Configure task types and completion fields'}
        </p>
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => { setMode('templates'); setSelectedType(null); }}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all duration-200 active:scale-95 ${
            mode === 'templates'
              ? 'bg-white/10 text-white/80 border border-white/15'
              : 'text-white/30 border border-transparent hover:bg-white/5'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Templates
        </button>
        <button
          type="button"
          onClick={() => setMode('task-types')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all duration-200 active:scale-95 ${
            mode === 'task-types'
              ? 'bg-white/10 text-white/80 border border-white/15'
              : 'text-white/30 border border-transparent hover:bg-white/5'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Task Types
        </button>
      </div>
    </div>
  );

  /* ── task types mode ────────────────────────────────────────────── */

  if (mode === 'task-types') {
    return (
      <div className="space-y-5">
        {pageHeader}
        <TaskTypesPanel />
      </div>
    );
  }

  /* ── loading state ───────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="space-y-5">
        {pageHeader}
        <div className="glass-card p-6 animate-pulse h-64" />
      </div>
    );
  }

  /* ── entry view: 4 tiles ─────────────────────────────────────────── */

  if (!selectedType) {
    return (
      <div className="space-y-5">
        {pageHeader}

        <LayoutGroup>
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            {ROOM_TYPES.map((type) => {
              const t = templateForType(type);
              const color = STAGE_COLORS[type];
              const count = taskCountForTemplate(t);
              const grid = t ? buildDayGrid(t.schedules) : null;

              return (
                <motion.button
                  key={type}
                  layoutId={type}
                  layout="position"
                  variants={staggerItem}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`p-5 rounded-2xl text-left transition-all duration-300 active:scale-[0.97] ${
                    t
                      ? 'glass-card hover:bg-white/[0.09] hover:border-white/[0.14] hover:scale-[1.01]'
                      : 'bg-white/[0.03] backdrop-blur-2xl border border-dashed border-white/[0.08] rounded-2xl hover:bg-white/[0.06] hover:border-white/[0.12]'
                  }`}
                  style={
                    t
                      ? {
                          borderColor: `${color}33`,
                          boxShadow: `0 0 20px ${color}15`,
                        }
                      : undefined
                  }
                >
                  <p className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3">
                    {type}
                  </p>

                  {t && grid ? (
                    <>
                      {/* Mini weekly preview */}
                      <div className="flex gap-1.5 mb-3">
                        {DAYS.map((day) => (
                          <div key={day} className="flex flex-col gap-0.5 items-center">
                            {grid[day].slice(0, 4).map(({ item }, i) => {
                              const cfg = getTaskTypeConfig(item.task_type);
                              return (
                                <div
                                  key={i}
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: cfg.color }}
                                />
                              );
                            })}
                            {grid[day].length === 0 && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white/[0.06]" />
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-white/40">
                        {t.name} &middot; {count} tasks/week
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-white/20 mt-4">
                      No template &middot; Tap to create
                    </p>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </LayoutGroup>
      </div>
    );
  }

  /* ── expanded view: bento card swap ──────────────────────────────── */

  const color = STAGE_COLORS[selectedType];
  const otherTypes = ROOM_TYPES.filter((t) => t !== selectedType);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors active:scale-95"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          All Templates
        </button>
        <div className="flex-1" />
        <h1 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
          Templates & Tasks
        </h1>
      </div>

      <LayoutGroup>
        <div className="grid grid-cols-5 gap-4">
          {/* ── Main panel (3/5) ─────────────────────────────────── */}
          <motion.div
            layoutId={selectedType}
            layout="position"
            transition={springTransition}
            className="col-span-5 lg:col-span-3 glass-card p-5 space-y-4"
            style={{
              borderColor: `${color}33`,
              boxShadow: `0 0 20px ${color}15`,
            }}
          >
            {/* Template header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white/80">
                  {template?.name ?? `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Template`}
                </h2>
                <p className="text-xs text-white/40 mt-0.5">
                  {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} room schedule
                </p>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="text-xs px-3 py-1.5 rounded-lg text-white/40 hover:text-white/60 transition-colors active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all duration-200 active:scale-95"
                    >
                      <Save className="w-3 h-3" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={startEditing}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-all duration-200 active:scale-95"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    {template && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowApply(!showApply);
                          setApplySuccess(null);
                        }}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-all duration-200 active:scale-95"
                      >
                        Apply
                        <ChevronDown className={`w-3 h-3 transition-transform ${showApply ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Weekly timeline */}
            <div className="grid grid-cols-7 gap-3">
              {DAYS.map((day) => (
                <div key={day} className="space-y-2">
                  <div className="text-xs text-white/25 uppercase tracking-wider text-center font-medium py-1">
                    {day}
                  </div>
                  <div className="space-y-1.5 min-h-[200px]">
                    {dayGrid[day].map(({ item, index }) => {
                      const config = getTaskTypeConfig(item.task_type);
                      return (
                        <motion.div
                          key={`${item.task_type}-${index}`}
                          layout
                          className="relative group"
                        >
                          <div
                            className="rounded-xl px-3 py-2.5 text-[10px] font-medium truncate"
                            style={{
                              backgroundColor: `${config.color}15`,
                              borderWidth: 1,
                              borderColor: `${config.color}20`,
                              color: `${config.color}cc`,
                            }}
                          >
                            {config.label}
                          </div>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => removeTask(index)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </motion.div>
                      );
                    })}

                    {/* Empty column placeholder */}
                    {dayGrid[day].length === 0 && !isEditing && (
                      <div className="min-h-[60px] rounded-xl border border-dashed border-white/[0.06]" />
                    )}

                    {/* Add to this day */}
                    {isEditing && (
                      <AddTaskPopover
                        onAdd={(taskType) => addTask(taskType, [DAY_INDEX[day]])}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add daily task strip */}
            {isEditing && (
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] text-white/20 uppercase tracking-wider mb-2">
                  Add daily task
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_TASKS.map((type) => {
                    const config = getTaskTypeConfig(type);
                    const alreadyDaily = schedules.some(
                      (s) => s.task_type === type && s.recurrence === 'daily',
                    );
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addTask(type, [0, 1, 2, 3, 4, 5, 6])}
                        disabled={alreadyDaily}
                        className="px-2.5 py-1 rounded-lg text-[10px] border border-white/5 transition-all duration-200 active:scale-95 disabled:opacity-20"
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

            {/* Phase Milestones */}
            <PhaseMilestones
              schedules={schedules}
              isEditing={isEditing}
              onAdd={(taskType, phaseDay) => {
                if (!editingSchedules) startEditing();
                const newItem: TemplateScheduleItem = {
                  task_type: taskType,
                  recurrence: 'daily',
                  scheduling_mode: 'phase_day',
                  phase_day_start: phaseDay,
                  phase_day_end: phaseDay,
                  priority: 'medium',
                };
                setEditingSchedules((prev) => [...(prev ?? template?.schedules ?? []), newItem]);
              }}
              onRemove={(index) => {
                if (!editingSchedules) startEditing();
                setEditingSchedules((prev) => {
                  const list = [...(prev ?? template?.schedules ?? [])];
                  list.splice(index, 1);
                  return list;
                });
              }}
            />

            {/* Apply panel (slide-down) */}
            <AnimatePresence>
              {showApply && !isEditing && template && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 border-t border-white/5 space-y-4">
                    {applySuccess ? (
                      /* ── Success state ─────────────────────────── */
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl border p-5 text-center space-y-3"
                        style={{
                          borderColor: '#10B98133',
                          boxShadow: '0 0 20px #10B98115',
                          background: 'rgba(16, 185, 129, 0.05)',
                        }}
                      >
                        <p className="text-sm text-emerald-300 font-semibold">
                          Applied to {applySuccess.rooms} room{applySuccess.rooms !== 1 ? 's' : ''} &middot; {applySuccess.tasks} tasks generated
                        </p>
                        <div className="flex gap-3 justify-center">
                          <button
                            type="button"
                            onClick={goBack}
                            className="text-xs px-4 py-2 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-all duration-200 active:scale-95"
                          >
                            Back to Schedule Builder
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/cultivation-command-center')}
                            className="text-xs px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all duration-200 active:scale-95"
                          >
                            Open Command Center &rarr;
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      /* ── Room selection ─────────────────────────── */
                      <>
                        <h3 className="text-sm font-semibold text-white/80">
                          Apply &ldquo;{template.name}&rdquo; to rooms
                        </h3>

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {roomsOfType.map((room) => {
                            const isSelected = selectedRoomIds.has(room.id);
                            return (
                              <button
                                key={room.id}
                                type="button"
                                onClick={() => toggleRoom(room.id)}
                                className={`relative p-3 rounded-xl border transition-all duration-200 active:scale-95 text-left ${
                                  isSelected
                                    ? 'glass-elevated'
                                    : 'bg-white/[0.03] border-white/5 hover:bg-white/5'
                                }`}
                                style={
                                  isSelected
                                    ? { borderColor: `${color}33` }
                                    : undefined
                                }
                              >
                                <div className="flex items-center gap-2">
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  )}
                                  <span className="font-mono text-xs text-white/70">
                                    {room.room_code}
                                  </span>
                                </div>
                                {/* Mini 7-day strip */}
                                <div className="flex gap-0.5 mt-2">
                                  {DAYS.map((day, di) => {
                                    const offset = stagger && isSelected ? di % 2 : 0;
                                    const hasTasks = dayGrid[day].length > 0;
                                    return (
                                      <div
                                        key={day}
                                        className="w-2 h-1.5 rounded-sm transition-all duration-300"
                                        style={{
                                          backgroundColor:
                                            hasTasks && !offset
                                              ? `${color}40`
                                              : hasTasks && offset
                                                ? `${color}20`
                                                : 'rgba(255,255,255,0.04)',
                                        }}
                                      />
                                    );
                                  })}
                                </div>
                              </button>
                            );
                          })}
                          {roomsOfType.length === 0 && (
                            <p className="text-xs text-white/20 col-span-full">
                              No active {selectedType} rooms
                            </p>
                          )}
                        </div>

                        {/* Stagger toggle */}
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2">
                            <Shuffle className="w-4 h-4 text-white/30" />
                            <div>
                              <p className="text-xs text-white/60">Stagger heavy tasks</p>
                              <p className="text-[10px] text-white/25">
                                Offset task days per room so no two rooms share the same heavy day
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setStagger(!stagger)}
                            className={`w-10 h-5 rounded-full transition-colors ${
                              stagger ? 'bg-emerald-500' : 'bg-white/10'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                                stagger ? 'translate-x-5' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Apply button */}
                        <button
                          type="button"
                          onClick={handleApply}
                          disabled={saving || selectedRoomIds.size === 0}
                          className="w-full rounded-xl py-3 bg-emerald-500/20 text-emerald-300 text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-30 transition-all duration-200 active:scale-[0.98]"
                        >
                          {saving
                            ? 'Applying...'
                            : `Apply to ${selectedRoomIds.size} room${selectedRoomIds.size !== 1 ? 's' : ''}`}
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Sidebar (2/5) ──────────────────────────────────── */}
          <div className="col-span-5 lg:col-span-2 space-y-3">
            {otherTypes.map((type) => {
              const t = templateForType(type);
              const sColor = STAGE_COLORS[type];
              const count = taskCountForTemplate(t);

              return (
                <motion.button
                  key={type}
                  layoutId={type}
                  layout="position"
                  transition={springTransition}
                  type="button"
                  onClick={() => {
                    setSelectedType(type);
                    setEditingSchedules(null);
                    setShowApply(false);
                    setApplySuccess(null);
                    setSelectedRoomIds(new Set());
                  }}
                  className="w-full p-4 rounded-2xl glass-card text-left hover:bg-white/[0.09] hover:border-white/[0.14] hover:scale-[1.01] transition-all duration-300 active:scale-[0.97]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                        {type}
                      </p>
                      {t ? (
                        <p className="text-[10px] text-white/30 mt-0.5 truncate">
                          {t.name} &middot; {count} tasks/week
                        </p>
                      ) : (
                        <p className="text-[10px] text-white/20 mt-0.5">No template</p>
                      )}
                    </div>

                    {/* Mini preview dots */}
                    {t && (
                      <div className="flex gap-1">
                        {DAYS.map((day) => {
                          const grid = buildDayGrid(t.schedules);
                          return (
                            <div key={day} className="flex flex-col gap-0.5 items-center">
                              {grid[day].slice(0, 3).map(({ item }, i) => {
                                const cfg = getTaskTypeConfig(item.task_type);
                                return (
                                  <div
                                    key={i}
                                    className="w-1 h-1 rounded-full"
                                    style={{ backgroundColor: cfg.color }}
                                  />
                                );
                              })}
                              {grid[day].length === 0 && (
                                <div className="w-1 h-1 rounded-full bg-white/[0.06]" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}

            {/* Active indicator */}
            <div
              className="p-3 rounded-xl border text-center"
              style={{
                borderColor: `${color}33`,
                background: `${color}08`,
              }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
                ● {selectedType} active
              </p>
            </div>
          </div>
        </div>
      </LayoutGroup>
    </div>
  );
}

/* ── backwards compat export ───────────────────────────────────────── */
export { ScheduleBuilder as VisualTemplateBuilder };

/* ══════════════════════════════════════════════════════════════════════
   TASK TYPES PANEL — glass-styled task type management
   ══════════════════════════════════════════════════════════════════════ */

function TaskTypesPanel() {
  const { settings, loading, createTaskType, updateTaskType, deleteTaskType } = useTaskTypeSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Fall back to TASK_TYPE_CONFIG if no settings in DB
  const types: TaskTypeSetting[] = useMemo(() => {
    if (settings.length > 0) return settings;
    return (AVAILABLE_TASKS).map((key, i) => {
      const config = getTaskTypeConfig(key);
      return {
        id: key,
        task_key: key,
        label: config.label,
        description: '',
        color: config.color,
        icon: (config as Record<string, unknown>).icon as string ?? 'Wrench',
        fields: [],
        is_enabled: true,
        sort_order: i * 10 + 10,
        is_builtin: true,
        created_at: '',
        updated_at: '',
      };
    });
  }, [settings]);

  const editingType = editingId ? types.find(t => t.id === editingId) ?? null : null;

  if (loading) {
    return <div className="glass-card p-6 animate-pulse h-64" />;
  }

  // Editing a single task type
  if (editingType || creating) {
    return (
      <TaskTypeEditor
        taskType={editingType}
        onSave={async (input) => {
          if (editingType) {
            await updateTaskType(editingType.id, input);
          } else {
            await createTaskType(input as CreateTaskTypeInput);
          }
          setEditingId(null);
          setCreating(false);
        }}
        onDelete={editingType && !editingType.is_builtin ? async () => {
          await deleteTaskType(editingType.id);
          setEditingId(null);
        } : undefined}
        onCancel={() => { setEditingId(null); setCreating(false); }}
      />
    );
  }

  // Grid view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/30">{types.filter(t => t.is_enabled).length} active task types</p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25 transition-all duration-200 active:scale-95"
        >
          <Plus className="w-3 h-3" />
          New Task Type
        </button>
      </div>

      <motion.div
        className="grid grid-cols-2 lg:grid-cols-3 gap-3"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {types.map((tt) => {
          const Icon = ICON_MAP[tt.icon] ?? Wrench;
          return (
            <motion.button
              key={tt.id}
              variants={staggerItem}
              type="button"
              onClick={() => setEditingId(tt.id)}
              className={`glass-card p-4 text-left hover:bg-white/[0.09] hover:border-white/[0.14] hover:scale-[1.01] transition-all duration-300 active:scale-[0.97] ${
                !tt.is_enabled ? 'opacity-40' : ''
              }`}
              style={{ borderLeftWidth: 3, borderLeftColor: `${tt.color}60` }}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${tt.color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: tt.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wider block truncate">{tt.label}</span>
                  {!tt.is_enabled && <span className="text-[9px] text-amber-400">Disabled</span>}
                </div>
                {tt.is_builtin
                  ? <Lock className="w-3 h-3 text-white/15 flex-shrink-0" />
                  : <Pencil className="w-3 h-3 text-white/15 flex-shrink-0" />
                }
              </div>
              {tt.description && (
                <p className="text-[10px] text-white/30 leading-relaxed line-clamp-2 mb-2">{tt.description}</p>
              )}
              {tt.fields && tt.fields.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tt.fields.slice(0, 3).map(f => (
                    <span key={f} className="text-[9px] text-white/20 px-1.5 py-0.5 rounded bg-white/[0.04]">{f}</span>
                  ))}
                  {tt.fields.length > 3 && <span className="text-[9px] text-white/15">+{tt.fields.length - 3}</span>}
                </div>
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ── Task Type Editor ─────────────────────────────────────────────── */

function TaskTypeEditor({ taskType, onSave, onDelete, onCancel }: {
  taskType: TaskTypeSetting | null;
  onSave: (input: UpdateTaskTypeInput & Partial<CreateTaskTypeInput>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}) {
  const isNew = !taskType;
  const [label, setLabel] = useState(taskType?.label ?? '');
  const [taskKey, setTaskKey] = useState(taskType?.task_key ?? '');
  const [description, setDescription] = useState(taskType?.description ?? '');
  const [color, setColor] = useState(taskType?.color ?? '#A6A6A6');
  const [icon, setIcon] = useState(taskType?.icon ?? 'Wrench');
  const [fields, setFields] = useState<string[]>(taskType?.fields ?? []);
  const [isEnabled, setIsEnabled] = useState(taskType?.is_enabled ?? true);
  const [newField, setNewField] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!label.trim()) return;
    setSaving(true);
    try {
      const input: UpdateTaskTypeInput & Partial<CreateTaskTypeInput> = {
        label: label.trim(),
        description: description.trim(),
        color,
        icon,
        fields,
        is_enabled: isEnabled,
      };
      if (isNew) {
        const key = taskKey.trim() || label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        (input as CreateTaskTypeInput).task_key = key;
      }
      await onSave(input);
    } finally {
      setSaving(false);
    }
  }

  function addField() {
    if (newField.trim() && !fields.includes(newField.trim())) {
      setFields([...fields, newField.trim()]);
      setNewField('');
    }
  }

  function removeField(f: string) {
    setFields(fields.filter(x => x !== f));
  }

  const SelectedIcon = ICON_MAP[icon] ?? Wrench;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 space-y-5"
      style={{ borderLeftWidth: 3, borderLeftColor: `${color}60` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors active:scale-95"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <h2 className="text-sm font-semibold text-white/80">
            {isNew ? 'New Task Type' : `Edit: ${taskType.label}`}
          </h2>
        </div>
        <div className="flex gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-xs px-3 py-1.5 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !label.trim()}
            className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all duration-200 active:scale-95 disabled:opacity-30"
          >
            <Save className="w-3 h-3" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: basic info */}
        <div className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
              <SelectedIcon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/70">{label || 'Task Name'}</p>
              <p className="text-[10px] text-white/30">{description || 'Description...'}</p>
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Flush"
              className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25"
            />
          </div>

          {isNew && (
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Key (auto-generated if blank)</label>
              <input
                type="text"
                value={taskKey}
                onChange={(e) => setTaskKey(e.target.value)}
                placeholder="e.g., flush"
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder:text-white/25"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What does this task involve?"
              className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 resize-none"
            />
          </div>

          {/* Enable toggle */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-white/50">Active</span>
            <button
              type="button"
              onClick={() => setIsEnabled(!isEnabled)}
              className={`w-10 h-5 rounded-full transition-colors ${isEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Right: color, icon, fields */}
        <div className="space-y-4">
          {/* Color picker */}
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-2 block">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg transition-all active:scale-90 ${color === c ? 'ring-2 ring-white/30 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: `${c}40`, borderWidth: 1, borderColor: `${c}60` }}
                />
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-2 block">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_ICONS.map(name => {
                const Ic = ICON_MAP[name] ?? Wrench;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIcon(name)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                      icon === name ? 'bg-white/15 border border-white/20' : 'bg-white/[0.04] hover:bg-white/[0.08]'
                    }`}
                  >
                    <Ic className="w-4 h-4" style={{ color: icon === name ? color : 'rgba(255,255,255,0.3)' }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Completion fields */}
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-2 block">Completion Fields</label>
            <div className="space-y-1.5 mb-2">
              {fields.map(f => (
                <div key={f} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <span className="text-xs text-white/50 flex-1">{f}</span>
                  <button
                    type="button"
                    onClick={() => removeField(f)}
                    className="text-white/20 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newField}
                onChange={(e) => setNewField(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addField()}
                placeholder="Add field..."
                className="flex-1 glass-input rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/20"
              />
              <button
                type="button"
                onClick={addField}
                disabled={!newField.trim()}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-20"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── sub-components ────────────────────────────────────────────────── */

function AddTaskPopover({ onAdd }: { onAdd: (type: TaskType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full py-1.5 rounded-lg border border-dashed border-white/[0.06] text-white/15 hover:text-white/30 hover:border-white/15 transition-colors flex items-center justify-center"
      >
        <Plus className="w-3 h-3" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 mt-1 z-20 w-48 glass-elevated p-2 space-y-0.5"
          >
            {AVAILABLE_TASKS.map((type) => {
              const config = getTaskTypeConfig(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    onAdd(type);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] text-white/60 hover:bg-white/10 transition-colors text-left"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
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

/* ── Phase Milestones sub-component ───────────────────────────────── */

function PhaseMilestones({
  schedules,
  isEditing,
  onAdd,
  onRemove,
}: {
  schedules: TemplateScheduleItem[];
  isEditing: boolean;
  onAdd: (taskType: TaskType, phaseDay: number) => void;
  onRemove: (index: number) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType | null>(null);
  const [phaseDay, setPhaseDay] = useState(1);

  const milestones = schedules
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.scheduling_mode === 'phase_day')
    .sort((a, b) => (a.item.phase_day_start ?? 0) - (b.item.phase_day_start ?? 0));

  function handleAdd() {
    if (!selectedTaskType) return;
    onAdd(selectedTaskType, phaseDay);
    setSelectedTaskType(null);
    setPhaseDay(1);
    setPopoverOpen(false);
  }

  return (
    <div className="pt-4 border-t border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] text-white/20 uppercase tracking-wider">Phase Milestones</h3>
        {isEditing && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setPopoverOpen(!popoverOpen);
                setSelectedTaskType(null);
                setPhaseDay(1);
              }}
              className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/50 transition-colors active:scale-95"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>

            <AnimatePresence>
              {popoverOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full right-0 mt-1 z-20 w-56 glass-elevated p-2 space-y-1"
                >
                  {!selectedTaskType ? (
                    AVAILABLE_TASKS.map((type) => {
                      const config = getTaskTypeConfig(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSelectedTaskType(type)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] text-white/60 hover:bg-white/10 transition-colors text-left"
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                          {config.label}
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-2 space-y-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: getTaskTypeConfig(selectedTaskType).color }}
                        />
                        <span className="text-[10px] text-white/60">
                          {getTaskTypeConfig(selectedTaskType).label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-white/30">Day</label>
                        <input
                          type="number"
                          min={1}
                          value={phaseDay}
                          onChange={(e) => setPhaseDay(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80 font-mono focus:outline-none focus:border-white/20"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTaskType(null)}
                          className="flex-1 text-[10px] px-2 py-1.5 rounded-lg text-white/40 hover:text-white/60 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleAdd}
                          className="flex-1 flex items-center justify-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all duration-200 active:scale-95"
                        >
                          <Check className="w-3 h-3" />
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {milestones.length > 0 ? (
        <div className="space-y-1.5">
          {milestones.map(({ item, index }) => {
            const config = getTaskTypeConfig(item.task_type);
            return (
              <div
                key={`milestone-${index}`}
                className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ backgroundColor: `${config.color}08` }}
              >
                <div className="w-2 h-2 rotate-45" style={{ backgroundColor: config.color }} />
                <span className="text-xs font-medium flex-1" style={{ color: `${config.color}cc` }}>
                  {config.label}
                </span>
                <span className="text-xs text-white/30 font-mono">Day {item.phase_day_start}</span>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-white/20 hover:text-red-400" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !isEditing && (
          <p className="text-[10px] text-white/15">No milestones set</p>
        )
      )}
    </div>
  );
}
