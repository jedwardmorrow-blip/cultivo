import { useState, useMemo } from 'react';
import { CheckCircle, Circle, Clock, AlertTriangle } from 'lucide-react';
import { useWorkerAuth } from '../hooks/useWorkerAuth';
import { useDailyTasks } from '../../cultivation/hooks/useDailyTasks';
import { TASK_TYPE_CONFIG } from '../../cultivation/types';
import { TaskCompletionForm } from '../../cultivation/components/TaskCompletionForm';
import { todayIso } from '@/shared/utils/format';
import type { DailyTaskInstance, TaskType } from '../../cultivation/types';

export function MyTasksView() {
  const { staff } = useWorkerAuth();
  const { tasks, loading, error, updateStatus, completeWithLog, refetch } = useDailyTasks(todayIso());
  const [selectedTask, setSelectedTask] = useState<DailyTaskInstance | null>(null);

  const myTasks = useMemo(() => {
    if (!staff) return [];
    return tasks.filter((t) => t.assigned_to === staff.id);
  }, [tasks, staff]);

  const pendingTasks = myTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'carry_forward');
  const doneTasks = myTasks.filter((t) => t.status === 'completed' || t.status === 'skipped');

  const totalCount = myTasks.length;
  const doneCount = doneTasks.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  async function handleComplete(task: DailyTaskInstance) {
    await updateStatus(task.id, 'completed');
    setSelectedTask(null);
  }

  function handleTaskTap(task: DailyTaskInstance) {
    if (task.status === 'completed' || task.status === 'skipped') return;
    setSelectedTask(task);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-cult-medium-gray text-sm uppercase tracking-wider">Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-sm p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress header */}
      <div className="px-4 py-4 border-b border-cult-dark-gray bg-cult-near-black">
        <div className="flex items-center justify-between mb-2">
          <span className="text-cult-white text-sm font-semibold uppercase tracking-wider">
            Today's Tasks
          </span>
          <span className="text-cult-medium-gray text-xs">
            {doneCount} of {totalCount} done
          </span>
        </div>
        <div className="w-full h-2 bg-cult-black rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress === 100 ? 'bg-green-500' : 'bg-cult-white'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress === 100 && totalCount > 0 && (
          <p className="text-green-400 text-xs mt-2 text-center uppercase tracking-wider font-semibold">
            All tasks complete
          </p>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Circle className="w-12 h-12 text-cult-dark-gray mb-3" />
            <p className="text-cult-medium-gray text-sm">No tasks assigned to you today.</p>
            <p className="text-cult-dark-gray text-xs mt-1">Check with your manager for assignments.</p>
          </div>
        ) : (
          <div className="divide-y divide-cult-dark-gray">
            {/* Pending / in-progress tasks first */}
            {pendingTasks.map((task) => (
              <WorkerTaskRow key={task.id} task={task} onTap={() => handleTaskTap(task)} />
            ))}

            {/* Completed tasks */}
            {doneTasks.map((task) => (
              <WorkerTaskRow key={task.id} task={task} onTap={() => {}} />
            ))}
          </div>
        )}
      </div>

      {/* Task completion bottom sheet */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div
            className="flex-shrink-0 bg-black/60"
            style={{ height: '10vh' }}
            onClick={() => setSelectedTask(null)}
          />
          {/* Sheet */}
          <div className="flex-1 bg-cult-black border-t border-cult-medium-gray overflow-y-auto">
            <div className="px-4 py-3 border-b border-cult-dark-gray flex items-center justify-between sticky top-0 bg-cult-black z-10">
              <div>
                <span
                  className="inline-flex px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-sm"
                  style={{
                    backgroundColor: `${(TASK_TYPE_CONFIG[selectedTask.task_type as TaskType] ?? TASK_TYPE_CONFIG.custom).color}20`,
                    color: (TASK_TYPE_CONFIG[selectedTask.task_type as TaskType] ?? TASK_TYPE_CONFIG.custom).color,
                  }}
                >
                  {(TASK_TYPE_CONFIG[selectedTask.task_type as TaskType] ?? TASK_TYPE_CONFIG.custom).label}
                </span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-cult-medium-gray hover:text-cult-white text-sm uppercase tracking-wider"
              >
                Close
              </button>
            </div>
            <div className="p-4">
              <TaskCompletionForm
                taskInstance={selectedTask}
                onComplete={() => { refetch(); setSelectedTask(null); }}
                onCancel={() => setSelectedTask(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface WorkerTaskRowProps {
  task: DailyTaskInstance;
  onTap: () => void;
}

function WorkerTaskRow({ task, onTap }: WorkerTaskRowProps) {
  const config = TASK_TYPE_CONFIG[task.task_type as TaskType] ?? TASK_TYPE_CONFIG.custom;
  const isDone = task.status === 'completed' || task.status === 'skipped';
  const isCarried = task.status === 'carry_forward';

  // Look up room name from room_id — we just show the ID prefix for now
  // In production, this would join to grow_rooms
  const roomDisplay = task.room_id ? task.room_id.slice(0, 8) : '—';

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={isDone}
      className={`w-full text-left px-4 py-4 flex items-center gap-3 transition-colors ${
        isDone
          ? 'opacity-50'
          : isCarried
            ? 'border-l-2 border-l-amber-600 active:bg-cult-near-black'
            : 'active:bg-cult-near-black'
      }`}
    >
      {/* Status icon */}
      <div className="flex-shrink-0">
        {isDone ? (
          <CheckCircle className="w-6 h-6 text-green-500" />
        ) : task.status === 'in_progress' ? (
          <Clock className="w-6 h-6 text-sky-400" />
        ) : (
          <Circle className="w-6 h-6 text-cult-medium-gray" />
        )}
      </div>

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-sm flex-shrink-0"
            style={{ backgroundColor: `${config.color}20`, color: config.color }}
          >
            {config.label}
          </span>
          {task.notes && (
            <span className="text-cult-light-gray text-xs truncate">{task.notes}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {task.estimated_duration && (
            <span className="text-cult-medium-gray text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.estimated_duration}
            </span>
          )}
          {isDone && task.completed_at && (
            <span className="text-green-600 text-xs">
              Done {new Date(task.completed_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Tap arrow for pending tasks */}
      {!isDone && (
        <div className="flex-shrink-0 text-cult-dark-gray">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </button>
  );
}
