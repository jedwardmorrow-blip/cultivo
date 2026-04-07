import { useState, useMemo } from 'react';
import {
  Sprout, ChevronRight, ChevronDown, ClipboardList,
  Scissors, AlertTriangle, Calendar, Users, Droplets,
  X, CheckCircle2, Clock, Leaf,
} from 'lucide-react';
import { useRoomOperationalState, type RoomOperationalState } from '../hooks/useRoomOperationalState';
import { useDailyTasks } from '../hooks/useDailyTasks';
import { useGrowRooms } from '../hooks/useGrowRooms';
import { useFeedProgramRecipe } from '../hooks/useFeedProgramRecipe';
import { getTaskTypeConfig } from '../types';
import type { DailyTaskInstance, TaskType } from '../types';
import { ROOM_TYPE_LEFT_BORDER, ROOM_TYPE_TEXT } from '../constants/stageColors';
import { todayIso } from '../utils/dateUtils';

// ═══════════════════════════════════════════════════════════════
// Room Row — compact room summary, click to expand
// ═══════════════════════════════════════════════════════════════

function RoomRow({ state, isOpen, onToggle, tasks }: {
  state: RoomOperationalState;
  isOpen: boolean;
  onToggle: () => void;
  tasks: DailyTaskInstance[];
}) {
  const isEmpty = state.occupancy_status === 'empty';
  const borderCls = ROOM_TYPE_LEFT_BORDER[state.room_type] ?? ROOM_TYPE_LEFT_BORDER.mixed;
  const typeTextCls = ROOM_TYPE_TEXT[state.room_type] ?? ROOM_TYPE_TEXT.mixed;

  const roomTasks = tasks.filter(t => t.room_id === state.room_id);
  const doneTasks = roomTasks.filter(t => t.status === 'completed').length;
  const totalTasks = roomTasks.length;

  const dayCount = state.room_type === 'flower' ? state.days_since_flip : state.days_in_stage;
  const harvestDays = state.section_days_to_harvest ?? state.days_to_harvest;

  let urgencyDot = '';
  if (state.urgency_score === 3) urgencyDot = 'bg-red-500';
  else if (state.urgency_score === 2) urgencyDot = 'bg-amber-500';
  else if (state.urgency_score === 1) urgencyDot = 'bg-yellow-500';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full text-left border-l-4 ${borderCls} ${
        isOpen ? 'bg-cult-charcoal/60' : 'bg-cult-near-black hover:bg-cult-charcoal/30'
      } border-b border-cult-dark-gray/50 transition-colors`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Expand chevron */}
        {isOpen
          ? <ChevronDown className="w-3.5 h-3.5 text-cult-medium-gray flex-shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-cult-medium-gray flex-shrink-0" />
        }

        {/* Urgency dot */}
        {urgencyDot && <div className={`w-2 h-2 rounded-full ${urgencyDot} flex-shrink-0`} />}

        {/* Room code */}
        <span className="font-mono text-sm font-bold text-cult-white w-16 flex-shrink-0">{state.room_code}</span>

        {/* Type badge */}
        <span className={`text-[10px] px-1.5 py-0.5 uppercase tracking-wider font-bold border flex-shrink-0 ${
          isEmpty ? 'border-cult-dark-gray text-cult-medium-gray' : typeTextCls
        }`}>
          {isEmpty ? 'Empty' : state.room_type}
        </span>

        {/* Plants + strains */}
        {!isEmpty && (
          <span className="text-xs text-cult-lighter-gray flex-shrink-0">
            {state.total_plants}p · {state.strain_count}s
          </span>
        )}

        {/* Day counter */}
        {dayCount != null && (
          <span className="text-xs text-cult-medium-gray flex-shrink-0">Day {dayCount}</span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Harvest countdown */}
        {state.room_type === 'flower' && harvestDays != null && (
          <span className={`text-xs font-medium flex-shrink-0 ${
            harvestDays <= 0 ? 'text-red-400' : harvestDays <= 7 ? 'text-amber-400' : 'text-cult-medium-gray'
          }`}>
            {harvestDays <= 0 ? `${Math.abs(harvestDays)}d overdue` : `${harvestDays}d to harvest`}
          </span>
        )}

        {/* Task progress */}
        {totalTasks > 0 && (
          <span className={`text-xs flex-shrink-0 font-mono ${
            doneTasks === totalTasks ? 'text-emerald-400' : 'text-cult-medium-gray'
          }`}>
            {doneTasks}/{totalTasks}
          </span>
        )}

        {/* Strains preview */}
        {!isEmpty && state.strain_names && state.strain_names.length > 0 && (
          <span className="text-[10px] text-cult-text-faint truncate max-w-[200px] hidden lg:inline">
            {state.strain_names.slice(0, 3).join(', ')}{state.strain_names.length > 3 ? ` +${state.strain_names.length - 3}` : ''}
          </span>
        )}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// Room Panel — expanded operational view with tabs
// ═══════════════════════════════════════════════════════════════

type PanelTab = 'status' | 'tasks' | 'feed';

function RoomPanel({ state, tasks, onUpdateTaskStatus }: {
  state: RoomOperationalState;
  tasks: DailyTaskInstance[];
  onUpdateTaskStatus: (taskId: string, status: string) => void;
}) {
  const [tab, setTab] = useState<PanelTab>('tasks');
  const roomTasks = useMemo(() => tasks.filter(t => t.room_id === state.room_id), [tasks, state.room_id]);

  const tabs: { key: PanelTab; label: string; icon: typeof ClipboardList; count?: number }[] = [
    { key: 'tasks', label: 'Tasks', icon: ClipboardList, count: roomTasks.length },
    { key: 'status', label: 'Status', icon: Leaf },
    { key: 'feed', label: 'Feed', icon: Droplets },
  ];

  return (
    <div className="bg-cult-charcoal/30 border-b border-cult-dark-gray/50 border-l-4 border-l-transparent">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 pt-2 border-b border-cult-dark-gray/30">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-cult-accent text-cult-white'
                : 'border-transparent text-cult-medium-gray hover:text-cult-lighter-gray'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
            {count != null && count > 0 && (
              <span className="text-[10px] bg-cult-dark-gray px-1 rounded">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 py-3 max-h-[400px] overflow-y-auto">
        {tab === 'tasks' && <TasksPanel tasks={roomTasks} onUpdateStatus={onUpdateTaskStatus} />}
        {tab === 'status' && <StatusPanel state={state} />}
        {tab === 'feed' && <FeedPanel state={state} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tasks Panel
// ═══════════════════════════════════════════════════════════════

function TasksPanel({ tasks, onUpdateStatus }: {
  tasks: DailyTaskInstance[];
  onUpdateStatus: (taskId: string, status: string) => void;
}) {
  const sorted = useMemo(() => {
    const order: Record<string, number> = { in_progress: 0, pending: 1, completed: 2, skipped: 3 };
    return [...tasks].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  }, [tasks]);

  if (sorted.length === 0) {
    return <p className="text-xs text-cult-text-faint py-4 text-center">No tasks scheduled for this room today.</p>;
  }

  return (
    <div className="space-y-1">
      {sorted.map(task => (
        <TaskRow key={task.id} task={task} onUpdateStatus={onUpdateStatus} />
      ))}
    </div>
  );
}

function TaskRow({ task, onUpdateStatus }: {
  task: DailyTaskInstance;
  onUpdateStatus: (taskId: string, status: string) => void;
}) {
  const config = getTaskTypeConfig(task.task_type);
  const statusStyles: Record<string, string> = {
    completed: 'text-emerald-400',
    in_progress: 'text-amber-400',
    pending: 'text-cult-text-muted',
    skipped: 'text-cult-text-faint line-through',
  };

  return (
    <div className="flex items-center gap-3 py-2 px-2 rounded hover:bg-white/[0.03] group">
      {/* Status toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (task.status === 'pending') onUpdateStatus(task.id, 'in_progress');
          else if (task.status === 'in_progress') onUpdateStatus(task.id, 'completed');
        }}
        className="flex-shrink-0"
      >
        {task.status === 'completed' ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : task.status === 'in_progress' ? (
          <Clock className="w-4 h-4 text-amber-400" />
        ) : (
          <div className="w-4 h-4 rounded-full border border-cult-medium-gray group-hover:border-cult-accent transition-colors" />
        )}
      </button>

      {/* Task type indicator */}
      <div
        className="w-1.5 h-4 rounded-sm flex-shrink-0"
        style={{ backgroundColor: config.color }}
      />

      {/* Label */}
      <span className={`text-xs flex-1 ${statusStyles[task.status] ?? 'text-cult-lighter-gray'}`}>
        {config.label}
      </span>

      {/* Quick actions for pending */}
      {task.status === 'pending' && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onUpdateStatus(task.id, 'in_progress'); }}
          className="text-[10px] text-cult-accent opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Start
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Status Panel
// ═══════════════════════════════════════════════════════════════

function StatusPanel({ state }: { state: RoomOperationalState }) {
  const dayCount = state.room_type === 'flower' ? state.days_since_flip : state.days_in_stage;

  const stats: { label: string; value: string | number | null }[] = [
    { label: 'Plants', value: state.total_plants },
    { label: 'Strains', value: state.strain_count },
    { label: 'Day', value: dayCount },
    { label: 'Groups', value: state.plant_group_count },
  ];

  if (state.room_type === 'flower') {
    if (state.earliest_flip_date) stats.push({ label: 'Flipped', value: state.earliest_flip_date });
    if (state.section_projected_harvest) stats.push({ label: 'Harvest Date', value: state.section_projected_harvest });
    if (state.last_harvest_date) stats.push({ label: 'Last Harvest', value: state.last_harvest_date });
  }

  return (
    <div className="space-y-3">
      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-cult-near-black border border-cult-dark-gray/50 rounded p-2">
            <div className="text-[10px] text-cult-text-faint uppercase tracking-wider">{label}</div>
            <div className="text-sm font-semibold text-cult-white mt-0.5">{value ?? '—'}</div>
          </div>
        ))}
      </div>

      {/* Strains list */}
      {state.strain_names && state.strain_names.length > 0 && (
        <div>
          <div className="text-[10px] text-cult-text-faint uppercase tracking-wider mb-1.5">Strains</div>
          <div className="flex flex-wrap gap-1">
            {state.strain_names.map(s => (
              <span key={s} className="text-xs border border-cult-dark-gray text-cult-lighter-gray px-1.5 py-0.5 bg-cult-surface-overlay">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Feed Panel — current week's recipe
// ═══════════════════════════════════════════════════════════════

function FeedPanel({ state }: { state: RoomOperationalState }) {
  const stage = state.dominant_stage ?? state.room_type;
  const daysInStage = state.days_since_flip ?? state.days_in_stage ?? 0;
  const { recipe, loading } = useFeedProgramRecipe(stage, daysInStage);

  if (loading) return <p className="text-xs text-cult-text-faint py-4 text-center">Loading recipe...</p>;
  if (!recipe) return <p className="text-xs text-cult-text-faint py-4 text-center">No feed program configured for this stage.</p>;

  return (
    <div className="space-y-3">
      {/* Program header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-cult-white">{recipe.program_name}</span>
          <span className="text-[10px] text-cult-medium-gray ml-2">
            {recipe.phase} · Week {recipe.week_number}
          </span>
        </div>
        {recipe.targets.target_ec && (
          <span className="text-xs font-mono text-cult-accent">EC {recipe.targets.target_ec}</span>
        )}
      </div>

      {/* Targets row */}
      <div className="flex gap-3 text-[10px]">
        {recipe.targets.target_ppm_500 && (
          <span className="text-cult-lighter-gray">PPM 500: <span className="text-cult-white font-medium">{recipe.targets.target_ppm_500}</span></span>
        )}
        {recipe.targets.target_ph_min && recipe.targets.target_ph_max && (
          <span className="text-cult-lighter-gray">pH: <span className="text-cult-white font-medium">{recipe.targets.target_ph_min}–{recipe.targets.target_ph_max}</span></span>
        )}
      </div>

      {/* Recipe entries */}
      <div className="space-y-1">
        {recipe.entries.map((entry, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded bg-cult-near-black border border-cult-dark-gray/30">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-cult-text-faint w-4 text-right">{entry.mixing_order}</span>
              <span className="text-xs text-cult-lighter-gray">{entry.product.name}</span>
            </div>
            <span className="text-xs font-mono text-cult-white">
              {entry.ml_per_gal} {entry.product.unit}/gal
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Command Center
// ═══════════════════════════════════════════════════════════════

export function CommandCenter() {
  const { rooms: opsRooms, loading } = useRoomOperationalState();
  const today = todayIso();
  const { tasks, updateStatus } = useDailyTasks(today);

  const [openRoomId, setOpenRoomId] = useState<string | null>(null);

  // Group rooms by type
  const roomsByType = useMemo(() => {
    const typeOrder = ['flower', 'veg', 'clone', 'mother', 'mixed'];
    const groups = new Map<string, RoomOperationalState[]>();
    for (const room of opsRooms) {
      const type = room.room_type;
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type)!.push(room);
    }
    return typeOrder
      .filter(t => groups.has(t))
      .map(t => ({ type: t, rooms: groups.get(t)! }));
  }, [opsRooms]);

  // Summary stats
  const totalPlants = opsRooms.reduce((sum, r) => sum + r.total_plants, 0);
  const activeRooms = opsRooms.filter(r => r.total_plants > 0).length;
  const totalTasksToday = tasks.length;
  const completedToday = tasks.filter(t => t.status === 'completed').length;
  const urgentRooms = opsRooms.filter(r => r.urgency_score >= 2).length;

  function handleToggle(roomId: string) {
    setOpenRoomId(prev => prev === roomId ? null : roomId);
  }

  function handleUpdateTaskStatus(taskId: string, status: string) {
    updateStatus(taskId, status as DailyTaskInstance['status']);
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-cult-charcoal rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sprout className="w-6 h-6 text-cult-accent" />
          <div>
            <h1 className="text-lg font-semibold text-cult-white font-montserrat">Command Center</h1>
            <p className="text-[12px] text-cult-text-muted">{activeRooms} rooms · {totalPlants} plants · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-2">
          {urgentRooms > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-900/20 border border-red-500/30 rounded text-xs">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-red-300 font-medium">{urgentRooms} need attention</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cult-charcoal border border-cult-dark-gray rounded text-xs">
            <ClipboardList className="w-3 h-3 text-cult-accent" />
            <span className="text-cult-white font-medium">{completedToday}/{totalTasksToday}</span>
            <span className="text-cult-text-muted">tasks</span>
          </div>
        </div>
      </div>

      {/* Room list grouped by type */}
      {roomsByType.map(({ type, rooms }) => (
        <div key={type}>
          <div className="text-[10px] text-cult-text-faint uppercase tracking-wider font-medium px-4 py-1.5">
            {type} rooms
          </div>
          <div className="border border-cult-dark-gray/50 rounded overflow-hidden">
            {rooms.map(room => (
              <div key={room.room_id}>
                <RoomRow
                  state={room}
                  isOpen={openRoomId === room.room_id}
                  onToggle={() => handleToggle(room.room_id)}
                  tasks={tasks}
                />
                {openRoomId === room.room_id && (
                  <RoomPanel
                    state={room}
                    tasks={tasks}
                    onUpdateTaskStatus={handleUpdateTaskStatus}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
