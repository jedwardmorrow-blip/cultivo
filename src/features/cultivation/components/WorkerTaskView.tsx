import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  CheckCircle2, Circle, Play, Clock, ChevronRight, ChevronDown,
  AlertTriangle, SkipForward, Sprout, Droplets, SprayCan, Scissors,
  ArrowRightLeft, Search, Sparkles, GitBranch, Wrench, Wheat,
  CircleDot, User, Beaker,
} from 'lucide-react';
import { useDailyTasks, useGrowRooms, useAttendance } from '../hooks';
import { useActiveStaff } from '@features/sessions/hooks/useActiveStaff';
import { TASK_TYPE_CONFIG } from '../types';
import type { TaskType, TaskStatus } from '../types';
import { TaskCompletionForm } from './TaskCompletionForm';
import type { TaskCardData } from './TaskCard';
import { todayIso } from '../utils/dateUtils';
import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// Worker Task View — mobile-first employee task board
//
// Design principles (mobile-design skill):
// - Touch targets ≥ 48px (Android standard)
// - Primary CTAs in thumb zone (bottom of screen)
// - Minimal chrome, maximum task focus
// - Swipe-free (button-based for reliability on all devices)
// - Dark theme matches existing cult-ops design system
// ═══════════════════════════════════════════════════════════════

const ICON_MAP: Record<string, typeof Scissors> = {
  SprayCan, Scissors, ArrowRightLeft, Sparkles, Wheat,
  Droplets, Search, GitBranch, Sprout, Wrench, Beaker,
};

const STATUS_CONFIG: Record<TaskStatus, { icon: typeof Circle; color: string; label: string }> = {
  pending: { icon: Circle, color: 'text-zinc-400', label: 'To Do' },
  in_progress: { icon: CircleDot, color: 'text-sky-400', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'text-green-400', label: 'Done' },
  skipped: { icon: SkipForward, color: 'text-zinc-500', label: 'Skipped' },
  carry_forward: { icon: AlertTriangle, color: 'text-amber-400', label: 'Carried' },
};

interface WorkerIdentity {
  id: string;
  first_name: string;
}

