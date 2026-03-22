import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  ClipboardList,
  Layers,
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
} from 'lucide-react';
import { Button } from '@/shared/components';
import { useAttendance, useDailyTasks, useGrowRooms } from '../hooks';
import { useActiveStaff } from '@features/sessions/hooks/useActiveStaff';
import { TASK_TYPE_CONFIG } from '../types';
import type { TaskType, TaskStatus, RoomType } from '../types';
import { RoomCalendar } from './RoomCalendar';
import { WorkerCheckIn } from './WorkerCheckIn';
import type { StaffMember } from './WorkerCheckIn';
import { TaskCard } from './TaskCard';
import type { TaskCardData, StaffOption } from './TaskCard';
import { TaskCompletionForm } from './TaskCompletionForm';
import { DeadPlantForm } from './DeadPlantForm';
import { todayIso } from '../utils/dateUtils';

type TabId = 'calendar' | 'board' | 'types' | 'workers';

const TABS: { id: TabId; label: string; icon: typeof Calendar }[] = [
  { id: 'board', label: 'Daily Board', icon: ClipboardList },
  { id: 'calendar', label: 'Schedules', icon: Calendar },
  { id: 'types', label: 'Task Types', icon: Layers },
  { id: 'workers', label: 'Workers', icon: Users },
];

const TASK_TYPE_DESCRIPTIONS: Record<TaskType, string> = {
  ipm_spray: 'Apply integrated pest management sprays and treatments to prevent or control pests and diseases.',
  defoliation: 'Remove excess fan leaves to improve light penetration and airflow through the canopy.',
  transplant: 'Move plants from smaller containers to larger ones as they outgrow their current pots.',
  cleaning: 'Sanitize surfaces, floors, and equipment. Remove debris and dead plant material.',
  harvest: 'Cut, hang, and process mature plants at peak trichome development.',
  feeding: 'Prepare and deliver nutrient solution. Record EC, pH, volume, and water temperature.',
  scouting: 'Inspect plants for pests, disease, nutrient deficiencies, and overall plant health.',
  training: 'Apply low-stress or high-stress training techniques to shape plant structure.',
  clone_cutting: 'Take cuttings from mother plants for propagation. Dip, place in trays, label.',
  custom: 'General-purpose task for activities that do not fit standard categories.',
};

const TASK_TYPE_FIELDS: Record<TaskType, string[]> = {
  ipm_spray: ['Product', 'Method', 'Target Pest', 'Re-entry Hours'],
  defoliation: ['Type', 'Sections', 'Progress'],
  transplant: ['From Size', 'To Size', 'Count'],
  cleaning: ['Type', 'Notes'],
  harvest: ['Wet Weight', 'Plant Count', 'Waste'],
  feeding: ['EC', 'pH', 'Volume (gal)', 'Water Temp'],
  scouting: ['Pests', 'Disease', 'Nutrient Issues', 'Health Rating'],
  training: ['Type', 'Plant Count', 'Sections'],
  clone_cutting: ['Mother ID', 'Cut Count', 'Tray'],
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
};

const ROOM_TYPE_ORDER: Record<string, number> = { mother: 0, veg: 1, flower: 2, clone: 3, mixed: 4 };
const ROOM_TYPE_BORDER: Record<string, string> = {
  mother: 'border-l-amber-600',
  veg: 'border-l-green-600',
  flower: 'border-l-rose-600',
  clone: 'border-l-sky-600',
  mixed: 'border-l-cult-medium-gray',
};
const ROOM_TYPE_BG: Record<string, string> = {
  mother: 'bg-amber-600',
  veg: 'bg-green-600',
  flower: 'bg-rose-600',
  clone: 'bg-sky-600',
  mixed: 'bg-cult-medium-gray',
};
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Roles that belong on the cultivation task board */
const CULTIVATION_ROLES = new Set(['cultivation_manager', 'cultivation_lead', 'cultivator', 'manager', 'operations', 'operations_manager']);

export function SchedulesPage() {
  const { rooms: dbRooms } = useGrowRooms();

  const rooms = useMemo(() => {
    return dbRooms.map((r) => ({ id: r.id, name: r.name, room_type: r.room_type, room_code: r.room_code }));
  }, [dbRooms]);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">Room Schedules</h1>
        <p className="text-cult-light-gray mt-1">Set up recurring task schedules for each grow room</p>
      </div>
      <RoomCalendar rooms={rooms} />
    </div>
  );
}

