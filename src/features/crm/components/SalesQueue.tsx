import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  MoreHorizontal,
  MapPin,
  Bell,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Timer,
  Star,
  X,
  Search,
  Sparkles,
  Loader2,
  Zap,
} from 'lucide-react';
import { LoadingSpinner } from '@/shared/components';
import { useSalesQueue } from '../hooks';
import { runTaskEngine } from '../services/crm.service';
import type { CRMTask, VisitSchedule, TaskType, VisitType, TriggerSource } from '../types';
import { TaskCreateModal } from './TaskCreateModal';

/* ── Constants ─────────────────────────────────────────────────── */

const taskTypeIcons: Record<TaskType, typeof RefreshCw> = {
  reorder_reminder: RefreshCw,
  visit_overdue: MapPin,
  visit_follow_up: Calendar,
  prospect_advancement: TrendingUp,
  general: Bell,
};

const taskTypeLabels: Record<TaskType, string> = {
  reorder_reminder: 'Reorder',
  visit_overdue: 'Visit Overdue',
  visit_follow_up: 'Follow-Up',
  prospect_advancement: 'Prospect',
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

type TypeFilter = TaskType | 'all';
type SourceFilter = TriggerSource | 'all';

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

/* ── TaskRow ───────────────────────────────────────────────────── */

function TaskRow({
  task,
  isOverdue,
  isExpanded,
  onComplete,
  onSnooze,
  onCancel,
  onDismiss,
  onNavigate,
  onToggleFocus,
  onToggleExpand,
  onUpdateTask,
}: {
  task: CRMTask;
  isOverdue: boolean;
  isExpanded: boolean;
  onComplete: () => void;
  onSnooze: (days: number) => void;
  onCancel: () => void;
  onDismiss: () => void;
  onNavigate: () => void;
  onToggleFocus: () => void;
  onToggleExpand: () => void;
  onUpdateTask: (updates: Partial<CRMTask>) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editDueDate, setEditDueDate] = useState(task.due_date);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [saving, setSaving] = useState(false);

  const Icon = taskTypeIcons[task.task_type] || ClipboardList;
  const overdueDays = isOverdue ? daysOverdue(task.due_date) : 0;
  const ExpandIcon = isExpanded ? ChevronDown : ChevronRight;

  const handleSaveEdit = async () => {
    setSaving(true);
    const updates: Partial<CRMTask> = {};
    if (editTitle !== task.title) updates.title = editTitle;
    if (editPriority !== task.priority) updates.priority = editPriority;
    if (editDueDate !== task.due_date) updates.due_date = editDueDate;
    if (editDescription !== (task.description || '')) updates.description = editDescription || null;
    if (Object.keys(updates).length > 0) {
      onUpdateTask(updates);
    }
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditDueDate(task.due_date);
    setEditDescription(task.description || '');
    onToggleExpand();
  };

  return (
    <div className={`transition-colors ${task.focus_today ? 'border-l-2 border-l-amber-400' : ''}`}>
      <div className="px-4 py-3 flex items-center gap-3 hover:bg-cult-dark-gray/40 transition-colors group">
        <button
          onClick={onToggleFocus}
          className={`p-0.5 flex-shrink-0 transition-colors ${
            task.focus_today
              ? 'text-amber-400 hover:text-amber-300'
              : 'text-cult-charcoal hover:text-amber-400/60'
          }`}
          title={task.focus_today ? 'Remove from Today focus' : 'Focus Today'}
        >
          <Star className="w-3.5 h-3.5" fill={task.focus_today ? 'currentColor' : 'none'} />
        </button>

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
            <span className="text-xs text-cult-silver">{taskTypeLabels[task.task_type]}</span>
            {task.trigger_source === 'auto' && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded">
                <Zap className="w-2.5 h-2.5" /> auto
              </span>
            )}
            {task.focus_today && (
              <span className="text-xs text-amber-400 font-medium">★ Focus</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-cult-silver">
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
            onClick={onToggleExpand}
            className="p-1.5 text-cult-medium-gray hover:text-cult-white transition-colors"
            title="Edit task"
          >
            <ExpandIcon className="w-4 h-4" />
          </button>
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
                  onClick={() => { onDismiss(); setShowActions(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-cult-silver hover:text-cult-white hover:bg-cult-dark-gray transition-colors"
                >
                  Dismiss
                </button>
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

      {isExpanded && (
        <div className="px-4 pb-4 pt-1 bg-cult-dark-gray/30 border-t border-cult-charcoal/50 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-cult-silver mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-cult-near-black border border-cult-medium-gray rounded text-sm text-cult-white placeholder-cult-silver focus:outline-none focus:border-cult-lighter-gray"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wider text-cult-silver mb-1">Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as CRMTask['priority'])}
                  className="w-full px-3 py-1.5 bg-cult-near-black border border-cult-medium-gray rounded text-sm text-cult-white focus:outline-none focus:border-cult-lighter-gray"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-cult-silver mb-1">Due Date</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-cult-near-black border border-cult-medium-gray rounded text-sm text-cult-white focus:outline-none focus:border-cult-lighter-gray"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-cult-silver mb-1">Notes / Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              placeholder="Add notes about this task..."
              className="w-full px-3 py-2 bg-cult-near-black border border-cult-medium-gray rounded text-sm text-cult-white placeholder-cult-silver focus:outline-none focus:border-cult-lighter-gray resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium text-cult-black bg-cult-white rounded hover:bg-cult-off-white transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1.5 text-xs text-cult-silver hover:text-cult-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── VisitRow ──────────────────────────────────────────────────── */

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
          <span className={`px-1.5 py-0.5 text-xs rounded ${visitTypeColors[visit.visit_type]}`}>
            {visitTypeLabels[visit.visit_type]}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-cult-silver">
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

/* ── Filter helpers ────────────────────────────────────────────── */

function filterTasks(
  tasks: CRMTask[],
  search: string,
  typeFilter: TypeFilter,
  sourceFilter: SourceFilter,
): CRMTask[] {
  let result = tasks;

  if (typeFilter !== 'all') {
    result = result.filter((t) => t.task_type === typeFilter);
  }
  if (sourceFilter !== 'all') {
    result = result.filter((t) => t.trigger_source === sourceFilter);
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.customer_name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
  }
  return result;
}

function filterVisits(visits: VisitSchedule[], search: string): VisitSchedule[] {
  if (!search) return visits;
  const q = search.toLowerCase();
  return visits.filter(
    (v) =>
      v.customer_name?.toLowerCase().includes(q) ||
      v.location_notes?.toLowerCase().includes(q)
  );
}

/* ── Main Component ────────────────────────────────────────────── */

export function SalesQueue() {
  const navigate = useNavigate();
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
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [taskNotes, setTaskNotes] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Absorbed from AutomatedTaskEngine
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [runningEngine, setRunningEngine] = useState(false);

  const hasFilters = search !== '' || typeFilter !== 'all' || sourceFilter !== 'all';

  // Apply filters to each section
  const fOverdue = useMemo(() => filterTasks(overdueTasks, search, typeFilter, sourceFilter), [overdueTasks, search, typeFilter, sourceFilter]);
  const fToday = useMemo(() => filterTasks(todayTasks, search, typeFilter, sourceFilter), [todayTasks, search, typeFilter, sourceFilter]);
  const fUpcoming = useMemo(() => filterTasks(upcomingTasks, search, typeFilter, sourceFilter), [upcomingTasks, search, typeFilter, sourceFilter]);
  const fTodayVisits = useMemo(() => filterVisits(todayVisits, search), [todayVisits, search]);
  const fWeekVisits = useMemo(() => filterVisits(weekVisits, search), [weekVisits, search]);

  const totalToday = fToday.length + fTodayVisits.length;
  const totalWeek = fToday.length + fUpcoming.length + fTodayVisits.length + fWeekVisits.length;
  const totalOpen = fOverdue.length + fToday.length + fUpcoming.length;

  // Count auto-generated tasks (unfiltered) for the stat block
  const autoCount = overdueTasks.filter((t) => t.trigger_source === 'auto').length
    + todayTasks.filter((t) => t.trigger_source === 'auto').length
    + upcomingTasks.filter((t) => t.trigger_source === 'auto').length;

  const navigateToAccount = (customerId: string) => {
    navigate(`/crm-account-detail/${customerId}`);
  };

  const handleCompleteVisit = async () => {
    if (!completingVisitId) return;
    await actions.completeVisit(completingVisitId, visitNotes);
    setCompletingVisitId(null);
    setVisitNotes('');
  };

  const handleCompleteTask = async () => {
    if (!completingTaskId) return;
    await actions.completeTask(completingTaskId, taskNotes || undefined);
    setCompletingTaskId(null);
    setTaskNotes('');
  };

  const handleSkipCompleteTask = async () => {
    if (!completingTaskId) return;
    await actions.completeTask(completingTaskId);
    setCompletingTaskId(null);
    setTaskNotes('');
  };

  const handleRunEngine = async () => {
    setRunningEngine(true);
    await runTaskEngine();
    await reload();
    setRunningEngine(false);
  };

  const handleDismissTask = async (taskId: string) => {
    await actions.cancelTask(taskId);
  };

  const renderTaskRow = (task: CRMTask, isOverdue: boolean) => (
    <TaskRow
      key={task.id}
      task={task}
      isOverdue={isOverdue}
      isExpanded={expandedTaskId === task.id}
      onComplete={() => setCompletingTaskId(task.id)}
      onSnooze={(days) => actions.snoozeTask(task.id, days)}
      onCancel={() => actions.cancelTask(task.id)}
      onDismiss={() => handleDismissTask(task.id)}
      onNavigate={() => navigateToAccount(task.customer_id)}
      onToggleFocus={() => actions.toggleFocusToday(task.id)}
      onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
      onUpdateTask={(updates) => actions.updateTask(task.id, updates)}
    />
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cult-white">My Queue</h1>
          <p className="text-cult-light-gray mt-2">Tasks and visits requiring your attention</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunEngine}
            disabled={runningEngine}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/20 transition-colors disabled:opacity-50"
            title="Generate auto-tasks from account health, visit cadence, and prospect data"
          >
            {runningEngine ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {runningEngine ? 'Running...' : 'Generate Tasks'}
          </button>
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

      {/* Stat blocks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBlock label="Overdue" value={overdueTasks.length} accent={overdueTasks.length > 0 ? 'red' : undefined} />
        <StatBlock label="Today" value={todayTasks.length + todayVisits.length} accent={(todayTasks.length + todayVisits.length) > 0 ? 'amber' : undefined} />
        <StatBlock label="This Week" value={todayTasks.length + upcomingTasks.length + todayVisits.length + weekVisits.length} />
        <StatBlock label="Open Tasks" value={overdueTasks.length + todayTasks.length + upcomingTasks.length} sub={autoCount > 0 ? `${autoCount} auto` : undefined} />
      </div>

      {/* Filter bar — compact, always visible */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cult-medium-gray" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks or customers..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-cult-near-black border border-cult-medium-gray rounded-lg text-cult-white placeholder:text-cult-medium-gray focus:outline-none focus:border-cult-lighter-gray"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="px-2.5 py-1.5 text-xs bg-cult-near-black border border-cult-medium-gray rounded-lg text-cult-light-gray focus:outline-none focus:border-cult-lighter-gray"
        >
          <option value="all">All Types</option>
          {Object.entries(taskTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
          className="px-2.5 py-1.5 text-xs bg-cult-near-black border border-cult-medium-gray rounded-lg text-cult-light-gray focus:outline-none focus:border-cult-lighter-gray"
        >
          <option value="all">All Sources</option>
          <option value="auto">Auto-Generated</option>
          <option value="manual">Manual</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setTypeFilter('all'); setSourceFilter('all'); }}
            className="px-2 py-1.5 text-xs text-cult-silver hover:text-cult-white transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Queue sections */}
      {fOverdue.length > 0 && (
        <QueueSection
          title="Overdue"
          icon={AlertTriangle}
          iconColor="text-red-400"
          count={fOverdue.length}
          accentBorder="border-red-500/30"
        >
          {fOverdue.map((task) => renderTaskRow(task, true))}
        </QueueSection>
      )}

      <QueueSection
        title="Today"
        icon={Calendar}
        iconColor="text-amber-400"
        count={totalToday}
      >
        {fToday.map((task) => renderTaskRow(task, false))}
        {fTodayVisits.map((visit) => (
          <VisitRow
            key={visit.id}
            visit={visit}
            onComplete={() => setCompletingVisitId(visit.id)}
            onNavigate={() => navigateToAccount(visit.customer_id)}
          />
        ))}
        {totalToday === 0 && (
          <div className="px-4 py-8 text-center text-sm text-cult-light-gray">
            {hasFilters ? 'No items match your filters.' : 'No tasks or visits scheduled for today.'}
          </div>
        )}
      </QueueSection>

      <QueueSection
        title="This Week"
        icon={Timer}
        iconColor="text-cult-silver"
        count={fUpcoming.length + fWeekVisits.length}
      >
        {fUpcoming.map((task) => renderTaskRow(task, false))}
        {fWeekVisits.map((visit) => (
          <VisitRow
            key={visit.id}
            visit={visit}
            onComplete={() => setCompletingVisitId(visit.id)}
            onNavigate={() => navigateToAccount(visit.customer_id)}
          />
        ))}
        {fUpcoming.length + fWeekVisits.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-cult-light-gray">
            {hasFilters ? 'No items match your filters.' : 'No upcoming tasks or visits this week.'}
          </div>
        )}
      </QueueSection>

      {/* Task completion notes modal */}
      {completingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-cult-white">Complete Task</h3>
              <button
                onClick={() => { setCompletingTaskId(null); setTaskNotes(''); }}
                className="p-1 text-cult-silver hover:text-cult-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={taskNotes}
              onChange={(e) => setTaskNotes(e.target.value)}
              placeholder="What happened? Any notes? (optional)"
              rows={4}
              autoFocus
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-sm text-cult-white placeholder-cult-silver focus:outline-none focus:border-cult-lighter-gray resize-none"
            />
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleCompleteTask}
                className="px-4 py-2 text-sm font-medium text-cult-black bg-cult-white rounded hover:bg-cult-off-white transition-colors"
              >
                Complete with Notes
              </button>
              <button
                onClick={handleSkipCompleteTask}
                className="px-4 py-2 text-sm text-cult-silver hover:text-cult-white transition-colors"
              >
                Skip &amp; Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visit completion notes modal */}
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

/* ── Section wrapper ───────────────────────────────────────────── */

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

/* ── Stat block ────────────────────────────────────────────────── */

function StatBlock({ label, value, accent, sub }: { label: string; value: number; accent?: 'red' | 'amber'; sub?: string }) {
  const valueColor = accent === 'red' ? 'text-red-400' : accent === 'amber' ? 'text-amber-400' : 'text-cult-white';
  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4 transition-all duration-200 hover:scale-[1.01]">
      <p className="text-xs font-medium uppercase tracking-wider text-cult-silver mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-[10px] text-purple-400 mt-0.5">{sub}</p>}
    </div>
  );
}
