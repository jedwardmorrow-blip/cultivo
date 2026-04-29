import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { useAuditLineItems } from '../hooks/useAuditLineItems';
import { useAuth } from '@/lib/auth';
import type { AuditLineItem, AuditVarianceStatus } from '@/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatG(g: number | null | undefined): string {
  if (g == null) return '—';
  return `${g.toLocaleString('en-US', { maximumFractionDigits: 1 })} g`;
}

const STATUS_CONFIG: Record<AuditVarianceStatus, { label: string; bg: string; text: string }> = {
  within_scale_tolerance: { label: 'Tolerance', bg: 'bg-cult-success-muted border-cult-success/30', text: 'text-cult-success' },
  requires_explanation:   { label: 'Needs Explanation', bg: 'bg-cult-warning-muted border-cult-warning/30', text: 'text-cult-warning' },
  flagged:                { label: 'Flagged', bg: 'bg-cult-danger-muted border-cult-danger/30', text: 'text-cult-danger' },
  resolved:               { label: 'Resolved', bg: 'bg-cult-info-muted border-cult-info/30', text: 'text-cult-info' },
};

function StatusBadge({ status }: { status: AuditVarianceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

// ─── Line Item Row ──────────────────────────────────────────────────────────

interface LineItemRowProps {
  item: AuditLineItem;
  isSupervisor: boolean;
  onUpdate: (id: string, changes: Record<string, unknown>) => Promise<void>;
}

function LineItemRow({ item, isSupervisor, onUpdate }: LineItemRowProps) {
  const [expanded, setExpanded] = useState(
    item.variance_status === 'requires_explanation' || item.variance_status === 'flagged'
  );
  const [explanation, setExplanation] = useState(item.explanation ?? '');
  const [correctiveAction, setCorrectiveAction] = useState(item.corrective_action ?? '');
  const [criminalFlag, setCriminalFlag] = useState(item.criminal_activity_flag);
  const [saving, setSaving] = useState(false);

  const needsExplanation =
    item.variance_status === 'requires_explanation' || item.variance_status === 'flagged';
  const varianceAbs = Math.abs(item.variance_g);
  const showCriminalFlag = isSupervisor && varianceAbs >= 50;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onUpdate(item.id, {
        explanation: explanation || null,
        corrective_action: correctiveAction || null,
        criminal_activity_flag: criminalFlag,
        ...(explanation.trim() && correctiveAction.trim() && needsExplanation
          ? { variance_status: 'resolved' as const, resolved_at: new Date().toISOString() }
          : {}),
      });
    } finally {
      setSaving(false);
    }
  }, [item.id, explanation, correctiveAction, criminalFlag, needsExplanation, onUpdate]);

  return (
    <>
      <tr
        className="border-b border-cult-surface-raised/40 hover:bg-cult-surface-raised/20 cursor-pointer"
        onClick={() => needsExplanation && setExpanded(e => !e)}
      >
        <td className="px-3 py-2.5 text-[12px] text-cult-text-muted w-6">
          {needsExplanation && (expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
        </td>
        <td className="px-3 py-2.5 text-[12px] text-cult-text-primary font-mono">{item.product_name}</td>
        <td className="px-3 py-2.5 text-[12px] text-cult-text-muted tabular-nums text-right">{formatG(item.expected_qty)}</td>
        <td className="px-3 py-2.5 text-[12px] text-cult-text-muted tabular-nums text-right">{formatG(item.actual_qty)}</td>
        <td className={`px-3 py-2.5 text-[12px] tabular-nums text-right font-medium ${
          item.variance_g < -0.5 ? 'text-cult-danger' : item.variance_g > 0.5 ? 'text-cult-warning' : 'text-cult-success'
        }`}>
          {item.variance_g >= 0 ? '+' : ''}{formatG(item.variance_g)}
        </td>
        <td className="px-3 py-2.5"><StatusBadge status={item.variance_status} /></td>
      </tr>

      {expanded && needsExplanation && (
        <tr className="border-b border-cult-surface-raised/40">
          <td colSpan={6} className="px-3 py-3">
            <div className="ml-6 space-y-3 bg-cult-surface-raised/30 rounded p-3">
              <div>
                <label className="block text-[10px] text-cult-text-muted uppercase tracking-wider mb-1">
                  Explanation <span className="text-cult-danger">*</span>
                </label>
                <textarea
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  rows={2}
                  placeholder="Explain the cause of the variance..."
                  className="w-full bg-cult-surface-raised border border-cult-border text-cult-text-primary px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-cult-accent rounded resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-cult-text-muted uppercase tracking-wider mb-1">
                  Corrective Action <span className="text-cult-danger">*</span>
                </label>
                <textarea
                  value={correctiveAction}
                  onChange={e => setCorrectiveAction(e.target.value)}
                  rows={2}
                  placeholder="Steps taken or planned to prevent recurrence..."
                  className="w-full bg-cult-surface-raised border border-cult-border text-cult-text-primary px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-cult-accent rounded resize-none"
                />
              </div>

              {showCriminalFlag && (
                <label className="flex items-center gap-2 p-2 bg-cult-danger-muted border border-cult-danger/30 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criminalFlag}
                    onChange={e => setCriminalFlag(e.target.checked)}
                    className="accent-red-500"
                  />
                  <Shield className="w-3.5 h-3.5 text-cult-danger" />
                  <span className="text-[11px] text-cult-danger/80">Flag suspected criminal activity (supervisor only)</span>
                </label>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving || !explanation.trim() || !correctiveAction.trim()}
                  className="px-3 py-1.5 text-[11px] bg-cult-accent text-cult-black font-semibold rounded hover:bg-cult-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save & Resolve'}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface AuditReconciliationTableProps {
  auditId: string;
  onAllResolved?: (resolved: boolean) => void;
}

export function AuditReconciliationTable({ auditId, onAllResolved }: AuditReconciliationTableProps) {
  const { lineItems, loading, error, updateLineItem } = useAuditLineItems(auditId);
  const { profile } = useAuth();
  const isSupervisor = profile?.role === 'admin' || profile?.role === 'manager';

  // Check if all items that need explanation are resolved
  const unresolvedCount = lineItems.filter(
    li => (li.variance_status === 'requires_explanation' || li.variance_status === 'flagged')
  ).length;

  // Notify parent of resolution state
  if (onAllResolved) {
    onAllResolved(unresolvedCount === 0);
  }

  const counts = {
    total: lineItems.length,
    tolerance: lineItems.filter(li => li.variance_status === 'within_scale_tolerance').length,
    needsExplanation: lineItems.filter(li => li.variance_status === 'requires_explanation').length,
    flagged: lineItems.filter(li => li.variance_status === 'flagged').length,
    resolved: lineItems.filter(li => li.variance_status === 'resolved').length,
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-cult-surface-raised rounded" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-cult-danger-muted border border-cult-danger/40 rounded">
        <AlertTriangle className="w-5 h-5 text-cult-danger flex-shrink-0" />
        <div>
          <div className="text-[13px] text-cult-danger/80 font-medium">Failed to load line items</div>
          <div className="text-[12px] text-cult-danger mt-0.5">{error}</div>
        </div>
      </div>
    );
  }

  if (lineItems.length === 0) {
    return (
      <div className="text-center py-8 text-[13px] text-cult-text-muted">
        No line items for this audit.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        <span className="text-[11px] text-cult-text-muted">{counts.total} items</span>
        {counts.tolerance > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-cult-success-muted border border-cult-success/30 text-cult-success">
            <CheckCircle className="w-3 h-3" /> {counts.tolerance} within tolerance
          </span>
        )}
        {counts.needsExplanation > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-cult-warning-muted border border-cult-warning/30 text-cult-warning">
            <AlertTriangle className="w-3 h-3" /> {counts.needsExplanation} need explanation
          </span>
        )}
        {counts.flagged > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-cult-danger-muted border border-cult-danger/30 text-cult-danger">
            <AlertTriangle className="w-3 h-3" /> {counts.flagged} flagged
          </span>
        )}
        {counts.resolved > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-cult-info-muted border border-cult-info/30 text-cult-info">
            <CheckCircle className="w-3 h-3" /> {counts.resolved} resolved
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded border border-cult-border/40">
        <table className="w-full">
          <thead>
            <tr className="bg-cult-surface-raised/60 border-b border-cult-border/40">
              <th className="w-6" />
              <th className="px-3 py-2 text-left text-[10px] text-cult-text-muted uppercase tracking-wider">Batch / Product</th>
              <th className="px-3 py-2 text-right text-[10px] text-cult-text-muted uppercase tracking-wider">Expected</th>
              <th className="px-3 py-2 text-right text-[10px] text-cult-text-muted uppercase tracking-wider">Actual</th>
              <th className="px-3 py-2 text-right text-[10px] text-cult-text-muted uppercase tracking-wider">Variance</th>
              <th className="px-3 py-2 text-left text-[10px] text-cult-text-muted uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map(item => (
              <LineItemRow
                key={item.id}
                item={item}
                isSupervisor={isSupervisor}
                onUpdate={updateLineItem}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