// ═══ Worker selector (first screen if no worker selected) ═══
function WorkerSelector({ staff, onSelect }: { staff: WorkerIdentity[]; onSelect: (id: string) => void }) {
  return (
    <div className="min-h-screen bg-cult-near-black flex flex-col">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-cult-white">Crew View</h1>
        <p className="text-sm text-cult-medium-gray mt-1">Task assignments for floor workers</p>
      </div>
      <div className="flex-1 px-4 pb-8">
        <div className="grid grid-cols-2 gap-3">
          {staff.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className="flex flex-col items-center justify-center gap-2 p-6 bg-cult-charcoal/40 border border-cult-dark-gray/40 rounded-lg active:bg-cult-charcoal/80 transition-colors min-h-[100px]"
            >
              <span className="w-12 h-12 rounded-full bg-violet-600/30 flex items-center justify-center text-lg font-bold text-violet-300">
                {s.first_name.charAt(0)}
              </span>
              <span className="text-sm font-semibold text-cult-white">{s.first_name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══ Progress header ═══
function ProgressHeader({ completed, total, workerName }: { completed: number; total: number; workerName: string }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = pct === 100 && total > 0;

  return (
    <div className="px-5 pt-4 pb-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-lg font-bold text-cult-white">Today's Tasks</h1>
          <p className="text-xs text-cult-medium-gray mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            <span className="mx-1.5">·</span>
            <span className="text-violet-400">{workerName}</span>
          </p>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-bold ${allDone ? 'text-green-400' : 'text-cult-white'}`}>{pct}%</span>
          <p className="text-[10px] text-cult-medium-gray">{completed}/{total} done</p>
        </div>
      </div>
      <div className="w-full h-2 bg-cult-charcoal rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-green-500' : 'bg-violet-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ═══ Individual task row ═══
interface TaskRowProps {
  task: TaskCardData;
  roomName: string;
  onTap: () => void;
  onStart: () => void;
  onComplete: () => void;
}

function TaskRow({ task, roomName, onTap, onStart, onComplete }: TaskRowProps) {
  const config = TASK_TYPE_CONFIG[task.task_type] ?? TASK_TYPE_CONFIG.custom;
  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const iconName = (config as Record<string, unknown>).icon as string | undefined;
  const TaskIcon = iconName ? ICON_MAP[iconName] ?? Wrench : Wrench;

  const isPending = task.status === 'pending' || task.status === 'carry_forward';
  const isInProgress = task.status === 'in_progress';
  const isDone = task.status === 'completed' || task.status === 'skipped';

  return (
    <div className={`border-b border-cult-dark-gray/30 ${isDone ? 'opacity-40' : ''}`}>
      {/* Main row — tappable */}
      <button
        onClick={onTap}
        className="w-full flex items-center gap-3 px-5 py-4 text-left active:bg-cult-charcoal/30 transition-colors min-h-[64px]"
      >
        {/* Status indicator */}
        <StatusIcon className={`w-6 h-6 flex-shrink-0 ${statusCfg.color}`} />

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded"
              style={{ backgroundColor: `${config.color}20`, color: config.color }}
            >
              <TaskIcon className="w-3 h-3" />
              {config.label}
            </span>
            {task.status === 'carry_forward' && (
              <span className="text-[10px] text-amber-400 font-semibold">CARRIED</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-cult-light-gray font-mono">{roomName}</span>
            {task.estimated_duration && (
              <span className="flex items-center gap-0.5 text-[10px] text-cult-medium-gray">
                <Clock className="w-3 h-3" />
                {task.estimated_duration}
              </span>
            )}
            {task.notes && (
              <span className="text-[10px] text-cult-dark-gray truncate max-w-[120px]">{task.notes}</span>
            )}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-cult-dark-gray flex-shrink-0" />
      </button>

      {/* Quick action bar — only for actionable tasks */}
      {(isPending || isInProgress) && (
        <div className="flex items-center gap-2 px-5 pb-3 -mt-1">
          {isPending && (
            <button
              onClick={(e) => { e.stopPropagation(); onStart(); }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-sky-300 bg-sky-950/50 border border-sky-800/40 rounded-lg active:bg-sky-900 transition-colors min-h-[44px]"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          )}
          {isInProgress && (
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-green-300 bg-green-950/50 border border-green-800/40 rounded-lg active:bg-green-900 transition-colors min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ═══ Room group ═══
function RoomGroup({
  roomCode,
  tasks,
  onTapTask,
  onStartTask,
  onCompleteTask,
}: {
  roomCode: string;
  tasks: TaskCardData[];
  onTapTask: (task: TaskCardData) => void;
  onStartTask: (taskId: string) => void;
  onCompleteTask: (task: TaskCardData) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const doneCount = tasks.filter((t) => t.status === 'completed').length;
  const allDone = doneCount === tasks.length;

  return (
    <div className="mb-2">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-3 active:bg-cult-charcoal/20 transition-colors min-h-[48px]"
      >
        <div className="flex items-center gap-2">
          <ChevronDown className={`w-4 h-4 text-cult-medium-gray transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          <span className="text-xs font-bold text-cult-light-gray uppercase tracking-wider font-mono">{roomCode}</span>
        </div>
        <span className={`text-xs font-semibold ${allDone ? 'text-green-400' : 'text-cult-medium-gray'}`}>
          {doneCount}/{tasks.length}
        </span>
      </button>
      {!collapsed && (
        <div>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              roomName={roomCode}
              onTap={() => onTapTask(task)}
              onStart={() => onStartTask(task.id)}
              onComplete={() => onCompleteTask(task)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ Main component ═══
export function WorkerTaskView() {
  const [workerId, setWorkerId] = useState<string | null>(() => {
    try { return sessionStorage.getItem('cult-worker-id'); } catch { return null; }
  });
  const [completingTask, setCompletingTask] = useState<{ task: TaskCardData; roomId: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine'>('mine');

  const date = todayIso();
  const { rooms: dbRooms } = useGrowRooms();
  const { tasks: dbTasks, completeWithLog, updateStatus, refetch: refetchTasks } = useDailyTasks(date);
  const { staff: activeStaff } = useActiveStaff();

  const rooms = useMemo(() =>
    dbRooms.map((r) => ({ id: r.id, name: r.name, room_type: r.room_type, room_code: r.room_code })),
    [dbRooms]
  );

  // Build staff list — cultivation roles
  const CULTIVATION_ROLES = useMemo(() => new Set(['cultivation_manager', 'cultivation_lead', 'cultivator', 'manager', 'operations', 'operations_manager']), []);
  const cultStaff = useMemo(() =>
    activeStaff.filter((s) => CULTIVATION_ROLES.has(s.role ?? '')).map((s) => ({ id: s.id, first_name: s.first_name })),
    [activeStaff, CULTIVATION_ROLES]
  );

  const workerName = useMemo(() => {
    const w = cultStaff.find((s) => s.id === workerId);
    return w?.first_name ?? 'Worker';
  }, [cultStaff, workerId]);

  // Persist worker selection
  useEffect(() => {
    try {
      if (workerId) sessionStorage.setItem('cult-worker-id', workerId);
      else sessionStorage.removeItem('cult-worker-id');
    } catch { /* SSR safe */ }
  }, [workerId]);

  // Map tasks to TaskCardData
  const allTasks: TaskCardData[] = useMemo(() =>
    dbTasks.map((t) => {
      const room = rooms.find((r) => r.id === t.room_id);
      const staffMember = activeStaff.find((s) => s.id === t.assigned_to);
      return {
        id: t.id,
        task_type: t.task_type,
        room_name: room?.room_code ?? 'Unknown',
        assigned_to: t.assigned_to ?? null,
        assigned_to_name: staffMember?.first_name ?? null,
        status: t.status,
        estimated_duration: t.estimated_duration,
        notes: t.notes,
        scope: t.scope,
        progress_current: (t.progress_data as Record<string, number>)?.current,
        progress_total: (t.progress_data as Record<string, number>)?.total,
        task_config: t.task_config,
      };
    }),
    [dbTasks, rooms, activeStaff]
  );

  // Filter to worker's tasks
  const visibleTasks = useMemo(() => {
    if (filter === 'mine' && workerId) {
      return allTasks.filter((t) => t.assigned_to === workerId);
    }
    return allTasks;
  }, [allTasks, filter, workerId]);

  // Group by room
  const tasksByRoom = useMemo(() => {
    const map = new Map<string, TaskCardData[]>();
    for (const t of visibleTasks) {
      const list = map.get(t.room_name) ?? [];
      list.push(t);
      map.set(t.room_name, list);
    }
    // Sort each room's tasks: pending/carried first, then in_progress, then done
    const statusOrder: Record<string, number> = { carry_forward: 0, pending: 1, in_progress: 2, completed: 3, skipped: 4 };
    for (const [, list] of map) {
      list.sort((a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5));
    }
    return map;
  }, [visibleTasks]);

  const completedCount = visibleTasks.filter((t) => t.status === 'completed').length;
  const totalCount = visibleTasks.length;

  // ═══ Actions ═══
  const handleStart = useCallback(async (taskId: string) => {
    await updateStatus(taskId, 'in_progress');
  }, [updateStatus]);

  const handleOpenComplete = useCallback((task: TaskCardData) => {
    const room = rooms.find((r) => r.room_code === task.room_name);
    setCompletingTask({ task, roomId: room?.id ?? '' });
  }, [rooms]);

  const handleComplete = useCallback(async (taskId: string, refTable: string, refId: string, duration: string | null) => {
    await completeWithLog(taskId, refTable, refId, duration ?? undefined);
    await refetchTasks();
    setCompletingTask(null);
  }, [completeWithLog, refetchTasks]);

  const handleTapTask = useCallback((task: TaskCardData) => {
    if (task.status === 'in_progress') {
      handleOpenComplete(task);
    }
    // For pending, tapping just opens detail — or we could start
    // For completed, no action
  }, [handleOpenComplete]);

  // ═══ Worker selector ═══
  if (!workerId) {
    return <WorkerSelector staff={cultStaff} onSelect={setWorkerId} />;
  }

  // ═══ Completion form overlay ═══
  if (completingTask) {
    return (
      <div className="min-h-screen bg-cult-near-black">
        <TaskCompletionForm
          task={completingTask.task}
          roomId={completingTask.roomId}
          onComplete={(refTable, refId, duration) => handleComplete(completingTask.task.id, refTable, refId, duration)}
          onNavigateHarvest={() => { /* noop in worker view */ }}
          onNavigateClone={() => { /* noop in worker view */ }}
          onClose={() => setCompletingTask(null)}
        />
      </div>
    );
  }

  // ═══ Main task list ═══
  return (
    <div className="min-h-screen bg-cult-near-black flex flex-col">
      {/* Top bar */}
      <div className="bg-cult-near-black border-b border-cult-dark-gray/40 sticky top-0 z-10">
        <ProgressHeader completed={completedCount} total={totalCount} workerName={workerName} />

        {/* Filter toggle */}
        <div className="flex items-center gap-1 px-5 pb-3">
          {(['mine', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors min-h-[40px] ${
                filter === f
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-cult-medium-gray border border-transparent active:bg-cult-charcoal/30'
              }`}
            >
              {f === 'mine' ? 'My Tasks' : 'All Tasks'}
            </button>
          ))}

          {/* Change worker — small link */}
          <button
            onClick={() => setWorkerId(null)}
            className="ml-auto flex items-center gap-1 px-2 py-2 text-[10px] text-cult-dark-gray active:text-cult-medium-gray transition-colors min-h-[40px]"
          >
            <User className="w-3 h-3" />
            Switch
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto pb-20">
        {tasksByRoom.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            {filter === 'mine' ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-green-500/30 mb-4" />
                <p className="text-base text-cult-light-gray font-medium">No tasks assigned to you</p>
                <p className="text-xs text-cult-medium-gray mt-2">
                  Check with your manager or tap "All Tasks" to see what's on the board.
                </p>
              </>
            ) : (
              <>
                <Circle className="w-12 h-12 text-cult-dark-gray mb-4" />
                <p className="text-base text-cult-light-gray font-medium">No tasks today</p>
                <p className="text-xs text-cult-medium-gray mt-2">Tasks generate from room schedules at midnight.</p>
              </>
            )}
          </div>
        ) : (
          Array.from(tasksByRoom.entries()).map(([roomCode, tasks]) => (
            <RoomGroup
              key={roomCode}
              roomCode={roomCode}
              tasks={tasks}
              onTapTask={handleTapTask}
              onStartTask={handleStart}
              onCompleteTask={handleOpenComplete}
            />
          ))
        )}

        {/* All done state */}
        {totalCount > 0 && completedCount === totalCount && (
          <div className="flex flex-col items-center py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-950/40 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-lg font-bold text-green-400">All done!</p>
            <p className="text-sm text-cult-medium-gray mt-1">Great work today, {workerName}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
