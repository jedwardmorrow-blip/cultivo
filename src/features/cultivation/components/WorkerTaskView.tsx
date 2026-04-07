/**
 * Worker Task View — mobile-first employee task board (Glass Design System)
 *
 * Design: Liquid Glass aesthetic matching Command Center quality.
 * Philosophy: "Focused execution interface" — workers see their tasks, nothing else.
 * Engagement: Personal stats card, room context, inline feed preview, observation logging.
 *
 * Touch targets ≥ 48px. Button-based (no swipe). Glass surfaces throughout.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Circle, Play, Clock, ChevronRight, ChevronDown,
  AlertTriangle, SkipForward, Sprout, Droplets, SprayCan, Scissors,
  ArrowRightLeft, Search, Sparkles, GitBranch, Wrench, Wheat,
  CircleDot, User, Beaker, Flame, PenLine, X, Send,
} from 'lucide-react';
import { useDailyTasks, useGrowRooms } from '../hooks';
import { useActiveStaff } from '@features/sessions/hooks/useActiveStaff';
import { useRoomOperationalState } from '../hooks/useRoomOperationalState';
import { useWorkerStats } from '../hooks/useWorkerStats';
import { TASK_TYPE_CONFIG, getTaskTypeConfig } from '../types';
import type { TaskType, TaskStatus } from '../types';
import { TaskCompletionForm } from './TaskCompletionForm';
import type { TaskCardData } from './TaskCard';
import { todayIso } from '../utils/dateUtils';
import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// Design tokens
// ═══════════════════════════════════════════════════════════════

const PAGE_BG = 'bg-gradient-to-br from-[#0a0f0a] via-[#080a08] to-[#060808]';
const GLASS = 'rounded-2xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]';
const GLASS_CARD = 'rounded-2xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-xl';
const GLASS_NESTED = 'rounded-xl bg-white/[0.04] border border-white/[0.06]';

const STAGE_COLORS: Record<string, string> = {
  flower: '#F43F5E', veg: '#10B981', clone: '#0EA5E9', mother: '#F59E0B', mixed: '#8B5CF6',
};

const ICON_MAP: Record<string, typeof Scissors> = {
  SprayCan, Scissors, ArrowRightLeft, Sparkles, Wheat,
  Droplets, Search, GitBranch, Sprout, Wrench, Beaker,
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'text-white/30',
  in_progress: 'text-sky-400',
  completed: 'text-emerald-400',
  skipped: 'text-white/20',
  carry_forward: 'text-amber-400',
};

const STATUS_ICONS: Record<TaskStatus, typeof Circle> = {
  pending: Circle,
  in_progress: CircleDot,
  completed: CheckCircle2,
  skipped: SkipForward,
  carry_forward: AlertTriangle,
};

interface WorkerIdentity {
  id: string;
  first_name: string;
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ═══════════════════════════════════════════════════════════════
// Worker Selector — first screen
// ═══════════════════════════════════════════════════════════════

function WorkerSelector({ staff, onSelect }: { staff: WorkerIdentity[]; onSelect: (id: string) => void }) {
  return (
    <div className={`min-h-screen ${PAGE_BG} flex flex-col`}>
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-xl font-semibold text-white/80">{timeGreeting()}</h1>
        <p className="text-xs text-white/40 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <p className="text-sm text-white/50 mt-3">Who's clocking in?</p>
      </div>
      <div className="flex-1 px-4 pb-8">
        <div className="grid grid-cols-2 gap-3">
          {staff.map((s) => (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: staff.indexOf(s) * 0.05 }}
              onClick={() => onSelect(s.id)}
              className={`${GLASS_CARD} flex flex-col items-center justify-center gap-2.5 p-6 active:scale-[0.97] transition-all duration-200 min-h-[110px] hover:bg-white/[0.09] hover:border-white/[0.14]`}
            >
              <span className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-lg font-bold text-emerald-300">
                {s.first_name.charAt(0)}
              </span>
              <span className="text-sm font-medium text-white/70">{s.first_name}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Personal Stats Card
// ═══════════════════════════════════════════════════════════════

function PersonalStatsCard({ workerId }: { workerId: string }) {
  const stats = useWorkerStats(workerId);

  if (stats.loading || stats.totalCompleted30d === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mx-4 mt-3 ${GLASS_NESTED} p-4`}
      style={stats.streak >= 3 ? {
        borderColor: 'rgba(16,185,129,0.15)',
        boxShadow: '0 0 12px rgba(16,185,129,0.08)',
      } : undefined}
    >
      <div className="flex items-center justify-between">
        {stats.streak > 0 && (
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-300">{stats.streak} day streak</span>
          </div>
        )}
        <div className="flex items-center gap-4 ml-auto text-[10px] text-white/30">
          <div>
            <span className="text-white/60 font-semibold">{stats.thisWeekCompleted}</span> this week
          </div>
          {stats.bestDayCount > 0 && (
            <div>
              Best: <span className="text-white/60 font-semibold">{stats.bestDayCount}</span> in a day
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Progress Header
// ═══════════════════════════════════════════════════════════════

function ProgressHeader({ completed, total, inProgress, workerName }: {
  completed: number; total: number; inProgress: number; workerName: string;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round((inProgress / total) * 100) : 0;
  const allDone = pct === 100 && total > 0;

  return (
    <div className="px-5 pt-5 pb-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-lg font-semibold text-white/80">{timeGreeting()}, {workerName}</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="text-right">
          <span className={`text-3xl font-bold tabular-nums ${allDone ? 'text-emerald-400' : 'text-white'}`}>{pct}%</span>
          <p className="text-[10px] text-white/30">{completed}/{total} done</p>
        </div>
      </div>
      <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden flex">
        <div
          className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
        <div
          className="h-full bg-sky-500/60 transition-all duration-500"
          style={{ width: `${inProgressPct}%` }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Room Context Card — shown at top of each room group
// ═══════════════════════════════════════════════════════════════

function RoomContextCard({ roomCode, roomType, dayCount, totalDays, plantCount, strainCount, harvestDays }: {
  roomCode: string;
  roomType: string;
  dayCount: number | null;
  totalDays: number;
  plantCount: number;
  strainCount: number;
  harvestDays: number | null;
}) {
  const stageColor = STAGE_COLORS[roomType] ?? STAGE_COLORS.mixed;
  const emoji = roomType === 'flower' ? '🌸' : roomType === 'veg' ? '🌱' : roomType === 'clone' ? '🧬' : '🌿';

  return (
    <div
      className={`mx-5 mb-2 ${GLASS_NESTED} px-3 py-2.5 flex items-center gap-3`}
      style={{ borderLeftWidth: 2, borderLeftColor: `${stageColor}50` }}
    >
      <span className="text-sm">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">{roomCode}</span>
          <span className="text-[10px] text-white/20 uppercase">{roomType}</span>
          {dayCount != null && (
            <span className="text-[10px] text-white/30 font-mono">Day {dayCount}/{totalDays}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[9px] text-white/25">
          <span>{plantCount} plants</span>
          <span>{strainCount} strains</span>
          {harvestDays != null && harvestDays > 0 && (
            <span>Harvest in {harvestDays}d</span>
          )}
          {harvestDays != null && harvestDays <= 0 && (
            <span className="text-amber-400/60">Harvest due</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Task Row — glass styled with inline feed preview
// ═══════════════════════════════════════════════════════════════

function TaskRow({ task, roomName, feedPreview, onTap, onStart, onComplete }: {
  task: TaskCardData;
  roomName: string;
  feedPreview?: { ec: number; phMin: number; phMax: number; products: string } | null;
  onTap: () => void;
  onStart: () => void;
  onComplete: () => void;
}) {
  const config = getTaskTypeConfig(task.task_type);
  const StatusIcon = STATUS_ICONS[task.status] ?? Circle;
  const statusColor = STATUS_COLORS[task.status] ?? 'text-white/30';
  const iconName = (config as Record<string, unknown>).icon as string | undefined;
  const TaskIcon = iconName ? ICON_MAP[iconName] ?? Wrench : Wrench;

  const isPending = task.status === 'pending' || task.status === 'carry_forward';
  const isInProgress = task.status === 'in_progress';
  const isDone = task.status === 'completed' || task.status === 'skipped';
  const isFeed = task.task_type === 'batch_tank_mix' || task.task_type === 'feeding';

  return (
    <div className={`border-b border-white/[0.04] ${isDone ? 'opacity-30' : ''}`}>
      {/* Main row */}
      <button
        onClick={onTap}
        className="w-full flex items-center gap-3 px-5 py-4 text-left active:bg-white/[0.03] transition-colors min-h-[64px]"
      >
        <StatusIcon className={`w-6 h-6 flex-shrink-0 ${statusColor}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg"
              style={{ backgroundColor: `${config.color}15`, color: `${config.color}cc` }}
            >
              <TaskIcon className="w-3 h-3" />
              {config.label}
            </span>
            {task.status === 'carry_forward' && (
              <span className="text-[10px] text-amber-400 font-semibold">CARRIED</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-white/40 font-mono">{roomName}</span>
            {task.estimated_duration && (
              <span className="flex items-center gap-0.5 text-[10px] text-white/25">
                <Clock className="w-3 h-3" />
                {task.estimated_duration}
              </span>
            )}
          </div>

          {/* Inline feed preview */}
          {isFeed && feedPreview && !isDone && (
            <div className="mt-1.5 text-[10px] text-white/25 space-y-0.5">
              <div>EC {feedPreview.ec} · pH {feedPreview.phMin}–{feedPreview.phMax}</div>
              <div className="truncate">{feedPreview.products}</div>
            </div>
          )}

          {task.notes && !isFeed && (
            <p className="text-[10px] text-white/20 mt-1 truncate">{task.notes}</p>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-white/15 flex-shrink-0" />
      </button>

      {/* Action buttons */}
      {(isPending || isInProgress) && (
        <div className="flex items-center gap-2 px-5 pb-3 -mt-1">
          {isPending && (
            <button
              onClick={(e) => { e.stopPropagation(); onStart(); }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-xl bg-sky-500/15 text-sky-300 border border-sky-500/20 active:scale-95 transition-all duration-200 min-h-[44px]"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          )}
          {isInProgress && (
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 active:scale-95 transition-all duration-200 min-h-[44px]"
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

// ═══════════════════════════════════════════════════════════════
// Room Group — collapsible with context card
// ═══════════════════════════════════════════════════════════════

function RoomGroup({
  roomCode,
  roomType,
  tasks,
  workerId,
  roomState,
  feedPreview,
  onTapTask,
  onStartTask,
  onCompleteTask,
}: {
  roomCode: string;
  roomType: string;
  tasks: TaskCardData[];
  workerId: string | null;
  roomState?: { dayCount: number | null; totalDays: number; plantCount: number; strainCount: number; harvestDays: number | null };
  feedPreview?: { ec: number; phMin: number; phMax: number; products: string } | null;
  onTapTask: (task: TaskCardData) => void;
  onStartTask: (taskId: string) => void;
  onCompleteTask: (task: TaskCardData) => void;
}) {
  const storageKey = `cult-room-collapsed-${workerId ?? 'anon'}-${roomCode}`;
  const [collapsed, setCollapsed] = useState(() => {
    try { return sessionStorage.getItem(storageKey) === '1'; } catch { return false; }
  });
  const doneCount = tasks.filter((t) => t.status === 'completed').length;
  const allDone = doneCount === tasks.length;
  const stageColor = STAGE_COLORS[roomType] ?? STAGE_COLORS.mixed;

  return (
    <div className="mb-1">
      {/* Room header */}
      <button
        onClick={() => {
          const next = !collapsed;
          setCollapsed(next);
          try { sessionStorage.setItem(storageKey, next ? '1' : '0'); } catch { /* noop */ }
        }}
        className="w-full flex items-center justify-between px-5 py-3 active:bg-white/[0.03] transition-colors min-h-[48px]"
        style={{ borderLeftWidth: 3, borderLeftColor: allDone ? '#10B98140' : `${stageColor}40` }}
      >
        <div className="flex items-center gap-2">
          <ChevronDown className={`w-4 h-4 text-white/25 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
          <span className="text-xs font-bold text-white/60 uppercase tracking-wider font-mono">{roomCode}</span>
        </div>
        <span className={`text-xs font-semibold ${allDone ? 'text-emerald-400' : 'text-white/30'}`}>
          {allDone ? '✓' : `${doneCount}/${tasks.length}`}
        </span>
      </button>

      {/* Room content */}
      {!collapsed && (
        <>
          {/* Room context card */}
          {roomState && (
            <RoomContextCard
              roomCode={roomCode}
              roomType={roomType}
              dayCount={roomState.dayCount}
              totalDays={roomState.totalDays}
              plantCount={roomState.plantCount}
              strainCount={roomState.strainCount}
              harvestDays={roomState.harvestDays}
            />
          )}

          {/* Tasks */}
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              roomName={roomCode}
              feedPreview={feedPreview}
              onTap={() => onTapTask(task)}
              onStart={() => onStartTask(task.id)}
              onComplete={() => onCompleteTask(task)}
            />
          ))}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Quick Observation Sheet
