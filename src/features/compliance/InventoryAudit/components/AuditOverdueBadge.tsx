import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useInventoryAuditStatus } from '../hooks/useInventoryAuditStatus';

/**
 * Reusable badge showing compliance audit clock status.
 * Reads from inventory_audit_status view (CUL-359 DB dependency).
 *
 * States:
 *   current  (< 28 days): subtle gray chip "Last audit: X days ago"
 *   warning  (28-30 days): yellow badge "Audit due in X days"
 *   overdue  (> 30 days):  red badge   "AUDIT OVERDUE — X days"
 */
export function AuditOverdueBadge() {
  const { status, loading } = useInventoryAuditStatus();

  if (loading) {
    return (
      <div className="h-6 w-36 bg-cult-surface-raised/40 rounded animate-pulse" />
    );
  }

  // View not deployed yet or no audits on record
  if (!status) return null;

  const { days_since_last_audit, audit_clock_status } = status;

  if (audit_clock_status === 'overdue') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cult-danger-muted border border-cult-danger/40 rounded text-[11px] font-bold text-cult-danger uppercase tracking-wider">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        AUDIT OVERDUE — {days_since_last_audit ?? '?'} days
      </div>
    );
  }

  if (audit_clock_status === 'warning') {
    const daysLeft = 30 - (days_since_last_audit ?? 30);
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cult-warning-muted border border-cult-warning/30 rounded text-[11px] font-semibold text-cult-warning">
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        Audit due in {Math.max(0, daysLeft)} day{daysLeft !== 1 ? 's' : ''}
      </div>
    );
  }

  // current
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cult-surface-raised/40 border border-cult-border/40 rounded text-[11px] text-cult-text-muted">
      <CheckCircle className="w-3 h-3 flex-shrink-0" />
      Last audit: {days_since_last_audit ?? '?'} days ago
    </div>
  );
}