export function DailyTaskBoard() {
  const [activeTab, setActiveTab] = useState<TabId>('board');
  const [selectedDate, setSelectedDate] = useState(todayIso);

  const { rooms: dbRooms } = useGrowRooms();
  const { tasks: dbTasks, completeWithLog, assignWorker, updateStatus, refetch: refetchTasks, createTask } = useDailyTasks(selectedDate);
  const { records: attendance, upsertAttendance } = useAttendance(selectedDate);
  const { staff: activeStaff } = useActiveStaff();

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
        assigned_to_name: staffMember?.first_name ?? t.assigned_to,
        status: t.status,
        estimated_duration: t.estimated_duration,
        notes: t.notes,
        scope: t.scope,
        progress_current: (t.progress_data as Record<string, number>)?.current,
        progress_total: (t.progress_data as Record<string, number>)?.total,
        estimated_cost: cost,
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
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cult-white uppercase tracking-wide">
            Task Board
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            <button
              type="button"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().slice(0, 10));
              }}
              className="p-1 text-cult-medium-gray hover:text-cult-white transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
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
              className="p-1 text-cult-medium-gray hover:text-cult-white transition-colors"
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayIso())}
                className="ml-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cult-accent border border-cult-accent/30 hover:bg-cult-accent/10 transition-colors"
              >
                Jump to Today
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Bar ────────────────────────────────────────── */}
      <div className="bg-cult-surface-overlay border-b border-cult-dark-gray overflow-x-auto scrollbar-hide mb-6">
        <div className="flex items-center gap-0 min-w-max">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 -mb-px flex-shrink-0 ${
                  isActive
                    ? 'text-cult-white border-cult-accent'
                    : 'text-cult-medium-gray hover:text-cult-light-gray border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'calendar' && <RoomCalendar rooms={rooms} />}
      {activeTab === 'board' && (
        <DailyBoardTab
          rooms={rooms}
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
        />
      )}
      {activeTab === 'types' && <TaskTypesTab />}
      {activeTab === 'workers' && (
        <WorkersTab staff={allStaff} tasks={taskCards} attendance={attendance} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DAILY BOARD TAB — Redesigned
   ═══════════════════════════════════════════════════════════ */

interface DailyBoardTabProps {
  rooms: { id: string; name: string; room_type: RoomType; room_code: string }[];
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
}

function DailyBoardTab({ rooms, staff, allStaff, tasks, attendance, date, onUpsertAttendance, onCompleteWithLog, onCreateTask, onAssignWorker, onStartTask }: DailyBoardTabProps) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskRoomId, setAddTaskRoomId] = useState<string | null>(null);
  const [completingTask, setCompletingTask] = useState<{ task: TaskCardData; roomId: string } | null>(null);
  const [showDeadPlantForm, setShowDeadPlantForm] = useState(false);
  const [deadPlantRoomId, setDeadPlantRoomId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

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

  // Staff options for quick-assign (only present cultivation staff)
  const quickAssignStaff: StaffOption[] = useMemo(() => {
    const presentIds = new Set(attendance.filter((a) => a.is_present).map((a) => a.staff_id));
    return staff
      .filter((s) => presentIds.has(s.id))
      .map((s) => ({ id: s.id, first_name: s.first_name }));
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
        const cfg_a = TASK_TYPE_CONFIG[a.task_type];
        const cfg_b = TASK_TYPE_CONFIG[b.task_type];
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
    entries.sort((a, b) => (ROOM_TYPE_ORDER[a.room.room_type] ?? 9) - (ROOM_TYPE_ORDER[b.room.room_type] ?? 9));
    return entries;
  }, [rooms, tasksByRoom, tasks]);

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
                    stats.pct === 100 ? 'bg-green-500' : 'bg-cult-accent'
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
            className="flex items-center gap-2 px-4 py-2.5 bg-cult-accent hover:bg-cult-accent-hover text-white text-xs font-semibold uppercase tracking-wider transition-colors"
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
          <span className="text-[10px] text-cult-medium-gray uppercase tracking-wider mr-1 flex-shrink-0">Show:</span>
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
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-sm transition-colors flex-shrink-0 ${
                  isActive
                    ? 'bg-cult-charcoal text-cult-white border border-cult-medium-gray'
                    : 'text-cult-medium-gray hover:text-cult-light-gray border border-transparent hover:border-cult-dark-gray'
                }`}
              >
                <Icon className="w-3 h-3" />
                {chip.label}
                <span className={`ml-0.5 text-[10px] ${isActive ? 'text-cult-light-gray' : 'text-cult-medium-gray'}`}>
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Staff Check-In (cultivation only, collapsed by default) ── */}
      <WorkerCheckIn
        staff={staff}
        rooms={rooms.map((r) => ({ id: r.id, room_code: r.room_code }))}
        attendance={attendance}
        date={date}
        onUpsertAttendance={onUpsertAttendance}
      />

      {/* ── Empty State ──────────────────────────────────── */}
      {hasNoTasks && (
        <div className="border border-dashed border-cult-dark-gray py-16 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-cult-charcoal flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-cult-medium-gray" />
          </div>
          <div className="text-center">
            <p className="text-sm text-cult-light-gray font-medium">No tasks scheduled for this day</p>
            <p className="text-xs text-cult-medium-gray mt-1 max-w-xs">
              Tasks are auto-generated from room schedules, or you can add one manually.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openAddTask()}
              className="flex items-center gap-2 px-4 py-2 bg-cult-accent hover:bg-cult-accent-hover text-white text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </button>
          </div>
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
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ROOM_TYPE_BG[room.room_type] ?? 'bg-cult-medium-gray'}`} />
                  <span className="text-[11px] font-bold text-cult-light-gray uppercase tracking-widest">
                    {ROOM_TYPE_LABELS[room.room_type] ?? room.room_type}
                  </span>
                  <div className="flex-1 h-px bg-cult-dark-gray" />
                </div>
              )}

              <div
                className={`bg-cult-near-black border border-cult-dark-gray border-l-2 ${ROOM_TYPE_BORDER[room.room_type] ?? ''} ${
                  allDone ? 'opacity-50' : ''
                } animate-fade-in`}
                style={{ animationDelay: `${currentIndex * 50}ms`, animationFillMode: 'both' }}
              >
                {/* Room Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-cult-dark-gray/50">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-cult-white">{room.room_code}</span>
                    <span className="text-[10px] text-cult-medium-gray uppercase">{room.room_type}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Completion indicator */}
                    <div className="flex items-center gap-2">
                      {allDone ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-green-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Done
                        </span>
                      ) : (
                        <>
                          <span className="text-[11px] font-medium text-cult-light-gray">
                            {completedCount}/{totalCount}
                          </span>
                          <div className="w-16 h-1.5 bg-cult-charcoal rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300 bg-cult-accent"
                              style={{ width: `${roomPct}%` }}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openDeadPlantForm(room.id)}
                        className="p-1.5 hover:bg-cult-charcoal rounded-sm transition-colors text-cult-medium-gray hover:text-red-400"
                        title="Log dead plant"
                      >
                        <Skull className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openAddTask(room.id)}
                        className="p-1.5 hover:bg-cult-charcoal rounded-sm transition-colors text-cult-medium-gray hover:text-cult-accent"
                        title="Add task to this room"
                      >
                        <Plus className="w-3.5 h-3.5" />
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
                        onClick={() => openCompletionForm(t)}
                        staffOptions={quickAssignStaff}
                        onQuickAssign={onAssignWorker}
                        onStartTask={onStartTask}
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
          staff={allStaff}
          preSelectedRoomId={addTaskRoomId}
          taskDate={date}
          onClose={() => setShowAddTask(false)}
          onSave={async (input) => {
            await onCreateTask({ ...input, task_date: date });
            setShowAddTask(false);
          }}
        />
      )}

      {completingTask && (
        <TaskCompletionForm
          task={completingTask.task}
          roomId={completingTask.roomId}
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
      <div className="text-[10px] text-cult-medium-gray uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-bold ${accent ?? 'text-cult-white'}`}>{value}</div>
      <div className="text-[10px] text-cult-medium-gray mt-0.5">{detail}</div>
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
          <span className="text-[11px] text-cult-medium-gray font-medium">
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
  const [taskType, setTaskType] = useState<TaskType>('feeding');
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
        <button type="button" onClick={onClose} className="p-1 hover:bg-cult-charcoal rounded-sm transition-colors">
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
        <label className="block text-[10px] text-cult-light-gray uppercase tracking-wider mb-1">Task Type</label>
        <select value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)} className={selectClass}>
          {taskTypes.map((t) => <option key={t} value={t}>{TASK_TYPE_CONFIG[t].label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-cult-light-gray uppercase tracking-wider mb-1">Room</label>
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={selectClass}>
          <option value="">Select room...</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.room_code}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-cult-light-gray uppercase tracking-wider mb-1">Assign To</label>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={selectClass}>
          <option value="">Unassigned</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.first_name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-cult-light-gray uppercase tracking-wider mb-1">Notes</label>
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

function TaskTypesTab() {
  const types = Object.entries(TASK_TYPE_CONFIG) as [TaskType, typeof TASK_TYPE_CONFIG[TaskType]][];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {types.map(([key, config]) => {
        const Icon = ICON_MAP[config.icon] ?? Wrench;
        const fields = TASK_TYPE_FIELDS[key] ?? [];
        return (
          <div key={key} className="bg-cult-near-black border border-cult-dark-gray p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${config.color}20` }}
              >
                <Icon className="w-4 h-4" style={{ color: config.color }} />
              </div>
              <span className="text-xs font-semibold text-cult-white uppercase tracking-wider">{config.label}</span>
            </div>
            <p className="text-[10px] text-cult-light-gray leading-relaxed">
              {TASK_TYPE_DESCRIPTIONS[key]}
            </p>
            {fields.length > 0 && (
              <div className="pt-2 border-t border-cult-dark-gray/50">
                <span className="text-[9px] text-cult-medium-gray uppercase tracking-wider">Fields</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {fields.map((f) => (
                    <span key={f} className="px-1.5 py-0.5 text-[9px] bg-cult-charcoal text-cult-light-gray rounded-sm">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WORKERS TAB
   ═══════════════════════════════════════════════════════════ */

interface WorkersTabProps {
  staff: StaffMember[];
  tasks: TaskCardData[];
  attendance: ReturnType<typeof useAttendance>['records'];
}

function WorkersTab({ staff, tasks, attendance }: WorkersTabProps) {
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, (typeof attendance)[0]>();
    for (const a of attendance) map.set(a.staff_id, a);
    return map;
  }, [attendance]);

  const taskCountByWorker = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    for (const t of tasks) {
      if (!t.assigned_to_name) continue;
      const match = staff.find((s) => s.first_name === t.assigned_to_name);
      if (!match) continue;
      const curr = map.get(match.id) ?? { total: 0, completed: 0 };
      curr.total++;
      if (t.status === 'completed') curr.completed++;
      map.set(match.id, curr);
    }
    return map;
  }, [tasks, staff]);

  const tasksByWorker = useMemo(() => {
    const map = new Map<string, TaskCardData[]>();
    for (const t of tasks) {
      if (!t.assigned_to_name) continue;
      const match = staff.find((s) => s.first_name === t.assigned_to_name);
      if (!match) continue;
      const list = map.get(match.id) ?? [];
      list.push(t);
      map.set(match.id, list);
    }
    return map;
  }, [tasks, staff]);

  const totalPresent = attendance.filter((a) => a.is_present).length;
  const totalTasksAssigned = tasks.length;
  const totalCompleted = tasks.filter((t) => t.status === 'completed').length;
  const totalHours = attendance.reduce((sum, a) => sum + (a.is_present ? (a.hours_worked ?? 8) : 0), 0);

  const STATUS_DOT: Record<TaskStatus, string> = {
    pending: 'bg-zinc-500',
    in_progress: 'bg-sky-400',
    completed: 'bg-green-400',
    skipped: 'bg-zinc-600',
    carry_forward: 'bg-amber-400',
  };

  const ROLE_BADGE: Record<string, string> = {
    manager: 'bg-amber-950 text-amber-400 border border-amber-800',
    cultivation_manager: 'bg-amber-950 text-amber-400 border border-amber-800',
    cultivation_lead: 'bg-amber-950 text-amber-400 border border-amber-800',
    cultivator: 'bg-green-950 text-green-400 border border-green-800',
    operations: 'bg-sky-950 text-sky-400 border border-sky-800',
    operations_manager: 'bg-sky-950 text-sky-400 border border-sky-800',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Present" value={`${totalPresent} / ${staff.length}`} />
        <SummaryCard label="Tasks Assigned" value={String(totalTasksAssigned)} />
        <SummaryCard label="Completed" value={String(totalCompleted)} />
        <SummaryCard label="Total Hours" value={String(totalHours)} />
      </div>

      <div className="bg-cult-near-black border border-cult-dark-gray divide-y divide-cult-dark-gray/50">
        {staff.map((s) => {
          const rec = attendanceMap.get(s.id);
          const isPresent = rec?.is_present ?? false;
          const hours = rec?.hours_worked ?? 0;
          const roomAssignments = rec?.room_assignments ?? [];
          const counts = taskCountByWorker.get(s.id) ?? { total: 0, completed: 0 };
          const isExpanded = expandedWorker === s.id;
          const workerTasks = tasksByWorker.get(s.id) ?? [];
          const workerCost = isPresent ? s.hourly_rate * (hours || 8) : 0;

          return (
            <div key={s.id}>
              <button
                type="button"
                onClick={() => isPresent && setExpandedWorker(isExpanded ? null : s.id)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                  !isPresent ? 'opacity-40' : 'hover:bg-cult-charcoal/20 active:bg-cult-charcoal/30'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-cult-charcoal flex items-center justify-center text-sm font-bold text-cult-white flex-shrink-0">
                    {s.first_name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-cult-white font-medium">{s.first_name}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-sm ${ROLE_BADGE[s.role] ?? 'bg-cult-charcoal text-cult-light-gray'}`}>
                        {s.role.replace(/_/g, ' ')}
                      </span>
                      {!isPresent && (
                        <span className="text-[10px] text-zinc-500 uppercase">Absent</span>
                      )}
                    </div>
                    {isPresent && roomAssignments.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {roomAssignments.map((rid) => (
                          <span key={rid} className="px-1.5 py-0.5 text-[9px] font-mono bg-cult-charcoal text-cult-light-gray rounded-sm">{rid}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {isPresent && (
                  <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                    <div className="text-center">
                      <div className="text-cult-white font-semibold">{counts.total}</div>
                      <div className="text-[9px] text-cult-medium-gray uppercase">Tasks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-cult-green font-semibold">{counts.completed}</div>
                      <div className="text-[9px] text-cult-medium-gray uppercase">Done</div>
                    </div>
                    <div className="text-center">
                      <div className="text-cult-white font-semibold">{hours}h</div>
                      <div className="text-[9px] text-cult-medium-gray uppercase">Hours</div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-cult-medium-gray transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                )}
              </button>

              {isExpanded && isPresent && (
                <div className="px-4 pb-4 bg-cult-black/50">
                  <div className="pl-11 space-y-2">
                    {/* Worker cost summary */}
                    <div className="flex items-center gap-4 text-xs text-cult-medium-gray pb-2 border-b border-cult-dark-gray/50">
                      <span>${s.hourly_rate}/hr</span>
                      <span>{hours || 8}h shift</span>
                      <span className="text-cult-white font-semibold">${workerCost.toFixed(0)} est. cost</span>
                    </div>

                    {workerTasks.length === 0 ? (
                      <div className="py-3 text-xs text-cult-medium-gray italic">No tasks assigned</div>
                    ) : (
                      workerTasks.map((t) => {
                        const config = TASK_TYPE_CONFIG[t.task_type] ?? TASK_TYPE_CONFIG.custom;
                        return (
                          <div key={t.id} className="flex items-center gap-3 py-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[t.status] ?? 'bg-zinc-500'}`} />
                            <span
                              className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-sm flex-shrink-0"
                              style={{ backgroundColor: `${config.color}20`, color: config.color }}
                            >
                              {config.label}
                            </span>
                            <span className="text-xs font-mono text-cult-white">{t.room_name}</span>
                            {t.estimated_duration && (
                              <span className="flex items-center gap-1 text-[10px] text-cult-medium-gray ml-auto">
                                <Clock className="w-3 h-3" />
                                {t.estimated_duration}
                              </span>
                            )}
                            {t.estimated_cost != null && t.estimated_cost > 0 && (
                              <span className="text-[10px] text-cult-medium-gray font-mono">${t.estimated_cost.toFixed(0)}</span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cult-near-black border border-cult-dark-gray p-3">
      <div className="text-lg font-bold text-cult-white">{value}</div>
      <div className="text-[10px] text-cult-medium-gray uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
