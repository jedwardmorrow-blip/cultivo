import { useState } from 'react';
import { ArrowLeft, AlertTriangle, Check, Loader2 } from 'lucide-react';
import type { AuditSessionWithLines, AuditLine, AuditApplySummary } from '../../services/audit.service';

interface AuditReviewApplyProps {
  session: AuditSessionWithLines;
  actionLoading: boolean;
  error: string | null;
  onBack: () => void;
  onApply: () => Promise<AuditApplySummary>;
  onAbandon: (reason?: string) => Promise<void>;
  onBackToHub: () => void;
}

function gramsToLbs(g: number): string {
  return (g / 453.592).toFixed(2);
}

export function AuditReviewApply({
  session,
  actionLoading,
  error,
  onBack,
  onApply,
  onAbandon,
  onBackToHub,
}: AuditReviewApplyProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [abandonReason, setAbandonReason] = useState('');
  const [applySummary, setApplySummary] = useState<AuditApplySummary | null>(null);

  const lines = session.lines;
  const isApplied = session.status === 'applied' || session.status === 'completed';
  const isAbandoned = session.status === 'abandoned';
  const isTerminal = isApplied || isAbandoned;

  // Summary stats
  const matches = lines.filter((l) => l.line_status === 'match');
  const variances = lines.filter((l) => l.line_status === 'variance');
  const notFound = lines.filter((l) => l.line_status === 'not_found');
  const orphans = lines.filter((l) => l.line_status === 'orphan');
  const pending = lines.filter((l) => l.line_status === 'pending');

  // Variance lines missing reasons (blocks apply)
  const variancesMissingReason = variances.filter((l) => !l.variance_reason);
  const canApply = pending.length === 0 && variancesMissingReason.length === 0 && !isTerminal;

  const netVariance = lines.reduce((sum, l) => sum + (l.variance_qty ?? 0), 0);

  async function handleApply() {
    try {
      const summary = await onApply();
      setApplySummary(summary);
      setConfirmOpen(false);
    } catch {
      // Close modal so the error banner behind it becomes visible
      setConfirmOpen(false);
    }
  }

  async function handleAbandon() {
    await onAbandon(abandonReason.trim() || undefined);
    setAbandonOpen(false);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={isTerminal ? onBackToHub : onBack}
          className="p-2 rounded-xl hover:bg-cult-surface-raised transition text-cult-text-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-cult-text-primary">
            {session.audit_number} — {isApplied ? 'Applied' : isAbandoned ? 'Abandoned' : 'Review'}
          </h2>
          <p className="text-xs text-cult-text-secondary">
            {session.selected_stages.join(', ')} · {lines.length} packages
          </p>
        </div>
      </div>

      {/* Applied summary banner */}
      {(isApplied || applySummary) && (
        <div className="rounded-xl border border-cult-success/30 bg-cult-success/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-5 h-5 text-cult-success" />
            <span className="text-sm font-bold text-cult-success">Audit Applied Successfully</span>
          </div>
          {applySummary && (
            <div className="text-xs text-cult-text-secondary space-y-0.5">
              <p>{applySummary.movements_written} inventory movements written</p>
              <p>{applySummary.variances_logged} variance log entries created</p>
              <p>Net variance: {applySummary.net_variance_qty > 0 ? '+' : ''}{applySummary.net_variance_qty}g ({gramsToLbs(applySummary.net_variance_qty)} lbs)</p>
            </div>
          )}
        </div>
      )}

      {isAbandoned && (
        <div className="rounded-xl border border-cult-border bg-cult-surface-subtle p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-cult-text-muted" />
            <span className="text-sm font-bold text-cult-text-muted">Audit Abandoned</span>
          </div>
          {session.notes && (
            <p className="text-xs text-cult-text-muted mt-1">{session.notes}</p>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && !isTerminal && (
        <div className="rounded-xl border border-cult-danger/30 bg-cult-danger/10 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-cult-danger" />
            <span className="text-sm font-bold text-cult-danger">Failed to apply audit</span>
          </div>
          <p className="text-xs text-cult-text-secondary mt-1">{error}</p>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Match" value={matches.length} color="text-cult-success" />
        <StatCard label="Variance" value={variances.length} color="text-cult-warning" />
        <StatCard label="Not Found" value={notFound.length} color="text-cult-danger" />
        <StatCard label="Orphan" value={orphans.length} color="text-purple-400" />
      </div>

      {/* Net variance */}
      <div className="rounded-xl border border-cult-border bg-cult-surface-raised p-4 flex items-center justify-between">
        <span className="text-sm text-cult-text-secondary">Net variance</span>
        <span className={`text-lg font-bold font-mono ${netVariance === 0 ? 'text-cult-success' : 'text-cult-warning'}`}>
          {netVariance > 0 ? '+' : ''}{netVariance}g
          <span className="text-xs text-cult-text-muted ml-2">({gramsToLbs(netVariance)} lbs)</span>
        </span>
      </div>

      {/* Blocking warnings */}
      {pending.length > 0 && !isTerminal && (
        <div className="rounded-xl border border-cult-warning/30 bg-cult-warning/10 p-3 text-sm text-cult-warning">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          {pending.length} line{pending.length > 1 ? 's' : ''} still pending — go back and count them before applying.
        </div>
      )}
      {variancesMissingReason.length > 0 && !isTerminal && (
        <div className="rounded-xl border border-cult-warning/30 bg-cult-warning/10 p-3 text-sm text-cult-warning">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          {variancesMissingReason.length} variance line{variancesMissingReason.length > 1 ? 's' : ''} missing a reason — go back and assign reasons.
        </div>
      )}

      {/* Variance detail table */}
      {(variances.length > 0 || notFound.length > 0) && (
        <div className="rounded-2xl border border-cult-border bg-cult-surface-raised overflow-hidden">
          <div className="px-4 py-3 border-b border-cult-border-subtle bg-cult-surface-inset">
            <div className="text-sm font-bold text-cult-text-primary uppercase tracking-wider">
              Variance Detail
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cult-border-subtle">
                  <th className="text-left px-4 py-2 text-[10px] font-bold text-cult-text-muted uppercase tracking-wider">Package</th>
                  <th className="text-left px-4 py-2 text-[10px] font-bold text-cult-text-muted uppercase tracking-wider">Batch</th>
                  <th className="text-left px-4 py-2 text-[10px] font-bold text-cult-text-muted uppercase tracking-wider">Product</th>
                  <th className="text-right px-4 py-2 text-[10px] font-bold text-cult-text-muted uppercase tracking-wider">Expected</th>
                  <th className="text-right px-4 py-2 text-[10px] font-bold text-cult-text-muted uppercase tracking-wider">Actual</th>
                  <th className="text-right px-4 py-2 text-[10px] font-bold text-cult-text-muted uppercase tracking-wider">Variance</th>
                  <th className="text-left px-4 py-2 text-[10px] font-bold text-cult-text-muted uppercase tracking-wider">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cult-border-faint">
                {[...variances, ...notFound].map((l) => (
                  <tr key={l.id} className="hover:bg-cult-surface-inset">
                    <td className="px-4 py-2 font-mono text-cult-text-primary">{l.package_id}</td>
                    <td className="px-4 py-2 font-mono text-cult-text-muted text-xs">{l.batch ?? '—'}</td>
                    <td className="px-4 py-2 text-cult-text-secondary truncate max-w-[200px]">{l.product_name}</td>
                    <td className="px-4 py-2 text-right font-mono text-cult-text-secondary">{l.expected_qty}</td>
                    <td className="px-4 py-2 text-right font-mono text-cult-text-primary">{l.actual_qty ?? '—'}</td>
                    <td className={`px-4 py-2 text-right font-mono ${(l.variance_qty ?? 0) < 0 ? 'text-cult-danger' : 'text-cult-warning'}`}>
                      {l.variance_qty != null ? (l.variance_qty > 0 ? '+' : '') + l.variance_qty : '—'}
                    </td>
                    <td className="px-4 py-2 text-cult-text-muted capitalize text-xs">
                      {l.variance_reason?.replace(/_/g, ' ') ?? (
                        <span className="text-cult-warning">missing</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      {!isTerminal && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => setAbandonOpen(true)}
            className="px-4 py-2 rounded-xl border border-cult-danger/30 text-cult-danger text-sm font-bold hover:bg-cult-danger/10 transition"
          >
            Abandon Audit
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={!canApply || actionLoading}
            className="px-6 py-2.5 rounded-xl bg-cult-accent text-cult-opaque-black font-bold text-sm hover:bg-cult-accent-hover transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Apply Audit
          </button>
        </div>
      )}

      {isTerminal && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onBackToHub}
            className="px-5 py-2.5 rounded-xl border border-cult-border text-cult-text-secondary font-medium text-sm hover:bg-cult-surface-raised transition"
          >
            Back to Audit Hub
          </button>
        </div>
      )}

      {/* Confirm apply modal */}
      {confirmOpen && (
        <ConfirmModal
          title="Apply Audit Adjustments"
          message={`This will write ${variances.length + notFound.length} inventory movement(s) and update on-hand quantities. This cannot be undone.`}
          confirmLabel="Apply"
          loading={actionLoading}
          onConfirm={handleApply}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      {/* Abandon modal */}
      {abandonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAbandonOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-cult-border bg-cult-opaque-near-black p-6 shadow-2xl">
            <h3 className="text-base font-bold text-cult-text-primary mb-2">Abandon Audit</h3>
            <p className="text-sm text-cult-text-secondary mb-4">
              This will mark the audit as abandoned. No adjustments will be applied.
            </p>
            <textarea
              value={abandonReason}
              onChange={(e) => setAbandonReason(e.target.value)}
              rows={2}
              placeholder="Reason (optional)"
              className="w-full px-3 py-2 rounded-xl border border-cult-border bg-cult-surface-subtle text-sm text-cult-text-primary placeholder:text-cult-text-muted resize-none focus:outline-none focus:border-cult-accent/50 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAbandonOpen(false)}
                className="px-4 py-2 rounded-xl text-sm text-cult-text-secondary hover:text-cult-text-primary transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAbandon}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-cult-danger text-white font-bold text-sm hover:bg-cult-danger/80 transition disabled:opacity-40 flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Abandon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-cult-border bg-cult-surface-raised p-3 text-center">
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      <div className="text-[10px] font-bold text-cult-text-muted uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  loading,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-cult-border bg-cult-opaque-near-black p-6 shadow-2xl">
        <h3 className="text-base font-bold text-cult-text-primary mb-2">{title}</h3>
        <p className="text-sm text-cult-text-secondary mb-5">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm text-cult-text-secondary hover:text-cult-text-primary transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-cult-accent text-cult-opaque-black font-bold text-sm hover:bg-cult-accent-hover transition disabled:opacity-40 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
