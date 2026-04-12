import { useState, useMemo } from 'react';
import { ArrowLeft, Search, RotateCcw, EyeOff, ChevronRight } from 'lucide-react';
import type { AuditSessionWithLines, AuditLine, VarianceReason, LineStatus } from '../../services/audit.service';

const VARIANCE_REASONS: { value: VarianceReason; label: string }[] = [
  { value: 'moisture_loss', label: 'Moisture loss' },
  { value: 'spillage', label: 'Spillage' },
  { value: 'measurement_error', label: 'Measurement error' },
  { value: 'waste', label: 'Waste' },
  { value: 'qc_sampling', label: 'QC sampling' },
  { value: 'coa_sampling', label: 'COA sampling' },
  { value: 'processing_loss', label: 'Processing loss' },
  { value: 'count_error', label: 'Count error' },
  { value: 'data_entry_error', label: 'Data entry error' },
  { value: 'moved_not_tracked', label: 'Moved (not tracked)' },
  { value: 'damage_disposal', label: 'Damage / disposal' },
  { value: 'theft_loss', label: 'Theft / loss' },
  { value: 'other', label: 'Other' },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-white/[0.06] text-cult-text-muted' },
  match: { label: 'Match', className: 'bg-cult-success/10 text-cult-success' },
  variance: { label: 'Variance', className: 'bg-cult-warning/10 text-cult-warning' },
  not_found: { label: 'Not Found', className: 'bg-cult-danger/10 text-cult-danger' },
  orphan: { label: 'Orphan', className: 'bg-purple-500/10 text-purple-400' },
};

type FilterKey = 'all' | LineStatus;

interface AuditCountingViewProps {
  session: AuditSessionWithLines;
  actionLoading: boolean;
  onBack: () => void;
  onRecordCount: (lineId: string, actualQty: number, opts?: { variance_reason?: VarianceReason; variance_notes?: string }) => Promise<void>;
  onMarkNotFound: (lineId: string) => Promise<void>;
  onResetLine: (lineId: string) => Promise<void>;
  onMoveToReview: () => void;
}

