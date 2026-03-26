import { useState, useEffect, useMemo } from 'react';
import { DollarSign, Search, ChevronDown, ChevronRight, CheckCircle, AlertTriangle, Clock, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface CustomerSummary {
  customer_id: string;
  customer_name: string;
  open_invoice_count: number;
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  oldest_days_outstanding: number;
  overdue_count: number;
  overdue_amount: number;
  current_amount: number;
  bucket_1_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_id: string;
  invoice_status: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  amount_due: number;
  ar_status: string;
  days_outstanding: number;
  age_bucket: string;
  payment_count: number;
  payment_terms: string;
  notes: string | null;
}

interface AROverview {
  total_open_invoices: number;
  total_outstanding: number;
  total_overdue: number;
  current_amount: number;
  bucket_1_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
  draft_count: number;
  draft_value: number;
}

const BUCKET_COLORS: Record<string, string> = {
  'draft': 'text-cult-text-muted',
  'current': 'text-green-400',
  '1-30': 'text-amber-400',
  '31-60': 'text-orange-400',
  '61-90': 'text-red-400',
  '90+': 'text-red-500',
};

const STATUS_STYLES: Record<string, string> = {
  'open': 'bg-blue-900/40 text-blue-400 border border-blue-800/50',
  'partial': 'bg-amber-900/40 text-amber-400 border border-amber-800/50',
  'paid': 'bg-green-900/40 text-green-400 border border-green-800/50',
  'overdue': 'bg-red-900/40 text-red-400 border border-red-800/50',
  'draft': 'bg-cult-border text-cult-text-muted border border-cult-border',
};

function fmt(val: number | null | undefined) {
  if (val == null || isNaN(Number(val))) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(val));
}

function fmtDec(val: number | null | undefined) {
  if (val == null || isNaN(Number(val))) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val));
}

type SortField = 'customer_name' | 'total_outstanding' | 'overdue_amount' | 'oldest_days_outstanding';
type ViewMode = 'customers' | 'invoices';

