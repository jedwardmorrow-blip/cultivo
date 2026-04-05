/**
 * DocumentDispatchQueue
 *
 * Shows all active orders with per-document status pills (Invoice · COA · Manifest)
 * and one-click send buttons. Part of CUL-362.
 *
 * Data dependencies (CUL-361 DBA):
 *   - email_send_log.document_type column
 *   - customer_communication_preferences table
 *   - customer_contacts.role column
 * The service layer degrades gracefully until those are deployed.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, FileText, Send, Search,
  RefreshCw, ChevronDown,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  getDispatchQueue, sendDocument, computeDocStatus,
  type DispatchOrderRow, type DocStatusPill, type DocumentType,
} from '../services/dispatch.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDeliveryDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

function formatCountdown(minutesUntilDeadline: number): string {
  if (minutesUntilDeadline < 0) {
    const abs = Math.abs(minutesUntilDeadline);
    if (abs < 60) return `${abs}m overdue`;
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return m > 0 ? `${h}h ${m}m overdue` : `${h}h overdue`;
  }
  if (minutesUntilDeadline < 60) return `Due in ${minutesUntilDeadline}m`;
  const h = Math.floor(minutesUntilDeadline / 60);
  const m = minutesUntilDeadline % 60;
  return m > 0 ? `Due in ${h}h ${m}m` : `Due in ${h}h`;
}

function pillStyles(state: DocStatusPill['state']): string {
  switch (state) {
    case 'sent':     return 'bg-emerald-900/30 text-emerald-400 border-emerald-500/40';
    case 'overdue':  return 'bg-red-900/30 text-red-400 border-red-500/40';
    case 'due_soon': return 'bg-amber-900/20 text-amber-400 border-amber-500/30';
    default:         return 'bg-cult-charcoal text-cult-light-gray border-cult-medium-gray/40';
  }
}

function pillIcon(state: DocStatusPill['state']) {
  switch (state) {
    case 'sent':     return <CheckCircle2 className="w-3 h-3 flex-shrink-0" />;
    case 'overdue':  return <AlertTriangle className="w-3 h-3 flex-shrink-0" />;
    case 'due_soon': return <Clock className="w-3 h-3 flex-shrink-0" />;
    default:         return <FileText className="w-3 h-3 flex-shrink-0" />;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DocPill({ pill }: { pill: DocStatusPill }) {
  const title =
    pill.state === 'sent' && pill.sentAt
      ? `Sent ${new Date(pill.sentAt).toLocaleString()}`
      : pill.minutesUntilDeadline != null
      ? formatCountdown(pill.minutesUntilDeadline)
      : undefined;

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold uppercase tracking-wide ${pillStyles(pill.state)}`}
    >
      {pillIcon(pill.state)}
      {pill.label}
    </span>
  );
}

interface SendButtonProps {
  docType: DocumentType;
  label: string;
  sent: boolean;
  sending: boolean;
  onSend: () => void;
}

function SendButton({ docType: _docType, label, sent, sending, onSend }: SendButtonProps) {
  if (sent) {
    return (
      <button
        disabled
        className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-emerald-900/20 text-emerald-500/60 border border-emerald-600/20 cursor-default"
      >
        <CheckCircle2 className="w-3 h-3" />
        Sent
      </button>
    );
  }

  return (
    <button
      onClick={onSend}
      disabled={sending}
      className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-cult-charcoal text-cult-light-gray border border-cult-medium-gray hover:border-cult-lighter-gray hover:text-cult-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {sending ? (
        <RefreshCw className="w-3 h-3 animate-spin" />
      ) : (
        <Send className="w-3 h-3" />
      )}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Order row
// ---------------------------------------------------------------------------

interface OrderRowProps {
  row: DispatchOrderRow;
  onSent: () => void;
}

function OrderRow({ row, onSent }: OrderRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState<Record<DocumentType, boolean>>({
    invoice: false, coa: false, manifest: false,
  });
  const [sendError, setSendError] = useState<string | null>(null);

  const pills = useMemo<DocStatusPill[]>(() => [
    computeDocStatus('invoice', 'Invoice', row.delivery_date, row.invoice_lead_time_hours, row.invoice_send),
    computeDocStatus('coa', 'COA', row.delivery_date, 24, row.coa_send),
    computeDocStatus('manifest', 'Manifest', row.delivery_date, 24, row.manifest_send),
  ], [row]);

  const hasOverdue = pills.some(p => p.state === 'overdue');
  const allSent = pills.every(p => p.state === 'sent');

  async function handleSend(docType: DocumentType) {
    setSendError(null);
    setSending(prev => ({ ...prev, [docType]: true }));

    const { success, error } = await sendDocument(
      row.order_id,
      row.order_number,
      docType,
    );

    setSending(prev => ({ ...prev, [docType]: false }));
    if (!success || error) {
      setSendError(`Failed to send ${docType}. Try again.`);
    } else {
      onSent();
    }
  }

  const docSent = (docType: DocumentType) => {
    const pillForType = pills.find(p => p.type === docType);
    return pillForType?.state === 'sent';
  };

  return (
    <div className={`border-b border-cult-medium-gray/30 transition-colors ${
      hasOverdue ? 'bg-red-950/10' : ''
    }`}>
      <div
        className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-3 cursor-pointer hover:bg-cult-charcoal/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Left: order + customer info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-cult-white font-mono">
              {row.order_number}
            </span>
            {hasOverdue && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-900/40 border border-red-500/40 rounded text-[10px] font-bold text-red-400 uppercase tracking-wider">
                <AlertTriangle className="w-2.5 h-2.5" />
                Docs Overdue
              </span>
            )}
            {allSent && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-900/20 border border-emerald-500/30 rounded text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                <CheckCircle2 className="w-2.5 h-2.5" />
                All Sent
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-cult-light-gray flex-wrap">
            <span className="truncate">{row.customer_name}</span>
            {row.delivery_date && (
              <>
                <span className="text-cult-medium-gray">·</span>
                <span>Delivery {formatDeliveryDate(row.delivery_date)}</span>
              </>
            )}
            <span className="text-cult-medium-gray">·</span>
            <span>{formatCurrency(row.total_amount)}</span>
          </div>
        </div>

        {/* Center: status pills */}
        <div className="flex items-center gap-1.5">
          {pills.map(pill => (
            <DocPill key={pill.type} pill={pill} />
          ))}
        </div>

        {/* Right: expand chevron */}
        <ChevronDown className={`w-4 h-4 text-cult-medium-gray transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded: action buttons + error */}
      {expanded && (
        <div className="px-4 pb-3 bg-cult-black/30">
          {sendError && (
            <div className="mb-2 px-3 py-1.5 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-400">
              {sendError}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-cult-silver mr-1">Send:</span>
            <SendButton
              docType="invoice"
              label="Invoice"
              sent={docSent('invoice')}
              sending={sending.invoice}
              onSend={() => handleSend('invoice')}
            />
            <SendButton
              docType="coa"
              label="COA"
              sent={docSent('coa')}
              sending={sending.coa}
              onSend={() => handleSend('coa')}
            />
            <SendButton
              docType="manifest"
              label="Manifest"
              sent={docSent('manifest')}
              sending={sending.manifest}
              onSend={() => handleSend('manifest')}
            />
          </div>
          <p className="mt-2 text-[11px] text-cult-silver/60">
            Note: email delivery requires the send-document edge function (CUL-351). Send actions currently log to email_send_log only.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type FilterMode = 'all' | 'overdue' | 'unsent';

export function DocumentDispatchQueue() {
  const [rows, setRows] = useState<DispatchOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getDispatchQueue();
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = rows;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        r =>
          r.order_number.toLowerCase().includes(q) ||
          r.customer_name.toLowerCase().includes(q),
      );
    }

    if (filterMode === 'overdue') {
      result = result.filter(r => {
        const pills = [
          computeDocStatus('invoice', 'Invoice', r.delivery_date, r.invoice_lead_time_hours, r.invoice_send),
          computeDocStatus('coa', 'COA', r.delivery_date, 24, r.coa_send),
          computeDocStatus('manifest', 'Manifest', r.delivery_date, 24, r.manifest_send),
        ];
        return pills.some(p => p.state === 'overdue');
      });
    }

    if (filterMode === 'unsent') {
      result = result.filter(r => {
        const pills = [
          computeDocStatus('invoice', 'Invoice', r.delivery_date, r.invoice_lead_time_hours, r.invoice_send),
          computeDocStatus('coa', 'COA', r.delivery_date, 24, r.coa_send),
          computeDocStatus('manifest', 'Manifest', r.delivery_date, 24, r.manifest_send),
        ];
        return pills.some(p => p.state !== 'sent');
      });
    }

    return result;
  }, [rows, search, filterMode]);

  const overdueCount = useMemo(
    () =>
      rows.filter(r => {
        const pills = [
          computeDocStatus('invoice', 'Invoice', r.delivery_date, r.invoice_lead_time_hours, r.invoice_send),
          computeDocStatus('coa', 'COA', r.delivery_date, 24, r.coa_send),
          computeDocStatus('manifest', 'Manifest', r.delivery_date, 24, r.manifest_send),
        ];
        return pills.some(p => p.state === 'overdue');
      }).length,
    [rows],
  );

  const allSentCount = useMemo(
    () =>
      rows.filter(r =>
        [r.invoice_send, r.coa_send, r.manifest_send].every(s => s !== null),
      ).length,
    [rows],
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-cult-white">Document Dispatch Queue</h2>
        <p className="text-sm text-cult-light-gray mt-1">
          Send invoices, COAs, and manifests to dispensary partners. R9-18-310(B)(5) · R9-18-312.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-cult-near-black border border-cult-medium-gray p-3">
          <div className="text-xs text-cult-light-gray uppercase tracking-wider">Active Orders</div>
          <div className="text-2xl font-bold text-cult-white mt-1">{rows.length}</div>
        </div>
        <div className={`bg-cult-near-black border p-3 ${
          overdueCount > 0 ? 'border-red-500/40' : 'border-cult-medium-gray'
        }`}>
          <div className="text-xs text-cult-light-gray uppercase tracking-wider">Docs Overdue</div>
          <div className={`text-2xl font-bold mt-1 ${
            overdueCount > 0 ? 'text-red-400' : 'text-cult-white'
          }`}>{overdueCount}</div>
        </div>
        <div className="bg-cult-near-black border border-cult-medium-gray p-3">
          <div className="text-xs text-cult-light-gray uppercase tracking-wider">All Docs Sent</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{allSentCount}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-silver" />
          <input
            type="text"
            placeholder="Search order or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-cult-near-black border border-cult-medium-gray text-sm text-cult-white placeholder-cult-silver focus:outline-none focus:border-cult-lighter-gray rounded"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'overdue', 'unsent'] as FilterMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-2 text-xs font-medium uppercase tracking-wider rounded transition-all ${
                filterMode === mode
                  ? 'bg-cult-charcoal text-cult-white border border-cult-lighter-gray'
                  : 'text-cult-light-gray border border-cult-medium-gray hover:border-cult-lighter-gray hover:text-cult-white'
              }`}
            >
              {mode === 'all' ? 'All' : mode === 'overdue' ? `Overdue${overdueCount > 0 ? ` (${overdueCount})` : ''}` : 'Unsent'}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 border border-cult-medium-gray text-cult-light-gray hover:border-cult-lighter-gray hover:text-cult-white rounded transition-all disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-cult-near-black border border-cult-medium-gray overflow-hidden rounded">
        {/* Column header */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-2 bg-cult-black border-b border-cult-medium-gray">
          <div className="text-xs font-semibold text-cult-silver uppercase tracking-wider">Order / Customer</div>
          <div className="text-xs font-semibold text-cult-silver uppercase tracking-wider">Doc Status</div>
          <div className="w-4" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-cult-light-gray text-sm">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading dispatch queue...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-cult-light-gray">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mb-2" />
            <p className="text-sm">
              {rows.length === 0
                ? 'No active orders'
                : 'No orders match your filter'}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map(row => (
              <OrderRow
                key={row.order_id}
                row={row}
                onSent={load}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer note */}
      {rows.length > 0 && (
        <p className="mt-3 text-[11px] text-cult-silver/50 text-right">
          {filtered.length} of {rows.length} orders shown
        </p>
      )}
    </div>
  );
}
