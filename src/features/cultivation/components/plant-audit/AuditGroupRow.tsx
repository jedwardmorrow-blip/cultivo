import { useEffect, useState } from 'react';
import { Check, RotateCcw, SkipForward, Trash2, AlertTriangle } from 'lucide-react';
import type { PlantAuditCount, PlantAuditCauseOfDeath } from '../../types';

interface AuditGroupRowProps {
  count: PlantAuditCount;
  onRecord: (physicalCount: number, cause?: PlantAuditCauseOfDeath, notes?: string) => Promise<void>;
  onMarkNotFound: (cause: PlantAuditCauseOfDeath, notes?: string) => Promise<void>;
  onSkip: (notes?: string) => Promise<void>;
  onReset: () => Promise<void>;
  disabled?: boolean;
}

const CAUSE_OPTIONS: { value: PlantAuditCauseOfDeath; label: string }[] = [
  { value: 'pest', label: 'Pest' },
  { value: 'disease', label: 'Disease' },
  { value: 'nutrient', label: 'Nutrient' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'cull_at_move', label: 'Culled at move' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Unknown' },
];

/**
 * AuditGroupRow — one plant group's walk-time count entry.
 *
 * Layout:
 *   [Strain · Stage]   DB: 24   [ 24 ] [✓] [✗ Not found] [⤼ Skip]
 *
 * On variance < 0 a cause_of_death selector expands. On variance > 0 we just
 * show the positive delta — no cause required. On zero variance the row turns
 * subtle green and locks.
 */
export function AuditGroupRow({
  count,
  onRecord,
  onMarkNotFound,
  onSkip,
  onReset,
  disabled,
}: AuditGroupRowProps) {
  const [physicalInput, setPhysicalInput] = useState<string>(
    count.physical_count != null ? String(count.physical_count) : '',
  );
  const [cause, setCause] = useState<PlantAuditCauseOfDeath>(
    count.cause_of_death ?? 'unknown',
  );
  const [notes, setNotes] = useState<string>(count.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [showNotFoundForm, setShowNotFoundForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep local state in sync if the count is reset from outside.
  useEffect(() => {
    setPhysicalInput(count.physical_count != null ? String(count.physical_count) : '');
    setCause(count.cause_of_death ?? 'unknown');
    setNotes(count.notes ?? '');
  }, [count.id, count.physical_count, count.cause_of_death, count.notes]);

  const dbCount = count.db_count_snapshot;
  const strainName =
    count.strain_name_snapshot ??
    count.plant_groups?.strains?.name ??
    count.strains?.name ??
    'Unknown';
  const stage = count.plant_groups?.growth_stage ?? null;
  const status = count.status;
  const isLocked =
    status === 'counted' ||
    status === 'variance_noted' ||
    status === 'not_found' ||
    status === 'skipped' ||
    status === 'orphan_created';

  const parsedPhysical = parseInt(physicalInput);
  const hasValidPhysical = !isNaN(parsedPhysical) && parsedPhysical >= 0;
  const liveVariance = hasValidPhysical ? parsedPhysical - dbCount : null;
  const needsCause = liveVariance !== null && liveVariance < 0;

  async function handleConfirm() {
    if (!hasValidPhysical || saving) return;
    if (needsCause && !cause) {
      setError('Cause of death required for negative variance');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onRecord(
        parsedPhysical,
        needsCause ? cause : undefined,
        notes.trim() || undefined,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save count');
    } finally {
      setSaving(false);
    }
  }

  async function handleNotFound() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onMarkNotFound(cause, notes.trim() || undefined);
      setShowNotFoundForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark not found');
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSkip(notes.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onReset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset');
    } finally {
      setSaving(false);
    }
  }

  // ──────────── status-driven shell class ────────────
  const shellClass = (() => {
    if (status === 'counted') {
      return 'bg-cult-success/10 border-cult-success/30';
    }
    if (status === 'variance_noted') {
      if (count.variance !== null && count.variance < 0) {
        return 'bg-cult-danger/10 border-cult-danger/30';
      }
      return 'bg-cult-info/10 border-cult-info/30';
    }
    if (status === 'not_found') {
      return 'bg-cult-danger/10 border-cult-danger/30';
    }
    if (status === 'skipped') {
      return 'bg-cult-warning/10 border-cult-warning/30';
    }
    if (status === 'orphan_created') {
      return 'bg-cult-pending/10 border-cult-pending/30';
    }
    return 'bg-white/[0.04] border-white/[0.10]';
  })();

  return (
    <div className={`rounded-cult border p-3 transition ${shellClass}`}>
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <div className="text-sm font-semibold text-cult-text-primary truncate">
            {strainName}
          </div>
          <div className="text-xs text-cult-text-secondary flex items-center gap-2 mt-0.5">
            {stage && (
              <span className="uppercase tracking-wider">{stage}</span>
            )}
            <span className="text-cult-text-muted">·</span>
            <span>DB: <span className="text-cult-text-primary font-medium">{dbCount}</span></span>
          </div>
        </div>

        {!isLocked && !showNotFoundForm && (
          <>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={physicalInput}
              onChange={(e) => setPhysicalInput(e.target.value)}
              disabled={disabled || saving}
              placeholder="Count"
              className="glass-input w-20 px-2 py-1.5 rounded-xl text-center text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
            />
            <button
              type="button"
              onClick={handleConfirm}
              disabled={disabled || saving || !hasValidPhysical}
              className="p-2 rounded-xl bg-cult-success/20 border border-cult-success/40 text-cult-success hover:bg-cult-success/30 transition disabled:opacity-40"
              title="Confirm count"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowNotFoundForm(true)}
              disabled={disabled || saving}
              className="p-2 rounded-xl bg-cult-danger/20 border border-cult-danger/40 text-cult-danger hover:bg-cult-danger/30 transition disabled:opacity-40"
              title="Not found"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={disabled || saving}
              className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.10] text-cult-text-secondary hover:bg-white/[0.08] transition disabled:opacity-40"
              title="Skip"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </>
        )}

        {isLocked && (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-sm font-bold text-cult-text-primary">
                {status === 'not_found'
                  ? 'Not found'
                  : status === 'skipped'
                    ? 'Skipped'
                    : status === 'orphan_created'
                      ? `+${count.physical_count ?? 0}`
                      : count.physical_count ?? 0}
              </div>
              {count.variance !== null && count.variance !== 0 && status !== 'orphan_created' && (
                <div
                  className={`text-xs font-medium ${
                    count.variance < 0 ? 'text-cult-danger' : 'text-cult-info'
                  }`}
                >
                  Δ {count.variance > 0 ? '+' : ''}
                  {count.variance}
                </div>
              )}
            </div>
            {status !== 'orphan_created' && (
              <button
                type="button"
                onClick={handleReset}
                disabled={disabled || saving}
                className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.10] text-cult-text-secondary hover:bg-white/[0.08] transition disabled:opacity-40"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Live variance banner while typing (unconfirmed) */}
      {!isLocked && !showNotFoundForm && liveVariance !== null && liveVariance !== 0 && (
        <div
          className={`mt-2 text-xs flex items-center gap-1.5 ${
            liveVariance < 0 ? 'text-cult-danger' : 'text-cult-info'
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          Variance: {liveVariance > 0 ? '+' : ''}
          {liveVariance}
          {liveVariance < 0 && ' — cause of death required'}
          {liveVariance > 0 && ' — extra plants will be added to this group'}
        </div>
      )}

      {/* Cause of death selector when typed variance is negative */}
      {!isLocked && !showNotFoundForm && needsCause && (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {CAUSE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setCause(opt.value)}
              className={`px-2 py-1 text-xs rounded-xl border transition ${
                cause === opt.value
                  ? 'bg-cult-danger/20 border-cult-danger/40 text-cult-danger'
                  : 'bg-white/[0.04] border-white/[0.10] text-cult-text-secondary hover:bg-white/[0.06]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Not-found confirmation form */}
      {!isLocked && showNotFoundForm && (
        <div className="mt-3 space-y-2 p-3 rounded-cult bg-cult-danger/10 border border-cult-danger/30">
          <div className="text-xs text-cult-danger font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" />
            Entire group missing — mark as not found?
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {CAUSE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCause(opt.value)}
                className={`px-2 py-1 text-xs rounded-xl border transition ${
                  cause === opt.value
                    ? 'bg-cult-danger/20 border-cult-danger/40 text-cult-danger'
                    : 'bg-white/[0.04] border-white/[0.10] text-cult-text-secondary hover:bg-white/[0.06]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="glass-input w-full px-2 py-1.5 rounded-xl text-sm text-cult-text-primary focus:border-cult-danger focus:ring-2 focus:ring-cult-danger/20"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleNotFound}
              disabled={saving}
              className="flex-1 px-3 py-1.5 rounded-xl bg-cult-danger text-white text-xs font-bold hover:bg-cult-danger/80 transition disabled:opacity-50"
            >
              Confirm Not Found
            </button>
            <button
              type="button"
              onClick={() => setShowNotFoundForm(false)}
              disabled={saving}
              className="px-3 py-1.5 rounded-xl border border-white/[0.15] text-cult-text-secondary text-xs hover:bg-white/[0.06] transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 text-xs text-cult-danger flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  );
}
