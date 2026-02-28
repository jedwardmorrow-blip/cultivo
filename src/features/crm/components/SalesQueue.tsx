import { useState } from 'react';
import {
  ClipboardList,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  MapPin,
  Phone,
  Package,
  RefreshCw,
  ChevronRight,
  Timer,
} from 'lucide-react';
import { LoadingSpinner } from '@/shared/components';
import { useSalesQueue } from '../hooks';
import type { CRMTask, VisitSchedule, TaskType, VisitType } from '../types';
import { TaskCreateModal } from './TaskCreateModal';

interface SalesQueueProps {
  onViewChange: (view: string) => void;
}

const taskTypeIcons: Record<TaskType, typeof Phone> = {
  callback: Phone,
  visit_reminder: MapPin,
  sample_drop: Package,
  reorder_prompt: RefreshCw,
  general: ClipboardList,
};

const taskTypeLabels: Record<TaskType, string> = {
  callback: 'Callback',
  visit_reminder: 'Visit Reminder',
  sample_drop: 'Sample Drop',
  reorder_prompt: 'Reorder Prompt',
  general: 'General',
};

const priorityColors: Record<string, string> = {
  urgent: 'text-red-400 bg-red-500/15',
  high: 'text-orange-400 bg-orange-500/15',
  medium: 'text-amber-400 bg-amber-500/15',
  low: 'text-cult-silver bg-cult-dark-gray',
};

const visitTypeColors: Record<VisitType, string> = {
  check_in: 'text-teal-400 bg-teal-500/15',
  sample_drop: 'text-amber-400 bg-amber-500/15',
  new_pitch: 'text-sky-400 bg-sky-500/15',
  relationship: 'text-emerald-400 bg-emerald-500/15',
};

const visitTypeLabels: Record<VisitType, string> = {
  check_in: 'Check-in',
  sample_drop: 'Sample Drop',
  new_pitch: 'New Pitch',
  relationship: 'Relationship',
};

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

