import { Clock, ArrowRight } from 'lucide-react';
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

interface TaskCardProps {
  task: TaskCardData;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const config = TASK_TYPE_CONFIG[task.task_type] ?? TASK_TYPE_CONFIG.custom;
  const statusStyle = STATUS_STYLES[task.status] ?? STATUS_STYLES.pending;
  const isCarried = task.status === 'carry_forward';
  const isMultiDay = task.scope === 'multi_day' && task.progress_total && task.progress_total > 1;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-cult-near-black border border-cult-dark-gray hover:border-cult-medium-gray transition-colors p-3 group ${
        isCarried ? 'border-l-2 border-l-amber-600' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-sm flex-shrink-0"
            style={{ backgroundColor: `${config.color}20`, color: config.color }}
          >
            {config.label}
          </span>
          <span className="font-mono text-xs font-bold text-cult-white truncate">
            {task.room_name}
          </span>
        </div>

        <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-sm flex-shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
          {statusStyle.label}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-2 text-xs text-cult-light-gray">
        {task.assigned_to_name && (
          <span className="flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-cult-charcoal flex items-center justify-center text-[10px] font-bold text-cult-white flex-shrink-0">
              {task.assigned_to_name.charAt(0)}
            </span>
            {task.assigned_to_name}
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

      {isCarried && task.notes && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-400">
          <ArrowRight className="w-3 h-3" />
          {task.notes}
        </div>
      )}
    </button>
  );
}