// ═══════════════════════════════════════════════════════════════

const OBS_CATEGORIES = ['observation', 'issue', 'environmental'] as const;

function QuickObservationSheet({ roomCodes, workerId, onClose }: {
  roomCodes: string[];
  workerId: string;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [roomCode, setRoomCode] = useState(roomCodes[0] ?? '');
  const [category, setCategory] = useState<string>('observation');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await supabase.from('daily_log_annotations').insert({
        annotation_date: todayIso(),
        room_code: roomCode || null,
        category,
        severity: 'info',
        content: text.trim(),
        created_by: workerId,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col justify-end"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative rounded-t-2xl border-t border-white/[0.1] bg-white/[0.07] backdrop-blur-[40px] p-5 space-y-4 pb-8"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/80">Add Observation</h3>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        {/* Room selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {roomCodes.map(code => (
            <button
              key={code}
              type="button"
              onClick={() => setRoomCode(code)}
              className={`px-3 py-1.5 text-[10px] font-mono rounded-lg whitespace-nowrap transition-all active:scale-95 ${
                roomCode === code
                  ? 'bg-white/10 text-white/70 border border-white/15'
                  : 'text-white/30 border border-transparent hover:bg-white/5'
              }`}
            >
              {code}
            </button>
          ))}
        </div>

        {/* Category pills */}
        <div className="flex gap-1.5">
          {OBS_CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-wider rounded-lg transition-all active:scale-95 ${
                category === cat
                  ? 'bg-white/10 text-white/70 border border-white/15'
                  : 'text-white/25 border border-transparent hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Text input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What did you notice?"
          rows={3}
          className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 resize-none"
        />

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !text.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 text-sm font-medium active:scale-[0.98] transition-all duration-200 disabled:opacity-30"
        >
          <Send className="w-4 h-4" />
          {saving ? 'Saving...' : 'Submit'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

const CYCLE_DEFAULTS: Record<string, number> = { flower: 63, veg: 42, clone: 21, mother: 42, mixed: 42 };

export function WorkerTaskView() {
  const [workerId, setWorkerId] = useState<string | null>(() => {
    try { return sessionStorage.getItem('cult-worker-id'); } catch { return null; }
  });
  const [completingTask, setCompletingTask] = useState<{ task: TaskCardData; roomId: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine'>('mine');
  const [showObservation, setShowObservation] = useState(false);

  const date = todayIso();
  const { rooms: dbRooms } = useGrowRooms();
  const { tasks: dbTasks, completeWithLog, updateStatus, refetch: refetchTasks } = useDailyTasks(date);
  const { staff: activeStaff } = useActiveStaff();
  const { rooms: opsRooms } = useRoomOperationalState();

  const rooms = useMemo(() =>
    dbRooms.map((r) => ({ id: r.id, name: r.name, room_type: r.room_type, room_code: r.room_code })),
    [dbRooms]
  );

  const CULTIVATION_ROLES = useMemo(() => new Set(['cultivation_manager', 'cultivation_lead', 'cultivator', 'manager', 'operations', 'operations_manager']), []);
  const cultStaff = useMemo(() =>
    activeStaff.filter((s) => CULTIVATION_ROLES.has(s.role ?? '')).map((s) => ({ id: s.id, first_name: s.first_name })),
    [activeStaff, CULTIVATION_ROLES]
  );

  const workerName = useMemo(() => {
    const w = cultStaff.find((s) => s.id === workerId);
    return w?.first_name ?? 'Worker';
  }, [cultStaff, workerId]);

  useEffect(() => {
    try {
      if (workerId) sessionStorage.setItem('cult-worker-id', workerId);
      else sessionStorage.removeItem('cult-worker-id');
    } catch { /* SSR safe */ }
  }, [workerId]);

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

  const visibleTasks = useMemo(() => {
    if (filter === 'mine' && workerId) {
      return allTasks.filter((t) => t.assigned_to === workerId);
    }
    return allTasks;
  }, [allTasks, filter, workerId]);

  // Group by room with room metadata
  const tasksByRoom = useMemo(() => {
    const map = new Map<string, { tasks: TaskCardData[]; roomType: string; roomId: string }>();
    for (const t of visibleTasks) {
      const existing = map.get(t.room_name);
      if (existing) {
        existing.tasks.push(t);
      } else {
        const room = rooms.find(r => r.room_code === t.room_name);
        map.set(t.room_name, { tasks: [t], roomType: room?.room_type ?? 'mixed', roomId: room?.id ?? '' });
      }
    }
    const statusOrder: Record<string, number> = { carry_forward: 0, pending: 1, in_progress: 2, completed: 3, skipped: 4 };
    for (const [, entry] of map) {
      entry.tasks.sort((a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5));
    }
    return map;
  }, [visibleTasks, rooms]);

  // Room operational state lookup
  const roomStateMap = useMemo(() => {
    const map = new Map<string, { dayCount: number | null; totalDays: number; plantCount: number; strainCount: number; harvestDays: number | null }>();
    for (const r of opsRooms) {
      const dayCount = r.room_type === 'flower' ? r.days_since_flip : r.days_in_stage;
      map.set(r.room_code, {
        dayCount,
        totalDays: CYCLE_DEFAULTS[r.room_type] ?? 42,
        plantCount: r.total_plants,
        strainCount: r.strain_count,
        harvestDays: r.section_days_to_harvest ?? r.days_to_harvest,
      });
    }
    return map;
  }, [opsRooms]);

  const roomCodes = useMemo(() => [...tasksByRoom.keys()], [tasksByRoom]);
  const completedCount = visibleTasks.filter((t) => t.status === 'completed').length;
  const inProgressCount = visibleTasks.filter((t) => t.status === 'in_progress').length;
  const totalCount = visibleTasks.length;

  // Actions
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
  }, [handleOpenComplete]);

  // Worker selector
  if (!workerId) {
    return <WorkerSelector staff={cultStaff} onSelect={setWorkerId} />;
  }

  // Completion form overlay
  if (completingTask) {
    return (
      <div className={`min-h-screen ${PAGE_BG}`}>
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

  // Main task list
  return (
    <div className={`min-h-screen ${PAGE_BG} flex flex-col`}>
      {/* Sticky header */}
      <div className="bg-[#0a0f0a]/90 backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-10">
        <ProgressHeader
          completed={completedCount}
          total={totalCount}
          inProgress={inProgressCount}
          workerName={workerName}
        />

        {/* Filter toggle */}
        <div className="flex items-center gap-1.5 px-5 pb-3">
          {(['mine', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all duration-200 min-h-[40px] active:scale-95 ${
                filter === f
                  ? 'bg-white/10 text-white/70 border border-white/15'
                  : 'text-white/30 border border-transparent hover:bg-white/5'
              }`}
            >
              {f === 'mine' ? 'My Tasks' : 'All Tasks'}
            </button>
          ))}

          <button
            onClick={() => setWorkerId(null)}
            className="ml-auto flex items-center gap-1 px-2 py-2 text-[10px] text-white/20 active:text-white/40 transition-colors min-h-[40px]"
          >
            <User className="w-3 h-3" />
            Switch
          </button>
        </div>
      </div>

      {/* Personal stats */}
      {workerId && <PersonalStatsCard workerId={workerId} />}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto pb-24">
        {tasksByRoom.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className={`${GLASS_CARD} p-8 w-full max-w-xs`}>
              {filter === 'mine' ? (
                <>
                  <CheckCircle2 className="w-10 h-10 text-emerald-400/20 mx-auto mb-4" />
                  <p className="text-sm text-white/50 font-medium">No tasks assigned to you</p>
                  <p className="text-[10px] text-white/25 mt-2">
                    Check with your manager or tap "All Tasks" to see what's on the board.
                  </p>
                </>
              ) : (
                <>
                  <Circle className="w-10 h-10 text-white/10 mx-auto mb-4" />
                  <p className="text-sm text-white/50 font-medium">No tasks today</p>
                  <p className="text-[10px] text-white/25 mt-2">Tasks generate from room schedules.</p>
                </>
              )}
            </div>
          </div>
        ) : (
          Array.from(tasksByRoom.entries()).map(([roomCode, { tasks: roomTasks, roomType }]) => (
            <RoomGroup
              key={roomCode}
              roomCode={roomCode}
              roomType={roomType}
              tasks={roomTasks}
              workerId={workerId}
              roomState={roomStateMap.get(roomCode)}
              feedPreview={null}
              onTapTask={handleTapTask}
              onStartTask={handleStart}
              onCompleteTask={handleOpenComplete}
            />
          ))
        )}

        {/* All done celebration */}
        {totalCount > 0 && completedCount === totalCount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-12 px-6 text-center"
          >
            <div
              className={`${GLASS_CARD} p-8 w-full max-w-xs`}
              style={{ borderColor: 'rgba(16,185,129,0.2)', boxShadow: '0 0 24px rgba(16,185,129,0.1)' }}
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-emerald-400">All done!</p>
              <p className="text-sm text-white/40 mt-1">Great work today, {workerName}.</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Floating observation button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3 }}
        type="button"
        onClick={() => setShowObservation(true)}
        className={`fixed bottom-6 right-6 ${GLASS} px-4 py-3 flex items-center gap-2 active:scale-95 transition-all duration-200 z-30`}
      >
        <PenLine className="w-4 h-4 text-white/50" />
        <span className="text-xs text-white/50 font-medium">Add Note</span>
      </motion.button>

      {/* Observation sheet */}
      <AnimatePresence>
        {showObservation && (
          <QuickObservationSheet
            roomCodes={roomCodes}
            workerId={workerId}
            onClose={() => setShowObservation(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
