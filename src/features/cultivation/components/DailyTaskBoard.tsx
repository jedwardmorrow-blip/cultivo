import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  ClipboardList,
  Users,
  Plus,
  X,
  Wrench,
  Skull,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { Button } from '@/shared/components';
import { notificationService } from '@/services';
import { useAttendance, useDailyTasks, useGrowRooms, useGenerateTasksFromSchedules } from '../hooks';
import { useRoomOperationalState } from '../hooks/useRoomOperationalState';
import { useActiveStaff } from '@features/sessions/hooks/useActiveStaff';
import { TASK_TYPE_CONFIG, getTaskTypeConfig } from '../types';
import type { TaskType, RoomType } from '../types';
import { RoomCalendar, RoomSetupPanel } from './RoomCalendar';
import { ScheduleBuilder } from './VisualTemplateBuilder';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { WorkerCheckIn } from './WorkerCheckIn';
import type { StaffMember } from './WorkerCheckIn';
import type { RoomOperationalState } from '../hooks/useRoomOperationalState';
import { TaskCard } from './TaskCard';
import type { TaskCardData, StaffOption } from './TaskCard';
import { TaskCompletionForm } from './TaskCompletionForm';
import { DeadPlantForm } from './DeadPlantForm';
import { StaffCapacityPanel } from './StaffCapacityPanel';
import { WeekTaskGrid } from './WeekTaskGrid';
import { todayIso } from '../utils/dateUtils';
import { ROOM_TYPE_LEFT_BORDER } from '../constants/stageColors';

/* Workers tab removed in favour of standalone /worker-tasks route.
   Task Types and Templates moved to /cultivation-task-settings. */

const ROOM_TYPE_ORDER: Record<string, number> = { mother: 0, veg: 1, flower: 2, clone: 3, mixed: 4 };
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Roles that belong on the cultivation task board */
const CULTIVATION_ROLES = new Set(['cultivation_manager', 'cultivation_lead', 'cultivator', 'manager', 'operations', 'operations_manager']);

export function SchedulesPage() {
  return <ScheduleBuilder />;
}

