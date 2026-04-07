import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  X,
  Download,
  MoreVertical,
  Eye,
  Check,
  Trash2,
  FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { recordPayment } from '@/features/financial/services/payments.service';
import { InvoiceModal } from '@/features/orders/components/InvoiceModal';
import type {
  ARSummaryByCustomer,
  ARAgingRow,
  AROverview,
  ARCustomerBehavior,
  ARPaymentHistoryRow,
} from '@/types';

// Local alias — ARAgingRow is the v_ar_aging view shape used as Invoice in this component
type Invoice = ARAgingRow;

interface LineItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_type?: string;
  strain?: string;
}

interface InvoiceDetails extends Invoice {
  line_items?: LineItem[];
}

type StatusFilter = 'all' | 'overdue' | 'open' | 'partial' | 'paid' | 'draft';
type ViewMode = 'customers' | 'invoices';

const BUCKET_COLORS: Record<string, string> = {
  'draft': 'text-cult-text-muted',
  'current': 'text-cult-success',
  '1-30': 'text-cult-warning',
  '31-60': 'text-cult-warning',
  '61-90': 'text-cult-danger',
  '90+': 'text-cult-danger',
};

const STATUS_STYLES: Record<string, string> = {
  'open': 'bg-cult-info-muted text-cult-info border border-cult-info/50',
  'partial': 'bg-cult-warning-muted text-cult-warning border border-cult-warning/50',
  'paid': 'bg-cult-success-muted text-cult-success border border-cult-success/50',
  'overdue': 'bg-cult-danger-muted text-cult-danger border border-cult-danger/50',
  'draft': 'bg-cult-border text-cult-text-muted border border-cult-border',
  'sent': 'bg-purple-900/40 text-purple-400 border border-purple-800/50',
  'void': 'bg-gray-900/40 text-gray-400 border border-gray-800/50',
};

function fmt(val: number | null | undefined) {
  if (val == null || isNaN(Number(val))) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(val));
}

function fmtDec(val: number | null | undefined) {
  if (val == null || isNaN(Number(val))) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString();
}

