import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CalendarDays,
  ClipboardList,
  Users,
  Plus,
  X,
  Scissors,
  Droplets,
  Search,
  SprayCan,
  Sparkles,
  Wheat,
  Sprout,
  Wrench,
  GitBranch,
  ArrowRightLeft,
  Clock,
  Skull,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleDot,
  Circle,
  Pencil,
  Save,
  Beaker,
  Settings,
} from 'lucide-react';
import { Button } from '@/shared/components';
import { useAttendance, useDailyTasks, useGrowRooms, useTaskTypeSettings } from '../hooks';
import { useRoomOperationalState } from '../hooks/useRoomOperationalState';
import { useActiveStaff } from '@features/sessions/hooks/useActiveStaff';
import { TASK_TYPE_CONFIG, getTaskTypeConfig } from '../types';
import type { TaskType, RoomType } from '../types';
import { RoomCalendar, RoomSetupPanel } from './RoomCalendar';
import { TemplateManager } from './TemplateManager';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { WorkerCheckIn } from './WorkerCheckIn';
import type { StaffMember } from './WorkerCheckIn';
import type { RoomOperationalState } from '../hooks/useRoomOperationalState';
import { TaskCard } from './TaskCard';
import type { TaskCardData, StaffOption } from './TaskCard';
import { TaskCompletionForm } from './TaskCompletionForm';
import { DeadPlantForm } from './DeadPlantForm';
import { todayIso } from '../utils/dateUtils';
import { ROOM_TYPE_LEFT_BORDER, ROOM_TYPE_DOT } from '../constants/stageColors';

/* Tab system removed — Task Types opens as overlay via gear icon,
   Workers tab removed in favour of standalone /worker-tasks route */

const TASK_TYPE_DESCRIPTIONS: Partial<Record<TaskType, string>> = {
  ipm_spray: 'Apply integrated pest management sprays and treatments to prevent or control pests and diseases.',
  defoliation: 'Remove excess fan leaves to improve light penetration and airflow through the canopy.',
  transplant: 'Move plants from smaller containers to larger ones as they outgrow their current pots.',
  cleaning: 'Sanitize surfaces, floors, and equipment. Remove debris and dead plant material.',
  harvest: 'Cut, hang, and process mature plants at peak trichome development.',
  batch_tank_mix: 'Mix nutrient solution in batch tanks. Record EC/PPM, pH, volume, and products used.',
  saturation_check: 'Check runoff EC/pH and substrate moisture levels to verify nutrient uptake.',
  irrigation_audit: 'Confirm and adjust automated watering timers, emitter flow rates, and schedules.',
  scouting: 'Inspect plants for pests, disease, nutrient deficiencies, and overall plant health.',
  training: 'Apply low-stress or high-stress training techniques to shape plant structure.',
  clone_cutting: 'Take cuttings from mother plants for propagation. Dip, place in trays, label.',
  maintenance: 'Routine equipment maintenance, HVAC checks, and infrastructure repairs.',
  concentrate_mix: 'Mix concentrated nutrient stock solutions for automated dosing systems.',
  custom: 'General-purpose task for activities that do not fit standard categories.',
};

const TASK_TYPE_FIELDS: Partial<Record<TaskType, string[]>> = {
  ipm_spray: ['Product', 'Method', 'Target Pest', 'Re-entry Hours'],
  defoliation: ['Type', 'Sections', 'Progress'],
  transplant: ['From Size', 'To Size', 'Count'],
  cleaning: ['Type', 'Notes'],
  harvest: ['Wet Weight', 'Plant Count', 'Waste'],
  batch_tank_mix: ['EC/PPM', 'pH', 'Volume (gal)', 'Products'],
  saturation_check: ['Runoff EC', 'Runoff pH', 'Moisture %', 'Sections'],
  irrigation_audit: ['Timer Settings', 'Flow Rate', 'Adjustments'],
  scouting: ['Pests', 'Disease', 'Nutrient Issues', 'Health Rating'],
  training: ['Type', 'Plant Count', 'Sections'],
  clone_cutting: ['Mother ID', 'Cut Count', 'Tray'],
  maintenance: ['Equipment', 'Issue', 'Resolution'],
  concentrate_mix: ['Product', 'Concentration', 'Volume'],
  custom: ['Task Name', 'Description'],
};

const ICON_MAP: Record<string, typeof Scissors> = {
  SprayCan,
  Scissors,
  ArrowRightLeft,
  Sparkles,
  Wheat,
  Droplets,
  Search,
  GitBranch,
  Sprout,
  Wrench,
  Beaker,
  Settings,
  Clock,
  Skull,
};

