import { memo, useState, useRef, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Clock, ArrowRight, UserPlus, ChevronDown, AlertTriangle, Play, CheckCircle2, SkipForward, FastForward } from 'lucide-react';
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
  assigned_to: string | null;
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
  is_present?: boolean;
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
  /** Callback to skip this task */
  onSkipTask?: (taskId: string) => void;
  /** Callback to carry this task forward to next day */
  onCarryForward?: (taskId: string) => void;
}

const SWIPE_THRESHOLD = 80; // px needed to trigger action
const SWIPE_MAX = 120; // max visual offset

export const TaskCard = memo(function TaskCard({ task, onClick, staffOptions, onQuickAssign, onStartTask, onSkipTask, onCarryForward }: TaskCardProps) {
  const config = TASK_TYPE_CONFIG[task.task_type] ?? TASK_TYPE_CONFIG.custom;
  const statusStyle = STATUS_STYLES[task.status] ?? STATUS_STYLES.pending;
  const isCarried = task.status === 'carry_forward';
  const isCompleted = task.status === 'completed';
  const isPending = task.status === 'pending' || task.status === 'carry_forward';
  const isInProgress = task.status === 'in_progress';
  const isUnassigned = !task.assigned_to_name;
  const isMultiDay = task.scope === 'multi_day' && task.progress_total && task.progress_total > 1;
  const [starting, setStarting] = useState(false);

  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  // Can swipe right to start (pending only), swipe left to open/complete (non-completed)
  const canSwipeRight = isPending && !!onStartTask && !starting;
  const canSwipeLeft = !isCompleted && !!onClick;

  const handlers = useSwipeable({
    onSwiping: (e) => {
      if (e.dir === 'Right' && canSwipeRight) {
        setSwiping(true);
        setSwipeX(Math.min(e.deltaX, SWIPE_MAX));
      } else if (e.dir === 'Left' && canSwipeLeft) {
        setSwiping(true);
        setSwipeX(Math.max(e.deltaX, -SWIPE_MAX));
      }
    },
    onSwipedRight: (e) => {
      if (canSwipeRight && e.deltaX >= SWIPE_THRESHOLD) {
        setStarting(true);
        onStartTask!(task.id);
      }
      setSwiping(false);
      setSwipeX(0);
    },
    onSwipedLeft: (e) => {
      if (canSwipeLeft && Math.abs(e.deltaX) >= SWIPE_THRESHOLD) {
        onClick!();
      }
      setSwiping(false);
      setSwipeX(0);
    },
    onSwiped: () => {
      setSwiping(false);
      setSwipeX(0);
    },
    trackMouse: false,
    trackTouch: true,
    delta: 15,
    preventScrollOnSwipe: true,
  });

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

  const swipeProgress = Math.abs(swipeX) / SWIPE_THRESHOLD;
  const isSwipeRight = swipeX > 0;
  const isSwipeTriggered = Math.abs(swipeX) >= SWIPE_THRESHOLD;

  return (
    <div className={`relative overflow-hidden ${isCompleted ? 'opacity-50' : ''}`} {...handlers}>
      {/* Swipe underlay — reveals behind the card as it slides */}
      {swiping && swipeX !== 0 && (
        <div
          className={`absolute inset-0 flex items-center ${
            isSwipeRight ? 'justify-start pl-4' : 'justify-end pr-4'
          } ${
            isSwipeRight
              ? isSwipeTriggered ? 'bg-sky-600' : 'bg-sky-950'
              : isSwipeTriggered ? 'bg-green-600' : 'bg-green-950'
          } transition-colors duration-150`}
        >
          {isSwipeRight ? (
            <div className="flex items-center gap-2 text-sky-100">
              <Play className="w-5 h-5" style={{ opacity: Math.min(1, swipeProgress) }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ opacity: Math.min(1, swipeProgress) }}>
                Start
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-100">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ opacity: Math.min(1, swipeProgress) }}>
                Open
              </span>
              <CheckCircle2 className="w-5 h-5" style={{ opacity: Math.min(1, swipeProgress) }} />
            </div>
          )}
        </div>
      )}

      {/* Card content — slides horizontally */}
      <div
        style={{
          transform: swiping ? `translateX(${swipeX}px)` : 'translateX(0)',
          transition: swiping ? 'none' : 'transform 0.2s ease-out',
        }}
        className="relative bg-cult-near-black"
      >
        <button
          type="button"
          onClick={onClick}
          className={`w-full text-left hover:bg-cult-charcoal/30 transition-colors px-2.5 sm:px-3 py-2 group ${
            isCarried ? 'border-l-2 border-l-amber-500 bg-amber-950/10' : ''
          }`}
        >
          {/* Single-row compact layout: type badge | assignment | status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-sm flex-shrink-0"
                style={{ backgroundColor: `${config.color}20`, color: config.color }}
              >
                {config.label}
              </span>

              {task.assigned_to_name ? (
                <span className="flex items-center gap-1 text-xs text-cult-light-gray min-w-0">
                  <span className="w-4 h-4 rounded-full bg-cult-charcoal flex items-center justify-center text-[10px] font-bold text-cult-white flex-shrink-0">
                    {task.assigned_to_name.charAt(0)}
                  </span>
                  <span className="truncate">{task.assigned_to_name}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400/80 text-xs">
                  <UserPlus className="w-3 h-3" />
                </span>
              )}

              {isCarried && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="font-medium hidden sm:inline">Carried</span>
                </span>
              )}

              {task.estimated_duration && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-cult-medium-gray">
                  <Clock className="w-3 h-3" />
                  {task.estimated_duration}
                </span>
              )}
            </div>

            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-sm flex-shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
          </div>

          {isMultiDay && task.progress_current != null && task.progress_total != null && (
            <div className="mt-1.5">
              <div className="flex items-center justify-between text-xs text-cult-light-gray mb-0.5">
                <span>{task.progress_current}/{task.progress_total} sections</span>
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
        </button>

        {/* Quick-start + skip/carry buttons — pending tasks */}
        {isPending && onStartTask && (
          <div className="absolute bottom-2 right-3 z-10 flex items-center gap-1">
            {onSkipTask && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSkipTask(task.id);
                }}
                className="flex items-center gap-1 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-900/60 border border-zinc-700/40 hover:bg-zinc-800 hover:border-zinc-600 rounded-md transition-colors min-h-[36px]"
                title="Skip this task"
              >
                <SkipForward className="w-3 h-3" />
                Skip
              </button>
            )}
            {onCarryForward && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCarryForward(task.id);
                }}
                className="flex items-center gap-1 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-amber-400/80 bg-amber-950/40 border border-amber-800/30 hover:bg-amber-950/70 hover:border-amber-700 rounded-md transition-colors min-h-[36px]"
                title="Carry forward to next day"
              >
                <FastForward className="w-3 h-3" />
                Defer
              </button>
            )}
            <button
              type="button"
              disabled={starting}
              onClick={(e) => {
                e.stopPropagation();
                setStarting(true);
                onStartTask(task.id);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-950/50 border border-sky-800/50 hover:bg-sky-950 hover:border-sky-700 active:bg-sky-900 rounded-md transition-colors disabled:opacity-50 min-h-[44px]"
            >
              <Play className="w-3.5 h-3.5" />
              {starting ? 'Starting...' : 'Start'}
            </button>
          </div>
        )}

        {/* Quick-assign button — only show when unassigned and staff options available */}
        {isUnassigned && !isCompleted && staffOptions && staffOptions.length > 0 && onQuickAssign && (
          <div ref={dropdownRef} className="absolute top-2 right-2 sm:right-20 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAssignDropdown((v) => !v);
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/50 border border-amber-800/50 hover:bg-amber-950 hover:border-amber-700 active:bg-amber-900 rounded-md transition-colors min-h-[44px]"
            >
              <UserPlus className="w-3 h-3" />
              Assign
            </button>

            {showAssignDropdown && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-cult-near-black border border-cult-medium-gray rounded-sm shadow-lg overflow-hidden animate-fade-in z-20 max-h-60 overflow-y-auto">
                {staffOptions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickAssign(task.id, s.id);
                      setShowAssignDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-3 text-sm hover:bg-cult-charcoal active:bg-cult-charcoal/80 transition-colors text-left min-h-[44px] ${
                      s.is_present === false ? 'text-cult-medium-gray' : 'text-cult-light-gray'
                    }`}
                  >
                    <span className="relative flex-shrink-0">
                      <span className="w-5 h-5 rounded-full bg-cult-charcoal flex items-center justify-center text-xs font-bold text-cult-white">
                        {s.first_name.charAt(0)}
                      </span>
                      {s.is_present && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 ring-1 ring-cult-near-black" />
                      )}
                    </span>
                    <span>{s.first_name}</span>
                    {s.is_present === false && (
                      <span className="text-xs text-cult-dark-gray ml-auto">Off</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