export function AccountsReceivable() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [overview, setOverview] = useState<AROverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('customers');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('total_outstanding');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'ach', reference_number: '', payment_date: new Date().toISOString().split('T')[0] });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [custRes, overviewRes, invRes] = await Promise.all([
        supabase.from('v_ar_summary_by_customer').select('*').order('total_outstanding', { ascending: false }),
        supabase.from('v_ar_overview').select('*').single(),
        supabase.from('v_ar_aging').select('*').order('days_outstanding', { ascending: false }),
      ]);
      if (custRes.data) setCustomers(custRes.data as any);
      if (overviewRes.data) setOverview(overviewRes.data as any);
      if (invRes.data) setInvoices(invRes.data as any);
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
      setCustomerInvoices((data || []) as any);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoadingInvoices(false);
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
      const { error } = await supabase.from('payments').insert({
        invoice_id: paymentModal.id,
        payment_date: paymentForm.payment_date,
        amount,
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number.trim() || null,
        recorded_by: user?.id || null,
      });
      if (error) throw error;
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentModal(null);
        setPaymentSuccess(false);
        setPaymentForm({ amount: '', payment_method: 'ach', reference_number: '', payment_date: new Date().toISOString().split('T')[0] });
        loadData();
        if (expandedCustomer) loadCustomerInvoices(expandedCustomer);
      }, 1000);
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to record payment');
    } finally {
      setPaymentSaving(false);
    }
  }

  const filteredCustomers = useMemo(() => {
    let filtered = customers.filter(c =>
      !search || c.customer_name.toLowerCase().includes(search.toLowerCase())
    );
    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string') return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return filtered;
  }, [customers, search, sortField, sortAsc]);

  const filteredInvoices = useMemo(() => {
    if (!search) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(i =>
      i.customer_name.toLowerCase().includes(q) ||
      i.invoice_number.toLowerCase().includes(q) ||
      (i.order_number && i.order_number.toLowerCase().includes(q))
    );
  }, [invoices, search]);

  function handleSort(field: SortField) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
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
        <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">Accounts Receivable</h1>
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
            <div className="text-xs text-red-400 uppercase">Overdue</div>
            <div className="text-red-400 font-mono text-lg mt-1">{fmt(overview.total_overdue)}</div>
          </div>
          <div className="bg-cult-surface border border-cult-border rounded-cult p-4">
            <div className="text-xs text-green-400 uppercase">Current</div>
            <div className="text-cult-white font-mono text-lg mt-1">{fmt(overview.current_amount)}</div>
          </div>
          <div className="bg-cult-surface border border-cult-border rounded-cult p-4">
            <div className="text-xs text-amber-400 uppercase">1-30 Days</div>
            <div className="text-cult-white font-mono text-lg mt-1">{fmt(overview.bucket_1_30)}</div>
          </div>
          <div className="bg-cult-surface border border-cult-border rounded-cult p-4">
            <div className="text-xs text-orange-400 uppercase">31-60 Days</div>
            <div className="text-cult-white font-mono text-lg mt-1">{fmt(overview.bucket_31_60)}</div>
          </div>
          <div className="bg-cult-surface border border-cult-border rounded-cult p-4">
            <div className="text-xs text-red-500 uppercase">90+ Days</div>
            <div className="text-cult-white font-mono text-lg mt-1">{fmt(Number(overview.bucket_61_90) + Number(overview.bucket_90_plus))}</div>
          </div>
        </div>
      )}

      {/* Controls */}
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

      {/* Customer View */}
      {viewMode === 'customers' && (
        <div className="bg-cult-surface border border-cult-border rounded-cult overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-cult-text-muted text-left border-b border-cult-border">
                  <th className="px-4 py-3 font-medium w-8"></th>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-cult-white" onClick={() => handleSort('customer_name')}>
                    Customer {sortField === 'customer_name' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 font-medium text-center">Invoices</th>
                  <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-cult-white" onClick={() => handleSort('total_outstanding')}>
                    Outstanding {sortField === 'total_outstanding' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-cult-white" onClick={() => handleSort('overdue_amount')}>
                    Overdue {sortField === 'overdue_amount' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 font-medium text-center cursor-pointer hover:text-cult-white" onClick={() => handleSort('oldest_days_outstanding')}>
                    Oldest {sortField === 'oldest_days_outstanding' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">Current</th>
                  <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">1-30</th>
                  <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">31-60</th>
                  <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">61-90</th>
                  <th className="px-4 py-3 font-medium text-right hidden lg:table-cell">90+</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(c => (
                  <>
                    <tr
                      key={c.customer_id}
                      className="border-b border-cult-border/50 hover:bg-cult-black/30 transition-colors cursor-pointer"
                      onClick={() => loadCustomerInvoices(c.customer_id)}
                    >
                      <td className="px-4 py-3 text-cult-text-muted">
                        {expandedCustomer === c.customer_id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </td>
                      <td className="px-4 py-3 text-cult-white font-medium">{c.customer_name}</td>
                      <td className="px-4 py-3 text-center text-cult-light-gray">{c.open_invoice_count}</td>
                      <td className="px-4 py-3 text-right text-cult-white font-mono">{fmt(c.total_outstanding)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {Number(c.overdue_amount) > 0 ? (
                          <span className="text-red-400">{fmt(c.overdue_amount)}</span>
                        ) : (
                          <span className="text-cult-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={BUCKET_COLORS[
                          c.oldest_days_outstanding > 90 ? '90+' :
                          c.oldest_days_outstanding > 60 ? '61-90' :
                          c.oldest_days_outstanding > 30 ? '31-60' :
                          c.oldest_days_outstanding > 0 ? '1-30' : 'current'
                        ] || 'text-cult-text-muted'}>
                          {c.oldest_days_outstanding}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-cult-light-gray hidden lg:table-cell">{Number(c.current_amount) > 0 ? fmt(c.current_amount) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-cult-light-gray hidden lg:table-cell">{Number(c.bucket_1_30) > 0 ? fmt(c.bucket_1_30) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-cult-light-gray hidden lg:table-cell">{Number(c.bucket_31_60) > 0 ? fmt(c.bucket_31_60) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-cult-light-gray hidden lg:table-cell">{Number(c.bucket_61_90) > 0 ? fmt(c.bucket_61_90) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-cult-light-gray hidden lg:table-cell">{Number(c.bucket_90_plus) > 0 ? fmt(c.bucket_90_plus) : '—'}</td>
                    </tr>
                    {expandedCustomer === c.customer_id && (
                      <tr key={`${c.customer_id}-detail`}>
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
                                    <tr key={inv.id} className="border-t border-cult-border/20 hover:bg-cult-black/30">
                                      <td className="px-6 py-2.5 text-cult-white font-mono text-xs">{inv.invoice_number}</td>
                                      <td className="px-4 py-2.5 text-cult-text-muted text-xs">{inv.order_number}</td>
                                      <td className="px-4 py-2.5 text-cult-light-gray text-xs">{new Date(inv.issue_date).toLocaleDateString()}</td>
                                      <td className="px-4 py-2.5 text-cult-light-gray text-xs">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                                      <td className="px-4 py-2.5 text-right text-cult-white font-mono text-xs">{fmtDec(inv.total_amount)}</td>
                                      <td className="px-4 py-2.5 text-right font-mono text-xs text-green-400">{Number(inv.paid_amount) > 0 ? fmtDec(inv.paid_amount) : '—'}</td>
                                      <td className="px-4 py-2.5 text-right text-cult-white font-mono text-xs">{fmtDec(inv.amount_due)}</td>
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
                                            onClick={(e) => { e.stopPropagation(); setPaymentModal(inv); setPaymentForm(f => ({ ...f, amount: String(inv.amount_due) })); }}
                                            className="text-xs text-green-400 hover:text-green-300 font-medium flex items-center gap-1"
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
                  </>
                ))}
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
                  <tr key={inv.id} className="border-b border-cult-border/50 hover:bg-cult-black/30 transition-colors">
                    <td className="px-4 py-3 text-cult-white font-mono text-xs">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-cult-white">{inv.customer_name}</td>
                    <td className="px-4 py-3 text-cult-text-muted text-xs">{inv.order_number}</td>
                    <td className="px-4 py-3 text-cult-light-gray">{new Date(inv.issue_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-cult-light-gray">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-right text-cult-white font-mono">{fmtDec(inv.total_amount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-400">{Number(inv.paid_amount) > 0 ? fmtDec(inv.paid_amount) : '—'}</td>
                    <td className="px-4 py-3 text-right text-cult-white font-mono">{fmtDec(inv.amount_due)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[inv.ar_status] || STATUS_STYLES['open']}`}>
                        {inv.ar_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs ${BUCKET_COLORS[inv.age_bucket] || 'text-cult-text-muted'}`}>
                        {inv.days_outstanding}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {Number(inv.amount_due) > 0 && inv.ar_status !== 'paid' && (
                        <button
                          onClick={() => { setPaymentModal(inv); setPaymentForm(f => ({ ...f, amount: String(inv.amount_due) })); }}
                          className="text-xs text-green-400 hover:text-green-300 font-medium flex items-center gap-1"
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
          </div>
          {filteredInvoices.length === 0 && (
            <div className="py-12 text-center text-cult-text-muted">No invoices match your search</div>
          )}
        </div>
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
                  <span className="text-green-400 font-mono">{fmtDec(paymentModal.paid_amount)}</span>
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
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {paymentError}
                </div>
              )}

              {paymentSuccess && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Payment recorded — invoice updated
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={paymentSaving || paymentSuccess}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-cult text-sm font-semibold hover:bg-green-500 transition-colors disabled:opacity-50"
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
