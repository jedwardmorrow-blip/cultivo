import { memo, useState, useRef, useEffect } from 'react';
import { Clock, ArrowRight, UserPlus, ChevronDown, AlertTriangle, Play } from 'lucide-react';
import { TASK_TYPE_CONFIG } from '../types';
import type { TaskType, TaskStatus } from '../types';

const STATUS_STYLES: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-zinc-800', text: 'text-zinc-400', label: 'Pending' },
  in_progress: { bg: 'bg-sky-950', text: 'text-sky-400', label: 'In Progress' },
  completed: { bg: 'bg-green-950', text: 'text-green-400', label: 'Completed' },
  skipped: { bg: 'bg-zinc-800', text: 'text-zinc-500 line-through', label: 'Skipped' },
  carry_forward: { bg: 'bg-amber-950', text: 'text-amber-400', label: 'Carried' },
};

export interface TaskCardData {
  id: string;
  task_type: TaskType;
  room_name: string;
  assigned_to_name: string | null;
  status: TaskStatus;
  estimated_duration: string | null;
  notes: string | null;
  scope?: string;
  progress_current?: number;
  progress_total?: number;
  estimated_cost?: number;
}

export interface StaffOption {
  id: string;
  first_name: string;
}

interface TaskCardProps {
  task: TaskCardData;
  onClick?: () => void;
  /** Available staff for quick-assign dropdown */
  staffOptions?: StaffOption[];
  /** Callback when user quick-assigns a worker */
  onQuickAssign?: (taskId: string, staffId: string) => void;
  /** Callback to transition task to in_progress */
  onStartTask?: (taskId: string) => void;
}

export const TaskCard = memo(function TaskCard({ task, onClick, staffOptions, onQuickAssign, onStartTask }: TaskCardProps) {
  const config = TASK_TYPE_CONFIG[task.task_type] ?? TASK_TYPE_CONFIG.custom;
  const statusStyle = STATUS_STYLES[task.status] ?? STATUS_STYLES.pending;
  const isCarried = task.status === 'carry_forward';
  const isCompleted = task.status === 'completed';
  const isPending = task.status === 'pending' || task.status === 'carry_forward';
  const isUnassigned = !task.assigned_to_name;
  const isMultiDay = task.scope === 'multi_day' && task.progress_total && task.progress_total > 1;
  const [starting, setStarting] = useState(false);

  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAssignDropdown) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAssignDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAssignDropdown]);

  return (
    <div className={`relative ${isCompleted ? 'opacity-50' : ''}`}>
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left hover:bg-cult-charcoal/30 transition-colors p-3 group ${
          isCarried ? 'border-l-2 border-l-amber-500 bg-amber-950/10' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Task type icon dot */}
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: config.color }}
            />
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-sm flex-shrink-0"
              style={{ backgroundColor: `${config.color}20`, color: config.color }}
            >
              {config.label}
            </span>
          </div>

          <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-sm flex-shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-2 text-xs text-cult-light-gray">
          {task.assigned_to_name ? (
            <span className="flex items-center gap-1">
              <span className="w-5 h-5 rounded-full bg-cult-charcoal flex items-center justify-center text-[10px] font-bold text-cult-white flex-shrink-0">
                {task.assigned_to_name.charAt(0)}
              </span>
              {task.assigned_to_name}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400/80">
              <UserPlus className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Unassigned</span>
            </span>
          )}
          {task.estimated_duration && (
            <span className="flex items-center gap-1 text-cult-medium-gray">
              <Clock className="w-3 h-3" />
              {task.estimated_duration}
            </span>
          )}
          {task.estimated_cost != null && task.estimated_cost > 0 && (
            <span className="text-cult-medium-gray font-mono">
              ${task.estimated_cost.toFixed(0)}
            </span>
          )}
        </div>

        {isMultiDay && task.progress_current != null && task.progress_total != null && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-cult-light-gray mb-1">
              <span>{task.progress_current} of {task.progress_total} sections</span>
              <span>{Math.round((task.progress_current / task.progress_total) * 100)}%</span>
            </div>
            <div className="w-full h-1 bg-cult-charcoal rounded-full overflow-hidden">
              <div
                className="h-full bg-cult-green rounded-full transition-all"
                style={{ width: `${(task.progress_current / task.progress_total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {isCarried && (
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            <span className="font-medium">Carried from yesterday</span>
            {task.notes && <span className="text-amber-400/70 ml-1">— {task.notes}</span>}
          </div>
        )}
      </button>

      {/* Quick-start button — one tap to move pending → in_progress */}
      {isPending && onStartTask && (
        <div className="absolute bottom-2 right-3 z-10">
          <button
            type="button"
            disabled={starting}
            onClick={(e) => {
              e.stopPropagation();
              setStarting(true);
              onStartTask(task.id);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sky-400 bg-sky-950/50 border border-sky-800/50 hover:bg-sky-950 hover:border-sky-700 rounded-sm transition-colors disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            {starting ? 'Starting...' : 'Start'}
          </button>
        </div>
      )}

      {/* Quick-assign button — only show when unassigned and staff options available */}
      {isUnassigned && !isCompleted && staffOptions && staffOptions.length > 0 && onQuickAssign && (
        <div ref={dropdownRef} className="absolute top-2 right-20 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAssignDropdown((v) => !v);
            }}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/50 border border-amber-800/50 hover:bg-amber-950 hover:border-amber-700 rounded-sm transition-colors"
          >
            <UserPlus className="w-3 h-3" />
            Assign
          </button>

          {showAssignDropdown && (
            <div className="absolute top-full right-0 mt-1 w-36 bg-cult-near-black border border-cult-medium-gray rounded-sm shadow-lg overflow-hidden animate-fade-in z-20">
              {staffOptions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAssign(task.id, s.id);
                    setShowAssignDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-cult-light-gray hover:bg-cult-charcoal transition-colors text-left"
                >
                  <span className="w-5 h-5 rounded-full bg-cult-charcoal flex items-center justify-center text-[10px] font-bold text-cult-white flex-shrink-0">
                    {s.first_name.charAt(0)}
                  </span>
                  {s.first_name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
