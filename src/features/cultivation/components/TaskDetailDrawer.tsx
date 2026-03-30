import { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  UserPlus,
  Trash2,
  Save,
  CheckCircle2,
  Play,
  SkipForward,
  CalendarClock,
  Users,
  StickyNote,
} from 'lucide-react';
import { TASK_TYPE_CONFIG } from '../types';
import type { TaskCardData, StaffOption } from './TaskCard';

interface TaskDetailDrawerProps {
  task: TaskCardData;
  roomId: string;
  staffOptions: StaffOption[];
  /** Crew members already on this task (from task_config.crew) */
  crewIds?: string[];
  onClose: () => void;
  onOpenCompletionForm: () => void;
  onAssignWorker: (taskId: string, staffId: string) => Promise<void>;
  onUpdateTask: (taskId: string, updates: {
    notes?: string | null;
    task_date?: string;
    assigned_to?: string | null;
    task_config?: Record<string, unknown>;
    status?: string;
  }) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onStartTask: (taskId: string) => Promise<void>;
  onSkipTask: (taskId: string) => Promise<void>;
  onCarryForward: (taskId: string) => Promise<void>;
}

/** Add N days to a YYYY-MM-DD string */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function TaskDetailDrawer({
  task,
  roomId,
  staffOptions,
  crewIds = [],
  onClose,
  onOpenCompletionForm,
  onAssignWorker,
  onUpdateTask,
  onDeleteTask,
  onStartTask,
  onSkipTask,
  onCarryForward,
}: TaskDetailDrawerProps) {
  const config = TASK_TYPE_CONFIG[task.task_type] ?? TASK_TYPE_CONFIG.custom;
  const isPending = task.status === 'pending' || task.status === 'carry_forward';
  const isInProgress = task.status === 'in_progress';
  const isCompleted = task.status === 'completed' || task.status === 'skipped';

  const [notes, setNotes] = useState(task.notes ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [selectedCrew, setSelectedCrew] = useState<string[]>(crewIds);
  const [localLeadId, setLocalLeadId] = useState<string | null>(task.assigned_to ?? null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasChanges =
    notes !== (task.notes ?? '') ||
    selectedCrew.join(',') !== crewIds.join(',') ||
    localLeadId !== (task.assigned_to ?? null);

  // Build crew display
  const crewMembers = useMemo(() => {
    return selectedCrew
      .map((id) => staffOptions.find((s) => s.id === id))
      .filter(Boolean) as StaffOption[];
  }, [selectedCrew, staffOptions]);

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdateTask(task.id, {
        notes: notes || null,
        assigned_to: localLeadId || null,
        task_config: { crew: selectedCrew },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDefer(targetDate: string) {
    setSaving(true);
    try {
      await onUpdateTask(task.id, {
        task_date: targetDate,
        status: 'carry_forward',
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDeleteTask(task.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  function handleStaffTap(staffId: string) {
    const isCurrentLead = localLeadId === staffId;
    const isInCrew = selectedCrew.includes(staffId);

    if (isCurrentLead) {
      // Tapping the lead again — unassign
      setLocalLeadId(null);
    } else if (isInCrew) {
      // Tapping a crew member — remove from crew
      setSelectedCrew((prev) => prev.filter((id) => id !== staffId));
    } else if (!localLeadId) {
      // No lead yet — assign as lead
      setLocalLeadId(staffId);
    } else {
      // Lead exists — add as crew
      setSelectedCrew((prev) => [...prev, staffId]);
    }
  }

  // Compute tomorrow's date string from the task's date
  const tomorrow = addDays(task.task_date ?? new Date().toISOString().slice(0, 10), 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative ml-auto bg-cult-near-black border-l border-cult-dark-gray w-full max-w-md h-full flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cult-dark-gray flex-shrink-0 bg-cult-charcoal/20">
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full ring-2 ring-black/20"
              style={{ backgroundColor: config.color }}
            />
            <div>
              <span className="text-xs text-cult-medium-gray uppercase tracking-wider">Task Detail</span>
              <h3 className="text-sm font-bold text-cult-white mt-0.5">{config.label}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-cult-charcoal active:bg-cult-charcoal/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-cult-medium-gray" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">
          {/* Room + Status */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-bold text-cult-white">{task.room_name}</span>
            <span
              className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-sm ${
                isPending ? 'bg-zinc-800 text-zinc-400'
                : isInProgress ? 'bg-sky-950 text-sky-400'
                : task.status === 'completed' ? 'bg-green-950 text-green-400'
                : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {task.status === 'carry_forward' ? 'Deferred' : task.status.replace('_', ' ')}
            </span>
          </div>

          {/* Quick Actions */}
          {!isCompleted && (
            <div className="flex flex-wrap gap-2">
              {isPending && (
                <button
                  type="button"
                  onClick={async () => { await onStartTask(task.id); onClose(); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-950/50 border border-sky-800/50 hover:bg-sky-950 hover:border-sky-700 rounded-sm transition-colors min-h-[44px]"
                >
                  <Play className="w-3.5 h-3.5" />
                  Start Task
                </button>
              )}
              {isInProgress && (
                <button
                  type="button"
                  onClick={() => { onOpenCompletionForm(); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-green-400 bg-green-950/50 border border-green-800/50 hover:bg-green-950 hover:border-green-700 rounded-sm transition-colors min-h-[44px]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete Task
                </button>
              )}
              {isPending && (
                <button
                  type="button"
                  onClick={async () => { await onSkipTask(task.id); onClose(); }}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-900/60 border border-zinc-700/40 hover:bg-zinc-800 rounded-sm transition-colors min-h-[44px]"
                >
                  <SkipForward className="w-3 h-3" />
                  Skip
                </button>
              )}
            </div>
          )}

          {/* ── Staff Assignment (Lead + Crew) ─────────── */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-cult-light-gray uppercase tracking-wider mb-1.5 font-semibold">
              <Users className="w-3.5 h-3.5" />
              Assign Staff
            </label>
            <p className="text-[10px] text-cult-dark-gray mb-2">Tap once for lead. Tap others to add crew.</p>
            {!isCompleted ? (
              <div className="grid grid-cols-3 gap-1.5">
                {staffOptions.map((s) => {
                  const isLead = localLeadId === s.id;
                  const inCrew = selectedCrew.includes(s.id);
                  const isSelected = isLead || inCrew;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleStaffTap(s.id)}
                      className={`relative flex items-center gap-2 px-2.5 py-2.5 text-xs rounded-sm transition-all min-h-[44px] ${
                        isLead
                          ? 'bg-green-950/40 border border-green-700/50 text-green-400 font-semibold'
                          : inCrew
                          ? 'bg-sky-950/40 border border-sky-700/50 text-sky-400 font-semibold'
                          : 'bg-cult-charcoal/30 border border-cult-dark-gray/50 text-cult-medium-gray hover:border-cult-medium-gray hover:text-cult-light-gray'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        isLead ? 'bg-green-700 text-white'
                        : inCrew ? 'bg-sky-700 text-white'
                        : 'bg-cult-charcoal text-cult-white'
                      }`}>
                        {s.first_name.charAt(0)}
                      </span>
                      <span className="truncate">{s.first_name}</span>
                      {s.is_present && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 ml-auto" />
                      )}
                      {isLead && (
                        <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[8px] font-bold uppercase bg-green-700 text-white rounded-sm leading-none">Lead</span>
                      )}
                      {inCrew && (
                        <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[8px] font-bold uppercase bg-sky-700 text-white rounded-sm leading-none">Crew</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-sm text-cult-light-gray">{task.assigned_to_name ?? 'Unassigned'}</span>
                {crewMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {crewMembers.map((s) => (
                      <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-sky-950/30 text-sky-400 rounded-sm">
                        {s.first_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Notes ────────────────────────────────── */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-cult-light-gray uppercase tracking-wider mb-2 font-semibold">
              <StickyNote className="w-3.5 h-3.5" />
              Notes
            </label>
            {!isCompleted ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add task notes or instructions..."
                className="w-full bg-cult-charcoal/40 border border-cult-dark-gray/50 text-cult-white text-sm py-2.5 px-3 rounded-sm resize-none focus:outline-none focus:border-cult-medium-gray placeholder:text-cult-dark-gray"
              />
            ) : (
              <p className="text-sm text-cult-medium-gray">{task.notes || 'No notes'}</p>
            )}
          </div>

          {/* ── Defer / Reschedule (combined) ──────────── */}
          {!isCompleted && (
            <div>
              <label className="flex items-center gap-1.5 text-xs text-cult-light-gray uppercase tracking-wider mb-2 font-semibold">
                <CalendarClock className="w-3.5 h-3.5" />
                Defer Task
              </label>
              <p className="text-[10px] text-cult-dark-gray mb-2.5">Move this task to another day. It will be tracked as deferred.</p>

              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => handleDefer(tomorrow)}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/40 border border-amber-800/40 hover:bg-amber-950/60 disabled:opacity-30 rounded-sm transition-colors min-h-[44px]"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-amber-400/70 bg-amber-950/20 border border-amber-800/20 hover:bg-amber-950/40 hover:text-amber-400 rounded-sm transition-colors min-h-[44px]"
                >
                  <Calendar className="w-3 h-3" />
                  {showDatePicker ? 'Hide' : 'Pick Date'}
                </button>
              </div>

              {showDatePicker && (
                <div className="space-y-2">
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    min={tomorrow}
                    className="w-full bg-cult-charcoal/40 border border-cult-dark-gray/50 text-cult-white text-sm py-2.5 px-3 rounded-sm focus:outline-none focus:border-cult-medium-gray"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDefer(rescheduleDate)}
                      disabled={!rescheduleDate || saving}
                      className="flex-1 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/40 border border-amber-800/40 hover:bg-amber-950/60 disabled:opacity-30 rounded-sm transition-colors min-h-[44px]"
                    >
                      {saving ? 'Moving...' : 'Move to Date'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowDatePicker(false); setRescheduleDate(''); }}
                      className="px-3 py-2.5 text-xs text-cult-medium-gray hover:text-cult-light-gray transition-colors min-h-[44px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-cult-dark-gray flex-shrink-0 bg-cult-charcoal/10">
          <div className="flex items-center gap-2">
            {/* Save button — only show when editable changes exist */}
            {hasChanges && !isCompleted && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-green-400 bg-green-950/40 border border-green-800/40 hover:bg-green-950/60 disabled:opacity-30 rounded-sm transition-colors min-h-[44px]"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}

            {/* Delete / Cancel task */}
            {!isCompleted && (
              confirmDelete ? (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-red-400 font-semibold">Cancel this task?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-950/40 border border-red-800/40 hover:bg-red-950/60 disabled:opacity-30 rounded-sm transition-colors min-h-[40px]"
                  >
                    {deleting ? 'Removing...' : 'Yes, Remove'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-2 text-xs text-cult-medium-gray hover:text-cult-light-gray transition-colors min-h-[40px]"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-red-400/60 hover:text-red-400 hover:bg-red-950/30 rounded-sm transition-colors min-h-[44px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Cancel Task
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