const ROOM_TYPE_ORDER: Record<string, number> = { mother: 0, veg: 1, flower: 2, clone: 3, mixed: 4 };
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Roles that belong on the cultivation task board */
const CULTIVATION_ROLES = new Set(['cultivation_manager', 'cultivation_lead', 'cultivator', 'manager', 'operations', 'operations_manager']);

export function SchedulesPage() {
  const { rooms: dbRooms } = useGrowRooms();
  const [scheduleView, setScheduleView] = useState<'calendar' | 'setup'>('calendar');
  const [setupRoomId, setSetupRoomId] = useState<string | undefined>(undefined);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  const rooms = useMemo(() => {
    return dbRooms.map((r) => ({ id: r.id, name: r.name, room_type: r.room_type, room_code: r.room_code }));
  }, [dbRooms]);

  function handleEditRoom(roomId: string, _roomCode: string) {
    setSetupRoomId(roomId);
    setScheduleView('setup');
  }

  function handleSwitchToSetup() {
    setSetupRoomId(undefined);
    setScheduleView('setup');
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-cult-white uppercase tracking-wide">Schedule Builder</h1>
          <p className="text-cult-light-gray mt-1 text-sm sm:text-base">Create and manage recurring task schedules</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowTemplateManager(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-semibold uppercase tracking-wider text-cult-medium-gray hover:text-cult-light-gray bg-cult-charcoal/40 border border-cult-dark-gray/60 hover:border-cult-medium-gray rounded-sm transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Manage Templates
          </button>
          <div className="flex border border-cult-dark-gray rounded-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setScheduleView('calendar')}
              className={`px-4 py-2.5 min-h-[44px] text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
                scheduleView === 'calendar'
                  ? 'bg-cult-charcoal text-cult-white'
                  : 'text-cult-medium-gray hover:text-cult-light-gray hover:bg-cult-charcoal/30'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </button>
            <button
              type="button"
              onClick={() => { setSetupRoomId(undefined); setScheduleView('setup'); }}
              className={`px-4 py-2.5 min-h-[44px] text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
                scheduleView === 'setup'
                  ? 'bg-cult-charcoal text-cult-white'
                  : 'text-cult-medium-gray hover:text-cult-light-gray hover:bg-cult-charcoal/30'
              }`}
            >
              <Wrench className="w-4 h-4" />
              Room Setup
            </button>
          </div>
        </div>
      </div>

      {/* View content */}
      {scheduleView === 'calendar' ? (
        <RoomCalendar rooms={rooms} onEditRoom={handleEditRoom} onSwitchToSetup={handleSwitchToSetup} />
      ) : (
        <RoomSetupPanel rooms={rooms} initialRoomId={setupRoomId} />
      )}

      {/* Global Template Manager overlay */}
      {showTemplateManager && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-[10vh]">
          <div className="w-full max-w-3xl max-h-[80vh] overflow-y-auto bg-cult-near-black border border-cult-dark-gray rounded-sm shadow-2xl">
            <TemplateManager onClose={() => setShowTemplateManager(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export function DailyTaskBoard() {
  const navigate = useNavigate();
  const [showTaskTypes, setShowTaskTypes] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayIso);

  const { rooms: dbRooms } = useGrowRooms();
  const { tasks: dbTasks, completeWithLog, assignWorker, updateStatus, refetch: refetchTasks, createTask, updateTask, deleteTask } = useDailyTasks(selectedDate);
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

  return (
    <div className="space-y-0 pb-8">
      {/* ── Header: Date Nav + Title ────────────────────────── */}
      <div className="flex items-start justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-2xl font-bold text-cult-white uppercase tracking-wide">
              Today's Tasks
            </h1>
            <button
              type="button"
              onClick={() => setShowTaskTypes(true)}
              className="p-2 text-cult-medium-gray hover:text-cult-white hover:bg-cult-charcoal/40 active:bg-cult-charcoal/60 transition-colors rounded-lg"
              title="Manage task types"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <p className="text-cult-medium-gray text-sm mt-0.5">Daily assignments by room</p>
          <div className="flex items-center gap-3 mt-1.5">
            <button
              type="button"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().slice(0, 10));
              }}
              className="p-3 -m-1 text-cult-medium-gray hover:text-cult-white active:bg-cult-charcoal/40 transition-colors rounded-lg"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className={`text-sm font-medium ${isToday ? 'text-cult-white' : 'text-cult-light-gray'}`}>
              {isToday ? 'Today' : dateLabel}
              {isToday && (
                <span className="text-cult-medium-gray ml-1.5 font-normal">
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
              className="p-3 -m-1 text-cult-medium-gray hover:text-cult-white active:bg-cult-charcoal/40 transition-colors rounded-lg"
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
        <button
          type="button"
          onClick={() => navigate('/cultivation-schedules')}
          className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-semibold uppercase tracking-wider text-cult-medium-gray hover:text-cult-light-gray bg-cult-charcoal/40 border border-cult-dark-gray/60 hover:border-cult-medium-gray rounded-sm transition-colors flex-shrink-0"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Manage Schedules
        </button>
      </div>

      {/* ── Board (single view — no tabs) ─────────────────── */}
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
      />

      {/* ── Task Type Manager overlay (gear icon) ────────── */}
      {showTaskTypes && <TaskTypesOverlay onClose={() => setShowTaskTypes(false)} />}
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
  onUpdateTask: (taskId: string, updates: { notes?: string | null; task_date?: string; assigned_to?: string | null; task_config?: Record<string, unknown> }) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

function DailyBoardTab({ rooms, opsRooms, staff, allStaff, tasks, attendance, date, onUpsertAttendance, onCompleteWithLog, onCreateTask, onAssignWorker, onStartTask, onSkipTask, onCarryForward, onUpdateTask, onDeleteTask }: DailyBoardTabProps) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskRoomId, setAddTaskRoomId] = useState<string | null>(null);
  const [completingTask, setCompletingTask] = useState<{ task: TaskCardData; roomId: string } | null>(null);
  const [detailTask, setDetailTask] = useState<{ task: TaskCardData; roomId: string } | null>(null);
  const [showDeadPlantForm, setShowDeadPlantForm] = useState(false);
  const [deadPlantRoomId, setDeadPlantRoomId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  // ── Ops data lookup (for room context + urgency sorting) ──
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

  // Staff options for quick-assign — all cultivation staff, present ones first with indicator
  const quickAssignStaff: StaffOption[] = useMemo(() => {
    const presentIds = new Set(attendance.filter((a) => a.is_present).map((a) => a.staff_id));
    return staff
      .map((s) => ({ id: s.id, first_name: s.first_name, is_present: presentIds.has(s.id) }))
      .sort((a, b) => (a.is_present === b.is_present ? 0 : a.is_present ? -1 : 1));
  }, [staff, attendance]);

  const filteredTasks = useMemo(() => {
    if (statusFilter === 'all') return tasks;
    return tasks.filter((t) => t.status === statusFilter);
  }, [tasks, statusFilter]);

  const tasksByRoom = useMemo(() => {
    const map = new Map<string, TaskCardData[]>();
    for (const t of filteredTasks) {
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
  }, [filteredTasks, rooms]);

  const sortedRoomEntries = useMemo(() => {
    const entries: { room: typeof rooms[0]; tasks: TaskCardData[]; completedCount: number; totalCount: number }[] = [];
    // Get all-tasks-by-room for progress calculation (not filtered)
    const allByRoom = new Map<string, TaskCardData[]>();
    for (const t of tasks) {
      const roomMatch = rooms.find((r) => r.room_code === t.room_name);
      const key = roomMatch?.id ?? t.room_name;
      const list = allByRoom.get(key) ?? [];
      list.push(t);
      allByRoom.set(key, list);
    }

    for (const room of rooms) {
      const roomTasks = tasksByRoom.get(room.id);
      const allRoomTasks = allByRoom.get(room.id) ?? [];
      if (allRoomTasks.length > 0) {
        entries.push({
          room,
          tasks: roomTasks ?? [],
          completedCount: allRoomTasks.filter((t) => t.status === 'completed').length,
          totalCount: allRoomTasks.length,
        });
      }
    }
    // Sort by room type group first, then urgency_score (highest first) within each group
    entries.sort((a, b) => {
      const typeA = ROOM_TYPE_ORDER[a.room.room_type] ?? 9;
      const typeB = ROOM_TYPE_ORDER[b.room.room_type] ?? 9;
      if (typeA !== typeB) return typeA - typeB;
      const urgA = opsMap.get(a.room.room_code)?.urgency_score ?? 0;
      const urgB = opsMap.get(b.room.room_code)?.urgency_score ?? 0;
      return urgB - urgA; // higher urgency first
    });
    return entries;
  }, [rooms, tasksByRoom, tasks, opsMap]);

  // Staff present count (cultivation only)
  const staffPresent = useMemo(() => {
    const cultIds = new Set(staff.map((s) => s.id));
    return attendance.filter((a) => a.is_present && cultIds.has(a.staff_id)).length;
  }, [staff, attendance]);

  function openAddTask(roomId?: string) {
    setAddTaskRoomId(roomId ?? null);
    setShowAddTask(true);
  }

  function openDeadPlantForm(roomId?: string) {
    setDeadPlantRoomId(roomId ?? null);
    setShowDeadPlantForm(true);
  }

  function openCompletionForm(task: TaskCardData) {
    const roomMatch = rooms.find((r) => r.room_code === task.room_name);
    setCompletingTask({ task, roomId: roomMatch?.id ?? '' });
  }

  function openDetailDrawer(task: TaskCardData) {
    const roomMatch = rooms.find((r) => r.room_code === task.room_name);
    setDetailTask({ task, roomId: roomMatch?.id ?? '' });
  }

  const roomsWithTasks = sortedRoomEntries.length;
  const hasNoTasks = tasks.length === 0;

  return (
    <div className="space-y-5 relative">
      {/* ── Command Center: Stats + Actions ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Progress"
            value={`${stats.pct}%`}
            detail={`${stats.completed} of ${stats.total} done`}
            accent={stats.pct === 100 ? 'text-green-400' : stats.pct >= 50 ? 'text-cult-accent' : 'text-cult-white'}
          >
            {stats.total > 0 && (
              <div className="w-full h-1.5 bg-cult-charcoal rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    stats.pct === 100 ? 'bg-green-500' : 'bg-green-600'
                  }`}
                  style={{ width: `${stats.pct}%` }}
                />
              </div>
            )}
          </StatCard>
          <StatCard
            label="Pending"
            value={String(stats.pending + stats.carried)}
            detail={stats.unassigned > 0 ? `${stats.unassigned} unassigned` : stats.carried > 0 ? `${stats.carried} carried over` : 'awaiting action'}
            accent={stats.unassigned > 0 ? 'text-amber-400' : stats.carried > 0 ? 'text-amber-400' : 'text-cult-white'}
          />
          <StatCard
            label="In Progress"
            value={String(stats.inProgress)}
            detail="being worked on"
            accent="text-sky-400"
          />
          <StatCard
            label="Crew On Duty"
            value={`${staffPresent} / ${staff.length}`}
            detail={`${roomsWithTasks} rooms active`}
            accent="text-cult-white"
          />
        </div>

        {/* Actions */}
        <div className="flex items-start gap-2 lg:flex-col">
          <button
            type="button"
            onClick={() => openAddTask()}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
          <button
            type="button"
            onClick={() => openDeadPlantForm()}
            className="flex items-center gap-2 px-4 py-2.5 bg-cult-charcoal hover:bg-cult-medium-gray text-cult-light-gray text-xs font-semibold uppercase tracking-wider transition-colors border border-cult-dark-gray"
          >
            <Skull className="w-3.5 h-3.5 text-red-400" />
            Dead Plant
          </button>
        </div>
      </div>

      {/* ── Status Filter Chips ──────────────────────────── */}
      {stats.total > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <span className="text-xs text-cult-medium-gray uppercase tracking-wider mr-1 flex-shrink-0">Show:</span>
          {([
            { key: 'all' as const, label: 'All Tasks', count: stats.total, icon: ClipboardList },
            { key: 'pending' as const, label: 'Pending', count: stats.pending + stats.carried, icon: Circle },
            { key: 'in_progress' as const, label: 'In Progress', count: stats.inProgress, icon: CircleDot },
            { key: 'completed' as const, label: 'Completed', count: stats.completed, icon: CheckCircle2 },
          ] as const).map((chip) => {
            const isActive = statusFilter === chip.key;
            const Icon = chip.icon;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setStatusFilter(chip.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium rounded-sm transition-colors flex-shrink-0 min-h-[44px] ${
                  isActive
                    ? 'bg-cult-charcoal text-cult-white border border-cult-medium-gray'
                    : 'text-cult-medium-gray hover:text-cult-light-gray border border-transparent hover:border-cult-dark-gray'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {chip.label}
                <span className={`ml-0.5 text-xs ${isActive ? 'text-cult-light-gray' : 'text-cult-medium-gray'}`}>
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Inline Crew Strip ─────────────────────────────── */}
      <InlineCrewStrip
        staff={staff}
        attendance={attendance}
        date={date}
        onUpsertAttendance={onUpsertAttendance}
      />

      {/* ── Empty State — Coaching-style ─────────────────── */}
      {hasNoTasks && (
        <div className="border border-dashed border-cult-dark-gray py-12 px-6 flex flex-col items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-cult-charcoal flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-cult-medium-gray" />
          </div>
          <div className="text-center max-w-md">
            <p className="text-sm text-cult-light-gray font-medium">No tasks scheduled for this day</p>
            <p className="text-xs text-cult-medium-gray mt-2 leading-relaxed">
              Tasks are auto-generated daily at midnight from room schedules.
              Set up recurring schedules in the Schedule tab, or add a one-off task below.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={() => openAddTask()}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors min-w-[160px] justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task Now
            </button>
          </div>
          <p className="text-[10px] text-cult-dark-gray mt-1">
            Tip: Use templates in the Schedule tab to quickly apply standard schedules to new rooms
          </p>
        </div>
      )}

      {/* ── Room Task Groups (grouped by room type) ────── */}
      {(() => {
        const ROOM_TYPE_LABELS: Record<string, string> = {
          mother: 'Mother Rooms',
          veg: 'Vegetative Rooms',
          flower: 'Flower Rooms',
          clone: 'Clone Rooms',
          mixed: 'Mixed Rooms',
        };

        // Group sorted entries by room_type for section headers
        let lastType = '';
        let cardIndex = 0;

        return sortedRoomEntries.map(({ room, tasks: roomTasks, completedCount, totalCount }) => {
          const roomPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          const allDone = roomPct === 100;
          const showSectionHeader = room.room_type !== lastType;
          lastType = room.room_type;
          const currentIndex = cardIndex++;

          // Separate active vs completed tasks within room
          const activeTasks = roomTasks.filter((t) => t.status !== 'completed' && t.status !== 'skipped');
          const completedTasks = roomTasks.filter((t) => t.status === 'completed' || t.status === 'skipped');

          return (
            <div key={room.id}>
              {/* Section header for room type */}
              {showSectionHeader && (
                <div className="flex items-center gap-3 mt-6 mb-2 first:mt-0">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ROOM_TYPE_DOT[room.room_type] ?? 'bg-cult-border'}`} />
                  <span className="text-xs font-bold text-cult-light-gray uppercase tracking-widest">
                    {ROOM_TYPE_LABELS[room.room_type] ?? room.room_type}
                  </span>
                  <div className="flex-1 h-px bg-cult-dark-gray" />
                </div>
              )}

              <div
                className={`bg-cult-near-black border border-cult-dark-gray border-l-2 ${ROOM_TYPE_LEFT_BORDER[room.room_type] ?? ''} ${
                  allDone ? 'opacity-50' : ''
                } animate-fade-in`}
                style={{ animationDelay: `${currentIndex * 50}ms`, animationFillMode: 'both' }}
              >
                {/* Room Header — with operational context */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-cult-dark-gray/50">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-bold text-cult-white">{room.room_code}</span>
                    {(() => {
                      const ops = opsMap.get(room.room_code);
                      if (!ops) return <span className="text-xs text-cult-medium-gray uppercase">{room.room_type}</span>;
                      return (
                        <>
                          <span className="text-[11px] text-cult-medium-gray font-mono">{ops.total_plants}p</span>
                          {ops.dominant_stage && ops.days_in_stage != null && (
                            <span className="text-[11px] text-cult-medium-gray font-mono">
                              Day {ops.days_in_stage}
                            </span>
                          )}
                          {ops.days_to_harvest != null && ops.days_to_harvest > 0 && (
                            <span className={`text-[11px] font-mono font-semibold ${
                              ops.days_to_harvest <= 7 ? 'text-amber-400' : 'text-cult-medium-gray'
                            }`}>
                              Harvest {ops.days_to_harvest}d
                            </span>
                          )}
                          {(ops.urgency_score ?? 0) >= 70 && (
                            <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider animate-pulse">
                              URGENT
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Completion indicator */}
                    <div className="flex items-center gap-2">
                      {allDone ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Done
                        </span>
                      ) : (
                        <>
                          <span className="text-xs font-medium text-cult-light-gray">
                            {completedCount}/{totalCount}
                          </span>
                          <div className="w-16 h-1.5 bg-cult-charcoal rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300 bg-green-600"
                              style={{ width: `${roomPct}%` }}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Batch assign — only show when there are unassigned active tasks */}
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
                        className="p-2.5 hover:bg-cult-charcoal rounded-lg transition-colors text-cult-medium-gray hover:text-red-400 active:bg-cult-charcoal/60 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title="Log dead plant"
                      >
                        <Skull className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openAddTask(room.id)}
                        className="p-2.5 hover:bg-cult-charcoal rounded-lg transition-colors text-cult-medium-gray hover:text-cult-accent active:bg-cult-charcoal/60 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title="Add task to this room"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active tasks */}
                {activeTasks.length > 0 && (
                  <div className="divide-y divide-cult-dark-gray/30">
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

                {/* Completed tasks — collapsed summary */}
                {completedTasks.length > 0 && (
                  <CompletedTasksCollapse
                    tasks={completedTasks}
                    onTaskClick={openCompletionForm}
                  />
                )}

                {/* Filtered empty state */}
                {roomTasks.length === 0 && statusFilter !== 'all' && (
                  <div className="px-4 py-3 text-xs text-cult-medium-gray italic">
                    No {statusFilter.replace('_', ' ')} tasks in this room
                  </div>
                )}
              </div>
            </div>
          );
        });
      })()}

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
        className="p-2.5 hover:bg-cult-charcoal rounded-lg transition-colors text-amber-400/70 hover:text-amber-400 active:bg-cult-charcoal/60 min-w-[44px] min-h-[44px] flex items-center justify-center"
        title={`Batch assign ${unassignedTasks.length} unassigned task${unassignedTasks.length !== 1 ? 's' : ''}`}
      >
        <Users className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-cult-near-black border border-cult-dark-gray shadow-xl min-w-[180px] py-1 animate-fade-in">
          <div className="px-3 py-1.5 border-b border-cult-dark-gray/50">
            <span className="text-[10px] text-cult-medium-gray uppercase tracking-wider">
              Assign {unassignedTasks.length} task{unassignedTasks.length !== 1 ? 's' : ''} to:
            </span>
          </div>
          {staffOptions.filter((s) => s.is_present).length === 0 ? (
            <p className="px-3 py-2 text-xs text-cult-medium-gray italic">No crew present</p>
          ) : (
            staffOptions.filter((s) => s.is_present).map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={assigning}
                onClick={() => handleAssignAll(s.id)}
                className="w-full text-left px-3 py-2 text-xs text-cult-light-gray hover:bg-cult-charcoal/50 hover:text-cult-white transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                <span className="w-6 h-6 rounded-full bg-green-900/50 text-green-300 ring-1 ring-green-500/50 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {s.first_name.slice(0, 2).toUpperCase()}
                </span>
                {s.first_name}
              </button>
            ))
          )}
          {assigning && (
            <div className="px-3 py-1.5 text-[10px] text-amber-400 animate-pulse text-center">Assigning...</div>
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
    <div className="bg-cult-near-black border border-cult-dark-gray px-4 py-2.5 flex items-center gap-3 overflow-x-auto scrollbar-hide">
      <span className="text-[10px] text-cult-medium-gray uppercase tracking-widest font-semibold flex-shrink-0">
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
                  ? 'bg-green-900/50 text-green-300 ring-2 ring-green-500/70'
                  : 'bg-cult-charcoal text-cult-medium-gray opacity-40 hover:opacity-70'
              }`}
            >
              {initials(s.first_name)}
            </button>
          );
        })}
      </div>
      <span className="text-xs text-cult-medium-gray flex-shrink-0 ml-auto font-mono">
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
    <div className="bg-cult-near-black border border-cult-dark-gray p-3">
      <div className="text-xs text-cult-medium-gray uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-bold ${accent ?? 'text-cult-white'}`}>{value}</div>
      <div className="text-xs text-cult-medium-gray mt-0.5">{detail}</div>
      {children}
    </div>
  );
}

/* ── Completed Tasks Collapse ───────────────────────────── */

function CompletedTasksCollapse({ tasks, onTaskClick }: { tasks: TaskCardData[]; onTaskClick: (t: TaskCardData) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-cult-dark-gray/50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-cult-charcoal/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500/60" />
          <span className="text-xs text-cult-medium-gray font-medium">
            {tasks.length} completed
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-cult-medium-gray transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="divide-y divide-cult-dark-gray/30">
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  }

  const TASK_TYPES = Object.keys(TASK_TYPE_CONFIG) as TaskType[];

  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">Add Task</h3>
        <button type="button" onClick={onClose} className="p-2.5 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-cult-charcoal active:bg-cult-charcoal/60 rounded-lg transition-colors">
          <X className="w-4 h-4 text-cult-medium-gray" />
        </button>
      </div>
      <AddTaskFormFields
        taskType={taskType} setTaskType={setTaskType}
        roomId={roomId} setRoomId={setRoomId}
        assignedTo={assignedTo} setAssignedTo={setAssignedTo}
        notes={notes} setNotes={setNotes}
        rooms={rooms} staff={staff} taskTypes={TASK_TYPES}
      />
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
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
        <div className="w-full bg-cult-near-black border-t border-cult-medium-gray rounded-t-xl animate-slide-in p-5 space-y-3 max-h-[80vh] overflow-y-auto">
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
      <div className="bg-cult-near-black border border-cult-medium-gray w-full max-w-sm p-5 space-y-3 animate-fade-in">
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
  const selectClass = 'w-full bg-cult-charcoal border border-cult-medium-gray text-cult-white text-xs py-2 px-2 rounded-sm focus:outline-none focus:border-cult-accent';
  return (
    <>
      <div>
        <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Task Type</label>
        <select value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)} className={selectClass}>
          {taskTypes.map((t) => <option key={t} value={t}>{getTaskTypeConfig(t).label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Room</label>
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={selectClass}>
          <option value="">Select room...</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.room_code}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Assign To</label>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={selectClass}>
          <option value="">Unassigned</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.first_name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-cult-charcoal border border-cult-medium-gray text-cult-white text-xs py-2 px-2 rounded-sm resize-none focus:outline-none focus:border-cult-accent"
          placeholder="Optional notes..."
        />
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   TASK TYPES TAB
   ═══════════════════════════════════════════════════════════ */

const AVAILABLE_ICONS = ['SprayCan', 'Scissors', 'ArrowRightLeft', 'Sparkles', 'Wheat', 'Droplets', 'Search', 'GitBranch', 'Sprout', 'Wrench', 'Beaker', 'Settings', 'Clock', 'Skull'] as const;
const PRESET_COLORS = ['#0EA5E9', '#10B981', '#8B5CF6', '#6B7280', '#F43F5E', '#3B82F6', '#F59E0B', '#06B6D4', '#EC4899', '#14B8A6', '#78716C', '#6366F1', '#A6A6A6', '#EF4444', '#D97706'];

function TaskTypesOverlay({ onClose }: { onClose: () => void }) {
  const { settings, loading, createTaskType, updateTaskType, deleteTaskType } = useTaskTypeSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Fallback to hardcoded while DB loads or is empty
  const types = settings.length > 0
    ? settings
    : (Object.entries(TASK_TYPE_CONFIG) as [TaskType, typeof TASK_TYPE_CONFIG[TaskType]][]).map(([key, config], i) => ({
        id: key,
        task_key: key,
        label: config.label,
        description: TASK_TYPE_DESCRIPTIONS[key] ?? '',
        color: config.color,
        icon: config.icon,
        fields: TASK_TYPE_FIELDS[key] ?? [],
        is_enabled: true,
        sort_order: i * 10 + 10,
        is_builtin: true,
        created_at: '',
        updated_at: '',
      }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-4xl bg-cult-near-black border border-cult-dark-gray rounded-lg shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cult-dark-gray/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-cult-accent" />
            <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">
              Manage Task Types
            </h3>
            {!loading && (
              <span className="text-xs text-cult-medium-gray">
                {types.filter((t) => t.is_enabled).length} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setEditingId(null); setShowAdd(true); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Type
            </button>
            <button type="button" onClick={onClose} className="p-2 hover:bg-cult-charcoal rounded transition-colors">
              <X className="w-4 h-4 text-cult-medium-gray" />
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <div className="text-sm text-cult-medium-gray py-8 text-center">Loading task types...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {types.map((tt) => {
                const Icon = ICON_MAP[tt.icon] ?? Wrench;
                return (
                  <button
                    key={tt.id}
                    type="button"
                    onClick={() => { setShowAdd(false); setEditingId(tt.id); }}
                    className={`text-left bg-cult-near-black border p-4 space-y-3 transition-all hover:border-cult-accent/50 ${
                      !tt.is_enabled ? 'opacity-40 border-cult-dark-gray/50' : editingId === tt.id ? 'border-cult-accent ring-1 ring-cult-accent/30' : 'border-cult-dark-gray'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${tt.color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: tt.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-cult-white uppercase tracking-wider block truncate">{tt.label}</span>
                        {!tt.is_enabled && <span className="text-[10px] text-amber-400 uppercase">Disabled</span>}
                      </div>
                      <Pencil className="w-3 h-3 text-cult-dark-gray flex-shrink-0" />
                    </div>
                    <p className="text-xs text-cult-light-gray leading-relaxed line-clamp-2">
                      {tt.description}
                    </p>
                    {tt.fields.length > 0 && (
                      <div className="pt-2 border-t border-cult-dark-gray/50">
                        <span className="text-xs text-cult-medium-gray uppercase tracking-wider">Fields</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tt.fields.map((f) => (
                            <span key={f} className="px-1.5 py-0.5 text-xs bg-cult-charcoal text-cult-light-gray rounded-sm">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit modal (stacks on top) */}
      {editingId && (() => {
        const tt = types.find((t) => t.id === editingId);
        if (!tt) return null;
        return (
          <TaskTypeEditorModal
            key={editingId}
            taskType={tt}
            onSave={async (updates) => {
              await updateTaskType(tt.id, updates);
              setEditingId(null);
            }}
            onDelete={!tt.is_builtin ? async () => {
              await deleteTaskType(tt.id);
              setEditingId(null);
            } : undefined}
            onClose={() => setEditingId(null)}
          />
        );
      })()}

      {/* Add new task type modal */}
      {showAdd && (
        <TaskTypeEditorModal
          taskType={null}
          onSave={async (input) => {
            const key = (input.label ?? 'custom')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_')
              .replace(/^_|_$/g, '');
            await createTaskType({
              task_key: `custom_${key}`,
              label: input.label ?? 'New Task Type',
              description: input.description,
              color: input.color,
              icon: input.icon,
              fields: input.fields,
            });
            setShowAdd(false);
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

/* ── Task Type Editor Modal ─────────────────────────────── */
interface TaskTypeEditorModalProps {
  taskType: {
    task_key: string;
    label: string;
    description: string;
    color: string;
    icon: string;
    fields: string[];
    is_enabled: boolean;
    is_builtin: boolean;
  } | null;
  onSave: (updates: { label?: string; description?: string; color?: string; icon?: string; fields?: string[]; is_enabled?: boolean }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

function TaskTypeEditorModal({ taskType, onSave, onDelete, onClose }: TaskTypeEditorModalProps) {
  const isNew = !taskType;
  const [label, setLabel] = useState(taskType?.label ?? '');
  const [description, setDescription] = useState(taskType?.description ?? '');
  const [color, setColor] = useState(taskType?.color ?? '#A6A6A6');
  const [icon, setIcon] = useState(taskType?.icon ?? 'Wrench');
  const [fieldsStr, setFieldsStr] = useState((taskType?.fields ?? []).join(', '));
  const [enabled, setEnabled] = useState(taskType?.is_enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const fields = fieldsStr.split(',').map((f) => f.trim()).filter(Boolean);
      await onSave({ label, description, color, icon, fields, is_enabled: enabled });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setSaving(true);
    try {
      await onDelete();
    } finally {
      setSaving(false);
    }
  }

  const PreviewIcon = ICON_MAP[icon] ?? Wrench;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative w-full max-w-lg bg-cult-near-black border border-cult-dark-gray rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
              <PreviewIcon className="w-5 h-5" style={{ color }} />
            </div>
            <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">
              {isNew ? 'New Task Type' : `Edit — ${taskType.label}`}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-cult-charcoal rounded transition-colors">
            <X className="w-4 h-4 text-cult-medium-gray" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Label */}
          <div>
            <label className="block text-xs text-cult-medium-gray uppercase tracking-wider mb-1">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 bg-cult-charcoal border border-cult-dark-gray text-cult-white text-sm rounded-sm focus:border-cult-accent focus:outline-none"
              placeholder="e.g. Foliar Spray"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs text-cult-medium-gray uppercase tracking-wider mb-1">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-sm border-2 transition-all ${color === c ? 'border-cult-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-cult-medium-gray uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-cult-charcoal border border-cult-dark-gray text-cult-white text-sm rounded-sm focus:border-cult-accent focus:outline-none resize-none"
              placeholder="What does this task type involve?"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-xs text-cult-medium-gray uppercase tracking-wider mb-1">Icon</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {AVAILABLE_ICONS.map((iconName) => {
                const Ic = ICON_MAP[iconName] ?? Wrench;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={`w-8 h-8 flex items-center justify-center rounded-sm border transition-all ${
                      icon === iconName ? 'border-cult-accent bg-cult-charcoal' : 'border-transparent hover:bg-cult-charcoal/50'
                    }`}
                    title={iconName}
                  >
                    <Ic className="w-4 h-4" style={{ color: icon === iconName ? color : '#666' }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fields */}
          <div>
            <label className="block text-xs text-cult-medium-gray uppercase tracking-wider mb-1">
              Completion Fields <span className="text-cult-dark-gray">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={fieldsStr}
              onChange={(e) => setFieldsStr(e.target.value)}
              className="w-full px-3 py-2 bg-cult-charcoal border border-cult-dark-gray text-cult-white text-sm rounded-sm focus:border-cult-accent focus:outline-none"
              placeholder="e.g. Product, Method, Duration"
            />
          </div>

          {/* Enable toggle */}
          {!isNew && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="accent-green-500"
              />
              <span className="text-xs text-cult-light-gray">Enabled</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-cult-dark-gray/50 bg-cult-near-black">
          <div>
            {onDelete && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Delete
              </button>
            )}
            {onDelete && confirmDelete && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Confirm?</span>
                <button type="button" onClick={handleDelete} className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-sm transition-colors" disabled={saving}>
                  Yes
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-xs text-cult-medium-gray hover:text-cult-white transition-colors">
                  No
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-cult-medium-gray hover:text-cult-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !label.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : isNew ? 'Create' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* WorkersTab removed — use standalone /worker-tasks (Crew) route instead. */