export function AccountsReceivable() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<ARSummaryByCustomer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [overview, setOverview] = useState<AROverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('customers');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [customerBehavior, setCustomerBehavior] = useState<Record<string, ARCustomerBehavior>>({});

  // Date range filter
  const [issueDateFrom, setIssueDateFrom] = useState('');
  const [issueDateTo, setIssueDateTo] = useState('');

  // Invoice detail drawer
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetails | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<ARPaymentHistoryRow[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [notesEdit, setNotesEdit] = useState('');
  const [notesEditing, setNotesEditing] = useState(false);

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'ach',
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0],
  });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Batch selection
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Invoice PDF modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [custRes, overviewRes, invRes, behaviorRes] = await Promise.all([
        supabase.from('v_ar_summary_by_customer').select('*').order('total_outstanding', { ascending: false }),
        supabase.from('v_ar_overview').select('*').single(),
        supabase.from('v_ar_aging').select('*').order('days_outstanding', { ascending: false }),
        supabase.from('v_ar_customer_behavior').select('*'),
      ]);

      if (custRes.data) setCustomers(custRes.data as unknown as ARSummaryByCustomer[]);
      if (overviewRes.data) setOverview(overviewRes.data as unknown as AROverview);
      if (invRes.data) setInvoices(invRes.data as unknown as Invoice[]);
      if (behaviorRes.data) {
        const behaviors = behaviorRes.data as unknown as ARCustomerBehavior[];
        const behaviorMap = behaviors.reduce<Record<string, ARCustomerBehavior>>(
          (acc, b) => {
            acc[b.customer_id] = b;
            return acc;
          },
          {}
        );
        setCustomerBehavior(behaviorMap);
      }
    } catch (err) {
      console.error('Failed to load AR data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomerInvoices(customerId: string) {
    if (expandedCustomer === customerId) {
      setExpandedCustomer(null);
      setCustomerInvoices([]);
      return;
    }
    try {
      setLoadingInvoices(true);
      setExpandedCustomer(customerId);
      const { data } = await supabase
        .from('v_ar_aging')
        .select('*')
        .eq('customer_id', customerId)
        .order('days_outstanding', { ascending: false });
      setCustomerInvoices((data || []) as unknown as Invoice[]);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  }

  async function loadInvoiceDetails(invoiceId: string) {
    try {
      setLoadingDetails(true);
      const [detailRes, paymentsRes] = await Promise.all([
        supabase.from('invoices').select('*').eq('id', invoiceId).single(),
        supabase.from('v_ar_payment_history').select('*').eq('invoice_id', invoiceId).order('payment_date', { ascending: false }),
      ]);

      if (detailRes.data) {
        const detail = detailRes.data as unknown as InvoiceDetails;
        setInvoiceDetails(detail);
        setNotesEdit(detail.notes || '');
      }
      if (paymentsRes.data) setPaymentHistory(paymentsRes.data as unknown as ARPaymentHistoryRow[]);
    } catch (err) {
      console.error('Failed to load invoice details:', err);
    } finally {
      setLoadingDetails(false);
    }
  }

  function openInvoiceDrawer(invoice: Invoice) {
    setSelectedInvoice(invoice);
    loadInvoiceDetails(invoice.id);
  }

  async function handleSaveNotes() {
    if (!invoiceDetails) return;
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ notes: notesEdit || null })
        .eq('id', invoiceDetails.id);
      if (error) throw error;
      setNotesEditing(false);
      setInvoiceDetails(prev => prev ? { ...prev, notes: notesEdit || null } : null);
      loadData();
    } catch (err: any) {
      console.error('Failed to save notes:', err);
    }
  }

  async function handleMarkStatus(invoiceId: string, status: string) {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ invoice_status: status })
        .eq('id', invoiceId);
      if (error) throw error;
      loadData();
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(prev => prev ? { ...prev, invoice_status: status } : null);
        if (invoiceDetails?.id === invoiceId) {
          setInvoiceDetails(prev => prev ? { ...prev, invoice_status: status } : null);
        }
      }
      setOpenMenuId(null);
    } catch (err: any) {
      console.error('Failed to update status:', err);
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentModal) return;
    setPaymentError(null);

    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      setPaymentError('Amount must be greater than 0');
      return;
    }
    if (amount > Number(paymentModal.amount_due)) {
      setPaymentError(`Amount exceeds balance due (${fmtDec(paymentModal.amount_due)})`);
      return;
    }

    try {
      setPaymentSaving(true);
      await recordPayment({
        invoice_id: paymentModal.id,
        payment_date: paymentForm.payment_date,
        amount,
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number.trim() || null,
        recorded_by: user?.id || null,
      });
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentModal(null);
        setPaymentSuccess(false);
        setPaymentForm({
          amount: '',
          payment_method: 'ach',
          reference_number: '',
          payment_date: new Date().toISOString().split('T')[0],
        });
        loadData();
        if (expandedCustomer) loadCustomerInvoices(expandedCustomer);
        if (selectedInvoice) loadInvoiceDetails(selectedInvoice.id);
      }, 1000);
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to record payment');
    } finally {
      setPaymentSaving(false);
    }
  }

  // Status filter logic
  function matchesStatusFilter(invoice: Invoice): boolean {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'overdue') return invoice.ar_status === 'overdue';
    if (statusFilter === 'open') return invoice.ar_status === 'open';
    if (statusFilter === 'partial') return invoice.ar_status === 'partial';
    if (statusFilter === 'paid') return invoice.ar_status === 'paid';
    if (statusFilter === 'draft') return invoice.invoice_status === 'draft';
    return true;
  }

  // Count invoices by status
  const statusCounts = useMemo(() => {
    const counts = {
      all: invoices.length,
      overdue: invoices.filter(i => i.ar_status === 'overdue').length,
      open: invoices.filter(i => i.ar_status === 'open').length,
      partial: invoices.filter(i => i.ar_status === 'partial').length,
      paid: invoices.filter(i => i.ar_status === 'paid').length,
      draft: invoices.filter(i => i.invoice_status === 'draft').length,
    };
    return counts;
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter(i => matchesStatusFilter(i));

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        i =>
          i.customer_name.toLowerCase().includes(q) ||
          i.invoice_number.toLowerCase().includes(q) ||
          (i.order_number && i.order_number.toLowerCase().includes(q))
      );
    }

    // Date range filter
    if (issueDateFrom) {
      const fromDate = new Date(issueDateFrom);
      filtered = filtered.filter(i => new Date(i.issue_date) >= fromDate);
    }
    if (issueDateTo) {
      const toDate = new Date(issueDateTo);
      filtered = filtered.filter(i => new Date(i.issue_date) <= toDate);
    }

    return filtered;
  }, [invoices, search, statusFilter, issueDateFrom, issueDateTo]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c =>
      !search || c.customer_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [customers, search]);

  function handleSelectAll() {
    if (selectAll) {
      setSelectedInvoiceIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedInvoiceIds(new Set(filteredInvoices.map(i => i.id)));
      setSelectAll(true);
    }
  }

  function handleSelectInvoice(invoiceId: string) {
    const newSelection = new Set(selectedInvoiceIds);
    if (newSelection.has(invoiceId)) {
      newSelection.delete(invoiceId);
    } else {
      newSelection.add(invoiceId);
    }
    setSelectedInvoiceIds(newSelection);
  }

  async function handleBatchMarkSent() {
    for (const invId of Array.from(selectedInvoiceIds)) {
      await handleMarkStatus(invId, 'sent');
    }
    setSelectedInvoiceIds(new Set());
    setSelectAll(false);
  }

  function exportCSV() {
    if (viewMode === 'customers') {
      exportCustomersCSV();
    } else {
      exportInvoicesCSV();
    }
  }

  function exportCustomersCSV() {
    const headers = ['Customer', 'Open Invoices', 'Outstanding', 'Overdue', 'Current', '1-30', '31-60', '61-90', '90+'];
    const rows = filteredCustomers.map(c => [
      c.customer_name,
      c.open_invoice_count.toString(),
      Number(c.total_outstanding).toString(),
      Number(c.overdue_amount).toString(),
      Number(c.current_amount).toString(),
      Number(c.bucket_1_30).toString(),
      Number(c.bucket_31_60).toString(),
      Number(c.bucket_61_90).toString(),
      Number(c.bucket_90_plus).toString(),
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ar-customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  function exportInvoicesCSV() {
    const headers = ['Invoice', 'Customer', 'Order', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status', 'Days Outstanding'];
    const rows = filteredInvoices.map(i => [
      i.invoice_number,
      i.customer_name,
      i.order_number,
      formatDate(i.issue_date),
      formatDate(i.due_date),
      Number(i.total_amount).toString(),
      Number(i.paid_amount).toString(),
      Number(i.amount_due).toString(),
      i.ar_status,
      i.days_outstanding.toString(),
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ar-invoices-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cult-text-muted">Loading accounts receivable...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 stagger-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-cult-white">Accounts Receivable</h1>
        <p className="text-cult-light-gray mt-2">Track invoices, record payments, and manage collections</p>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-cult-surface border border-cult-border rounded-cult p-4">
            <div className="text-xs text-cult-text-muted uppercase">Total Outstanding</div>
            <div className="text-cult-white font-mono text-lg mt-1">{fmt(overview.total_outstanding)}</div>
            <div className="text-xs text-cult-text-muted mt-0.5">{overview.total_open_invoices} invoices</div>
          </div>
          <div className="bg-cult-surface border border-cult-border rounded-cult p-4">
            <div className="text-xs text-cult-danger uppercase">Overdue</div>
            <div className="text-cult-danger font-mono text-lg mt-1">{fmt(overview.total_overdue)}</div>
          </div>
          <div className="bg-cult-surface border border-cult-border rounded-cult p-4">
            <div className="text-xs text-cult-success uppercase">Current</div>
            <div className="text-cult-white font-mono text-lg mt-1">{fmt(overview.current_amount)}</div>
          </div>
          <div className="bg-cult-surface border border-cult-border rounded-cult p-4">
            <div className="text-xs text-cult-warning uppercase">1-30 Days</div>
            <div className="text-cult-white font-mono text-lg mt-1">{fmt(overview.bucket_1_30)}</div>
          </div>
          <div className="bg-cult-surface border border-cult-border rounded-cult p-4">
            <div className="text-xs text-cult-warning uppercase">31-60 Days</div>
            <div className="text-cult-white font-mono text-lg mt-1">{fmt(overview.bucket_31_60)}</div>
          </div>
          <div className="bg-cult-surface border border-cult-border rounded-cult p-4">
            <div className="text-xs text-cult-danger uppercase">90+ Days</div>
            <div className="text-cult-white font-mono text-lg mt-1">
              {fmt(Number(overview.bucket_61_90) + Number(overview.bucket_90_plus))}
            </div>
          </div>
        </div>
      )}

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'overdue', 'open', 'partial', 'paid', 'draft'] as StatusFilter[]).map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-cult text-xs font-medium transition-colors capitalize ${
              statusFilter === status
                ? 'bg-cult-white text-cult-black'
                : 'bg-cult-surface border border-cult-border text-cult-text-muted hover:text-cult-white'
            }`}
          >
            {status} <span className="ml-1 opacity-60">({statusCounts[status]})</span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-text-muted" />
            <input
              type="text"
              placeholder="Search customers or invoices..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-cult-surface border border-cult-border rounded-cult pl-10 pr-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
            />
          </div>

          {/* Date Range Filters */}
          <div className="flex gap-2">
            <input
              type="date"
              value={issueDateFrom}
              onChange={e => setIssueDateFrom(e.target.value)}
              className="bg-cult-surface border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
              title="Issue date from"
            />
            <input
              type="date"
              value={issueDateTo}
              onChange={e => setIssueDateTo(e.target.value)}
              className="bg-cult-surface border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
              title="Issue date to"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-cult-white text-cult-black px-3 py-2 rounded-cult text-xs font-medium hover:bg-cult-light-gray transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          {/* View Toggle */}
          <div className="flex gap-1 bg-cult-surface border border-cult-border rounded-cult p-1">
            <button
              onClick={() => setViewMode('customers')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'customers' ? 'bg-cult-white text-cult-black' : 'text-cult-text-muted hover:text-cult-white'
              }`}
            >
              By Customer
            </button>
            <button
              onClick={() => setViewMode('invoices')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'invoices' ? 'bg-cult-white text-cult-black' : 'text-cult-text-muted hover:text-cult-white'
              }`}
            >
              All Invoices
            </button>
          </div>
        </div>
      </div>

      {/* Batch Actions Bar */}
      {viewMode === 'invoices' && selectedInvoiceIds.size > 0 && (
        <div className="bg-cult-black/50 border border-cult-border rounded-cult p-3 flex items-center justify-between">
          <span className="text-cult-white text-sm font-medium">{selectedInvoiceIds.size} selected</span>
          <div className="flex gap-2">
            <button
              onClick={handleBatchMarkSent}
              className="flex items-center gap-2 bg-purple-600 text-white px-3 py-1.5 rounded-cult text-xs font-medium hover:bg-purple-500 transition-colors"
            >
              <Check className="w-3 h-3" />
              Mark Sent
            </button>
            <button
              onClick={() => {
                setSelectedInvoiceIds(new Set());
                setSelectAll(false);
              }}
              className="text-cult-text-muted hover:text-cult-white text-xs"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Customer View */}
      {viewMode === 'customers' && (
        <div className="bg-cult-surface border border-cult-border rounded-cult overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-cult-text-muted text-left border-b border-cult-border">
                  <th className="px-4 py-3 font-medium w-8"></th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium text-center">Invoices</th>
                  <th className="px-4 py-3 font-medium text-right">Outstanding</th>
                  <th className="px-4 py-3 font-medium text-right">Overdue</th>
                  <th className="px-4 py-3 font-medium text-center">Oldest</th>
                  <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">Current</th>
                  <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">1-30</th>
                  <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">31-60</th>
                  <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">61-90</th>
                  <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">90+</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(c => {
                  const behavior = customerBehavior[c.customer_id];
                  return (
                    <div key={c.customer_id}>
                      <tr
                        className="border-b border-cult-border/50 hover:bg-cult-black/30 transition-colors cursor-pointer"
                        onClick={() => loadCustomerInvoices(c.customer_id)}
                      >
                        <td className="px-4 py-3 text-cult-text-muted">
                          {expandedCustomer === c.customer_id ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-cult-white font-medium">{c.customer_name}</div>
                          {behavior && (
                            <div className="text-xs text-cult-text-muted mt-1 space-y-0.5">
                              <div>Avg payment: {behavior.avg_days_to_pay || '—'} days</div>
                              {behavior.last_payment_date && (
                                <div>Last paid: {formatDate(behavior.last_payment_date)}</div>
                              )}
                              <div>Lifetime: {fmt(behavior.lifetime_paid)} paid</div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-cult-light-gray">{c.open_invoice_count}</td>
                        <td className="px-4 py-3 text-right text-cult-white font-mono">{fmt(c.total_outstanding)}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {Number(c.overdue_amount) > 0 ? (
                            <span className="text-cult-danger">{fmt(c.overdue_amount)}</span>
                          ) : (
                            <span className="text-cult-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={
                              BUCKET_COLORS[
                                c.oldest_days_outstanding > 90
                                  ? '90+'
                                  : c.oldest_days_outstanding > 60
                                    ? '61-90'
                                    : c.oldest_days_outstanding > 30
                                      ? '31-60'
                                      : c.oldest_days_outstanding > 0
                                        ? '1-30'
                                        : 'current'
                              ] || 'text-cult-text-muted'
                            }
                          >
                            {c.oldest_days_outstanding}d
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-cult-light-gray hidden lg:table-cell">
                          {Number(c.current_amount) > 0 ? fmt(c.current_amount) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-cult-light-gray hidden lg:table-cell">
                          {Number(c.bucket_1_30) > 0 ? fmt(c.bucket_1_30) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-cult-light-gray hidden lg:table-cell">
                          {Number(c.bucket_31_60) > 0 ? fmt(c.bucket_31_60) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-cult-light-gray hidden lg:table-cell">
                          {Number(c.bucket_61_90) > 0 ? fmt(c.bucket_61_90) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-cult-light-gray hidden lg:table-cell">
                          {Number(c.bucket_90_plus) > 0 ? fmt(c.bucket_90_plus) : '—'}
                        </td>
                      </tr>
                      {expandedCustomer === c.customer_id && (
                        <tr>
                          <td colSpan={11} className="px-0 py-0">
                            <div className="bg-cult-black/40 border-t border-cult-border/30">
                              {loadingInvoices ? (
                                <div className="py-4 text-center text-cult-text-muted text-sm">Loading invoices...</div>
                              ) : customerInvoices.length === 0 ? (
                                <div className="py-4 text-center text-cult-text-muted text-sm">No invoices found</div>
                              ) : (
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-cult-text-muted text-left">
                                      <th className="px-6 py-2 font-medium text-xs">Invoice</th>
                                      <th className="px-4 py-2 font-medium text-xs">Order</th>
                                      <th className="px-4 py-2 font-medium text-xs">Issued</th>
                                      <th className="px-4 py-2 font-medium text-xs">Due</th>
                                      <th className="px-4 py-2 font-medium text-xs text-right">Total</th>
                                      <th className="px-4 py-2 font-medium text-xs text-right">Paid</th>
                                      <th className="px-4 py-2 font-medium text-xs text-right">Balance</th>
                                      <th className="px-4 py-2 font-medium text-xs text-center">Status</th>
                                      <th className="px-4 py-2 font-medium text-xs text-center">Age</th>
                                      <th className="px-4 py-2 font-medium text-xs"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {customerInvoices.map(inv => (
                                      <tr
                                        key={inv.id}
                                        className="border-t border-cult-border/20 hover:bg-cult-black/30 cursor-pointer"
                                        onClick={() => openInvoiceDrawer(inv)}
                                      >
                                        <td className="px-6 py-2.5 text-cult-white font-mono text-xs">{inv.invoice_number}</td>
                                        <td className="px-4 py-2.5 text-cult-text-muted text-xs">{inv.order_number}</td>
                                        <td className="px-4 py-2.5 text-cult-light-gray text-xs">{formatDate(inv.issue_date)}</td>
                                        <td className="px-4 py-2.5 text-cult-light-gray text-xs">{formatDate(inv.due_date)}</td>
                                        <td className="px-4 py-2.5 text-right text-cult-white font-mono text-xs">
                                          {fmtDec(inv.total_amount)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-mono text-xs text-cult-success">
                                          {Number(inv.paid_amount) > 0 ? fmtDec(inv.paid_amount) : '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-cult-white font-mono text-xs">
                                          {fmtDec(inv.amount_due)}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[inv.ar_status] || STATUS_STYLES['open']}`}>
                                            {inv.ar_status}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                          <span className={`text-xs ${BUCKET_COLORS[inv.age_bucket] || 'text-cult-text-muted'}`}>
                                            {inv.days_outstanding}d
                                          </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                          {Number(inv.amount_due) > 0 && inv.ar_status !== 'paid' && (
                                            <button
                                              onClick={e => {
                                                e.stopPropagation();
                                                setPaymentModal(inv);
                                                setPaymentForm(f => ({ ...f, amount: String(inv.amount_due) }));
                                              }}
                                              className="text-xs text-cult-success hover:text-cult-success/80 font-medium flex items-center gap-1"
                                            >
                                              <CreditCard className="w-3 h-3" />
                                              Pay
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </div>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredCustomers.length === 0 && (
            <div className="py-12 text-center text-cult-text-muted">No customers match your search</div>
          )}
        </div>
      )}

      {/* Invoice View */}
      {viewMode === 'invoices' && (
        <div className="bg-cult-surface border border-cult-border rounded-cult overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-cult-text-muted text-left border-b border-cult-border">
                  <th className="px-4 py-3 font-medium w-8">
                    <input
                      type="checkbox"
                      checked={selectAll && filteredInvoices.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Issued</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Paid</th>
                  <th className="px-4 py-3 font-medium text-right">Balance</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-center">Age</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => (
                  <tr
                    key={inv.id}
                    className={`border-b border-cult-border/50 hover:bg-cult-black/30 transition-colors ${
                      selectedInvoiceIds.has(inv.id) ? 'bg-cult-black/50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedInvoiceIds.has(inv.id)}
                        onChange={() => handleSelectInvoice(inv.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3 text-cult-white font-mono text-xs cursor-pointer" onClick={() => openInvoiceDrawer(inv)}>
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3 text-cult-white cursor-pointer" onClick={() => openInvoiceDrawer(inv)}>
                      {inv.customer_name}
                    </td>
                    <td className="px-4 py-3 text-cult-text-muted text-xs">{inv.order_number}</td>
                    <td className="px-4 py-3 text-cult-light-gray">{formatDate(inv.issue_date)}</td>
                    <td className="px-4 py-3 text-cult-light-gray">{formatDate(inv.due_date)}</td>
                    <td className="px-4 py-3 text-right text-cult-white font-mono">{fmtDec(inv.total_amount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-cult-success">
                      {Number(inv.paid_amount) > 0 ? fmtDec(inv.paid_amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-cult-white font-mono">{fmtDec(inv.amount_due)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[inv.ar_status] || STATUS_STYLES['open']}`}>
                        {inv.ar_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs ${BUCKET_COLORS[inv.age_bucket] || 'text-cult-text-muted'}`}>{inv.days_outstanding}d</span>
                    </td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                      {Number(inv.amount_due) > 0 && inv.ar_status !== 'paid' && (
                        <button
                          onClick={() => {
                            setPaymentModal(inv);
                            setPaymentForm(f => ({ ...f, amount: String(inv.amount_due) }));
                          }}
                          className="text-xs text-cult-success hover:text-cult-success/80 font-medium flex items-center gap-1"
                        >
                          <CreditCard className="w-3 h-3" />
                          Pay
                        </button>
                      )}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === inv.id ? null : inv.id)}
                          className="text-cult-text-muted hover:text-cult-white"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === inv.id && (
                          <div className="absolute right-0 top-full mt-1 bg-cult-black border border-cult-border rounded-cult py-1 z-40 min-w-max">
                            <button
                              onClick={() => openInvoiceDrawer(inv)}
                              className="block w-full text-left px-3 py-1.5 text-xs text-cult-text-muted hover:text-cult-white hover:bg-cult-surface/50"
                            >
                              <Eye className="w-3 h-3 inline mr-2" />
                              View Details
                            </button>
                            <button
                              onClick={() => handleMarkStatus(inv.id, 'sent')}
                              className="block w-full text-left px-3 py-1.5 text-xs text-cult-text-muted hover:text-cult-white hover:bg-cult-surface/50"
                            >
                              <Check className="w-3 h-3 inline mr-2" />
                              Mark Sent
                            </button>
                            <button
                              onClick={() => handleMarkStatus(inv.id, 'void')}
                              className="block w-full text-left px-3 py-1.5 text-xs text-cult-text-muted hover:text-cult-danger hover:bg-cult-surface/50"
                            >
                              <Trash2 className="w-3 h-3 inline mr-2" />
                              Void
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredInvoices.length === 0 && (
            <div className="py-12 text-center text-cult-text-muted">No invoices match your filters</div>
          )}
        </div>
      )}

      {/* Invoice Detail Drawer */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedInvoice(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-cult-surface border-l border-cult-border overflow-y-auto">
            {loadingDetails ? (
              <div className="flex items-center justify-center h-full text-cult-text-muted">Loading invoice details...</div>
            ) : invoiceDetails ? (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-cult-white">{invoiceDetails.invoice_number}</h2>
                    <p className="text-cult-light-gray mt-1">{invoiceDetails.customer_name}</p>
                    {invoiceDetails.order_number && (
                      <p className="text-xs text-cult-text-muted mt-1">Order: {invoiceDetails.order_number}</p>
                    )}
                  </div>
                  <button onClick={() => setSelectedInvoice(null)} className="text-cult-text-muted hover:text-cult-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Invoice Info */}
                <div className="bg-cult-black/50 border border-cult-border/50 rounded-cult p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-cult-text-muted">Issue Date</div>
                      <div className="text-cult-white font-mono">{formatDate(invoiceDetails.issue_date)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-cult-text-muted">Due Date</div>
                      <div className="text-cult-white font-mono">{formatDate(invoiceDetails.due_date)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-cult-text-muted">Terms</div>
                      <div className="text-cult-white font-mono">{invoiceDetails.payment_terms || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-cult-text-muted">Status</div>
                      <div className="mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[invoiceDetails.ar_status] || STATUS_STYLES['open']}`}>
                          {invoiceDetails.ar_status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amounts */}
                <div className="bg-cult-black/50 border border-cult-border/50 rounded-cult p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-cult-text-muted">Invoice Total</span>
                    <span className="text-cult-white font-mono">{fmtDec(invoiceDetails.total_amount)}</span>
                  </div>
                  {Number(invoiceDetails.paid_amount) > 0 && (
                    <div className="flex justify-between mb-2">
                      <span className="text-cult-text-muted">Paid</span>
                      <span className="text-cult-success font-mono">{fmtDec(invoiceDetails.paid_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-cult-border/50">
                    <span className="text-cult-text-muted">Balance Due</span>
                    <span className="text-cult-white font-mono font-medium">{fmtDec(invoiceDetails.amount_due)}</span>
                  </div>
                </div>

                {/* Line Items */}
                {invoiceDetails.line_items && invoiceDetails.line_items.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-cult-white">Line Items</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-cult-text-muted border-b border-cult-border/50">
                            <th className="text-left py-2 px-2">Product</th>
                            <th className="text-center py-2 px-2">Qty</th>
                            <th className="text-right py-2 px-2">Price</th>
                            <th className="text-right py-2 px-2">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceDetails.line_items.map((item, idx) => (
                            <tr key={idx} className="border-b border-cult-border/20 hover:bg-cult-black/30">
                              <td className="py-2 px-2 text-cult-white">
                                {item.product_name}
                                {item.strain && <div className="text-xs text-cult-text-muted">{item.strain}</div>}
                              </td>
                              <td className="text-center py-2 px-2 text-cult-light-gray">{item.quantity}</td>
                              <td className="text-right py-2 px-2 text-cult-light-gray font-mono">{fmtDec(item.unit_price)}</td>
                              <td className="text-right py-2 px-2 text-cult-white font-mono">{fmtDec(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Payment History */}
                {paymentHistory.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-cult-white">Payment History</h3>
                    <div className="space-y-2">
                      {paymentHistory.map(payment => (
                        <div key={payment.id} className="bg-cult-black/50 border border-cult-border/50 rounded p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-cult-white font-mono">{fmtDec(payment.amount)}</div>
                              <div className="text-xs text-cult-text-muted mt-1">
                                {formatDate(payment.payment_date)} • {payment.payment_method}
                                {payment.reference_number && ` • ${payment.reference_number}`}
                              </div>
                              {payment.recorded_by_name && (
                                <div className="text-xs text-cult-text-muted">by {payment.recorded_by_name}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-cult-white">Notes</h3>
                    {!notesEditing && (
                      <button
                        onClick={() => setNotesEditing(true)}
                        className="text-xs text-cult-text-muted hover:text-cult-white"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {notesEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={notesEdit}
                        onChange={e => setNotesEdit(e.target.value)}
                        className="w-full bg-cult-black border border-cult-border rounded-cult p-3 text-cult-white text-sm focus:outline-none focus:border-cult-white min-h-24"
                        placeholder="Add notes..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveNotes}
                          className="flex-1 bg-cult-white text-cult-black px-3 py-1.5 rounded-cult text-xs font-medium hover:bg-cult-light-gray transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setNotesEditing(false);
                            setNotesEdit(invoiceDetails.notes || '');
                          }}
                          className="flex-1 border border-cult-border text-cult-text-muted px-3 py-1.5 rounded-cult text-xs font-medium hover:text-cult-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-cult-black/50 border border-cult-border/50 rounded-cult p-3 text-cult-light-gray text-sm">
                      {invoiceDetails.notes || 'No notes'}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-cult-border">
                  {invoiceDetails.order_id && (
                    <button
                      onClick={() => setShowInvoiceModal(true)}
                      className="flex-1 border border-cult-border text-cult-white px-3 py-2 rounded-cult text-sm font-medium hover:bg-cult-black/50 transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      View Invoice
                    </button>
                  )}
                  {Number(invoiceDetails.amount_due) > 0 && invoiceDetails.ar_status !== 'paid' && (
                    <button
                      onClick={() => {
                        setPaymentModal(invoiceDetails);
                        setPaymentForm(f => ({ ...f, amount: String(invoiceDetails.amount_due) }));
                      }}
                      className="flex-1 bg-cult-success text-white px-3 py-2 rounded-cult text-sm font-medium hover:bg-cult-success/80 transition-colors flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Record Payment
                    </button>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === invoiceDetails.id ? null : invoiceDetails.id)}
                      className="border border-cult-border text-cult-text-muted px-3 py-2 rounded-cult text-sm hover:text-cult-white transition-colors flex items-center gap-1"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openMenuId === invoiceDetails.id && (
                      <div className="absolute right-0 top-full mt-1 bg-cult-black border border-cult-border rounded-cult py-1 z-50 min-w-max">
                        <button
                          onClick={() => handleMarkStatus(invoiceDetails.id, 'sent')}
                          className="block w-full text-left px-3 py-1.5 text-xs text-cult-text-muted hover:text-cult-white hover:bg-cult-surface/50"
                        >
                          <Check className="w-3 h-3 inline mr-2" />
                          Mark Sent
                        </button>
                        <button
                          onClick={() => handleMarkStatus(invoiceDetails.id, 'void')}
                          className="block w-full text-left px-3 py-1.5 text-xs text-cult-text-muted hover:text-cult-danger hover:bg-cult-surface/50"
                        >
                          <Trash2 className="w-3 h-3 inline mr-2" />
                          Void
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Invoice PDF Modal */}
      {showInvoiceModal && invoiceDetails?.order_id && (
        <InvoiceModal
          orderId={invoiceDetails.order_id}
          orderNumber={invoiceDetails.order_number || invoiceDetails.invoice_number}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => !paymentSaving && setPaymentModal(null)}>
          <div className="bg-cult-surface border border-cult-border rounded-cult p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-cult-white mb-1">Record Payment</h3>
            <p className="text-sm text-cult-text-muted mb-4">
              {paymentModal.invoice_number} — {paymentModal.customer_name}
            </p>

            <div className="bg-cult-black/50 rounded-cult p-3 mb-4 border border-cult-border/50">
              <div className="flex justify-between text-sm">
                <span className="text-cult-text-muted">Invoice Total</span>
                <span className="text-cult-white font-mono">{fmtDec(paymentModal.total_amount)}</span>
              </div>
              {Number(paymentModal.paid_amount) > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-cult-text-muted">Already Paid</span>
                  <span className="text-cult-success font-mono">{fmtDec(paymentModal.paid_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm mt-1 pt-1 border-t border-cult-border/50">
                <span className="text-cult-text-muted">Balance Due</span>
                <span className="text-cult-white font-mono font-medium">{fmtDec(paymentModal.amount_due)}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-sm text-cult-text-muted mb-1">Payment Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-cult-text-muted mb-1">Payment Date *</label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))}
                  className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
                />
              </div>
              <div>
                <label className="block text-sm text-cult-text-muted mb-1">Payment Method</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={e => setPaymentForm(f => ({ ...f, payment_method: e.target.value }))}
                  className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
                >
                  <option value="ach">ACH</option>
                  <option value="check">Check</option>
                  <option value="wire">Wire</option>
                  <option value="cash">Cash</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-cult-text-muted mb-1">Reference / Check #</label>
                <input
                  type="text"
                  value={paymentForm.reference_number}
                  onChange={e => setPaymentForm(f => ({ ...f, reference_number: e.target.value }))}
                  className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
                  placeholder="Optional"
                />
              </div>

              {paymentError && (
                <div className="flex items-center gap-2 text-cult-danger text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {paymentError}
                </div>
              )}

              {paymentSuccess && (
                <div className="flex items-center gap-2 text-cult-success text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Payment recorded — invoice updated
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={paymentSaving || paymentSuccess}
                  className="flex-1 flex items-center justify-center gap-2 bg-cult-success text-white px-4 py-2.5 rounded-cult text-sm font-semibold hover:bg-cult-success/80 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {paymentSaving ? 'Recording...' : 'Record Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentModal(null)}
                  disabled={paymentSaving}
                  className="px-4 py-2.5 rounded-cult text-sm text-cult-text-muted hover:text-cult-white border border-cult-border hover:border-cult-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