export function AuditCountingView({
  session,
  actionLoading,
  onBack,
  onRecordCount,
  onMarkNotFound,
  onResetLine,
  onMoveToReview,
}: AuditCountingViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [expandedLine, setExpandedLine] = useState<string | null>(null);

  const lines = session.lines;

  const filtered = useMemo(() => {
    let result = lines;
    if (filter !== 'all') {
      result = result.filter((l) => l.line_status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.package_id.toLowerCase().includes(q) ||
          l.product_name.toLowerCase().includes(q) ||
          (l.strain?.toLowerCase().includes(q) ?? false) ||
          (l.batch?.toLowerCase().includes(q) ?? false),
      );
    }
    return result;
  }, [lines, filter, search]);

  const counts = useMemo(() => {
    const c = { pending: 0, match: 0, variance: 0, not_found: 0, orphan: 0, total: lines.length };
    for (const l of lines) {
      if (l.line_status in c) (c as any)[l.line_status]++;
    }
    return c;
  }, [lines]);

  const pendingCount = counts.pending;
  const canReview = pendingCount === 0 && lines.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-white/[0.06] transition text-cult-text-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-cult-text-primary">
              {session.audit_number}
            </h2>
            <p className="text-xs text-cult-text-secondary">
              {session.selected_stages.join(', ')} · {lines.length} packages
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onMoveToReview}
          disabled={!canReview}
          className="px-5 py-2.5 rounded-xl bg-cult-accent text-cult-opaque-black font-bold text-sm hover:bg-cult-accent-hover transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          Move to Review
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-cult-border bg-cult-surface-raised p-3">
        <div className="flex items-center justify-between text-xs text-cult-text-secondary mb-2">
          <span>{counts.total - pendingCount} of {counts.total} counted</span>
          <span>
            {counts.match} match · {counts.variance} variance · {counts.not_found} not found
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden flex">
          {counts.match > 0 && (
            <div
              className="h-full bg-cult-success"
              style={{ width: `${(counts.match / counts.total) * 100}%` }}
            />
          )}
          {counts.variance > 0 && (
            <div
              className="h-full bg-cult-warning"
              style={{ width: `${(counts.variance / counts.total) * 100}%` }}
            />
          )}
          {counts.not_found > 0 && (
            <div
              className="h-full bg-cult-danger"
              style={{ width: `${(counts.not_found / counts.total) * 100}%` }}
            />
          )}
          {counts.orphan > 0 && (
            <div
              className="h-full bg-purple-500"
              style={{ width: `${(counts.orphan / counts.total) * 100}%` }}
            />
          )}
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packages…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/[0.10] bg-white/[0.03] text-sm text-cult-text-primary placeholder:text-cult-text-muted focus:outline-none focus:border-cult-accent/50"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'pending', 'match', 'variance', 'not_found', 'orphan'] as FilterKey[]).map((f) => {
            const count = f === 'all' ? counts.total : (counts as any)[f] ?? 0;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filter === f
                    ? 'bg-cult-accent/15 text-cult-accent border border-cult-accent/30'
                    : 'bg-white/[0.03] text-cult-text-muted border border-transparent hover:bg-white/[0.06]'
                }`}
              >
                {f === 'all' ? 'All' : f === 'not_found' ? 'Not Found' : f.charAt(0).toUpperCase() + f.slice(1)}{' '}
                <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lines */}
      <div className="rounded-2xl border border-cult-border bg-cult-surface-raised overflow-hidden divide-y divide-white/[0.06]">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-cult-text-muted text-sm">
            {search ? 'No matches for search' : 'No lines in this filter'}
          </div>
        ) : (
          filtered.map((line) => (
            <AuditLineRow
              key={line.id}
              line={line}
              expanded={expandedLine === line.id}
              actionLoading={actionLoading}
              onToggle={() => setExpandedLine(expandedLine === line.id ? null : line.id)}
              onRecordCount={onRecordCount}
              onMarkNotFound={onMarkNotFound}
              onResetLine={onResetLine}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Line Row ────────────────────────────────────────────────────────

interface AuditLineRowProps {
  line: AuditLine;
  expanded: boolean;
  actionLoading: boolean;
  onToggle: () => void;
  onRecordCount: (lineId: string, actualQty: number, opts?: { variance_reason?: VarianceReason; variance_notes?: string }) => Promise<void>;
  onMarkNotFound: (lineId: string) => Promise<void>;
  onResetLine: (lineId: string) => Promise<void>;
}

function AuditLineRow({ line, expanded, actionLoading, onToggle, onRecordCount, onMarkNotFound, onResetLine }: AuditLineRowProps) {
  const [actualInput, setActualInput] = useState(line.actual_qty?.toString() ?? '');
  const [reason, setReason] = useState<VarianceReason | ''>(line.variance_reason ?? '');
  const [notes, setNotes] = useState(line.variance_notes ?? '');

  const badge = STATUS_BADGE[line.line_status] ?? STATUS_BADGE.pending;

  function handleConfirmCount() {
    const qty = parseFloat(actualInput);
    if (isNaN(qty) || qty < 0) return;
    onRecordCount(line.id, qty, {
      variance_reason: reason || undefined,
      variance_notes: notes.trim() || undefined,
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-3 hover:bg-white/[0.03] transition text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-cult-text-primary truncate">
              {line.package_id}
            </span>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <div className="text-xs text-cult-text-secondary mt-0.5 truncate">
            {line.product_name}
            {line.strain && ` · ${line.strain}`}
            {line.stage && ` · ${line.stage}`}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-mono text-cult-text-primary">
            {line.expected_qty} {line.unit}
          </div>
          {line.actual_qty != null && (
            <div className={`text-xs font-mono ${line.variance_qty === 0 ? 'text-cult-success' : 'text-cult-warning'}`}>
              → {line.actual_qty} {line.unit}
              {line.variance_qty != null && line.variance_qty !== 0 && (
                <span className="ml-1">
                  ({line.variance_qty > 0 ? '+' : ''}{line.variance_qty})
                </span>
              )}
            </div>
          )}
        </div>
      </button>

      {expanded && line.line_status === 'pending' && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/[0.04] pt-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-cult-text-muted uppercase tracking-wider block mb-1">
                Actual Qty ({line.unit})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={actualInput}
                onChange={(e) => setActualInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.04] text-sm text-cult-text-primary font-mono focus:outline-none focus:border-cult-accent/50"
                placeholder={line.expected_qty.toString()}
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-cult-text-muted uppercase tracking-wider block mb-1">
                Reason (if variance)
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as VarianceReason | '')}
                className="w-full px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.04] text-sm text-cult-text-primary focus:outline-none focus:border-cult-accent/50"
              >
                <option value="">—</option>
                {VARIANCE_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.04] text-sm text-cult-text-primary placeholder:text-cult-text-muted focus:outline-none focus:border-cult-accent/50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmCount}
              disabled={!actualInput || actionLoading}
              className="px-4 py-2 rounded-lg bg-cult-accent text-cult-opaque-black font-bold text-xs hover:bg-cult-accent-hover transition disabled:opacity-40"
            >
              Confirm Count
            </button>
            <button
              type="button"
              onClick={() => onMarkNotFound(line.id)}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg border border-cult-danger/30 text-cult-danger text-xs font-bold hover:bg-cult-danger/10 transition disabled:opacity-40"
            >
              <EyeOff className="w-3 h-3 inline mr-1" />
              Not Found
            </button>
          </div>
        </div>
      )}

      {expanded && line.line_status !== 'pending' && (
        <div className="px-3 pb-3 border-t border-white/[0.04] pt-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-cult-text-secondary">
              {line.variance_reason && <span className="capitalize">{line.variance_reason.replace(/_/g, ' ')}</span>}
              {line.variance_notes && <span className="ml-2 text-cult-text-muted">— {line.variance_notes}</span>}
              {line.counted_at && (
                <span className="ml-2 text-cult-text-muted">
                  counted {new Date(line.counted_at).toLocaleString()}
                </span>
              )}
            </div>
            {(line.line_status === 'match' || line.line_status === 'variance' || line.line_status === 'not_found') && (
              <button
                type="button"
                onClick={() => onResetLine(line.id)}
                disabled={actionLoading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-cult-text-muted hover:text-cult-text-primary hover:bg-white/[0.06] transition disabled:opacity-40"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