export function DailyTaskBoard() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [showCapacity, setShowCapacity] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  const { rooms: dbRooms } = useGrowRooms();
  const { tasks: dbTasks, completeWithLog, assignWorker, updateStatus, refetch: refetchTasks, createTask, updateTask, deleteTask } = useDailyTasks(selectedDate);
  const { generate: generateTasks, generating } = useGenerateTasksFromSchedules();
  const { records: attendance, upsertAttendance } = useAttendance(selectedDate);
  const { staff: activeStaff } = useActiveStaff();
  const { rooms: opsRooms } = useRoomOperationalState();

  // Map DB staff to StaffMember shape — filter to cultivation roles only
  const cultivationStaff: StaffMember[] = useMemo(() => {
    return activeStaff
      .filter((s) => CULTIVATION_ROLES.has(s.role ?? ''))
      .map((s) => ({
        id: s.id,
        first_name: s.first_name,
        role: s.role ?? 'staff',
        hourly_rate: 0,
      }));
  }, [activeStaff]);

  // All staff (for Workers tab which shows everyone)
  const allStaff: StaffMember[] = useMemo(() => {
    return activeStaff.map((s) => ({
      id: s.id,
      first_name: s.first_name,
      role: s.role ?? 'staff',
      hourly_rate: 0,
    }));
  }, [activeStaff]);

  const rooms = useMemo(() => {
    return dbRooms.map((r) => ({ id: r.id, name: r.name, room_type: r.room_type, room_code: r.room_code }));
  }, [dbRooms]);

  const taskCards: TaskCardData[] = useMemo(() => {
    return dbTasks.map((t) => {
      const room = rooms.find((r) => r.id === t.room_id);
      const staffMember = allStaff.find((s) => s.id === t.assigned_to);
      const durationHours = t.estimated_duration
        ? parseFloat(t.estimated_duration.replace(/[^0-9.]/g, '')) || 0
        : 0;
      const cost = staffMember && staffMember.hourly_rate > 0 ? durationHours * staffMember.hourly_rate : undefined;
      return {
        id: t.id,
        task_type: t.task_type,
        room_name: room?.room_code ?? 'Unknown',
        assigned_to: t.assigned_to ?? null,
        assigned_to_name: staffMember?.first_name ?? t.assigned_to,
        status: t.status,
        estimated_duration: t.estimated_duration,
        notes: t.notes,
        scope: t.scope,
        progress_current: (t.progress_data as Record<string, number>)?.current,
        progress_total: (t.progress_data as Record<string, number>)?.total,
        estimated_cost: cost,
        task_config: t.task_config,
      };
    });
  }, [dbTasks, rooms, allStaff]);

  const isToday = selectedDate === todayIso();
  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const handleGenerateTasks = async () => {
    try {
      const result = await generateTasks(selectedDate);
      if (result.created > 0) {
        notificationService.success(
          `Generated ${result.created} task${result.created !== 1 ? 's' : ''}${result.skipped > 0 ? ` (${result.skipped} already existed)` : ''}`,
        );
        await refetchTasks();
      } else if (result.skipped > 0) {
        notificationService.success('All scheduled tasks already exist for this day');
      } else {
        notificationService.success('No schedules fire on this date');
      }
    } catch {
      notificationService.error('Could not generate tasks from schedules', 'Generate Failed');
    }
  };

  return (
    <div className="space-y-0 pb-8">
      {/* ── Header: Date Nav + Title ────────────────────────── */}
      <div className="flex items-start justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-2xl font-bold text-cult-text-primary">
              Today's Tasks
            </h1>
          </div>
          <p className="text-cult-border text-sm mt-0.5">Daily assignments by room</p>
          <div className="flex items-center gap-3 mt-1.5">
            <button
              type="button"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().slice(0, 10));
              }}
              className="p-3 -m-1 text-cult-border hover:text-cult-text-primary active:bg-cult-surface-raised/40 transition-colors rounded-lg"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className={`text-sm font-medium ${isToday ? 'text-cult-text-primary' : 'text-cult-text-muted'}`}>
              {isToday ? 'Today' : dateLabel}
              {isToday && (
                <span className="text-cult-border ml-1.5 font-normal">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </span>

            <button
              type="button"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().slice(0, 10));
              }}
              className="p-3 -m-1 text-cult-border hover:text-cult-text-primary active:bg-cult-surface-raised/40 transition-colors rounded-lg"
              aria-label="Next day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {!isToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayIso())}
                className="ml-1 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-accent border border-cult-accent/30 hover:bg-cult-accent/10 active:bg-cult-accent/20 transition-colors rounded-sm"
              >
                Jump to Today
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Day / Week toggle */}
          <div className="flex border border-cult-surface rounded-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-2.5 min-h-[44px] text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                viewMode === 'day'
                  ? 'bg-cult-surface-raised text-cult-text-primary'
                  : 'text-cult-border hover:text-cult-text-muted hover:bg-cult-surface-raised/30'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Day
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-2.5 min-h-[44px] text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                viewMode === 'week'
                  ? 'bg-cult-surface-raised text-cult-text-primary'
                  : 'text-cult-border hover:text-cult-text-muted hover:bg-cult-surface-raised/30'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              4-Week
            </button>
          </div>
          {viewMode === 'day' && (
            <button
              type="button"
              onClick={handleGenerateTasks}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-semibold uppercase tracking-wider text-violet-400 hover:text-violet-300 bg-violet-950/40 border border-violet-800/40 hover:border-violet-700/60 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm transition-colors"
              title="Generate task instances from active room schedules for this date"
            >
              <Zap className="w-3.5 h-3.5" />
              {generating ? 'Generating…' : 'Generate Tasks'}
            </button>
          )}
          {viewMode === 'day' && (
            <button
              type="button"
              onClick={() => setShowCapacity((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors ${
                showCapacity
                  ? 'text-cult-accent bg-cult-accent/10 border border-cult-accent/40'
                  : 'text-cult-border hover:text-cult-text-muted bg-cult-surface-raised/40 border border-cult-surface/60 hover:border-cult-border'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Capacity
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/cultivation-schedules')}
            className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-semibold uppercase tracking-wider text-cult-border hover:text-cult-text-muted bg-cult-surface-raised/40 border border-cult-surface/60 hover:border-cult-border rounded-sm transition-colors"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Manage Schedules
          </button>
        </div>
      </div>

      {/* ── Staff Capacity Panel (collapsible, day view only) ── */}
      {viewMode === 'day' && showCapacity && (
        <div className="mb-5 p-4 bg-cult-surface border border-cult-surface rounded-sm">
          <StaffCapacityPanel
            tasks={taskCards}
            allStaff={allStaff}
            onAssignWorker={async (taskId, staffId) => { await assignWorker(taskId, staffId); }}
          />
        </div>
      )}

      {/* ── Week Grid view ─────────────────────────────────── */}
      {viewMode === 'week' && (
        <WeekTaskGrid weekCount={4} />
      )}

      {/* ── Day Board view ─────────────────────────────────── */}
      {viewMode === 'day' && (
        <DailyBoardTab
          rooms={rooms}
          opsRooms={opsRooms}
          staff={cultivationStaff}
          allStaff={allStaff}
          tasks={taskCards}
          attendance={attendance}
          date={selectedDate}
          onUpsertAttendance={async (input) => { await upsertAttendance(input); }}
          onCompleteWithLog={async (taskId, refTable, refId, dur) => {
            await completeWithLog(taskId, refTable, refId, dur ?? undefined);
            await refetchTasks();
          }}
          onCreateTask={async (input) => {
            await createTask(input);
          }}
          onAssignWorker={async (taskId, staffId) => {
            await assignWorker(taskId, staffId);
          }}
          onStartTask={async (taskId) => {
            await updateStatus(taskId, 'in_progress');
          }}
          onSkipTask={async (taskId) => {
            await updateStatus(taskId, 'skipped');
          }}
          onCarryForward={async (taskId) => {
            await updateStatus(taskId, 'carry_forward');
          }}
          onUpdateTask={async (taskId, updates) => {
            await updateTask(taskId, updates);
          }}
          onDeleteTask={async (taskId) => {
            await deleteTask(taskId);
          }}
          onGenerateTasks={handleGenerateTasks}
          generatingTasks={generating}
        />
      )}

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DAILY BOARD TAB — Redesigned
   ═══════════════════════════════════════════════════════════ */

interface DailyBoardTabProps {
  rooms: { id: string; name: string; room_type: RoomType; room_code: string }[];
  opsRooms: RoomOperationalState[];
  staff: StaffMember[];
  allStaff: StaffMember[];
  tasks: TaskCardData[];
  attendance: ReturnType<typeof useAttendance>['records'];
  date: string;
  onUpsertAttendance: (input: Parameters<ReturnType<typeof useAttendance>['upsertAttendance']>[0]) => Promise<void>;
  onCompleteWithLog: (taskId: string, refTable: string, refId: string, duration: string | null) => Promise<void>;
  onCreateTask: (input: { room_id: string; task_type: string; assigned_to?: string | null; notes?: string | null; task_date: string }) => Promise<void>;
  onAssignWorker: (taskId: string, staffId: string) => Promise<void>;
  onStartTask: (taskId: string) => Promise<void>;
  onSkipTask: (taskId: string) => Promise<void>;
  onCarryForward: (taskId: string) => Promise<void>;
  onUpdateTask: (taskId: string, updates: { notes?: string | null; task_date?: string; assigned_to?: string | null; task_config?: Record<string, unknown>; estimated_duration?: string | null; status?: string }) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onGenerateTasks?: () => Promise<void>;
  generatingTasks?: boolean;
}

function DailyBoardTab({ rooms, opsRooms, staff, allStaff, tasks, attendance, date, onUpsertAttendance, onCompleteWithLog, onCreateTask, onAssignWorker, onStartTask, onSkipTask, onCarryForward, onUpdateTask, onDeleteTask, onGenerateTasks, generatingTasks }: DailyBoardTabProps) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskRoomId, setAddTaskRoomId] = useState<string | null>(null);
  const [completingTask, setCompletingTask] = useState<{ task: TaskCardData; roomId: string } | null>(null);
  const [detailTask, setDetailTask] = useState<{ task: TaskCardData; roomId: string } | null>(null);
  const [showDeadPlantForm, setShowDeadPlantForm] = useState(false);
  const [deadPlantRoomId, setDeadPlantRoomId] = useState<string | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [toggledRooms, setToggledRooms] = useState<Set<string>>(new Set());
  const [roomFilters, setRoomFilters] = useState<Map<string, 'all' | 'pending' | 'in_progress' | 'completed'>>(new Map());

  // ── Ops data lookup ───────────────────────────────────
  const opsMap = useMemo(() => {
    const map = new Map<string, RoomOperationalState>();
    for (const ops of opsRooms) map.set(ops.room_code, ops);
    return map;
  }, [opsRooms]);

  // ── Task aggregation ──────────────────────────────────
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const carried = tasks.filter((t) => t.status === 'carry_forward').length;
    const skipped = tasks.filter((t) => t.status === 'skipped').length;
    const unassigned = tasks.filter((t) => !t.assigned_to_name && t.status !== 'completed' && t.status !== 'skipped').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pending, carried, skipped, unassigned, pct };
  }, [tasks]);

  // Staff options for quick-assign — present ones first
  const quickAssignStaff: StaffOption[] = useMemo(() => {
    const presentIds = new Set(attendance.filter((a) => a.is_present).map((a) => a.staff_id));
    return staff
      .map((s) => ({ id: s.id, first_name: s.first_name, is_present: presentIds.has(s.id) }))
      .sort((a, b) => (a.is_present === b.is_present ? 0 : a.is_present ? -1 : 1));
  }, [staff, attendance]);

  // tasksByRoom: all tasks grouped by room (no global filter — filtering is per-room)
  const tasksByRoom = useMemo(() => {
    const map = new Map<string, TaskCardData[]>();
    for (const t of tasks) {
      const roomMatch = rooms.find((r) => r.room_code === t.room_name);
      const key = roomMatch?.id ?? t.room_name;
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => {
        const cfg_a = getTaskTypeConfig(a.task_type);
        const cfg_b = getTaskTypeConfig(b.task_type);
        const pa = PRIORITY_ORDER[(cfg_a as Record<string, unknown>)?.priority as string] ?? 1;
        const pb = PRIORITY_ORDER[(cfg_b as Record<string, unknown>)?.priority as string] ?? 1;
        if (a.status === 'carry_forward' && b.status !== 'carry_forward') return -1;
        if (b.status === 'carry_forward' && a.status !== 'carry_forward') return 1;
        return pa - pb;
      });
    }
    return map;
  }, [tasks, rooms]);

  const sortedRoomEntries = useMemo(() => {
    const entries: { room: typeof rooms[0]; tasks: TaskCardData[]; completedCount: number; totalCount: number }[] = [];
    for (const room of rooms) {
      const roomTasks = tasksByRoom.get(room.id) ?? [];
      if (roomTasks.length > 0) {
        entries.push({
          room,
          tasks: roomTasks,
          completedCount: roomTasks.filter((t) => t.status === 'completed').length,
          totalCount: roomTasks.length,
        });
      }
    }
    entries.sort((a, b) => {
      const typeA = ROOM_TYPE_ORDER[a.room.room_type] ?? 9;
      const typeB = ROOM_TYPE_ORDER[b.room.room_type] ?? 9;
      if (typeA !== typeB) return typeA - typeB;
      const urgA = opsMap.get(a.room.room_code)?.urgency_score ?? 0;
      const urgB = opsMap.get(b.room.room_code)?.urgency_score ?? 0;
      return urgB - urgA;
    });
    return entries;
  }, [rooms, tasksByRoom, opsMap]);

  // ── Alert bar items ───────────────────────────────────
  const alerts = useMemo(() => {
    const items: string[] = [];
    for (const { room, tasks: roomTasks } of sortedRoomEntries) {
      const ops = opsMap.get(room.room_code);
      if (ops?.days_to_harvest != null && ops.days_to_harvest > 0 && ops.days_to_harvest <= 7) {
        items.push(`${room.room_code} harvest in ${ops.days_to_harvest}d`);
      }
      const unassigned = roomTasks.filter((t) => !t.assigned_to && t.status !== 'completed' && t.status !== 'skipped').length;
      if (unassigned > 0) {
        items.push(`${unassigned} unassigned task${unassigned !== 1 ? 's' : ''} in ${room.room_code}`);
      }
    }
    return items;
  }, [sortedRoomEntries, opsMap]);

  // ── Per-room helpers ──────────────────────────────────
  function getRoomFilter(roomId: string) {
    return roomFilters.get(roomId) ?? 'all';
  }

  function updateRoomFilter(roomId: string, filter: 'all' | 'pending' | 'in_progress' | 'completed') {
    setRoomFilters((prev) => { const next = new Map(prev); next.set(roomId, filter); return next; });
  }

  function isRoomCollapsed(roomId: string, allDone: boolean) {
    // User toggle flips the default; done rooms default-collapsed, others default-expanded
    return toggledRooms.has(roomId) ? !allDone : allDone;
  }

  function toggleRoom(roomId: string) {
    setToggledRooms((prev) => { const next = new Set(prev); if (next.has(roomId)) next.delete(roomId); else next.add(roomId); return next; });
  }

  const staffPresent = useMemo(() => {
    const cultIds = new Set(staff.map((s) => s.id));
    return attendance.filter((a) => a.is_present && cultIds.has(a.staff_id)).length;
  }, [staff, attendance]);

  function openAddTask(roomId?: string) { setAddTaskRoomId(roomId ?? null); setShowAddTask(true); }
  function openDeadPlantForm(roomId?: string) { setDeadPlantRoomId(roomId ?? null); setShowDeadPlantForm(true); }
  function openCompletionForm(task: TaskCardData) {
    const roomMatch = rooms.find((r) => r.room_code === task.room_name);
    setCompletingTask({ task, roomId: roomMatch?.id ?? '' });
  }
  function openDetailDrawer(task: TaskCardData) {
    const roomMatch = rooms.find((r) => r.room_code === task.room_name);
    setDetailTask({ task, roomId: roomMatch?.id ?? '' });
  }
  function crewInitials(name: string) {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  }

  const hasNoTasks = tasks.length === 0;

  return (
    <div className="space-y-5 relative">
      {/* ── Progress Bar + Actions ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-center">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-cult-text-primary">
              {stats.pct}% complete
              <span className="text-cult-border font-normal ml-2 text-xs">
                {stats.completed}/{stats.total} tasks
              </span>
            </span>
            <div className="flex items-center gap-3 text-xs">
              {stats.inProgress > 0 && (
                <span className="text-cult-info">{stats.inProgress} active</span>
              )}
              <span className="text-cult-border font-mono">{staffPresent}/{staff.length} crew</span>
            </div>
          </div>
          <div className="w-full h-2 bg-cult-surface-raised rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                stats.pct === 100 ? 'bg-cult-success' : 'bg-cult-accent'
              }`}
              style={{ width: `${Math.max(stats.pct, stats.total > 0 ? 2 : 0)}%` }}
            />
          </div>
          {stats.unassigned > 0 && (
            <p className="text-xs text-cult-warning/80 mt-1">
              {stats.unassigned} task{stats.unassigned !== 1 ? 's' : ''} unassigned
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 lg:flex-col lg:items-stretch">
          <button
            type="button"
            onClick={() => openAddTask()}
            className="flex items-center gap-2 px-4 py-2.5 bg-cult-success hover:bg-cult-success/90 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
          <button
            type="button"
            onClick={() => openDeadPlantForm()}
            className="flex items-center gap-2 px-4 py-2.5 bg-cult-surface-raised hover:bg-cult-border text-cult-text-muted text-xs font-semibold uppercase tracking-wider transition-colors border border-cult-surface"
          >
            <Skull className="w-3.5 h-3.5 text-cult-danger" />
            Dead Plant
          </button>
        </div>
      </div>

      {/* ── Alert Bar (conditional) ───────────────────────── */}
      {alerts.length > 0 && !alertDismissed && (
        <div className="flex items-start justify-between gap-3 px-4 py-3 bg-cult-warning-muted border border-cult-warning/30">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-cult-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-cult-warning leading-relaxed">{alerts.join(' · ')}</p>
          </div>
          <button
            type="button"
            onClick={() => setAlertDismissed(true)}
            className="p-1 -m-1 text-cult-warning/60 hover:text-cult-warning transition-colors flex-shrink-0"
            aria-label="Dismiss alerts"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Inline Crew Strip ─────────────────────────────── */}
      <InlineCrewStrip
        staff={staff}
        attendance={attendance}
        date={date}
        onUpsertAttendance={onUpsertAttendance}
      />

      {/* ── Empty State ───────────────────────────────────── */}
      {hasNoTasks && (
        <div className="border border-dashed border-cult-surface py-12 px-6 flex flex-col items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-cult-surface-raised flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-cult-border" />
          </div>
          <div className="text-center max-w-md">
            <p className="text-sm text-cult-text-muted font-medium">No tasks scheduled for this day</p>
            <p className="text-xs text-cult-border mt-2 leading-relaxed">
              Generate tasks from your room schedules, or add a one-off task manually.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {onGenerateTasks && (
              <button
                type="button"
                onClick={onGenerateTasks}
                disabled={generatingTasks}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold uppercase tracking-wider transition-colors min-w-[180px] justify-center"
              >
                <Zap className="w-3.5 h-3.5" />
                {generatingTasks ? 'Generating…' : 'Generate Tasks'}
              </button>
            )}
            <button
              type="button"
              onClick={() => openAddTask()}
              className="flex items-center gap-2 px-5 py-2.5 bg-cult-success hover:bg-cult-success/90 text-white text-xs font-semibold uppercase tracking-wider transition-colors min-w-[160px] justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task Now
            </button>
          </div>
          <p className="text-[10px] text-cult-surface mt-1">
            Tip: Use templates in the Schedule tab to quickly apply standard schedules to new rooms
          </p>
        </div>
      )}

      {/* ── Flat Room List (single-level, no room-type group headers) ── */}
      {sortedRoomEntries.map(({ room, tasks: roomTasks, completedCount, totalCount }, cardIndex) => {
        const allDone = completedCount === totalCount && totalCount > 0;
        const collapsed = isRoomCollapsed(room.id, allDone);
        const roomFilter = getRoomFilter(room.id);
        const ops = opsMap.get(room.room_code);

        // Apply per-room filter
        const visibleTasks = roomFilter === 'all' ? roomTasks : roomTasks.filter((t) => {
          if (roomFilter === 'pending') return t.status === 'pending' || t.status === 'carry_forward';
          if (roomFilter === 'in_progress') return t.status === 'in_progress';
          if (roomFilter === 'completed') return t.status === 'completed' || t.status === 'skipped';
          return true;
        });
        const activeTasks = visibleTasks.filter((t) => t.status !== 'completed' && t.status !== 'skipped');
        const completedTasks = visibleTasks.filter((t) => t.status === 'completed' || t.status === 'skipped');

        // Per-room filter counts
        const pendingCount = roomTasks.filter((t) => t.status === 'pending' || t.status === 'carry_forward').length;
        const activeCount = roomTasks.filter((t) => t.status === 'in_progress').length;
        const doneCount = roomTasks.filter((t) => t.status === 'completed' || t.status === 'skipped').length;

        // Crew assigned to tasks in this room
        const crewIds = [...new Set(roomTasks.filter((t) => t.assigned_to).map((t) => t.assigned_to as string))];
        const roomCrew = allStaff.filter((s) => crewIds.includes(s.id));

        return (
          <div
            key={room.id}
            className={`bg-cult-surface border border-cult-surface border-l-2 ${ROOM_TYPE_LEFT_BORDER[room.room_type] ?? ''} animate-fade-in`}
            style={{ animationDelay: `${cardIndex * 50}ms`, animationFillMode: 'both' }}
          >
            {/* Room Header — clickable to collapse/expand */}
            <button
              type="button"
              onClick={() => toggleRoom(room.id)}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-cult-surface/50 hover:bg-cult-surface-raised/20 transition-colors text-left"
            >
              <div className="flex items-center gap-3 flex-wrap min-w-0">
                <span className="font-mono text-sm font-bold text-cult-text-primary flex-shrink-0">{room.room_code}</span>
                {ops ? (
                  <>
                    {ops.total_plants > 0 && (
                      <span className="text-[11px] text-cult-border font-mono">{ops.total_plants}p</span>
                    )}
                    {ops.dominant_stage && ops.days_in_stage != null && (
                      <span className="text-[11px] text-cult-border font-mono">Day {ops.days_in_stage}</span>
                    )}
                    {ops.days_to_harvest != null && ops.days_to_harvest > 0 && (
                      <span className={`text-[11px] font-mono font-semibold flex-shrink-0 ${
                        ops.days_to_harvest <= 7 ? 'text-cult-warning' : 'text-cult-border'
                      }`}>
                        Harvest {ops.days_to_harvest}d
                      </span>
                    )}
                    {(ops.urgency_score ?? 0) >= 70 && (
                      <span className="text-[10px] font-mono font-bold text-cult-danger uppercase tracking-wider animate-pulse flex-shrink-0">
                        URGENT
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-cult-border uppercase">{room.room_type}</span>
                )}
                {/* Crew avatars inline */}
                {roomCrew.length > 0 && (
                  <div className="flex items-center -space-x-1.5 flex-shrink-0">
                    {roomCrew.slice(0, 3).map((s) => (
                      <span
                        key={s.id}
                        className="w-5 h-5 rounded-full bg-cult-success-muted text-cult-success ring-1 ring-cult-surface flex items-center justify-center text-[9px] font-bold"
                        title={s.first_name}
                      >
                        {crewInitials(s.first_name)}
                      </span>
                    ))}
                    {roomCrew.length > 3 && (
                      <span className="w-5 h-5 rounded-full bg-cult-surface-raised text-cult-border ring-1 ring-cult-surface flex items-center justify-center text-[9px] font-bold">
                        +{roomCrew.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {allDone ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-cult-success">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Done
                  </span>
                ) : (
                  <span className="text-xs font-mono text-cult-border">{completedCount}/{totalCount}</span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-cult-border transition-transform ${collapsed ? '' : 'rotate-180'}`} />
              </div>
            </button>

            {/* Expanded content */}
            {!collapsed && (
              <>
                {/* Per-room action bar: filter chips + room actions */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-cult-surface/30 bg-cult-surface/50">
                  <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
                    {([
                      { key: 'all' as const, label: 'All', count: totalCount },
                      { key: 'pending' as const, label: 'Pending', count: pendingCount },
                      { key: 'in_progress' as const, label: 'Active', count: activeCount },
                      { key: 'completed' as const, label: 'Done', count: doneCount },
                    ]).map(({ key, label, count }) => {
                      if (key !== 'all' && count === 0) return null;
                      const isActive = roomFilter === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => updateRoomFilter(room.id, key)}
                          className={`px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-sm transition-colors flex-shrink-0 ${
                            isActive
                              ? 'bg-cult-surface-raised text-cult-text-primary'
                              : 'text-cult-border hover:text-cult-text-muted hover:bg-cult-surface-raised/30'
                          }`}
                        >
                          {label}
                          {key !== 'all' && <span className="ml-1 opacity-70">{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {activeTasks.filter((t) => !t.assigned_to).length > 0 && (
                      <BatchAssignButton
                        unassignedTasks={activeTasks.filter((t) => !t.assigned_to)}
                        staffOptions={quickAssignStaff}
                        onAssign={onAssignWorker}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => openDeadPlantForm(room.id)}
                      className="p-2 hover:bg-cult-surface-raised rounded-lg transition-colors text-cult-border hover:text-cult-danger min-w-[36px] min-h-[36px] flex items-center justify-center"
                      title="Log dead plant"
                    >
                      <Skull className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openAddTask(room.id)}
                      className="p-2 hover:bg-cult-surface-raised rounded-lg transition-colors text-cult-border hover:text-cult-accent min-w-[36px] min-h-[36px] flex items-center justify-center"
                      title="Add task to this room"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Active tasks */}
                {activeTasks.length > 0 && (
                  <div className="divide-y divide-cult-surface/30">
                    {activeTasks.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        onClick={() => openDetailDrawer(t)}
                        staffOptions={quickAssignStaff}
                        onQuickAssign={onAssignWorker}
                        onStartTask={onStartTask}
                        onSkipTask={onSkipTask}
                        onCarryForward={onCarryForward}
                      />
                    ))}
                  </div>
                )}

                {/* Completed tasks */}
                {completedTasks.length > 0 && roomFilter !== 'completed' && (
                  <CompletedTasksCollapse tasks={completedTasks} onTaskClick={openCompletionForm} />
                )}
                {completedTasks.length > 0 && roomFilter === 'completed' && (
                  <div className="divide-y divide-cult-surface/30">
                    {completedTasks.map((t) => (
                      <TaskCard key={t.id} task={t} onClick={() => openCompletionForm(t)} />
                    ))}
                  </div>
                )}

                {/* Filtered empty state */}
                {visibleTasks.length === 0 && roomFilter !== 'all' && (
                  <div className="px-4 py-3 text-xs text-cult-border italic">
                    No {roomFilter === 'in_progress' ? 'active' : roomFilter.replace('_', ' ')} tasks in this room
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* ── Modals ────────────────────────────────────────── */}
      {showAddTask && (
        <AddTaskModal
          rooms={rooms}
          staff={staff}
          preSelectedRoomId={addTaskRoomId}
          taskDate={date}
          onClose={() => setShowAddTask(false)}
          onSave={async (input) => {
            await onCreateTask({ ...input, task_date: date });
            setShowAddTask(false);
          }}
        />
      )}

      {detailTask && (
        <TaskDetailDrawer
          task={detailTask.task}
          roomId={detailTask.roomId}
          staffOptions={quickAssignStaff}
          crewIds={(detailTask.task.task_config?.crew as string[]) ?? []}
          onClose={() => setDetailTask(null)}
          onOpenCompletionForm={() => {
            const t = detailTask;
            setDetailTask(null);
            setCompletingTask(t);
          }}
          onAssignWorker={onAssignWorker}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onStartTask={onStartTask}
          onSkipTask={onSkipTask}
          onCarryForward={onCarryForward}
        />
      )}

      {completingTask && (
        <TaskCompletionForm
          task={completingTask.task}
          roomId={completingTask.roomId}
          staffOptions={quickAssignStaff}
          onAssignWorker={onAssignWorker}
          onComplete={async (refTable, refId, dur) => {
            await onCompleteWithLog(completingTask.task.id, refTable, refId, dur);
            setCompletingTask(null);
          }}
          onNavigateHarvest={() => setCompletingTask(null)}
          onNavigateClone={() => setCompletingTask(null)}
          onClose={() => setCompletingTask(null)}
        />
      )}

      {showDeadPlantForm && (
        <DeadPlantForm
          prefilledRoomId={deadPlantRoomId}
          onComplete={() => setShowDeadPlantForm(false)}
          onClose={() => setShowDeadPlantForm(false)}
        />
      )}
    </div>
  );
}

/* ── Batch Assign Button ───────────────────────────────── */

function BatchAssignButton({
  unassignedTasks,
  staffOptions,
  onAssign,
}: {
  unassignedTasks: TaskCardData[];
  staffOptions: StaffOption[];
  onAssign: (taskId: string, staffId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  async function handleAssignAll(staffId: string) {
    setAssigning(true);
    try {
      for (const task of unassignedTasks) {
        await onAssign(task.id, staffId);
      }
    } finally {
      setAssigning(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2.5 hover:bg-cult-surface-raised rounded-lg transition-colors text-cult-warning/70 hover:text-cult-warning active:bg-cult-surface-raised/60 min-w-[44px] min-h-[44px] flex items-center justify-center"
        title={`Batch assign ${unassignedTasks.length} unassigned task${unassignedTasks.length !== 1 ? 's' : ''}`}
      >
        <Users className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-cult-surface border border-cult-surface min-w-[180px] py-1 animate-fade-in">
          <div className="px-3 py-1.5 border-b border-cult-surface/50">
            <span className="text-[10px] text-cult-border uppercase tracking-wider">
              Assign {unassignedTasks.length} task{unassignedTasks.length !== 1 ? 's' : ''} to:
            </span>
          </div>
          {staffOptions.filter((s) => s.is_present).length === 0 ? (
            <p className="px-3 py-2 text-xs text-cult-border italic">No crew present</p>
          ) : (
            staffOptions.filter((s) => s.is_present).map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={assigning}
                onClick={() => handleAssignAll(s.id)}
                className="w-full text-left px-3 py-2 text-xs text-cult-text-muted hover:bg-cult-surface-raised/50 hover:text-cult-text-primary transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                <span className="w-6 h-6 rounded-full bg-cult-success-muted text-cult-success ring-1 ring-cult-success/50 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {s.first_name.slice(0, 2).toUpperCase()}
                </span>
                {s.first_name}
              </button>
            ))
          )}
          {assigning && (
            <div className="px-3 py-1.5 text-[10px] text-cult-warning animate-pulse text-center">Assigning...</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Inline Crew Strip ──────────────────────────────────── */

function InlineCrewStrip({
  staff,
  attendance,
  date,
  onUpsertAttendance,
}: {
  staff: StaffMember[];
  attendance: ReturnType<typeof useAttendance>['records'];
  date: string;
  onUpsertAttendance: (input: Parameters<ReturnType<typeof useAttendance>['upsertAttendance']>[0]) => Promise<void>;
}) {
  const presentIds = useMemo(() => new Set(attendance.filter((a) => a.is_present).map((a) => a.staff_id)), [attendance]);
  const presentCount = staff.filter((s) => presentIds.has(s.id)).length;

  function togglePresence(staffId: string) {
    const current = presentIds.has(staffId);
    onUpsertAttendance({ staff_id: staffId, date, is_present: !current, hours_worked: current ? 0 : 8 });
  }

  // Initials helper
  function initials(name: string) {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  }

  return (
    <div className="bg-cult-surface border border-cult-surface px-4 py-2.5 flex items-center gap-3 overflow-x-auto scrollbar-hide">
      <span className="text-[10px] text-cult-border uppercase tracking-widest font-semibold flex-shrink-0">
        Crew
      </span>
      <div className="flex items-center gap-1.5">
        {staff.map((s) => {
          const isPresent = presentIds.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => togglePresence(s.id)}
              title={`${s.first_name} — ${isPresent ? 'Present' : 'Absent'} (tap to toggle)`}
              className={`relative w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-200 flex-shrink-0 ${
                isPresent
                  ? 'bg-cult-success-muted text-cult-success ring-2 ring-cult-success/70'
                  : 'bg-cult-surface-raised text-cult-border opacity-40 hover:opacity-70'
              }`}
            >
              {initials(s.first_name)}
            </button>
          );
        })}
      </div>
      <span className="text-xs text-cult-border flex-shrink-0 ml-auto font-mono">
        {presentCount}/{staff.length}
      </span>
    </div>
  );
}

/* ── Stat Card ──────────────────────────────────────────── */

function StatCard({
  label,
  value,
  detail,
  accent,
  children,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-cult-surface border border-cult-surface p-3">
      <div className="text-xs text-cult-border uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-bold ${accent ?? 'text-cult-text-primary'}`}>{value}</div>
      <div className="text-xs text-cult-border mt-0.5">{detail}</div>
      {children}
    </div>
  );
}

/* ── Completed Tasks Collapse ───────────────────────────── */

function CompletedTasksCollapse({ tasks, onTaskClick }: { tasks: TaskCardData[]; onTaskClick: (t: TaskCardData) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-cult-surface/50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-cult-surface-raised/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-cult-success/60" />
          <span className="text-xs text-cult-border font-medium">
            {tasks.length} completed
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-cult-border transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="divide-y divide-cult-surface/30">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} onClick={() => onTaskClick(t)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ADD TASK MODAL
   ═══════════════════════════════════════════════════════════ */

interface AddTaskModalProps {
  rooms: { id: string; room_code: string; room_type: RoomType }[];
  staff: StaffMember[];
  preSelectedRoomId: string | null;
  taskDate: string;
  onClose: () => void;
  onSave: (input: { room_id: string; task_type: string; assigned_to?: string | null; notes?: string | null }) => Promise<void>;
}

function AddTaskModal({ rooms, staff, preSelectedRoomId, taskDate, onClose, onSave }: AddTaskModalProps) {
  const [taskType, setTaskType] = useState<TaskType>('batch_tank_mix');
  const [roomId, setRoomId] = useState(preSelectedRoomId ?? '');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  async function handleSave() {
    if (!roomId) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        room_id: roomId,
        task_type: taskType,
        assigned_to: assignedTo || null,
        notes: notes || null,
      });
      notificationService.success('Task added');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save task';
      setError(message);
      notificationService.error(message, 'Task Creation Failed');
    } finally {
      setSaving(false);
    }
  }

  const TASK_TYPES = Object.keys(TASK_TYPE_CONFIG) as TaskType[];

  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-cult-text-primary uppercase tracking-wider">Add Task</h3>
        <button type="button" onClick={onClose} className="p-2.5 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-cult-surface-raised active:bg-cult-surface-raised/60 rounded-lg transition-colors">
          <X className="w-4 h-4 text-cult-border" />
        </button>
      </div>
      <AddTaskFormFields
        taskType={taskType} setTaskType={setTaskType}
        roomId={roomId} setRoomId={setRoomId}
        assignedTo={assignedTo} setAssignedTo={setAssignedTo}
        notes={notes} setNotes={setNotes}
        rooms={rooms} staff={staff} taskTypes={TASK_TYPES}
      />
      {error && <p className="text-xs text-cult-danger mt-2">{error}</p>}
      <Button onClick={handleSave} disabled={saving || !roomId} className="w-full mt-3">
        {saving ? 'Saving...' : 'Add Task'}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <div
        ref={backdropRef}
        className="fixed inset-0 z-50 flex items-end bg-black/60"
        onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      >
        <div className="w-full bg-cult-surface border-t border-cult-border rounded-t-xl animate-slide-in p-5 space-y-3 max-h-[80vh] overflow-y-auto">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="bg-cult-surface border border-cult-border w-full max-w-sm p-5 space-y-3 animate-fade-in">
        {content}
      </div>
    </div>
  );
}

/* ── Add Task Form Fields ──────────────────────────────── */

interface AddTaskFormFieldsProps {
  taskType: TaskType;
  setTaskType: (v: TaskType) => void;
  roomId: string;
  setRoomId: (v: string) => void;
  assignedTo: string;
  setAssignedTo: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  rooms: { id: string; room_code: string }[];
  staff: StaffMember[];
  taskTypes: TaskType[];
}

function AddTaskFormFields({
  taskType, setTaskType, roomId, setRoomId, assignedTo, setAssignedTo,
  notes, setNotes, rooms, staff, taskTypes,
}: AddTaskFormFieldsProps) {
  const selectClass = 'w-full bg-cult-surface-raised border border-cult-border text-cult-text-primary text-xs py-2 px-2 rounded-sm focus:outline-none focus:border-cult-accent';
  return (
    <>
      <div>
        <label className="block text-xs text-cult-text-muted uppercase tracking-wider mb-1">Task Type</label>
        <select value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)} className={selectClass}>
          {taskTypes.map((t) => <option key={t} value={t}>{getTaskTypeConfig(t).label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-cult-text-muted uppercase tracking-wider mb-1">Room</label>
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={selectClass}>
          <option value="">Select room...</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.room_code}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-cult-text-muted uppercase tracking-wider mb-1">Assign To</label>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={selectClass}>
          <option value="">Unassigned</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.first_name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-cult-text-muted uppercase tracking-wider mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-cult-surface-raised border border-cult-border text-cult-text-primary text-xs py-2 px-2 rounded-sm resize-none focus:outline-none focus:border-cult-accent"
          placeholder="Optional notes..."
        />
      </div>
    </>
  );
}

/* TaskTypesOverlay and TaskTypeEditorModal moved to TaskTypesOverlay.tsx */

/* WorkersTab removed — use standalone /worker-tasks (Crew) route instead. */
