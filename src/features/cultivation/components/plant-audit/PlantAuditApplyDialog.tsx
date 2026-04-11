import { useState } from 'react';
import { AlertTriangle, Check, XCircle } from 'lucide-react';
import type { PlantAuditSummary } from '../../types';

interface PlantAuditApplyDialogProps {
  auditNumber: string;
  totalDeaths: number;
  totalAdded: number;
  onApply: () => Promise<PlantAuditSummary>;
  onAbandon: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Apply confirmation — final, destructive. Writes mortality rows, increments
 * plant_groups.plant_count, and transitions the session to 'applied'.
 */
export function PlantAuditApplyDialog({
  auditNumber,
  totalDeaths,
  totalAdded,
  onApply,
  onAbandon,
  onCancel,
}: PlantAuditApplyDialogProps) {
  const [applying, setApplying] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  async function handleApply() {
    setApplying(true);
    setError(null);
    try {
      await onApply();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply audit');
      setApplying(false);
    }
  }

  async function handleAbandon() {
    setAbandoning(true);
    setError(null);
    try {
      await onAbandon();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to abandon audit');
      setAbandoning(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal rounded-cult shadow-glass-lg max-w-md w-full border border-cult-danger/30 shadow-glow-danger">
        <div className="px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-cult-warning" />
            <div>
              <h2 className="text-lg font-bold text-cult-text-primary uppercase tracking-wide">
                Apply Audit
              </h2>
              <p className="text-xs text-cult-text-secondary mt-0.5">
                {auditNumber}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-cult-text-primary">
            This is final. On apply, CULT will:
          </p>

          <ul className="space-y-2 text-sm">
            {totalDeaths > 0 && (
              <li className="flex items-start gap-2 text-cult-text-secondary">
                <span className="text-cult-danger font-bold">-{totalDeaths}</span>
                <span>plants logged as mortality across affected groups</span>
              </li>
            )}
            {totalAdded > 0 && (
              <li className="flex items-start gap-2 text-cult-text-secondary">
                <span className="text-cult-info font-bold">+{totalAdded}</span>
                <span>plants added via positive variance + orphan groups</span>
              </li>
            )}
            {totalDeaths === 0 && totalAdded === 0 && (
              <li className="flex items-start gap-2 text-cult-text-secondary">
                <Check className="w-4 h-4 text-cult-success mt-0.5 flex-shrink-0" />
                <span>No inventory changes — clean audit</span>
              </li>
            )}
          </ul>

          <div className="bg-cult-danger/10 border border-cult-danger/30 rounded-cult p-3 text-xs text-cult-danger">
            This cannot be reversed. The session will be locked as{' '}
            <span className="font-bold">applied</span> and the counts will become
            the permanent plant_groups baseline.
          </div>

          {error && (
            <div className="bg-cult-danger/10 border border-cult-danger/40 rounded-cult p-3 flex items-start gap-2 text-sm text-cult-danger">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 space-y-2">
          <button
            type="button"
            onClick={handleApply}
            disabled={applying || abandoning}
            className="w-full px-5 py-3 rounded-xl bg-cult-success text-cult-opaque-black font-bold hover:bg-cult-success-bright transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {applying ? 'Applying…' : 'Apply Audit'}
          </button>

          {!confirmAbandon ? (
            <button
              type="button"
              onClick={() => setConfirmAbandon(true)}
              disabled={applying || abandoning}
              className="w-full px-5 py-2 rounded-xl border border-white/[0.15] text-cult-text-secondary text-sm hover:bg-white/[0.06] hover:text-cult-danger transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              Abandon Audit
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-cult-warning text-center">
                Abandon will discard all counts. Are you sure?
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAbandon}
                  disabled={applying || abandoning}
                  className="flex-1 px-5 py-2 rounded-xl bg-cult-danger text-white text-sm font-bold hover:bg-cult-danger/80 transition disabled:opacity-50"
                >
                  {abandoning ? 'Abandoning…' : 'Yes, abandon'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAbandon(false)}
                  disabled={applying || abandoning}
                  className="flex-1 px-5 py-2 rounded-xl border border-white/[0.15] text-cult-text-primary text-sm hover:bg-white/[0.06] transition disabled:opacity-50"
                >
                  No, keep it
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onCancel}
            disabled={applying || abandoning}
            className="w-full px-5 py-2 rounded-xl text-cult-text-muted text-sm hover:text-cult-text-secondary transition disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
