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
  Beaker,
  Droplets,
  Info,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { TASK_TYPE_CONFIG } from '../types';
import { useFeedProgramRecipe } from '../hooks/useFeedProgramRecipe';
import { useRoomOperationalState } from '../hooks/useRoomOperationalState';
import type { RecipeEntry } from '../hooks/useFeedProgramRecipe';
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
    estimated_duration?: string | null;
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
  const [estimatedDuration, setEstimatedDuration] = useState(task.estimated_duration ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [selectedCrew, setSelectedCrew] = useState<string[]>(crewIds);
  const [localLeadId, setLocalLeadId] = useState<string | null>(task.assigned_to ?? null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Recipe overrides for batch_tank_mix tasks
  const existingOverrides = (task.task_config?.recipe_overrides as Record<string, number>) ?? {};
  const [recipeOverrides, setRecipeOverrides] = useState<Record<string, number>>(existingOverrides);

  const overridesChanged = JSON.stringify(recipeOverrides) !== JSON.stringify(existingOverrides);

  const hasChanges =
    notes !== (task.notes ?? '') ||
    estimatedDuration !== (task.estimated_duration ?? '') ||
    selectedCrew.join(',') !== crewIds.join(',') ||
    localLeadId !== (task.assigned_to ?? null) ||
    overridesChanged;

  // Build crew display
  const crewMembers = useMemo(() => {
    return selectedCrew
      .map((id) => staffOptions.find((s) => s.id === id))
      .filter(Boolean) as StaffOption[];
  }, [selectedCrew, staffOptions]);

  async function handleSave() {
    setSaving(true);
    try {
      const cfg: Record<string, unknown> = { crew: selectedCrew };
      if (task.task_type === 'batch_tank_mix' && Object.keys(recipeOverrides).length > 0) {
        cfg.recipe_overrides = recipeOverrides;
      }
      await onUpdateTask(task.id, {
        notes: notes || null,
        assigned_to: localLeadId || null,
        task_config: cfg,
        estimated_duration: estimatedDuration.trim() || null,
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
      <div className="relative ml-auto bg-cult-surface border-l border-cult-surface w-full max-w-md h-full flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header — sticky with room context */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cult-surface flex-shrink-0 bg-cult-surface-raised/20">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span
              className="w-3 h-3 rounded-full ring-2 ring-black/20 flex-shrink-0"
              style={{ backgroundColor: config.color }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cult-accent">{task.room_name}</span>
                <span className="text-cult-surface">·</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-sm ${
                    isPending ? 'bg-zinc-800 text-zinc-400'
                    : isInProgress ? 'bg-cult-info-muted text-cult-info'
                    : task.status === 'completed' ? 'bg-cult-success-muted text-cult-success'
                    : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {task.status === 'carry_forward' ? 'Deferred' : task.status.replace('_', ' ')}
                </span>
              </div>
              <h3 className="text-sm font-bold text-cult-text-primary mt-0.5 truncate">{config.label}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-cult-surface-raised active:bg-cult-surface-raised/60 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-cult-border" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">

          {/* Quick Actions */}
          {!isCompleted && (
            <div className="flex flex-wrap gap-2">
              {isPending && (
                <button
                  type="button"
                  onClick={async () => { await onStartTask(task.id); onClose(); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-info bg-cult-info-muted border border-cult-info/30 hover:bg-cult-info-muted hover:border-cult-info/50 rounded-sm transition-colors min-h-[44px]"
                >
                  <Play className="w-3.5 h-3.5" />
                  Start Task
                </button>
              )}
              {isInProgress && (
                <button
                  type="button"
                  onClick={() => { onOpenCompletionForm(); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-success bg-cult-success-muted border border-cult-success/30 hover:bg-cult-success-muted hover:border-cult-success/50 rounded-sm transition-colors min-h-[44px]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete Task
                </button>
              )}
              {isPending && (
                <button
                  type="button"
                  onClick={async () => { await onSkipTask(task.id); onClose(); }}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-text-secondary bg-cult-surface-raised/60 border border-cult-surface/60 hover:bg-cult-surface-raised rounded-sm transition-colors min-h-[44px]"
                >
                  <SkipForward className="w-3 h-3" />
                  Skip
                </button>
              )}
            </div>
          )}

          {/* ── Staff Assignment (Lead + Crew) ─────────── */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-cult-text-muted uppercase tracking-wider mb-1.5 font-semibold">
              <Users className="w-3.5 h-3.5" />
              Assign Staff
            </label>
            <p className="text-[10px] text-cult-surface mb-2">Tap once for lead. Tap others to add crew.</p>
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
                          ? 'bg-cult-success-muted border border-cult-success/30 text-cult-success font-semibold'
                          : inCrew
                          ? 'bg-cult-info-muted border border-cult-info/30 text-cult-info font-semibold'
                          : 'bg-cult-surface-raised/30 border border-cult-surface/50 text-cult-border hover:border-cult-border hover:text-cult-text-muted'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        isLead ? 'bg-cult-success text-white'
                        : inCrew ? 'bg-cult-info text-white'
                        : 'bg-cult-surface-raised text-cult-text-primary'
                      }`}>
                        {s.first_name.charAt(0)}
                      </span>
                      <span className="truncate">{s.first_name}</span>
                      {s.is_present && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cult-success flex-shrink-0 ml-auto" />
                      )}
                      {isLead && (
                        <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[8px] font-bold uppercase bg-cult-success text-white rounded-sm leading-none">Lead</span>
                      )}
                      {inCrew && (
                        <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[8px] font-bold uppercase bg-cult-info text-white rounded-sm leading-none">Crew</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-sm text-cult-text-muted">{task.assigned_to_name ?? 'Unassigned'}</span>
                {crewMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {crewMembers.map((s) => (
                      <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-cult-info-muted text-cult-info rounded-sm">
                        {s.first_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Estimated Duration ───────────────────── */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-cult-text-muted uppercase tracking-wider mb-2 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              Est. Duration
            </label>
            {!isCompleted ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  placeholder="e.g. 30m, 1.5h, 2h"
                  className="flex-1 bg-cult-surface-raised/40 border border-cult-surface/50 text-cult-text-primary text-sm py-2 px-3 rounded-sm focus:outline-none focus:border-cult-border placeholder:text-cult-surface"
                />
                <div className="flex flex-wrap gap-1">
                  {['30m', '1h', '2h', '4h'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEstimatedDuration(preset)}
                      className={`px-2 py-1.5 text-[10px] font-semibold uppercase rounded-sm transition-colors ${
                        estimatedDuration === preset
                          ? 'bg-cult-accent/20 text-cult-accent border border-cult-accent/40'
                          : 'bg-cult-surface-raised border border-cult-surface text-cult-border hover:text-cult-text-muted'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-cult-border">{task.estimated_duration || '—'}</p>
            )}
          </div>

          {/* ── Notes ────────────────────────────────── */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-cult-text-muted uppercase tracking-wider mb-2 font-semibold">
              <StickyNote className="w-3.5 h-3.5" />
              Notes
            </label>
            {!isCompleted ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add task notes or instructions..."
                className="w-full bg-cult-surface-raised/40 border border-cult-surface/50 text-cult-text-primary text-sm py-2.5 px-3 rounded-sm resize-none focus:outline-none focus:border-cult-border placeholder:text-cult-surface"
              />
            ) : (
              <p className="text-sm text-cult-border">{task.notes || 'No notes'}</p>
            )}
          </div>

          {/* ── Recipe Preview (batch_tank_mix only) ──── */}
          {task.task_type === 'batch_tank_mix' && !isCompleted && (
            <RecipePreviewPanel
              roomId={roomId}
              overrides={recipeOverrides}
              onOverride={(productId, value) =>
                setRecipeOverrides((prev) => ({ ...prev, [productId]: value }))
              }
            />
          )}

          {/* ── Defer / Reschedule (combined) ──────────── */}
          {!isCompleted && (
            <div>
              <label className="flex items-center gap-1.5 text-xs text-cult-text-muted uppercase tracking-wider mb-2 font-semibold">
                <CalendarClock className="w-3.5 h-3.5" />
                Defer Task
              </label>
              <p className="text-[10px] text-cult-surface mb-2.5">Move this task to another day. It will be tracked as deferred.</p>

              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => handleDefer(tomorrow)}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-warning bg-cult-warning-muted border border-cult-warning/30 hover:bg-cult-warning-muted hover:border-cult-warning/40 disabled:opacity-30 rounded-sm transition-colors min-h-[44px]"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-warning/70 bg-cult-warning-muted border border-cult-warning/20 hover:bg-cult-warning-muted hover:text-cult-warning rounded-sm transition-colors min-h-[44px]"
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
                    className="w-full bg-cult-surface-raised/40 border border-cult-surface/50 text-cult-text-primary text-sm py-2.5 px-3 rounded-sm focus:outline-none focus:border-cult-border"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDefer(rescheduleDate)}
                      disabled={!rescheduleDate || saving}
                      className="flex-1 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-warning bg-cult-warning-muted border border-cult-warning/30 hover:bg-cult-warning-muted hover:border-cult-warning/40 disabled:opacity-30 rounded-sm transition-colors min-h-[44px]"
                    >
                      {saving ? 'Moving...' : 'Move to Date'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowDatePicker(false); setRescheduleDate(''); }}
                      className="px-3 py-2.5 text-xs text-cult-border hover:text-cult-text-muted transition-colors min-h-[44px]"
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
        <div className="px-5 py-4 border-t border-cult-surface flex-shrink-0 bg-cult-surface-raised/10">
          <div className="flex items-center gap-2">
            {/* Save button — only show when editable changes exist */}
            {hasChanges && !isCompleted && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-success bg-cult-success-muted border border-cult-success/30 hover:bg-cult-success-muted hover:border-cult-success/40 disabled:opacity-30 rounded-sm transition-colors min-h-[44px]"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}

            {/* Delete / Cancel task */}
            {!isCompleted && (
              confirmDelete ? (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-cult-danger font-semibold">Cancel this task?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cult-danger bg-cult-danger-muted border border-cult-danger/30 hover:bg-cult-danger-muted hover:border-cult-danger/40 disabled:opacity-30 rounded-sm transition-colors min-h-[40px]"
                  >
                    {deleting ? 'Removing...' : 'Yes, Remove'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-2 text-xs text-cult-border hover:text-cult-text-muted transition-colors min-h-[40px]"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-danger/60 hover:text-cult-danger hover:bg-cult-danger-muted rounded-sm transition-colors min-h-[44px]"
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

/* ── Recipe Preview Panel (for batch_tank_mix tasks) ──── */
function RecipePreviewPanel({
  roomId,
  overrides,
  onOverride,
}: {
  roomId: string;
  overrides: Record<string, number>;
  onOverride: (productId: string, value: number) => void;
}) {
  const { rooms } = useRoomOperationalState();
  const room = rooms.find((r) => r.room_id === roomId);
  const stage = room?.dominant_stage ?? null;
  const daysInStage = room?.days_in_stage ?? null;
  const { recipe, loading, error } = useFeedProgramRecipe(stage, daysInStage);
  const [expanded, setExpanded] = useState(true);

  if (loading) {
    return (
      <div className="py-3 text-center">
        <span className="text-xs text-cult-border animate-pulse">Loading recipe...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-2.5 bg-cult-danger-muted border border-cult-danger/20 rounded-sm">
        <Info className="w-3.5 h-3.5 text-cult-danger flex-shrink-0" />
        <span className="text-xs text-cult-danger">{error}</span>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex items-center gap-2 p-2.5 bg-cult-warning-muted border border-cult-warning/20 rounded-sm">
        <Info className="w-3.5 h-3.5 text-cult-warning flex-shrink-0" />
        <span className="text-xs text-cult-warning">
          No feed recipe for this room.
          {!stage ? ' No active plant groups with a stage set.' : ''}
        </span>
      </div>
    );
  }

  const PHASE_COLORS: Record<string, string> = {
    clone: 'text-sky-400 bg-sky-500/20 border-sky-500/30',
    veg: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
    flower: 'text-rose-400 bg-rose-500/20 border-rose-500/30',
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <label className="flex items-center gap-1.5 text-xs text-cult-text-muted uppercase tracking-wider font-semibold cursor-pointer">
          <Beaker className="w-3.5 h-3.5 text-cult-info" />
          Feed Recipe
        </label>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border ${PHASE_COLORS[recipe.phase] ?? 'text-cult-border bg-cult-surface-raised border-cult-surface'}`}>
            {recipe.phase} W{recipe.week_number}
          </span>
          {expanded ? <ChevronUp className="w-3 h-3 text-cult-surface" /> : <ChevronDown className="w-3 h-3 text-cult-surface" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {/* Target ranges summary */}
          <div className="flex flex-wrap gap-1.5">
            {recipe.targets.target_ec != null && (
              <span className="px-2 py-1 text-[10px] font-mono font-semibold text-cult-border bg-cult-surface-raised/40 border border-cult-surface/40 rounded-sm">
                EC {recipe.targets.target_ec.toFixed(1)}
              </span>
            )}
            {recipe.targets.target_ppm_500 != null && (
              <span className="px-2 py-1 text-[10px] font-mono font-semibold text-cult-border bg-cult-surface-raised/40 border border-cult-surface/40 rounded-sm">
                PPM {recipe.targets.target_ppm_500}
              </span>
            )}
            {recipe.targets.target_ph_min != null && recipe.targets.target_ph_max != null && (
              <span className="px-2 py-1 text-[10px] font-mono font-semibold text-cult-border bg-cult-surface-raised/40 border border-cult-surface/40 rounded-sm">
                pH {recipe.targets.target_ph_min.toFixed(1)}–{recipe.targets.target_ph_max.toFixed(1)}
              </span>
            )}
          </div>

          {/* Product list with editable rates */}
          <div className="space-y-1">
            {recipe.entries.map((entry) => {
              const isPhAdjuster = entry.product.product_type === 'ph_adjuster';
              const effectiveRate = overrides[entry.product.id] ?? entry.ml_per_gal;
              const isOverridden = overrides[entry.product.id] != null && overrides[entry.product.id] !== entry.ml_per_gal;

              return (
                <RecipeProductRow
                  key={entry.product.id}
                  name={entry.product.name}
                  rate={effectiveRate}
                  defaultRate={entry.ml_per_gal}
                  maxRate={entry.ml_per_gal_max}
                  isPhAdjuster={isPhAdjuster}
                  isOverridden={isOverridden}
                  onChangeRate={(val) => onOverride(entry.product.id, val)}
                />
              );
            })}
          </div>

          <p className="text-[10px] text-cult-surface italic">
            Tap a rate to adjust. Changes save with the task and carry into the completion form.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Single product row with inline rate editing ──────── */
function RecipeProductRow({
  name,
  rate,
  defaultRate,
  maxRate,
  isPhAdjuster,
  isOverridden,
  onChangeRate,
}: {
  name: string;
  rate: number;
  defaultRate: number;
  maxRate: number | null;
  isPhAdjuster: boolean;
  isOverridden: boolean;
  onChangeRate: (val: number) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-sm border text-xs ${
      isOverridden ? 'bg-cult-warning-muted border-cult-warning/20' : 'bg-cult-surface-raised/20 border-cult-surface/30'
    }`}>
      <span className="text-cult-text-muted font-medium truncate mr-2">{name}</span>
      {isPhAdjuster ? (
        <span className="text-cult-warning/70 italic text-[10px]">as needed</span>
      ) : editing ? (
        <input
          type="number"
          step="0.5"
          min="0"
          value={rate}
          onChange={(e) => onChangeRate(Number(e.target.value))}
          onBlur={() => setEditing(false)}
          autoFocus
          className="w-20 bg-cult-surface border border-cult-accent text-cult-text-primary text-xs text-right py-1 px-2 rounded-sm focus:outline-none tabular-nums"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="tabular-nums text-cult-text-primary hover:text-cult-accent transition-colors"
        >
          {rate}
          {maxRate != null && maxRate !== defaultRate && (
            <span className="text-cult-surface ml-0.5">({defaultRate}–{maxRate})</span>
          )}
          <span className="text-cult-surface ml-1">mL/gal</span>
        </button>
      )}
    </div>
  );
}