function TaskRow({
  task,
  isOverdue,
  onComplete,
  onSnooze,
  onCancel,
  onNavigate,
}: {
  task: CRMTask;
  isOverdue: boolean;
  onComplete: () => void;
  onSnooze: (days: number) => void;
  onCancel: () => void;
  onNavigate: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const Icon = taskTypeIcons[task.task_type] || ClipboardList;
  const overdueDays = isOverdue ? daysOverdue(task.due_date) : 0;

  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-cult-dark-gray/40 transition-colors group">
      <div className={`p-1.5 rounded flex-shrink-0 ${priorityColors[task.priority]}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onNavigate}
            className="text-sm font-medium text-cult-white hover:text-sky-400 transition-colors truncate"
          >
            {task.title}
          </button>
          <span className="text-[10px] text-cult-silver">{taskTypeLabels[task.task_type]}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-cult-silver">
          <span className="text-cult-light-gray">{task.customer_name}</span>
          {task.dispensary_code && (
            <span className="font-mono text-cult-medium-gray">{task.dispensary_code}</span>
          )}
          {isOverdue && (
            <span className="text-red-400 font-medium">{overdueDays}d overdue</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onComplete}
          className="p-1.5 text-cult-medium-gray hover:text-emerald-400 transition-colors"
          title="Complete"
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1.5 text-cult-medium-gray hover:text-cult-white transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showActions && (
            <div className="absolute right-0 top-8 z-20 bg-cult-near-black border border-cult-medium-gray rounded-lg shadow-xl py-1 w-40">
              <button
                onClick={() => { onSnooze(1); setShowActions(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-cult-light-gray hover:text-cult-white hover:bg-cult-dark-gray transition-colors"
              >
                Snooze 1 day
              </button>
              <button
                onClick={() => { onSnooze(3); setShowActions(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-cult-light-gray hover:text-cult-white hover:bg-cult-dark-gray transition-colors"
              >
                Snooze 3 days
              </button>
              <button
                onClick={() => { onSnooze(7); setShowActions(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-cult-light-gray hover:text-cult-white hover:bg-cult-dark-gray transition-colors"
              >
                Snooze 1 week
              </button>
              <div className="border-t border-cult-charcoal my-1" />
              <button
                onClick={() => { onCancel(); setShowActions(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Cancel task
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VisitRow({
  visit,
  onComplete,
  onNavigate,
}: {
  visit: VisitSchedule;
  onComplete: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-cult-dark-gray/40 transition-colors group">
      <div className={`p-1.5 rounded flex-shrink-0 ${visitTypeColors[visit.visit_type]}`}>
        <MapPin className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onNavigate}
            className="text-sm font-medium text-cult-white hover:text-sky-400 transition-colors truncate"
          >
            {visit.customer_name}
          </button>
          <span className={`px-1.5 py-0.5 text-[10px] rounded ${visitTypeColors[visit.visit_type]}`}>
            {visitTypeLabels[visit.visit_type]}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-cult-silver">
          {visit.visit_time_window && <span>{visit.visit_time_window}</span>}
          {visit.location_notes && <span className="truncate max-w-[200px]">{visit.location_notes}</span>}
        </div>
      </div>
      <button
        onClick={onComplete}
        className="p-1.5 text-cult-medium-gray hover:text-emerald-400 transition-colors flex-shrink-0"
        title="Complete visit"
      >
        <CheckCircle2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export function SalesQueue({ onViewChange }: SalesQueueProps) {
  const {
    overdueTasks,
    todayTasks,
    upcomingTasks,
    todayVisits,
    weekVisits,
    loading,
    reload,
    actions,
  } = useSalesQueue();

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [completingVisitId, setCompletingVisitId] = useState<string | null>(null);
  const [visitNotes, setVisitNotes] = useState('');

  const totalToday = todayTasks.length + todayVisits.length;
  const totalWeek = todayTasks.length + upcomingTasks.length + todayVisits.length + weekVisits.length;

  const navigateToAccount = (customerId: string) => {
    onViewChange(`crm-account-detail:${customerId}`);
  };

  const handleCompleteVisit = async () => {
    if (!completingVisitId) return;
    await actions.completeVisit(completingVisitId, visitNotes);
    setCompletingVisitId(null);
    setVisitNotes('');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-cult-white uppercase tracking-wide">My Queue</h1>
          <p className="text-cult-light-gray mt-2">Tasks and visits requiring your attention</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateTask(true)}
            className="px-4 py-2 text-sm font-medium text-cult-black bg-cult-white rounded-lg hover:bg-cult-off-white transition-colors"
          >
            New Task
          </button>
          <button
            onClick={reload}
            className="p-2 text-cult-silver hover:text-cult-white bg-cult-dark-gray border border-cult-medium-gray rounded-lg hover:bg-cult-charcoal transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBlock label="Overdue" value={overdueTasks.length} accent={overdueTasks.length > 0 ? 'red' : undefined} />
        <StatBlock label="Today" value={totalToday} accent={totalToday > 0 ? 'amber' : undefined} />
        <StatBlock label="This Week" value={totalWeek} />
        <StatBlock label="Open Tasks" value={overdueTasks.length + todayTasks.length + upcomingTasks.length} />
      </div>

      {overdueTasks.length > 0 && (
        <QueueSection
          title="Overdue"
          icon={AlertTriangle}
          iconColor="text-red-400"
          count={overdueTasks.length}
          accentBorder="border-red-500/30"
        >
          {overdueTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isOverdue
              onComplete={() => actions.completeTask(task.id)}
              onSnooze={(days) => actions.snoozeTask(task.id, days)}
              onCancel={() => actions.cancelTask(task.id)}
              onNavigate={() => navigateToAccount(task.customer_id)}
            />
          ))}
        </QueueSection>
      )}

      <QueueSection
        title="Today"
        icon={Calendar}
        iconColor="text-amber-400"
        count={totalToday}
      >
        {todayTasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            isOverdue={false}
            onComplete={() => actions.completeTask(task.id)}
            onSnooze={(days) => actions.snoozeTask(task.id, days)}
            onCancel={() => actions.cancelTask(task.id)}
            onNavigate={() => navigateToAccount(task.customer_id)}
          />
        ))}
        {todayVisits.map((visit) => (
          <VisitRow
            key={visit.id}
            visit={visit}
            onComplete={() => setCompletingVisitId(visit.id)}
            onNavigate={() => navigateToAccount(visit.customer_id)}
          />
        ))}
        {totalToday === 0 && (
          <div className="px-4 py-8 text-center text-sm text-cult-light-gray">
            No tasks or visits scheduled for today.
          </div>
        )}
      </QueueSection>

      <QueueSection
        title="This Week"
        icon={Timer}
        iconColor="text-cult-silver"
        count={upcomingTasks.length + weekVisits.length}
      >
        {upcomingTasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            isOverdue={false}
            onComplete={() => actions.completeTask(task.id)}
            onSnooze={(days) => actions.snoozeTask(task.id, days)}
            onCancel={() => actions.cancelTask(task.id)}
            onNavigate={() => navigateToAccount(task.customer_id)}
          />
        ))}
        {weekVisits.map((visit) => (
          <VisitRow
            key={visit.id}
            visit={visit}
            onComplete={() => setCompletingVisitId(visit.id)}
            onNavigate={() => navigateToAccount(visit.customer_id)}
          />
        ))}
        {upcomingTasks.length + weekVisits.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-cult-light-gray">
            No upcoming tasks or visits this week.
          </div>
        )}
      </QueueSection>

      {completingVisitId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-cult-white mb-4">Complete Visit</h3>
            <textarea
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value)}
              placeholder="Outcome notes (optional)"
              rows={4}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-sm text-cult-white placeholder-cult-silver focus:outline-none focus:border-cult-lighter-gray resize-none"
            />
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleCompleteVisit}
                className="px-4 py-2 text-sm font-medium text-cult-black bg-cult-white rounded hover:bg-cult-off-white transition-colors"
              >
                Complete
              </button>
              <button
                onClick={() => { setCompletingVisitId(null); setVisitNotes(''); }}
                className="px-4 py-2 text-sm text-cult-silver hover:text-cult-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateTask && (
        <TaskCreateModal
          onClose={() => setShowCreateTask(false)}
          onCreated={() => { setShowCreateTask(false); reload(); }}
        />
      )}
    </div>
  );
}

function QueueSection({
  title,
  icon: Icon,
  iconColor,
  count,
  accentBorder,
  children,
}: {
  title: string;
  icon: typeof Calendar;
  iconColor: string;
  count: number;
  accentBorder?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-cult-near-black border rounded-lg overflow-hidden ${accentBorder || 'border-cult-medium-gray'}`}>
      <div className="px-4 py-3 border-b border-cult-charcoal flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">{title}</h3>
        </div>
        <span className="text-xs text-cult-light-gray">{count} items</span>
      </div>
      <div className="divide-y divide-cult-charcoal/50">{children}</div>
    </div>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: number; accent?: 'red' | 'amber' }) {
  const valueColor = accent === 'red' ? 'text-red-400' : accent === 'amber' ? 'text-amber-400' : 'text-cult-white';
  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-cult-silver mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
