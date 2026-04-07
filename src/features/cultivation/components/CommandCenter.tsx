/**
 * Command Center — Cultivation operational hub
 *
 * Design system: Liquid Glass + Bento Grid
 * Philosophy: "Less enterprise SaaS, more Tesla touchscreen"
 * See context DB: cultops_design_philosophy, design_language_master
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  Sprout, ClipboardList, AlertTriangle, Plus,
  CheckCircle2, Clock, ChevronLeft, ChevronRight, ChevronDown, X, Wheat,
  ArrowRightLeft, Skull, Printer, Users, CalendarDays, GripVertical,
} from 'lucide-react';
import { useRoomOperationalState, type RoomOperationalState } from '../hooks/useRoomOperationalState';
import { useDailyTasks } from '../hooks/useDailyTasks';
import { usePlantGroups } from '../hooks/usePlantGroups';
import { useGrowRooms } from '../hooks/useGrowRooms';
import { useFeedProgramRecipe } from '../hooks/useFeedProgramRecipe';
import { useActiveStaff } from '@features/sessions/hooks/useActiveStaff';
import { cultivationService } from '../services';
import { getTaskTypeConfig } from '../types';
import type { DailyTaskInstance, PlantGroup, IndividualPlant, RoomTable, SplitAndMoveInput, SplitAndMoveMultiInput, StrainCount } from '../types';
import type { SectionOccupancy } from '../types';
import type { TaskCardData } from './TaskCard';
import { TaskCompletionForm } from './TaskCompletionForm';
import { MoveToRoomModal } from './MoveToRoomModal';
import { PlantsByStrainCompact, PlantsByStrainExpanded } from './PlantsByStrain';
import { DeadPlantForm } from './DeadPlantForm';
import { PlantGroupLabelPrintModal } from './PlantGroupLabelPrintModal';
import { usePlantGroupLabel } from '../hooks/usePlantGroupLabel';
import { useGenerateTasksFromSchedules } from '../hooks/useGenerateTasksFromSchedules';
import { useTaskSchedules } from '../hooks/useTaskSchedules';
import { doesScheduleFireOnDate } from '../utils/scheduleResolution';
import { HarvestWorkflow } from './harvest';
import { todayIso } from '../utils/dateUtils';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { RoomTaskSchedule } from '../types';

// ═══════════════════════════════════════════════════════════════
// Design tokens — Liquid Glass
// ═══════════════════════════════════════════════════════════════

const GLASS = 'rounded-2xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]';
const GLASS_ELEVATED = 'rounded-2xl border border-white/[0.12] bg-white/[0.09] backdrop-blur-2xl shadow-[0_12px_48px_rgba(0,0,0,0.6)]';
const GLASS_TILE = 'rounded-2xl border border-white/[0.07] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]';
const GLASS_HOVER = 'hover:bg-white/[0.10] hover:border-white/[0.15] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]';
const GLASS_EMPTY = 'rounded-2xl border border-white/[0.04] bg-white/[0.02]';

// Page background gradient — gives glass something to blur against
const PAGE_BG = 'bg-gradient-to-br from-[#0a0f0a] via-[#080a08] to-[#060808]';

// Brand gold accent
const GOLD = '#D4A843';

// Stage color mapping — room type drives the glass tint
const STAGE_COLORS: Record<string, { base: string; glow: string }> = {
  flower: { base: '#F43F5E', glow: 'rgba(244,63,94,' },   // rose
  veg:    { base: '#10B981', glow: 'rgba(16,185,129,' },   // emerald
  clone:  { base: '#0EA5E9', glow: 'rgba(14,165,233,' },   // sky
  mother: { base: '#F59E0B', glow: 'rgba(245,158,11,' },   // amber
  mixed:  { base: '#8B5CF6', glow: 'rgba(139,92,246,' },   // purple
};

function getStageColor(roomType: string) {
  return STAGE_COLORS[roomType] ?? STAGE_COLORS.mixed;
}

function statusColor(urgency: number): string {
  if (urgency >= 3) return '#ef4444';
  if (urgency >= 2) return '#f59e0b';
  if (urgency >= 1) return '#eab308';
  return '#10b981';
}

function statusRingStyle(urgency: number, isEmpty: boolean, roomType?: string): React.CSSProperties {
  if (isEmpty) return { borderColor: 'rgba(255,255,255,0.06)' };
  // Use stage color for calm rooms, urgency color for attention rooms
  const color = urgency >= 2 ? statusColor(urgency) : getStageColor(roomType ?? 'mixed').base;
  return {
    borderColor: color,
    boxShadow: urgency >= 3
      ? `0 0 14px ${color}90, 0 0 40px ${color}35, inset 0 0 10px ${color}20`
      : urgency >= 2
        ? `0 0 12px ${color}70, 0 0 30px ${color}25`
        : `0 0 8px ${color}40, 0 0 20px ${color}15`,
  };
}

// Tile glass tint — room type colors the glass surface
function tileBg(roomType: string, urgency: number, isEmpty: boolean): string {
  if (isEmpty) return 'rgba(255,255,255,0.012)';
  const stage = getStageColor(roomType);
  if (urgency >= 3) return 'rgba(239,68,68,0.08)';
  if (urgency >= 2) return 'rgba(245,158,11,0.06)';
  return `${stage.glow}0.04)`;
}

// Tile border — tinted by stage
function tileBorder(roomType: string, urgency: number, isEmpty: boolean): string {
  if (isEmpty) return 'rgba(255,255,255,0.03)';
  if (urgency >= 3) return 'rgba(239,68,68,0.2)';
  if (urgency >= 2) return 'rgba(245,158,11,0.15)';
  const stage = getStageColor(roomType);
  return `${stage.glow}0.1)`;
}

// Stagger animation variants
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const tileVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

const expandVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } },
};

// ═══════════════════════════════════════════════════════════════
// LABOR OVERVIEW PANEL — tappable task counter dropdown
// ═══════════════════════════════════════════════════════════════

interface LaborOverviewProps {
  tasks: DailyTaskInstance[];
  opsRooms: RoomOperationalState[];
  staff: { id: string; first_name: string }[];
  onRoomClick: (code: string) => void;
  onClose: () => void;
}

function LaborOverviewPanel({ tasks, opsRooms, staff, onRoomClick, onClose }: LaborOverviewProps) {
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const pendingTasks = tasks.length - completedTasks - inProgressTasks;
  const assignedTasks = tasks.filter(t => t.assigned_to).length;
  const unassignedTasks = tasks.filter(t => !t.assigned_to && t.status !== 'completed' && t.status !== 'skipped').length;

  // Group tasks by task type for the summary strip
  const taskTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      counts[t.task_type] = (counts[t.task_type] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({ type, count, config: getTaskTypeConfig(type) }));
  }, [tasks]);

  // Group by room for breakdown
  const roomBreakdown = useMemo(() => {
    const roomMap = new Map<string, { code: string; type: string; total: number; assigned: number; done: number }>();
    for (const room of opsRooms) {
      if (room.occupancy_status === 'empty') continue;
      const roomTasks = tasks.filter(t => t.room_id === room.room_id);
      if (roomTasks.length === 0) continue;
      roomMap.set(room.room_code, {
        code: room.room_code,
        type: room.room_type,
        total: roomTasks.length,
        assigned: roomTasks.filter(t => t.assigned_to).length,
        done: roomTasks.filter(t => t.status === 'completed').length,
      });
    }
    return [...roomMap.values()].sort((a, b) => {
      const urgA = (a.total - a.done) - a.assigned;
      const urgB = (b.total - b.done) - b.assigned;
      if (urgB !== urgA) return urgB - urgA;
      return a.code.localeCompare(b.code);
    });
  }, [tasks, opsRooms]);

  // Staff task counts
  const staffBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach(t => {
      if (t.assigned_to) counts.set(t.assigned_to, (counts.get(t.assigned_to) ?? 0) + 1);
    });
    return staff
      .filter(s => counts.has(s.id))
      .map(s => ({ name: s.first_name, count: counts.get(s.id) ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }, [tasks, staff]);

  const progressPct = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
  const inProgressPct = tasks.length > 0 ? (inProgressTasks / tasks.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={`${GLASS_ELEVATED} p-5 space-y-4`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">Today's Workload</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* Task type summary strip */}
      {taskTypeCounts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {taskTypeCounts.map(({ type, count, config }) => (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border"
              style={{
                backgroundColor: `${config.color}15`,
                borderColor: `${config.color}20`,
                color: `${config.color}cc`,
              }}
            >
              {count} {config.label}
            </span>
          ))}
          <span className="inline-flex items-center px-2.5 py-1 text-[11px] text-white/30">
            {tasks.length} total
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="h-full bg-sky-500/60 transition-all duration-500"
            style={{ width: `${inProgressPct}%` }}
          />
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white/30">
          <span><span className="text-emerald-400">{completedTasks}</span> done</span>
          {inProgressTasks > 0 && <span><span className="text-sky-400">{inProgressTasks}</span> in progress</span>}
          <span>{pendingTasks} pending</span>
          <span className="mx-1">·</span>
          <span>{assignedTasks} assigned</span>
          {unassignedTasks > 0 && (
            <span className="text-amber-300">{unassignedTasks} unassigned</span>
          )}
        </div>
      </div>

      {/* Room breakdown */}
      {roomBreakdown.length > 0 && (
        <div className="bg-white/[0.04] backdrop-blur-[8px] border border-white/[0.06] rounded-xl overflow-hidden">
          {roomBreakdown.map((room, i) => {
            const stage = getStageColor(room.type);
            const open = room.total - room.done - room.assigned;
            const allDone = room.done === room.total;
            return (
              <button
                key={room.code}
                type="button"
                onClick={() => { onRoomClick(room.code); onClose(); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.04] transition-colors active:scale-[0.99] ${
                  i < roomBreakdown.length - 1 ? 'border-b border-white/[0.04]' : ''
                }`}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage.base }} />
                <span className="font-mono text-xs text-white/70 w-16">{room.code}</span>
                <span className="text-xs text-white/40">{room.total} task{room.total !== 1 ? 's' : ''}</span>
                <div className="flex-1" />
                {allDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : open > 0 ? (
                  <span className="text-[10px] text-amber-300 font-medium">{open} open</span>
                ) : (
                  <span className="text-[10px] text-white/25">{room.assigned} assigned</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Crew strip */}
      {staffBreakdown.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Users className="w-3 h-3 text-white/20 mr-1" />
          {staffBreakdown.map(s => (
            <span key={s.name} className="text-[10px] text-white/40">
              {s.name} <span className="text-white/20">({s.count})</span>
            </span>
          ))}
          {unassignedTasks > 0 && (
            <span className="text-[10px] text-amber-300/70">
              Unassigned ({unassignedTasks})
            </span>
          )}
        </div>
      )}

      {tasks.length === 0 && (
        <p className="text-xs text-white/20 text-center py-4">No tasks scheduled for today</p>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCHEDULE CALENDAR — Room schedule card for bento sidebar
// ═══════════════════════════════════════════════════════════════

const CYCLE_DEFAULTS: Record<string, number> = { flower: 63, veg: 42, clone: 21, mother: 42, mixed: 42 };
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
const ALL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function phaseToDate(flipDate: string, phaseDay: number): string {
  const d = new Date(flipDate + 'T12:00:00');
  d.setDate(d.getDate() + phaseDay - 1);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function phaseDayForDate(flipDate: string, dateStr: string): number {
  const flip = new Date(flipDate + 'T00:00:00Z');
  const target = new Date(dateStr + 'T00:00:00Z');
  return Math.round((target.getTime() - flip.getTime()) / 86400000) + 1;
}

/** Compact schedule card for the sidebar */
function ScheduleCardCompact({ state, tasks, schedules, flipDate }: {
  state: RoomOperationalState;
  tasks: DailyTaskInstance[];
  schedules: RoomTaskSchedule[];
  flipDate: string | null;
}) {
  const dayCount = state.room_type === 'flower' ? state.days_since_flip : state.days_in_stage;
  const totalDays = CYCLE_DEFAULTS[state.room_type] ?? 42;
  const progressPct = dayCount != null ? Math.min((dayCount / totalDays) * 100, 100) : 0;
  const stage = getStageColor(state.room_type);
  const today = todayIso();

  // 3-day lookahead
  const lookahead = useMemo(() => {
    const days: Array<{ label: string; dateStr: string; taskTypes: string[] }> = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(today + 'T12:00:00');
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });

      // Combine actual tasks + projected from schedules
      const actualTypes = tasks.filter(t => t.task_date === dateStr).map(t => t.task_type);
      const projectedTypes = schedules
        .filter(s => s.scheduling_mode !== 'phase_day' && doesScheduleFireOnDate(s, dateStr, flipDate))
        .map(s => s.task_type)
        .filter(t => !actualTypes.includes(t));

      const taskTypes = [...new Set([...actualTypes, ...projectedTypes])];
      if (taskTypes.length > 0) days.push({ label, dateStr, taskTypes });
    }
    return days;
  }, [today, tasks, schedules, flipDate]);

  // Upcoming milestones
  const milestones = useMemo(() => {
    if (!flipDate) return [];
    return schedules
      .filter(s => s.scheduling_mode === 'phase_day' && s.phase_day_start != null)
      .map(s => {
        const phaseDay = s.phase_day_start!;
        const realDate = phaseToDate(flipDate, phaseDay);
        const daysAway = Math.round((new Date(realDate + 'T00:00:00Z').getTime() - new Date(today + 'T00:00:00Z').getTime()) / 86400000);
        return { taskType: s.task_type, phaseDay, realDate, daysAway };
      })
      .filter(m => m.daysAway > -7) // show recent past milestones too
      .sort((a, b) => a.phaseDay - b.phaseDay)
      .slice(0, 2);
  }, [schedules, flipDate, today]);

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium">Schedule</h3>
        <span className="text-[10px] text-white/25 font-mono">
          {dayCount != null ? `Day ${dayCount}/${totalDays}` : '—'}
        </span>
      </div>

      {/* Phase progress bar */}
      <div className="w-full h-1 rounded-full bg-white/[0.06] mb-3">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%`, backgroundColor: `${stage.base}60` }}
        />
      </div>

      {/* 3-day lookahead */}
      {lookahead.length > 0 && (
        <div className="space-y-1 mb-2">
          {lookahead.map(day => (
            <div key={day.dateStr} className="flex items-center gap-2">
              <span className="text-[10px] text-white/25 w-16 flex-shrink-0">{day.label}</span>
              <div className="flex flex-wrap gap-1">
                {day.taskTypes.map(type => {
                  const cfg = getTaskTypeConfig(type);
                  return (
                    <span key={type} className="text-[9px] font-medium" style={{ color: `${cfg.color}99` }}>
                      {cfg.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-white/[0.04]">
          {milestones.map(m => {
            const cfg = getTaskTypeConfig(m.taskType);
            return (
              <div key={`${m.taskType}-${m.phaseDay}`} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rotate-45 flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                <span className="text-[10px] flex-1" style={{ color: `${cfg.color}99` }}>{cfg.label}</span>
                <span className="text-[9px] text-white/20">
                  {m.daysAway === 0 ? 'today' : m.daysAway > 0 ? `in ${m.daysAway}d` : `${Math.abs(m.daysAway)}d ago`}
                  {' · '}{formatShortDate(m.realDate)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {lookahead.length === 0 && milestones.length === 0 && (
        <p className="text-[10px] text-white/15">No schedules set</p>
      )}
    </>
  );
}

/** Draggable task pill for the calendar */
function DraggableTaskPill({ task, isDragOverlay }: { task: DailyTaskInstance; isDragOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  const config = getTaskTypeConfig(task.task_type);

  return (
    <div
      ref={!isDragOverlay ? setNodeRef : undefined}
      {...(!isDragOverlay ? { ...attributes, ...listeners } : {})}
      className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-medium cursor-grab active:cursor-grabbing transition-opacity ${
        isDragging && !isDragOverlay ? 'opacity-30' : ''
      }`}
      style={{
        backgroundColor: `${config.color}15`,
        borderWidth: 1,
        borderColor: `${config.color}20`,
        color: `${config.color}cc`,
        borderLeftWidth: 3,
        borderLeftColor: `${config.color}50`,
      }}
    >
      <span className="truncate">{config.label}</span>
      {task.assigned_to && (
        <span className="text-[8px] text-white/20 ml-auto flex-shrink-0">●</span>
      )}
    </div>
  );
}

/** Droppable day column for the calendar */
function DroppableDayColumn({ dateStr, phaseDay, isToday, stageColor, children }: {
  dateStr: string;
  phaseDay: number | null;
  isToday: boolean;
  stageColor: string;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: dateStr });
  const d = new Date(dateStr + 'T12:00:00');
  const dayName = ALL_DAYS[d.getDay()];
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border transition-colors duration-200 ${
        isWeekend ? 'min-w-[40px] max-w-[50px]' : 'flex-1 min-w-0'
      } ${isOver ? 'bg-white/[0.06] border-white/[0.12]' : 'bg-white/[0.02] border-white/[0.04]'} ${
        isToday ? 'border-l-2' : ''
      }`}
      style={isToday ? { borderLeftColor: `${stageColor}60` } : undefined}
    >
      {/* Day header */}
      <div className={`px-2 py-1.5 border-b border-white/[0.04] text-center ${isToday ? 'bg-white/[0.03]' : ''}`}>
        <div className="text-[9px] text-white/20 uppercase">{dayName}</div>
        {phaseDay != null && (
          <div className={`text-sm font-semibold ${isToday ? 'text-white/70' : 'text-white/50'}`}>{phaseDay}</div>
        )}
        <div className="text-[9px] text-white/20">{formatShortDate(dateStr)}</div>
      </div>
      {/* Tasks */}
      <div className="flex-1 p-1.5 space-y-1 min-h-[100px]">
        {children}
      </div>
    </div>
  );
}

/** Full expanded calendar for the main panel */
function ScheduleCalendarExpanded({ state, tasks, onReschedule }: {
  state: RoomOperationalState;
  tasks: DailyTaskInstance[];
  onReschedule: (taskId: string, newDate: string) => Promise<void>;
}) {
  const { schedules, loading: schedulesLoading } = useTaskSchedules(state.room_id);
  const flipDate = state.earliest_flip_date;
  const totalDays = CYCLE_DEFAULTS[state.room_type] ?? 42;
  const currentPhaseDay = state.room_type === 'flower' ? state.days_since_flip : state.days_in_stage;
  const currentWeek = Math.ceil((currentPhaseDay ?? 1) / 7);
  const totalWeeks = Math.ceil(totalDays / 7);
  const [viewWeek, setViewWeek] = useState(currentWeek);
  const [activeId, setActiveId] = useState<string | null>(null);
  const today = todayIso();
  const stage = getStageColor(state.room_type);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // Compute dates for the current view week
  const weekDates = useMemo(() => {
    if (!flipDate) {
      // No flip date — show current calendar week
      const d = new Date(today + 'T12:00:00');
      const dayOfWeek = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7)); // Go back to Monday
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        return {
          dateStr: date.toISOString().slice(0, 10),
          phaseDay: null as number | null,
        };
      });
    }
    // Phase-based week
    const weekStartDay = (viewWeek - 1) * 7 + 1;
    return Array.from({ length: 7 }, (_, i) => {
      const phaseDay = weekStartDay + i;
      return {
        dateStr: phaseToDate(flipDate, phaseDay),
        phaseDay,
      };
    });
  }, [flipDate, viewWeek, today]);

  // Get tasks for each day (actual instances)
  const dayTasks = useMemo(() => {
    const map = new Map<string, DailyTaskInstance[]>();
    for (const wd of weekDates) {
      map.set(wd.dateStr, tasks.filter(t => t.task_date === wd.dateStr));
    }
    return map;
  }, [tasks, weekDates]);

  // Phase milestones
  const milestones = useMemo(() => {
    if (!flipDate) return [];
    return schedules
      .filter(s => s.scheduling_mode === 'phase_day' && s.phase_day_start != null)
      .map(s => ({
        id: s.id,
        taskType: s.task_type,
        phaseDay: s.phase_day_start!,
        realDate: phaseToDate(flipDate, s.phase_day_start!),
        daysAway: Math.round((new Date(phaseToDate(flipDate, s.phase_day_start!) + 'T00:00:00Z').getTime() - new Date(today + 'T00:00:00Z').getTime()) / 86400000),
      }))
      .sort((a, b) => a.phaseDay - b.phaseDay);
  }, [schedules, flipDate, today]);

  const weekStartDate = weekDates[0]?.dateStr;
  const weekEndDate = weekDates[6]?.dateStr;
  const weekStartPhase = weekDates[0]?.phaseDay;
  const weekEndPhase = weekDates[6]?.phaseDay;

  const draggedTask = activeId ? tasks.find(t => t.id === activeId) : null;

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !active) return;
    const taskId = active.id as string;
    const newDate = over.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.task_date === newDate) return;
    await onReschedule(taskId, newDate);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  if (schedulesLoading) {
    return <div className="glass-skeleton h-64 rounded-2xl" />;
  }

  return (
    <div className="flex flex-col flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white/80">{state.room_code} Schedule</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {weekStartPhase != null && weekEndPhase != null
              ? `Day ${weekStartPhase}–${weekEndPhase} · `
              : ''}
            {weekStartDate && weekEndDate
              ? `${formatShortDate(weekStartDate)} – ${formatShortDate(weekEndDate)}`
              : ''}
            {flipDate ? ` · Flipped ${formatShortDate(flipDate)}` : ''}
          </p>
        </div>
        {flipDate && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewWeek(w => Math.max(1, w - 1))}
              disabled={viewWeek <= 1}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors active:scale-95 disabled:opacity-20"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-white/40" />
            </button>
            <span className="text-xs text-white/40 min-w-[80px] text-center">
              Week {viewWeek} of {totalWeeks}
            </span>
            <button
              type="button"
              onClick={() => setViewWeek(w => Math.min(totalWeeks, w + 1))}
              disabled={viewWeek >= totalWeeks}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors active:scale-95 disabled:opacity-20"
            >
              <ChevronRight className="w-3.5 h-3.5 text-white/40" />
            </button>
          </div>
        )}
      </div>

      {/* Calendar grid */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-1.5 flex-1">
          {weekDates.map(wd => (
            <DroppableDayColumn
              key={wd.dateStr}
              dateStr={wd.dateStr}
              phaseDay={wd.phaseDay}
              isToday={wd.dateStr === today}
              stageColor={stage.base}
            >
              {(dayTasks.get(wd.dateStr) ?? []).map(task => (
                <DraggableTaskPill key={task.id} task={task} />
              ))}
            </DroppableDayColumn>
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {draggedTask && <DraggableTaskPill task={draggedTask} isDragOverlay />}
        </DragOverlay>
      </DndContext>

      {/* Milestones strip */}
      {milestones.length > 0 && (
        <div className="pt-3 border-t border-white/[0.06] space-y-1.5">
          <h4 className="text-[10px] text-white/20 uppercase tracking-wider">Phase Milestones</h4>
          {milestones.map(m => {
            const cfg = getTaskTypeConfig(m.taskType);
            const isPast = m.daysAway < 0;
            return (
              <div
                key={m.id}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg ${isPast ? 'opacity-40' : ''}`}
                style={{ backgroundColor: `${cfg.color}08` }}
              >
                <div className="w-2 h-2 rotate-45 flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                <span className="text-xs font-medium flex-1" style={{ color: `${cfg.color}cc` }}>
                  {cfg.label}
                </span>
                <span className="text-[10px] text-white/25 font-mono">Day {m.phaseDay}</span>
                <span className="text-[10px] text-white/25">
                  {m.daysAway === 0 ? 'TODAY' : m.daysAway > 0 ? `in ${m.daysAway}d` : `${Math.abs(m.daysAway)}d ago`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN 1: Bento Room Tile
// ═══════════════════════════════════════════════════════════════

function RoomTile({ state, tasks, onClick }: {
  state: RoomOperationalState;
  tasks: DailyTaskInstance[];
  onClick: () => void;
}) {
  const isEmpty = state.occupancy_status === 'empty';
  const color = statusColor(state.urgency_score);
  const stage = getStageColor(state.room_type);
  const dayCount = state.room_type === 'flower' ? state.days_since_flip : state.days_in_stage;
  const harvestDays = state.section_days_to_harvest ?? state.days_to_harvest;
  const roomTasks = tasks.filter(t => t.room_id === state.room_id);
  const doneTasks = roomTasks.filter(t => t.status === 'completed').length;
  const isLarge = state.urgency_score >= 2;

  return (
    <motion.button
      variants={tileVariants}
      type="button"
      onClick={isEmpty ? undefined : onClick}
      className={`${isEmpty ? GLASS_EMPTY : GLASS_TILE} ${isEmpty ? '' : GLASS_HOVER} text-left transition-all duration-300 active:scale-[0.97] ${
        isLarge ? 'col-span-2 row-span-2' : ''
      } relative overflow-hidden group`}
      style={{
        minHeight: isLarge ? '220px' : '130px',
        backgroundColor: tileBg(state.room_type, state.urgency_score, isEmpty),
        borderColor: tileBorder(state.room_type, state.urgency_score, isEmpty),
        cursor: isEmpty ? 'default' : 'pointer',
      }}
    >
      {/* Ambient glow — stage-colored light bleeding through glass */}
      {!isEmpty && (() => {
        const glowColor = state.urgency_score >= 2 ? color : stage.base;
        return (
          <div
            className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
            style={{
              width: isLarge ? '160px' : '100px',
              height: isLarge ? '160px' : '100px',
              background: `radial-gradient(circle, ${glowColor}${isLarge ? '22' : '15'} 0%, ${glowColor}06 45%, transparent 70%)`,
              filter: 'blur(12px)',
            }}
          />
        );
      })()}

      <div className="relative p-4 flex flex-col h-full">
        {/* Header: code + status ring */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Status ring — stage-colored for calm, urgency-colored for alerts */}
            <div
              className="w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-500"
              style={statusRingStyle(state.urgency_score, isEmpty, state.room_type)}
            >
              {state.urgency_score >= 3 && (
                <motion.div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              {state.urgency_score < 3 && !isEmpty && (
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: state.urgency_score >= 2 ? color : stage.base, opacity: 0.7 }} />
              )}
            </div>
            <div>
              <span className="font-mono text-base font-bold text-white tracking-wide">{state.room_code}</span>
              <span className="text-[10px] uppercase tracking-widest ml-2" style={{ color: `${stage.base}80` }}>{state.room_type}</span>
            </div>
          </div>

          {/* Day counter */}
          {dayCount != null && (
            <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>D{dayCount}</span>
          )}
        </div>

        {/* Middle: plant info */}
        {!isEmpty && (
          <div className="mt-3 flex-1">
            <div className="text-2xl font-bold font-mono" style={{ color: GOLD }}>{state.total_plants}</div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider">
              plants · {state.strain_count} strains
            </div>
          </div>
        )}

        {isEmpty && (
          <div className="mt-3 flex-1 flex items-center">
            <span className="text-sm text-white/20">Empty</span>
          </div>
        )}

        {/* Footer: harvest + tasks */}
        {!isEmpty && (
          <div className="flex items-end justify-between mt-auto pt-3">
            {/* Harvest countdown */}
            {state.room_type === 'flower' && harvestDays != null ? (
              <span className={`text-xs font-medium ${
                harvestDays <= 0 ? 'text-red-400' : harvestDays <= 7 ? 'text-amber-400' : 'text-white/40'
              }`}>
                {harvestDays <= 0 ? `${Math.abs(harvestDays)}d overdue` : `${harvestDays}d to harvest`}
              </span>
            ) : (
              <span />
            )}

            {/* Task progress */}
            {roomTasks.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {roomTasks.map((t, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: t.status === 'completed' ? '#10b981' :
                          t.status === 'in_progress' ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-white/30 font-mono">{doneTasks}/{roomTasks.length}</span>
              </div>
            )}
          </div>
        )}

        {/* Strain chips — large tiles only */}
        {isLarge && !isEmpty && state.strain_names && state.strain_names.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {state.strain_names.slice(0, 6).map(s => (
              <span key={s} className="text-[10px] text-white/50 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/5">
                {s}
              </span>
            ))}
            {state.strain_names.length > 6 && (
              <span className="text-[10px] text-white/30">+{state.strain_names.length - 6}</span>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════
// Attention Strip
// ═══════════════════════════════════════════════════════════════

function AttentionStrip({ opsRooms, onRoomClick }: {
  opsRooms: RoomOperationalState[];
  onRoomClick: (code: string) => void;
}) {
  const items = useMemo(() => {
    return opsRooms
      .filter(r => r.urgency_score >= 1)
      .sort((a, b) => b.urgency_score - a.urgency_score)
      .map(r => {
        const harvestDays = r.section_days_to_harvest ?? r.days_to_harvest;
        let message = '';
        if (harvestDays !== null && harvestDays <= 0) message = `${Math.abs(harvestDays)}d overdue`;
        else if (harvestDays !== null && harvestDays <= 7) message = `Harvest in ${harvestDays}d`;
        else if (r.days_in_stage && r.days_in_stage > 30 && r.room_type === 'veg') message = `${r.days_in_stage}d in veg`;
        else if (r.urgency_score >= 2) message = 'Needs attention';
        else message = 'Watch';
        return { code: r.room_code, message, urgency: r.urgency_score };
      });
  }, [opsRooms]);

  if (items.length === 0) return null;

  return (
    <div className={`${GLASS} py-2.5 px-4 flex items-center gap-4 overflow-x-auto scrollbar-hide`}>
      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
      {items.map(item => (
        <button
          key={item.code}
          type="button"
          onClick={() => onRoomClick(item.code)}
          className="flex items-center gap-2 text-xs whitespace-nowrap hover:opacity-80 transition-opacity active:scale-95"
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor(item.urgency) }} />
          <span className="font-mono font-semibold text-white">{item.code}</span>
          <span className={item.urgency >= 3 ? 'text-red-400' : 'text-amber-400'}>{item.message}</span>
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN 2: Expanded Room View
// ═══════════════════════════════════════════════════════════════

function ExpandedRoomView({ state, tasks, groups, rooms, onUpdateTaskStatus, onCompleteWithLog, onAssignWorker, onCreateTask, onMoveToRoom, onSplitAndMove, onSplitAndMoveMultiple, onBack }: {
  state: RoomOperationalState;
  tasks: DailyTaskInstance[];
  groups: PlantGroup[];
  rooms: Array<{ id: string; name: string; room_code: string; room_type: string; is_active: boolean; capacity_plants: number | null; created_at: string; created_by: string | null }>;
  onUpdateTaskStatus: (id: string, status: string) => void;
  onCompleteWithLog: (taskId: string, refTable: string, refId: string, duration: string | null) => void;
  onAssignWorker: (taskId: string, staffId: string) => Promise<void>;
  onCreateTask: (input: { room_id: string; task_type: string; task_date: string; assigned_to?: string | null }) => Promise<void>;
  onMoveToRoom: (groupId: string, toRoomId: string) => Promise<void>;
  onSplitAndMove: (input: SplitAndMoveInput) => Promise<void>;
  onSplitAndMoveMultiple: (input: SplitAndMoveMultiInput) => Promise<void>;
  onBack: () => void;
}) {
  const roomTasks = useMemo(() => tasks.filter(t => t.room_id === state.room_id), [tasks, state.room_id]);
  const roomGroups = useMemo(() => groups.filter(g => g.grow_room_id === state.room_id && g.growth_stage !== 'harvested'), [groups, state.room_id]);
  const [completingTask, setCompletingTask] = useState<DailyTaskInstance | null>(null);
  const [movingGroup, setMovingGroup] = useState<PlantGroup | null>(null);
  const [movingBatchGroups, setMovingBatchGroups] = useState<PlantGroup[] | undefined>(undefined);
  const [focusedCard, setFocusedCard] = useState<string | null>(null);
  const [showHarvestConfirm, setShowHarvestConfirm] = useState(false);
  const [showHarvestWorkflow, setShowHarvestWorkflow] = useState(false);
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  // Section-level actions from grid cell popover
  const [sectionActionGroups, setSectionActionGroups] = useState<PlantGroup[] | null>(null);
  const [showSectionKill, setShowSectionKill] = useState(false);
  const [showSectionPrint, setShowSectionPrint] = useState(false);
  const {
    isOpen: sectionLabelIsOpen, isLoading: sectionLabelIsLoading, isPrinting: sectionLabelIsPrinting,
    labelData: sectionLabelData, logoDataUrl: sectionLogoDataUrl, error: sectionLabelError,
    openGroupLabel: sectionOpenGroupLabel, printLabels: sectionPrintLabels, closeLabel: sectionCloseLabel,
  } = usePlantGroupLabel();
  const { staff: activeStaff } = useActiveStaff();
  const { schedules: roomSchedules } = useTaskSchedules(state.room_id);
  const doneTasks = roomTasks.filter(t => t.status === 'completed').length;
  const dayCount = state.room_type === 'flower' ? state.days_since_flip : state.days_in_stage;
  const harvestDays = state.section_days_to_harvest ?? state.days_to_harvest;
  const color = statusColor(state.urgency_score);
  const stage = getStageColor(state.room_type);
  const headerColor = state.urgency_score >= 2 ? color : stage.base;

  return (
    <motion.div {...expandVariants} className="space-y-4">
      {/* Room header */}
      <div className={`${GLASS_ELEVATED} p-5 relative overflow-hidden`}
        style={{ borderColor: `${headerColor}20` }}
      >
        {/* Background glow — stage-colored light through header glass */}
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${headerColor}18 0%, ${headerColor}06 40%, transparent 65%)`,
            filter: 'blur(16px)',
          }}
        />

        <div className="relative flex items-center gap-5">
          <button type="button" onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 transition-colors active:scale-95">
            <ChevronLeft className="w-5 h-5 text-white/60" />
          </button>

          {/* Status ring */}
          <div
            className="w-14 h-14 rounded-full border-[3px] flex items-center justify-center"
            style={statusRingStyle(state.urgency_score, false, state.room_type)}
          >
            <span className="text-sm font-mono font-bold text-white">
              {state.room_type === 'flower' ? 'F' : state.room_type === 'veg' ? 'V' : state.room_type[0].toUpperCase()}
            </span>
          </div>

          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xl font-bold text-white">{state.room_code}</span>
              <span className="text-xs uppercase tracking-widest text-white/30">{state.room_type}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-white/40 mt-1">
              <span>{state.total_plants} plants</span>
              <span>{state.strain_count} strains</span>
              {dayCount != null && <span>Day {dayCount}</span>}
              {harvestDays != null && (
                <span className={harvestDays <= 0 ? 'text-red-400 font-medium' : harvestDays <= 7 ? 'text-amber-400' : ''}>
                  {harvestDays <= 0 ? `${Math.abs(harvestDays)}d overdue` : `${harvestDays}d to harvest`}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {state.room_type === 'flower' && (
              <button
                type="button"
                onClick={() => setShowHarvestConfirm(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-all active:scale-95"
              >
                <Wheat className="w-3.5 h-3.5" />
                Harvest
              </button>
            )}
            <div className="text-right">
              <span className="text-3xl font-bold font-mono" style={{ color: GOLD }}>{doneTasks}/{roomTasks.length}</span>
              <p className="text-[10px] text-white/25 uppercase tracking-wider">tasks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bento content grid — layoutId card swap with spring physics */}
      <LayoutGroup>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* ── Left column (3/5) — main content area ── */}
          <div className="lg:col-span-3" style={{ minHeight: '500px' }}>
            {/* Main panel — stable container, content swaps inside */}
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className={`${GLASS} p-5 h-full ${focusedCard ? 'flex flex-col' : ''}`}
            >
              <AnimatePresence mode="wait" initial={false}>
              {focusedCard ? (
                <motion.div
                  key={`panel-${focusedCard}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col flex-1"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium">
                      {focusedCard === 'room-layout' && 'Room Layout'}
                      {focusedCard === 'plant-groups' && `Plants (${state.total_plants})`}
                      {focusedCard === 'feed-recipe' && 'Feed Recipe'}
                      {focusedCard === 'room-info' && 'Room Info'}
                      {focusedCard === 'schedule' && 'Schedule'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setFocusedCard(null)}
                      className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/50 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-all active:scale-95"
                    >
                      <ChevronLeft className="w-3 h-3" /> Tasks
                    </button>
                  </div>

                  {focusedCard === 'room-layout' && (
                    <div className="flex-1 flex flex-col">
                      <RoomGrid
                        roomId={state.room_id}
                        inline
                        expanded
                        groups={roomGroups}
                        onMoveGroups={(grps) => {
                          setSectionActionGroups(grps);
                          setMovingGroup(grps[0]);
                          setMovingBatchGroups(grps.length > 1 ? grps : undefined);
                        }}
                        onKillGroups={(grps) => {
                          setSectionActionGroups(grps);
                          setShowSectionKill(true);
                        }}
                        onPrintGroups={async (grps) => {
                          if (grps.length > 0) {
                            await sectionOpenGroupLabel(grps[0]);
                            setShowSectionPrint(true);
                          }
                        }}
                      />
                    </div>
                  )}
                  {focusedCard === 'feed-recipe' && <InteractiveFeedCard state={state} />}
                  {focusedCard === 'room-info' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Plants', value: state.total_plants },
                        { label: 'Groups', value: state.plant_group_count },
                        { label: 'Day', value: dayCount ?? '—' },
                        { label: 'Strains', value: state.strain_count },
                        ...(state.earliest_flip_date ? [{ label: 'Flipped', value: state.earliest_flip_date }] : []),
                        ...(state.section_projected_harvest ? [{ label: 'Harvest', value: state.section_projected_harvest }] : []),
                      ].map(({ label, value }) => (
                        <div key={label} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.04]">
                          <div className="text-[9px] text-white/20 uppercase tracking-wider">{label}</div>
                          <div className="text-lg font-semibold text-white/90 mt-1">{value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {focusedCard === 'schedule' && (
                    <ScheduleCalendarExpanded
                      state={state}
                      tasks={roomTasks}
                      onReschedule={async (taskId, newDate) => {
                        const { supabase } = await import('@/lib/supabase');
                        await supabase.from('daily_task_instances').update({ task_date: newDate }).eq('id', taskId);
                      }}
                    />
                  )}
                  {focusedCard === 'plant-groups' && (
                    <PlantsByStrainExpanded
                      groups={roomGroups}
                      roomId={state.room_id}
                      rooms={rooms as any}
                      onMoveToRoom={onMoveToRoom}
                      onSplitAndMove={onSplitAndMove}
                      onSplitAndMoveMultiple={onSplitAndMoveMultiple}
                    />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="panel-tasks"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium">Today's Tasks</h3>
                    {!showInlineAdd ? (
                      <button
                        type="button"
                        onClick={() => setShowInlineAdd(true)}
                        className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white/50 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-all active:scale-95"
                      >
                        <Plus className="w-3 h-3" /> Add Task
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowInlineAdd(false)}
                        className="text-[10px] text-white/25 hover:text-white/50 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* Inline add task row */}
                  <AnimatePresence>
                    {showInlineAdd && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mb-3"
                      >
                        <InlineAddTask
                          roomId={state.room_id}
                          onAdd={async (input) => {
                            await onCreateTask(input);
                            setShowInlineAdd(false);
                          }}
                          onCancel={() => setShowInlineAdd(false)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <TaskChecklist
                    tasks={roomTasks}
                    onUpdateStatus={onUpdateTaskStatus}
                    onOpenCompletion={(task) => setCompletingTask(task)}
                  />
                </motion.div>
              )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* ── Right column (2/5) — all cards always rendered ── */}
          <div className="lg:col-span-2 space-y-3">
            {/* Tasks — compact sidebar version when a card is focused */}
            {focusedCard && (
              <motion.button
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                type="button"
                onClick={() => setFocusedCard(null)}
                className={`${GLASS} ${GLASS_HOVER} p-4 w-full text-left active:scale-[0.98]`}
              >
                <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-2">Today's Tasks</h3>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <span>{roomTasks.filter(t => t.status === 'completed').length}/{roomTasks.length} done</span>
                  {roomTasks.filter(t => t.status === 'in_progress').length > 0 && (
                    <span className="text-amber-400">{roomTasks.filter(t => t.status === 'in_progress').length} active</span>
                  )}
                </div>
              </motion.button>
            )}

            {/* Room Layout — always rendered, active = slim indicator */}
            <motion.button
              layoutId="card-room-layout"
              layout="position"
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              type="button"
              onClick={() => setFocusedCard(focusedCard === 'room-layout' ? null : 'room-layout')}
              className={`${focusedCard === 'room-layout' ? GLASS_ELEVATED : GLASS} ${GLASS_HOVER} w-full text-left active:scale-[0.98] ${
                focusedCard === 'room-layout' ? 'py-2.5 px-4' : 'p-4'
              }`}
            >
              {focusedCard === 'room-layout' ? (
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] text-emerald-400/60 uppercase tracking-widest font-medium">Room Layout</h3>
                  <span className="text-[9px] text-white/20">● active</span>
                </div>
              ) : (
                <>
                  <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-2">Room Layout</h3>
                  <RoomGrid roomId={state.room_id} compact />
                </>
              )}
            </motion.button>

            {/* Plants by Strain */}
            {roomGroups.length > 0 && (
              <motion.button
                layoutId="card-plant-groups"
                layout="position"
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                type="button"
                onClick={() => setFocusedCard(focusedCard === 'plant-groups' ? null : 'plant-groups')}
                className={`${focusedCard === 'plant-groups' ? GLASS_ELEVATED : GLASS} ${GLASS_HOVER} w-full text-left active:scale-[0.98] ${
                  focusedCard === 'plant-groups' ? 'py-2.5 px-4' : 'p-4'
                }`}
              >
                {focusedCard === 'plant-groups' ? (
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] text-emerald-400/60 uppercase tracking-widest font-medium">Plants <span className="text-white/15">({state.total_plants})</span></h3>
                    <span className="text-[9px] text-white/20">● active</span>
                  </div>
                ) : (
                  <>
                    <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-2">
                      Plants <span className="text-white/15">({state.total_plants})</span>
                    </h3>
                    <PlantsByStrainCompact groups={roomGroups} />
                  </>
                )}
              </motion.button>
            )}

            {/* Feed Recipe */}
            <motion.button
              layoutId="card-feed-recipe"
              layout="position"
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              type="button"
              onClick={() => setFocusedCard(focusedCard === 'feed-recipe' ? null : 'feed-recipe')}
              className={`${focusedCard === 'feed-recipe' ? GLASS_ELEVATED : GLASS} ${GLASS_HOVER} w-full text-left active:scale-[0.98] ${
                focusedCard === 'feed-recipe' ? 'py-2.5 px-4' : 'p-4'
              }`}
            >
              {focusedCard === 'feed-recipe' ? (
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] text-emerald-400/60 uppercase tracking-widest font-medium">Feed Recipe</h3>
                  <span className="text-[9px] text-white/20">● active</span>
                </div>
              ) : (
                <FeedCard state={state} />
              )}
            </motion.button>

            {/* Room Info */}
            <motion.button
              layoutId="card-room-info"
              layout="position"
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              type="button"
              onClick={() => setFocusedCard(focusedCard === 'room-info' ? null : 'room-info')}
              className={`${focusedCard === 'room-info' ? GLASS_ELEVATED : GLASS} ${GLASS_HOVER} w-full text-left active:scale-[0.98] ${
                focusedCard === 'room-info' ? 'py-2.5 px-4' : 'p-4'
              }`}
            >
              {focusedCard === 'room-info' ? (
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] text-emerald-400/60 uppercase tracking-widest font-medium">Room Info</h3>
                  <span className="text-[9px] text-white/20">● active</span>
                </div>
              ) : (
                <>
                  <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-2">Room Info</h3>
                  <div className="flex gap-4 text-xs text-white/40">
                    <span>{state.total_plants}p</span>
                    <span>{state.plant_group_count}g</span>
                    <span>Day {dayCount ?? '—'}</span>
                  </div>
                </>
              )}
            </motion.button>

            {/* Schedule */}
            <motion.button
              layoutId="card-schedule"
              layout="position"
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              type="button"
              onClick={() => setFocusedCard(focusedCard === 'schedule' ? null : 'schedule')}
              className={`${focusedCard === 'schedule' ? GLASS_ELEVATED : GLASS} ${GLASS_HOVER} w-full text-left active:scale-[0.98] ${
                focusedCard === 'schedule' ? 'py-2.5 px-4' : 'p-4'
              }`}
            >
              {focusedCard === 'schedule' ? (
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] text-emerald-400/60 uppercase tracking-widest font-medium">Schedule</h3>
                  <span className="text-[9px] text-white/20">● active</span>
                </div>
              ) : (
                <ScheduleCardCompact
                  state={state}
                  tasks={roomTasks}
                  schedules={roomSchedules}
                  flipDate={state.earliest_flip_date}
                />
              )}
            </motion.button>
          </div>
        </div>
      </LayoutGroup>

      {/* Task Completion Form modal */}
      {completingTask && (
        <TaskCompletionForm
          task={completingTask as unknown as TaskCardData}
          roomId={state.room_id}
          staffOptions={activeStaff?.map(s => ({ id: s.id, first_name: s.first_name })) ?? []}
          onAssignWorker={async (taskId, staffId) => { await onAssignWorker(taskId, staffId); }}
          onComplete={(refTable, refId, duration) => {
            onCompleteWithLog(completingTask.id, refTable, refId, duration);
            setCompletingTask(null);
          }}
          onNavigateHarvest={() => { /* TODO: inline harvest flow */ }}
          onNavigateClone={() => { /* TODO: inline clone flow */ }}
          onClose={() => setCompletingTask(null)}
        />
      )}

      {/* Move Plant Group modal */}
      {movingGroup && (
        <MoveToRoomModal
          group={movingGroup}
          groups={movingBatchGroups}
          rooms={rooms as any}
          onMove={async (toRoomId) => {
            await onMoveToRoom(movingGroup.id, toRoomId);
            setMovingGroup(null);
            setMovingBatchGroups(undefined);
          }}
          onSplitAndMove={async (input) => {
            await onSplitAndMove(input);
            setMovingGroup(null);
            setMovingBatchGroups(undefined);
          }}
          onSplitAndMoveMultiple={async (input) => {
            await onSplitAndMoveMultiple(input);
            setMovingGroup(null);
            setMovingBatchGroups(undefined);
          }}
          onCancel={() => {
            setMovingGroup(null);
            setMovingBatchGroups(undefined);
          }}
        />
      )}

      {/* Harvest confirmation */}
      <AnimatePresence>
        {showHarvestConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHarvestConfirm(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-sm ${GLASS_ELEVATED} p-6 space-y-4`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Wheat className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Harvest {state.room_code}?</h3>
                  <p className="text-xs text-white/40 mt-0.5">{state.total_plants} plants · {state.strain_count} strains</p>
                </div>
              </div>
              <p className="text-xs text-white/30">
                This will start the harvest workflow for {state.room_code}. You'll record wet weights per batch and assign a dry room.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowHarvestConfirm(false);
                    setShowHarvestWorkflow(true);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors active:scale-[0.98]"
                >
                  Start Harvest
                </button>
                <button
                  type="button"
                  onClick={() => setShowHarvestConfirm(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-white/40 text-sm hover:border-white/20 hover:text-white/60 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Harvest workflow modal */}
      {showHarvestWorkflow && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 pt-8">
            <HarvestWorkflow
              initialRoomId={state.room_id}
              onComplete={() => {
                setShowHarvestWorkflow(false);
                onBack();
              }}
              onCancel={() => setShowHarvestWorkflow(false)}
            />
          </div>
        </div>
      )}

      {/* Section-level Kill modal */}
      {showSectionKill && (
        <DeadPlantForm
          prefilledRoomId={state.room_id}
          onComplete={() => {
            setShowSectionKill(false);
            setSectionActionGroups(null);
          }}
          onClose={() => {
            setShowSectionKill(false);
            setSectionActionGroups(null);
          }}
        />
      )}

      {/* Section-level Print modal */}
      {showSectionPrint && sectionLabelData && (
        <PlantGroupLabelPrintModal
          isOpen={showSectionPrint}
          isLoading={sectionLabelIsLoading}
          isPrinting={sectionLabelIsPrinting}
          labelData={sectionLabelData}
          logoDataUrl={sectionLogoDataUrl}
          error={sectionLabelError}
          onClose={() => { setShowSectionPrint(false); sectionCloseLabel(); setSectionActionGroups(null); }}
          onPrint={sectionPrintLabels}
        />
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Inline Add Task — simple row for adding a task to the room
// ═══════════════════════════════════════════════════════════════

const INLINE_TASK_TYPES = ['batch_tank_mix', 'ipm_spray', 'scouting', 'defoliation', 'cleaning', 'training', 'maintenance', 'custom'] as const;

function InlineAddTask({ roomId, onAdd, onCancel }: {
  roomId: string;
  onAdd: (input: { room_id: string; task_type: string; task_date: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function handleAdd(taskType: string) {
    setSaving(true);
    try {
      await onAdd({ room_id: roomId, task_type: taskType, task_date: todayIso() });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
      {INLINE_TASK_TYPES.map(type => {
        const config = getTaskTypeConfig(type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => handleAdd(type)}
            disabled={saving}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all active:scale-95 disabled:opacity-30 whitespace-nowrap flex-shrink-0"
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
            <span className="text-[10px] text-white/50">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Task Checklist
// ═══════════════════════════════════════════════════════════════

function TaskChecklist({ tasks, onUpdateStatus, onOpenCompletion }: {
  tasks: DailyTaskInstance[];
  onUpdateStatus: (id: string, status: string) => void;
  onOpenCompletion: (task: DailyTaskInstance) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const order: Record<string, number> = { in_progress: 0, pending: 1, completed: 2, skipped: 3 };
    return [...tasks].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  }, [tasks]);

  if (sorted.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-white/20">No tasks scheduled today</p>
      </div>
    );
  }

  return (
    <motion.div className="space-y-1" variants={containerVariants} initial="hidden" animate="show">
      {sorted.map(task => {
        const config = getTaskTypeConfig(task.task_type);
        const isExpanded = expandedId === task.id;

        return (
          <motion.div key={task.id} variants={tileVariants}>
            {/* Task row */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : task.id)}
              className="w-full flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-white/5 transition-all duration-200 text-left group"
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (task.status === 'pending') onUpdateStatus(task.id, 'in_progress');
                  else if (task.status === 'in_progress') onUpdateStatus(task.id, 'completed');
                }}
                className="flex-shrink-0 active:scale-90 transition-transform duration-200"
              >
                {task.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : task.status === 'in_progress' ? (
                  <motion.div
                    className="w-5 h-5 rounded-full border-2 border-amber-400 bg-amber-400/20"
                    animate={{ borderColor: ['#f59e0b', '#fbbf24', '#f59e0b'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-white/15 group-hover:border-white/30 transition-colors" />
                )}
              </button>

              {/* Color accent */}
              <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />

              {/* Label */}
              <span className={`text-sm flex-1 transition-colors ${
                task.status === 'completed' ? 'text-white/25 line-through' :
                task.status === 'skipped' ? 'text-white/20 line-through' :
                'text-white/80'
              }`}>
                {config.label}
              </span>

              {/* Status hint */}
              {task.status === 'pending' && (
                <span className="text-[10px] text-white/15 opacity-0 group-hover:opacity-100 transition-opacity">tap to start</span>
              )}
            </button>

            {/* Expanded detail */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <TaskExpandedDetail task={task} onUpdateStatus={onUpdateStatus} onOpenCompletion={onOpenCompletion} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function TaskExpandedDetail({ task, onUpdateStatus, onOpenCompletion }: {
  task: DailyTaskInstance;
  onUpdateStatus: (id: string, status: string) => void;
  onOpenCompletion: (task: DailyTaskInstance) => void;
}) {
  const hasForm = ['ipm_spray', 'batch_tank_mix', 'defoliation', 'cleaning', 'scouting', 'training', 'custom', 'saturation_check', 'irrigation_audit'].includes(task.task_type);

  return (
    <div className="ml-11 mb-2 p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white/60">{getTaskTypeConfig(task.task_type).label}</span>
        <div className="flex gap-2">
          {task.status === 'pending' && (
            <button
              type="button"
              onClick={() => onUpdateStatus(task.id, 'in_progress')}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors active:scale-95"
            >
              Start
            </button>
          )}
          {(task.status === 'pending' || task.status === 'in_progress') && hasForm && (
            <button
              type="button"
              onClick={() => onOpenCompletion(task)}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors active:scale-95"
            >
              Complete with Log
            </button>
          )}
          {(task.status === 'pending' || task.status === 'in_progress') && !hasForm && (
            <button
              type="button"
              onClick={() => onUpdateStatus(task.id, 'completed')}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors active:scale-95"
            >
              Complete
            </button>
          )}
        </div>
      </div>

      {task.notes && <p className="text-xs text-white/40">{task.notes}</p>}

      {task.task_type === 'batch_tank_mix' && <InlineTankMixRecipe />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Feed / Recipe Cards
// ═══════════════════════════════════════════════════════════════

function InlineTankMixRecipe() {
  const { recipe, loading } = useFeedProgramRecipe('flower', 60);

  if (loading) return <div className="h-16 rounded-lg bg-white/5 animate-pulse" />;
  if (!recipe) return <p className="text-[10px] text-white/20">No feed program configured.</p>;

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/50">{recipe.program_name} · W{recipe.week_number}</span>
        {recipe.targets.target_ec && (
          <span className="text-xs font-mono text-emerald-400">EC {recipe.targets.target_ec}</span>
        )}
      </div>
      {recipe.entries.map((entry, i) => (
        <div key={i} className="flex justify-between text-[11px] py-1 px-2 rounded-lg bg-white/[0.03]">
          <span className="text-white/40">{entry.product.name}</span>
          <span className="text-white/60 font-mono">{entry.ml_per_gal} mL/gal</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Room Grid — table/section layout with occupancy
// ═══════════════════════════════════════════════════════════════

// Cell hover popover — compact glass tooltip (strain counts only)
function CellHoverPopover({ strainCounts, totalPlants, tableNum, sectionLabel }: {
  strainCounts: Array<{ abbreviation: string; count: number }>;
  totalPlants: number;
  tableNum: number;
  sectionLabel: string;
}) {
  return (
    <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
      <div className="rounded-xl border border-white/[0.12] bg-black/80 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] p-3 min-w-[140px]">
        <div className="text-[10px] text-white/50 font-mono mb-1.5">T{tableNum} · {sectionLabel}</div>
        <div className="text-sm font-bold text-white mb-2">{totalPlants} plants</div>
        <div className="space-y-1">
          {strainCounts.map(s => (
            <div key={s.abbreviation} className="flex items-center justify-between text-[10px]">
              <span className="text-white/50">{s.abbreviation}</span>
              <span className="text-emerald-400/70 font-mono">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 bg-black/80 border-r border-b border-white/[0.12]" />
    </div>
  );
}

// Pinned cell popover — click-to-pin with plant IDs accordion + actions
function PinnedCellPopover({ sectionId, strainCounts, totalPlants, tableNum, sectionLabel, groups, onMove, onKill, onPrint, onClose }: {
  sectionId: string;
  strainCounts: Array<{ abbreviation: string; count: number }>;
  totalPlants: number;
  tableNum: number;
  sectionLabel: string;
  groups: PlantGroup[];
  onMove: (groups: PlantGroup[]) => void;
  onKill: (groups: PlantGroup[]) => void;
  onPrint: (groups: PlantGroup[]) => void;
  onClose: () => void;
}) {
  const [expandedStrain, setExpandedStrain] = useState<string | null>(null);
  const [plantsByGroup, setPlantsByGroup] = useState<Map<string, IndividualPlant[]>>(new Map());
  const [loadingPlants, setLoadingPlants] = useState(true);

  // Load all individual plants for groups in this section
  useEffect(() => {
    async function load() {
      setLoadingPlants(true);
      const map = new Map<string, IndividualPlant[]>();
      for (const g of groups) {
        const plants = await cultivationService.listIndividualPlants(g.id);
        map.set(g.id, plants.filter(p => p.is_active));
      }
      setPlantsByGroup(map);
      setLoadingPlants(false);
    }
    load();
  }, [groups]);

  // Group plants by strain abbreviation for accordion display
  const strainPlants = useMemo(() => {
    const result = new Map<string, IndividualPlant[]>();
    for (const g of groups) {
      const abbr = g.strains?.abbreviation ?? g.strains?.name ?? 'Unknown';
      const existing = result.get(abbr) ?? [];
      const gPlants = plantsByGroup.get(g.id) ?? [];
      result.set(abbr, [...existing, ...gPlants]);
    }
    return result;
  }, [groups, plantsByGroup]);

  return (
    <div className="absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-2" onClick={(e) => e.stopPropagation()}>
      <motion.div
        initial={{ opacity: 0, y: 4, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.97 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-white/[0.12] bg-black/85 backdrop-blur-2xl shadow-[0_12px_48px_rgba(0,0,0,0.7)] p-4 min-w-[200px] max-w-[280px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] text-white/50 font-mono">T{tableNum} · {sectionLabel}</div>
            <div className="text-sm font-bold text-white">{totalPlants} plants</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors active:scale-95"
          >
            <X className="w-3.5 h-3.5 text-white/30" />
          </button>
        </div>

        {/* Strain accordion rows */}
        <div className="space-y-0.5 mb-3">
          {strainCounts.map(s => {
            const isExpanded = expandedStrain === s.abbreviation;
            const plants = strainPlants.get(s.abbreviation) ?? [];

            return (
              <div key={s.abbreviation}>
                <button
                  type="button"
                  onClick={() => setExpandedStrain(isExpanded ? null : s.abbreviation)}
                  className="w-full flex items-center justify-between text-[11px] py-1.5 px-2 rounded-lg hover:bg-white/[0.05] transition-colors active:scale-[0.98]"
                >
                  <div className="flex items-center gap-1.5">
                    {isExpanded
                      ? <ChevronDown className="w-3 h-3 text-white/20" />
                      : <ChevronRight className="w-3 h-3 text-white/20" />
                    }
                    <span className="text-white/50">{s.abbreviation}</span>
                  </div>
                  <span className="text-emerald-400/70 font-mono">{s.count}</span>
                </button>

                {/* Plant IDs dropdown */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-5 py-1 space-y-0.5 max-h-[120px] overflow-y-auto">
                        {loadingPlants ? (
                          <div className="text-[10px] text-white/15 animate-pulse py-1">Loading...</div>
                        ) : plants.length > 0 ? (
                          plants.map(plant => (
                            <div key={plant.id} className="text-[10px] font-mono text-white/35 py-0.5 px-2">
                              {plant.state_plant_id}
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] text-white/15 py-0.5 px-2">No IDs recorded</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Action bar */}
        {groups.length > 0 && (
          <div className="flex items-center gap-1.5 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => onMove(groups)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-white/[0.05] text-white/50 text-[10px] font-medium hover:bg-white/[0.08] transition-all active:scale-95"
            >
              <ArrowRightLeft className="w-3 h-3" /> Move
            </button>
            <button
              type="button"
              onClick={() => onKill(groups)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-red-500/10 text-red-400 text-[10px] font-medium hover:bg-red-500/20 transition-all active:scale-95"
            >
              <Skull className="w-3 h-3" /> Kill
            </button>
            <button
              type="button"
              onClick={() => onPrint(groups)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-white/[0.05] text-white/50 text-[10px] font-medium hover:bg-white/[0.08] transition-all active:scale-95"
            >
              <Printer className="w-3 h-3" /> Print
            </button>
          </div>
        )}
      </motion.div>
      {/* Arrow */}
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 bg-black/85 border-r border-b border-white/[0.12]" />
    </div>
  );
}

function RoomGrid({ roomId, compact, inline, expanded, groups, onMoveGroups, onKillGroups, onPrintGroups }: {
  roomId: string;
  compact?: boolean;
  inline?: boolean;
  expanded?: boolean;
  groups?: PlantGroup[];
  onMoveGroups?: (groups: PlantGroup[]) => void;
  onKillGroups?: (groups: PlantGroup[]) => void;
  onPrintGroups?: (groups: PlantGroup[]) => void;
}) {
  const [tables, setTables] = useState<RoomTable[]>([]);
  const [occupancy, setOccupancy] = useState<Map<string, SectionOccupancy>>(new Map());
  const [loading, setLoading] = useState(true);
  const [pinnedSectionId, setPinnedSectionId] = useState<string | null>(null);

  useState(() => {
    Promise.all([
      cultivationService.listRoomTables(roomId),
      cultivationService.getSectionOccupancy(roomId),
    ]).then(([t, o]) => {
      setTables(t);
      setOccupancy(o);
    }).finally(() => setLoading(false));
  });

  const sortedTables = useMemo(() =>
    [...tables].filter(t => t.sections.length > 0).sort((a, b) => a.table_number - b.table_number),
    [tables]
  );

  const sectionLabels = useMemo(() => {
    const labels = new Set<string>();
    sortedTables.forEach(t => t.sections.forEach(s => labels.add(s.section_label)));
    return [...labels].sort();
  }, [sortedTables]);

  // Get plant groups for the pinned section
  const pinnedSectionGroups = useMemo(() => {
    if (!pinnedSectionId || !groups) return [];
    return groups.filter(g => g.room_section_id === pinnedSectionId);
  }, [pinnedSectionId, groups]);

  const isInteractive = !compact && groups && onMoveGroups && onKillGroups && onPrintGroups;

  // Click outside to dismiss pinned popover
  useEffect(() => {
    if (!pinnedSectionId) return;
    function handleClick() { setPinnedSectionId(null); }
    // Delay listener to avoid immediate dismissal from the click that pinned it
    const timeout = setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 10);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('click', handleClick);
    };
  }, [pinnedSectionId]);

  if (loading) return compact ? <div className="h-12 rounded-lg bg-white/[0.02] animate-pulse" /> : <div className={`${inline ? '' : GLASS + ' p-4'} h-32 animate-pulse`} />;
  if (sortedTables.length === 0) return compact ? <div className="text-[10px] text-white/20">No tables configured</div> : null;

  return (
    <div className={`${expanded ? 'flex-1 flex flex-col' : ''}`}>
      {!compact && !inline && <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-3">Room Layout</h3>}
      <div
        className={`grid ${expanded ? 'gap-1.5 flex-1' : 'gap-1'}`}
        style={{
          gridTemplateColumns: `32px repeat(${sectionLabels.length}, 1fr)`,
          ...(expanded ? { gridTemplateRows: `auto repeat(${sortedTables.length}, 1fr)` } : {}),
        }}
      >
        {/* Column headers */}
        <div />
        {sectionLabels.map(label => (
          <div key={label} className="text-center text-[9px] font-mono text-white/20 py-1">{label}</div>
        ))}

        {/* Rows */}
        {sortedTables.map(table => (
          <>
            <div key={`label-${table.table_number}`} className="flex items-center justify-center text-[9px] font-mono text-white/20">
              T{table.table_number}
            </div>
            {sectionLabels.map(sLabel => {
              const section = table.sections.find(s => s.section_label === sLabel);
              if (!section) {
                return <div key={`${table.table_number}-${sLabel}`} />;
              }
              const occ = occupancy.get(section.id);
              const hasPlants = occ && occ.total_plants > 0;
              const isPinned = pinnedSectionId === section.id;
              const isClickable = isInteractive && hasPlants;

              return (
                <div
                  key={`${table.table_number}-${sLabel}`}
                  className={`relative group/cell ${compact ? 'min-h-[24px]' : expanded ? 'min-h-[48px]' : 'min-h-[36px]'} rounded-lg flex flex-col items-center justify-center transition-all duration-150 ${
                    isPinned
                      ? 'bg-emerald-500/20 border-2 border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                      : hasPlants
                        ? `bg-emerald-500/8 border border-emerald-500/15 ${isClickable ? 'hover:bg-emerald-500/15 hover:border-emerald-500/25' : ''}`
                        : 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04]'
                  } ${isClickable ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                  onClick={isClickable ? (e) => {
                    e.stopPropagation();
                    setPinnedSectionId(isPinned ? null : section.id);
                  } : undefined}
                >
                  {/* Hover popover — only when not pinned, non-compact */}
                  {!compact && hasPlants && !isPinned && !pinnedSectionId && (
                    <div className="hidden group-hover/cell:block">
                      <CellHoverPopover
                        strainCounts={occ.strain_counts}
                        totalPlants={occ.total_plants}
                        tableNum={table.table_number}
                        sectionLabel={sLabel}
                      />
                    </div>
                  )}

                  {/* Pinned popover with plant IDs + actions */}
                  <AnimatePresence>
                    {isPinned && isInteractive && (
                      <PinnedCellPopover
                        sectionId={section.id}
                        strainCounts={occ!.strain_counts}
                        totalPlants={occ!.total_plants}
                        tableNum={table.table_number}
                        sectionLabel={sLabel}
                        groups={pinnedSectionGroups}
                        onMove={onMoveGroups}
                        onKill={onKillGroups}
                        onPrint={onPrintGroups}
                        onClose={() => setPinnedSectionId(null)}
                      />
                    )}
                  </AnimatePresence>

                  {hasPlants && (
                    <>
                      <span className={`text-[10px] font-mono font-bold ${isPinned ? 'text-emerald-300' : 'text-emerald-400/70'}`}>{occ.total_plants}</span>
                      {occ.strain_counts.slice(0, 2).map(s => (
                        <span key={s.abbreviation} className={`text-[7px] leading-tight ${isPinned ? 'text-white/40' : 'text-white/25'}`}>{s.abbreviation}</span>
                      ))}
                      {occ.strain_counts.length > 2 && (
                        <span className="text-[7px] text-white/15">+{occ.strain_counts.length - 2}</span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

// Non-scalable product types — these don't change when EC is adjusted
const NON_SCALABLE_TYPES = new Set(['cleanse', 'ph_adjuster', 'supplement']);

function InteractiveFeedCard({ state }: { state: RoomOperationalState }) {
  const stage = state.dominant_stage ?? state.room_type;
  const days = state.days_since_flip ?? state.days_in_stage ?? 0;
  const { recipe, roomOverride, loading, saving, saveRoomOverride } = useFeedProgramRecipe(stage, days, state.room_id);

  // Local editing state — initialized from override or recipe defaults
  const [editEc, setEditEc] = useState<string>('');
  const [editPhMin, setEditPhMin] = useState<string>('');
  const [editPhMax, setEditPhMax] = useState<string>('');
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Initialize edit state when recipe/override loads
  useEffect(() => {
    if (!recipe) return;
    const ec = roomOverride?.target_ec ?? recipe.targets.target_ec;
    const phMin = roomOverride?.target_ph_min ?? recipe.targets.target_ph_min;
    const phMax = roomOverride?.target_ph_max ?? recipe.targets.target_ph_max;
    setEditEc(ec != null ? String(ec) : '');
    setEditPhMin(phMin != null ? String(phMin) : '');
    setEditPhMax(phMax != null ? String(phMax) : '');

    const amounts: Record<string, string> = {};
    for (const entry of recipe.entries) {
      const overrideAmt = roomOverride?.product_overrides?.[entry.product.id];
      amounts[entry.product.id] = String(overrideAmt ?? entry.ml_per_gal);
    }
    setEditAmounts(amounts);
    setIsDirty(false);
  }, [recipe, roomOverride]);

  // EC scaling — when EC changes, scale all nutrient products proportionally
  function handleEcChange(newEcStr: string) {
    setEditEc(newEcStr);
    setIsDirty(true);
    if (!recipe) return;

    const newEc = parseFloat(newEcStr);
    const baseEc = recipe.targets.target_ec;
    if (!baseEc || isNaN(newEc) || newEc <= 0) return;

    const scaleFactor = newEc / Number(baseEc);
    const newAmounts = { ...editAmounts };
    for (const entry of recipe.entries) {
      if (NON_SCALABLE_TYPES.has(entry.product.product_type)) continue;
      const baseAmount = entry.ml_per_gal;
      newAmounts[entry.product.id] = String(Math.round(baseAmount * scaleFactor * 10) / 10);
    }
    setEditAmounts(newAmounts);
  }

  function handleAmountChange(productId: string, value: string) {
    setEditAmounts(prev => ({ ...prev, [productId]: value }));
    setIsDirty(true);
  }

  function handlePhChange(field: 'min' | 'max', value: string) {
    if (field === 'min') setEditPhMin(value);
    else setEditPhMax(value);
    setIsDirty(true);
  }

  async function handleSave() {
    if (!recipe) return;
    const productOverrides: Record<string, number> = {};
    for (const entry of recipe.entries) {
      const val = parseFloat(editAmounts[entry.product.id] ?? '');
      if (!isNaN(val) && val !== entry.ml_per_gal) {
        productOverrides[entry.product.id] = val;
      }
    }
    await saveRoomOverride({
      target_ec: editEc ? parseFloat(editEc) : null,
      target_ph_min: editPhMin ? parseFloat(editPhMin) : null,
      target_ph_max: editPhMax ? parseFloat(editPhMax) : null,
      product_overrides: productOverrides,
    });
    setIsDirty(false);
  }

  function handleReset() {
    if (!recipe) return;
    setEditEc(recipe.targets.target_ec != null ? String(recipe.targets.target_ec) : '');
    setEditPhMin(recipe.targets.target_ph_min != null ? String(recipe.targets.target_ph_min) : '');
    setEditPhMax(recipe.targets.target_ph_max != null ? String(recipe.targets.target_ph_max) : '');
    const amounts: Record<string, string> = {};
    for (const entry of recipe.entries) {
      amounts[entry.product.id] = String(entry.ml_per_gal);
    }
    setEditAmounts(amounts);
    setIsDirty(true);
  }

  if (loading) return <div className="h-16 rounded-lg bg-white/[0.02] animate-pulse" />;
  if (!recipe) return <p className="text-[10px] text-white/20">No feed program configured.</p>;

  const hasOverride = roomOverride != null;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs text-white/60">{recipe.program_name}</span>
          <span className="text-[10px] text-white/25 ml-2">{recipe.phase} · W{recipe.week_number}</span>
        </div>
        {hasOverride && !isDirty && (
          <span className="text-[9px] text-amber-400/60 uppercase tracking-wider">Room Override</span>
        )}
      </div>

      {/* EC — large editable input */}
      <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
        <div className="flex-1">
          <div className="text-[9px] text-white/25 uppercase tracking-wider mb-1">Target EC</div>
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={editEc}
            onChange={(e) => handleEcChange(e.target.value)}
            className="bg-transparent text-2xl font-bold font-mono text-emerald-400 w-20 outline-none focus:text-emerald-300 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          {recipe.targets.target_ec && editEc !== String(recipe.targets.target_ec) && (
            <span className="text-[9px] text-white/15 font-mono ml-2">base: {recipe.targets.target_ec}</span>
          )}
        </div>
        {recipe.targets.target_ppm_500 && (
          <div>
            <div className="text-[9px] text-white/25 uppercase tracking-wider mb-1">PPM</div>
            <span className="text-sm font-mono text-white/40">{recipe.targets.target_ppm_500}</span>
          </div>
        )}
      </div>

      {/* Product rows — editable amounts */}
      <div className="space-y-1 mb-4">
        {recipe.entries.map((entry) => {
          const currentVal = editAmounts[entry.product.id] ?? String(entry.ml_per_gal);
          const isScalable = !NON_SCALABLE_TYPES.has(entry.product.product_type);
          const isOverridden = currentVal !== String(entry.ml_per_gal);

          return (
            <div key={entry.product.id} className="flex justify-between items-center py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] text-white/15 font-mono w-3">{entry.mixing_order}</span>
                <span className={`text-xs ${isScalable ? 'text-white/60' : 'text-white/35'}`}>{entry.product.name}</span>
                {!isScalable && (
                  <span className="text-[8px] text-white/15 uppercase">fixed</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isOverridden && (
                  <span className="text-[9px] text-white/15 font-mono">{entry.ml_per_gal}</span>
                )}
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={currentVal}
                  onChange={(e) => handleAmountChange(entry.product.id, e.target.value)}
                  className={`bg-transparent text-sm font-mono text-right w-14 outline-none transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                    isOverridden ? 'text-amber-300' : 'text-white/80'
                  } focus:text-white`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* pH — large editable */}
      <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] mb-4">
        <div className="text-[9px] text-white/25 uppercase tracking-wider">pH</div>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            step="0.1"
            min="0"
            max="14"
            value={editPhMin}
            onChange={(e) => handlePhChange('min', e.target.value)}
            className="bg-transparent text-lg font-bold font-mono text-white/70 w-12 outline-none focus:text-white transition-colors text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-white/20">–</span>
          <input
            type="number"
            step="0.1"
            min="0"
            max="14"
            value={editPhMax}
            onChange={(e) => handlePhChange('max', e.target.value)}
            className="bg-transparent text-lg font-bold font-mono text-white/70 w-12 outline-none focus:text-white transition-colors text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        {recipe.targets.target_ph_min && (editPhMin !== String(recipe.targets.target_ph_min) || editPhMax !== String(recipe.targets.target_ph_max)) && (
          <span className="text-[9px] text-white/15 font-mono">base: {recipe.targets.target_ph_min}–{recipe.targets.target_ph_max}</span>
        )}
      </div>

      {/* Save / Reset bar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || saving}
          className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all active:scale-[0.98] ${
            isDirty
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/30'
              : 'bg-white/[0.03] text-white/20 border border-white/[0.04] cursor-default'
          }`}
        >
          {saving ? 'Saving...' : isDirty ? 'Save to Room' : 'Saved'}
        </button>
        {(isDirty || hasOverride) && (
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl text-[10px] text-white/30 border border-white/[0.06] hover:text-white/50 hover:border-white/[0.1] transition-all active:scale-95"
          >
            Reset
          </button>
        )}
      </div>
    </>
  );
}

// Compact read-only feed card for sidebar
function FeedCardContent({ state }: { state: RoomOperationalState }) {
  const stage = state.dominant_stage ?? state.room_type;
  const days = state.days_since_flip ?? state.days_in_stage ?? 0;
  const { recipe, roomOverride, loading } = useFeedProgramRecipe(stage, days, state.room_id);

  if (loading) return <div className="h-16 rounded-lg bg-white/[0.02] animate-pulse" />;
  if (!recipe) return <p className="text-[10px] text-white/20">No feed program configured.</p>;

  const ec = roomOverride?.target_ec ?? recipe.targets.target_ec;
  const phMin = roomOverride?.target_ph_min ?? recipe.targets.target_ph_min;
  const phMax = roomOverride?.target_ph_max ?? recipe.targets.target_ph_max;

  return (
    <>
      <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-medium mb-3">Feed Recipe</h3>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-white/60">{recipe.program_name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">{recipe.phase} · W{recipe.week_number}</span>
          {ec && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              EC {ec}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1">
        {recipe.entries.map((entry) => {
          const amt = roomOverride?.product_overrides?.[entry.product.id] ?? entry.ml_per_gal;
          return (
            <div key={entry.product.id} className="flex justify-between items-center py-1.5 px-2.5 rounded-lg bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/20 font-mono w-3">{entry.mixing_order}</span>
                <span className="text-xs text-white/60">{entry.product.name}</span>
              </div>
              <span className="text-xs font-mono text-white/80">{amt}</span>
            </div>
          );
        })}
      </div>
      {phMin && phMax && (
        <div className="flex gap-4 mt-3">
          <span className="text-sm font-mono text-white/40">pH {phMin}–{phMax}</span>
          {recipe.targets.target_ppm_500 && <span className="text-[10px] text-white/25 self-center">PPM {recipe.targets.target_ppm_500}</span>}
        </div>
      )}
    </>
  );
}

function FeedCard({ state }: { state: RoomOperationalState }) {
  return <FeedCardContent state={state} />;
}

// ═══════════════════════════════════════════════════════════════
// Loading Skeleton
// ═══════════════════════════════════════════════════════════════

function GlassSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`${GLASS} animate-pulse ${i < 2 ? 'col-span-2 row-span-2' : ''}`}
            style={{ minHeight: i < 2 ? '200px' : '120px' }}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Quick Add Task Modal — 3 taps: type → person → done
// ═══════════════════════════════════════════════════════════════

const QUICK_ADD_TYPES = ['batch_tank_mix', 'ipm_spray', 'scouting', 'defoliation', 'cleaning', 'training', 'maintenance', 'custom'] as const;

function QuickAddTask({ roomId, roomCode, staff, onAdd, onClose }: {
  roomId: string;
  roomCode: string;
  staff: Array<{ id: string; first_name: string }>;
  onAdd: (input: { room_id: string; task_type: string; task_date: string; assigned_to?: string | null }) => Promise<void>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'type' | 'assign'>('type');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAssign(staffId: string | null) {
    if (!selectedType) return;
    setSaving(true);
    try {
      await onAdd({
        room_id: roomId,
        task_type: selectedType,
        task_date: todayIso(),
        assigned_to: staffId,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`relative w-full max-w-sm ${GLASS_ELEVATED} p-5 space-y-4`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            {step === 'type' ? `Add task to ${roomCode}` : 'Assign to'}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        {step === 'type' && (
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ADD_TYPES.map(type => {
              const config = getTaskTypeConfig(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setSelectedType(type); setStep('assign'); }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-95 text-left"
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
                  <span className="text-xs text-white/70">{config.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {step === 'assign' && (
          <div className="space-y-2">
            {/* Skip assignment option */}
            <button
              type="button"
              onClick={() => handleAssign(null)}
              disabled={saving}
              className="w-full p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-95 text-left"
            >
              <span className="text-xs text-white/40">Skip — leave unassigned</span>
            </button>
            {/* Staff list */}
            {staff.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleAssign(s.id)}
                disabled={saving}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-95 text-left"
              >
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white/60">
                  {s.first_name[0]}
                </div>
                <span className="text-sm text-white/70">{s.first_name}</span>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Command Center
// ═══════════════════════════════════════════════════════════════

export function CommandCenter() {
  const { rooms: opsRooms, loading } = useRoomOperationalState();
  const { rooms: growRooms } = useGrowRooms();
  const { groups: allGroups, moveToRoom, splitAndMoveToRoom, splitAndMoveMultipleToRoom } = usePlantGroups({ stage: 'active' });
  const today = todayIso();
  const { tasks, updateStatus, completeWithLog, assignWorker, createTask, refetch: refetchTasks } = useDailyTasks(today);
  const { staff: allStaff } = useActiveStaff();
  const { generate: generateTasks } = useGenerateTasksFromSchedules();
  const [selectedRoomCode, setSelectedRoomCode] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showLaborOverview, setShowLaborOverview] = useState(false);
  const [hasAutoGenerated, setHasAutoGenerated] = useState(false);

  // Auto-generate tasks from schedules on first mount
  useEffect(() => {
    if (!hasAutoGenerated && !loading) {
      generateTasks(today).then(result => {
        setHasAutoGenerated(true);
        if (result.created > 0) {
          refetchTasks();
        }
      }).catch(() => {
        setHasAutoGenerated(true);
      });
    }
  }, [hasAutoGenerated, loading, today, generateTasks, refetchTasks]);

  const selectedRoom = useMemo(
    () => selectedRoomCode ? opsRooms.find(r => r.room_code === selectedRoomCode) ?? null : null,
    [selectedRoomCode, opsRooms]
  );

  // Sort: urgent first, then by room code
  const sortedRooms = useMemo(() => {
    return [...opsRooms].sort((a, b) => {
      if (b.urgency_score !== a.urgency_score) return b.urgency_score - a.urgency_score;
      return a.room_code.localeCompare(b.room_code);
    });
  }, [opsRooms]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const unassignedCount = tasks.filter(t => !t.assigned_to && t.status !== 'completed' && t.status !== 'skipped').length;

  const handleRoomClick = useCallback((code: string) => {
    setSelectedRoomCode(code);
  }, []);

  const handleUpdateTaskStatus = useCallback((taskId: string, status: string) => {
    updateStatus(taskId, status as DailyTaskInstance['status']);
  }, [updateStatus]);

  if (loading) return <GlassSkeleton />;

  return (
    <div className={`min-h-screen ${PAGE_BG}`}>
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sprout className="w-5 h-5 text-emerald-400" />
          <div>
            <h1 className="text-base font-semibold text-white">Command Center</h1>
            <p className="text-[11px] text-white/30">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowLaborOverview(!showLaborOverview)}
          className={`${showLaborOverview ? GLASS_ELEVATED : GLASS} px-3 py-1.5 flex items-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer`}
          style={unassignedCount > 0 ? {
            borderColor: 'rgba(245,158,11,0.25)',
            boxShadow: '0 0 12px rgba(245,158,11,0.15)',
          } : completedTasks === totalTasks && totalTasks > 0 ? {
            borderColor: 'rgba(16,185,129,0.25)',
            boxShadow: '0 0 12px rgba(16,185,129,0.15)',
          } : undefined}
        >
          <ClipboardList className={`w-3.5 h-3.5 ${unassignedCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
          <span className="font-mono text-sm font-semibold text-white">{completedTasks}/{totalTasks}</span>
          <span className="text-[10px] text-white/30">done</span>
          <ChevronDown className={`w-3 h-3 text-white/20 transition-transform duration-200 ${showLaborOverview ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Labor overview panel — tappable counter dropdown */}
      <AnimatePresence>
        {showLaborOverview && (
          <LaborOverviewPanel
            tasks={tasks}
            opsRooms={opsRooms}
            staff={allStaff?.map(s => ({ id: s.id, first_name: s.first_name })) ?? []}
            onRoomClick={handleRoomClick}
            onClose={() => setShowLaborOverview(false)}
          />
        )}
      </AnimatePresence>

      {/* Attention strip */}
      <AttentionStrip opsRooms={opsRooms} onRoomClick={handleRoomClick} />

      {/* Main content */}
      <AnimatePresence mode="wait">
        {selectedRoom ? (
          <ExpandedRoomView
            key={`room-${selectedRoomCode}`}
            state={selectedRoom}
            tasks={tasks}
            groups={allGroups}
            rooms={growRooms}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            onCompleteWithLog={(taskId, refTable, refId, duration) => completeWithLog(taskId, refTable, refId, duration)}
            onAssignWorker={async (taskId, staffId) => { await assignWorker(taskId, staffId); }}
            onCreateTask={async (input) => { await createTask(input); }}
            onMoveToRoom={async (groupId, toRoomId) => { await moveToRoom(groupId, toRoomId); }}
            onSplitAndMove={async (input) => { await splitAndMoveToRoom(input); }}
            onSplitAndMoveMultiple={async (input) => { await splitAndMoveMultipleToRoom(input); }}
            onBack={() => setSelectedRoomCode(null)}
          />
        ) : (
          <motion.div
            key="grid"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {sortedRooms.map(room => (
              <RoomTile
                key={room.room_id}
                state={room}
                tasks={tasks}
                onClick={() => handleRoomClick(room.room_code)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating add button — visible when a room is selected */}
      {selectedRoom && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          type="button"
          onClick={() => setShowQuickAdd(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.4)] flex items-center justify-center transition-colors active:scale-90 z-40"
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      )}

      {/* Quick Add modal */}
      <AnimatePresence>
        {showQuickAdd && selectedRoom && (
          <QuickAddTask
            roomId={selectedRoom.room_id}
            roomCode={selectedRoom.room_code}
            staff={allStaff?.map(s => ({ id: s.id, first_name: s.first_name })) ?? []}
            onAdd={async (input) => { await createTask(input); }}
            onClose={() => setShowQuickAdd(false)}
          />
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
