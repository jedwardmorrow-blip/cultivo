import { useState } from 'react';
import { Download, ChevronLeft, ChevronRight, Filter, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useAuditHistory } from '../hooks/useAuditHistory';
import { AuditWorkflowModal } from './AuditWorkflowModal';
import { useInventoryAuditStatus } from '../hooks/useInventoryAuditStatus';
import type { InventoryAudit } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatG(g: number | null): string {
  if (g == null) return '—';
  return `${g.toLocaleString('en-US', { maximumFractionDigits: 1 })} g`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function StatusBadge({ status }: { status: InventoryAudit['status'] }) {
  const styles: Record<string, string> = {
    completed: 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30',
    flagged:   'bg-red-900/30 text-red-400 border-red-500/30',
    cancelled: 'bg-cult-charcoal text-cult-text-muted border-cult-medium-gray/40',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold uppercase tracking-wider ${styles[status] ?? styles.cancelled}`}>
      {status}
    </span>
  );
}

function exportToCSV(audits: InventoryAudit[]) {
  const headers = [
    'Audit #', 'Period Start', 'Period End', 'Auditor',
    'Calculated End (g)', 'Physical End (g)', 'Variance (g)',
    'Status', 'Date Completed',
  ];

  const rows = audits.map(a => [
    a.audit_number ?? '',
    a.period_start ?? '',
    a.period_end ?? '',
    a.auditor_name ?? '',
    a.calculated_ending_balance_g?.toString() ?? '',
    a.physical_ending_inventory_g?.toString() ?? '',
    a.variance_g?.toString() ?? '',
    a.status,
    a.completed_at ? new Date(a.completed_at).toISOString().slice(0, 10) : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inventory-audit-history-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AuditHistoryTable() {
  const { isAdmin, isManager } = useAuth();
  const canView = isAdmin || isManager;

  const {
    audits, loading, error, total, page, setPage,
    filters, setFilters, submitAudit, refresh,
  } = useAuditHistory();

  const { status: auditStatus } = useInventoryAuditStatus();

  const [showModal, setShowModal] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!canView) {
    return (
      <div className="p-8 text-center text-cult-text-muted text-[13px]">
        Audit history is restricted to admin and manager roles.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-5 h-5 text-cult-accent" />
          <h2 className="text-[14px] font-semibold text-cult-white uppercase tracking-wider">
            Inventory Audit History
          </h2>
          <span className="text-[11px] text-cult-text-muted">({total} records)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(audits)}
            disabled={audits.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] border border-cult-medium-gray text-cult-lighter-gray rounded hover:bg-cult-charcoal disabled:opacity-40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-cult-accent text-cult-black font-semibold rounded hover:bg-cult-accent/90 transition-colors"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            New Audit
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-cult-near-black border border-cult-dark-gray rounded">
        <Filter className="w-3.5 h-3.5 text-cult-text-muted" />

        <div className="flex items-center gap-2">
          <label className="text-[11px] text-cult-text-muted">Status:</label>
          <select
            value={filters.status ?? 'all'}
            onChange={e => setFilters({ ...filters, status: e.target.value as 'all' | 'completed' | 'flagged' })}
            className="bg-cult-charcoal border border-cult-medium-gray text-cult-white text-[12px] px-2 py-1 rounded focus:outline-none focus:border-cult-accent"
          >
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] text-cult-text-muted">From:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setFilters({ ...filters, dateFrom: e.target.value || undefined }); }}
            className="bg-cult-charcoal border border-cult-medium-gray text-cult-white text-[12px] px-2 py-1 rounded focus:outline-none focus:border-cult-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] text-cult-text-muted">To:</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setFilters({ ...filters, dateTo: e.target.value || undefined }); }}
            className="bg-cult-charcoal border border-cult-medium-gray text-cult-white text-[12px] px-2 py-1 rounded focus:outline-none focus:border-cult-accent"
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded text-[13px] text-red-300">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-cult-charcoal rounded" />
          ))}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-cult-medium-gray">
                {['Audit Period', 'Auditor', 'Calculated End', 'Physical End', 'Variance', 'Status', 'Completed'].map(h => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-[10px] text-cult-text-muted uppercase tracking-wider font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-cult-text-muted">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                audits.map(audit => {
                  const varianceG = audit.variance_g;
                  const varClass = varianceG == null
                    ? 'text-cult-text-muted'
                    : Math.abs(varianceG) < 0.001
                    ? 'text-emerald-400'
                    : 'text-red-400';

                  return (
                    <tr
                      key={audit.id}
                      className="border-b border-cult-charcoal/40 hover:bg-cult-charcoal/20 transition-colors"
                    >
                      <td className="px-3 py-3 text-cult-white">
                        <div>{formatDate(audit.period_start)}</div>
                        <div className="text-[11px] text-cult-text-muted">
                          → {formatDate(audit.period_end)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-cult-lighter-gray">
                        {audit.auditor_name ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-cult-text-primary tabular-nums">
                        {formatG(audit.calculated_ending_balance_g)}
                      </td>
                      <td className="px-3 py-3 text-cult-text-primary tabular-nums">
                        {formatG(audit.physical_ending_inventory_g)}
                      </td>
                      <td className={`px-3 py-3 tabular-nums font-medium ${varClass}`}>
                        {varianceG != null && varianceG >= 0 ? '+' : ''}
                        {formatG(varianceG)}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={audit.status} />
                      </td>
                      <td className="px-3 py-3 text-cult-text-muted">
                        {formatDate(audit.completed_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-cult-text-muted">
            Page {page + 1} of {totalPages} ({total} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              className="p-1.5 border border-cult-medium-gray rounded hover:bg-cult-charcoal disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-cult-white" />
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="p-1.5 border border-cult-medium-gray rounded hover:bg-cult-charcoal disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-cult-white" />
            </button>
          </div>
        </div>
      )}

      {/* Audit Workflow Modal */}
      <AuditWorkflowModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmitted={refresh}
        submitAudit={submitAudit}
        lastAuditEndDate={auditStatus?.last_audit_completed_at ?? null}
      />
    </div>
  );
}
