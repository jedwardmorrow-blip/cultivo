import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Receipt, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Download, MoreVertical,
  FileUp, X, Upload, Clock, Loader
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { parseInvoicePDF, uploadInvoicePDF } from '../services/invoiceParser.service';

// Type Definitions
interface APOverview {
  total_open_bills: number;
  vendors_with_open_ap: number;
  total_outstanding: number;
  total_overdue: number;
  current_amount: number;
  bucket_1_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
  outstanding_cogs: number;
  outstanding_operating: number;
  active_recurring_bills: number;
  monthly_recurring_total: number;
}

interface VendorSummary {
  vendor_id: string;
  vendor_name: string;
  open_bill_count: number;
  total_billed: number;
  total_paid: number;
  total_outstanding: number;
  oldest_days_outstanding: number;
  current_amount: number;
  bucket_1_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
  outstanding_cogs: number;
  outstanding_operating: number;
}

interface LineItem {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  amount: number;
}

interface Bill {
  id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_category: string;
  bill_number: string | null;
  bill_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number;
  amount_due: number;
  status: string;
  is_cogs: boolean;
  days_outstanding: number;
  age_bucket: string;
  payment_count: number;
  notes: string | null;
  created_at: string;
}

interface BillDetails extends Bill {
  line_items: LineItem[];
  payment_records: PaymentRecord[];
}

interface PaymentRecord {
  id: string;
  vendor_bill_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

interface VendorRecord {
  id: string;
  name: string;
  category: string;
  contact_email: string | null;
  contact_phone: string | null;
  payment_terms: string | null;
}

const VENDOR_CATEGORIES = [
  { value: 'nutrients', label: 'Nutrients' },
  { value: 'packaging_materials', label: 'Packaging Materials' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'testing', label: 'Testing / Lab Fees' },
  { value: 'rent', label: 'Rent' },
  { value: 'license', label: 'License Fees' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'labor_contract', label: 'Contract Labor' },
  { value: 'other', label: 'Other' },
] as const;

const AGE_BUCKETS = [
  { key: 'current', label: 'Current (0-30)', min: 0, max: 30, color: 'text-cult-success' },
  { key: '1-30', label: '1-30 Days', min: 1, max: 30, color: 'text-cult-warning' },
  { key: '31-60', label: '31-60 Days', min: 31, max: 60, color: 'text-cult-warning' },
  { key: '61-90', label: '61-90 Days', min: 61, max: 90, color: 'text-cult-warning' },
  { key: '90+', label: '90+ Days', min: 91, max: Infinity, color: 'text-cult-danger' },
];

interface NewBillFormState {
  vendor_id: string;
  vendor_name: string;
  vendor_category: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  is_cogs: boolean;
  notes: string;
}

interface PaymentFormState {
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string;
}

interface AddVendorFormState {
  name: string;
  category: string;
  contact_email: string;
  contact_phone: string;
  payment_terms: string;
}

export function VendorBillEntry() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State - Overview & Data
  const [overview, setOverview] = useState<APOverview | null>(null);
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  // State - Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State - UI
  const [viewMode, setViewMode] = useState<'vendors' | 'bills'>('vendors');
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<BillDetails | null>(null);
  const [ageBucketFilter, setAgeBucketFilter] = useState<string>('all');

  // State - Modals
  const [showNewBillModal, setShowNewBillModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [isDraggingPage, setIsDraggingPage] = useState(false);
  const dragCounterRef = useRef(0);

  // State - New Bill Form
  const [newBillForm, setNewBillForm] = useState<NewBillFormState>({
    vendor_id: '',
    vendor_name: '',
    vendor_category: 'nutrients',
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    subtotal: 0,
    tax_amount: 0,
    is_cogs: true,
    notes: '',
  });
  const [billFile, setBillFile] = useState<File | null>(null);
  const [billUploadLoading, setBillUploadLoading] = useState(false);
  const [billUploadError, setBillUploadError] = useState<string | null>(null);

  // State - Payment Form
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'check',
    notes: '',
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // State - Add Vendor Form
  const [vendorForm, setVendorForm] = useState<AddVendorFormState>({
    name: '',
    category: 'nutrients',
    contact_email: '',
    contact_phone: '',
    payment_terms: '',
  });
  const [vendorLoading, setVendorLoading] = useState(false);

  // Reset form handlers
  const resetNewBillForm = () => {
    setNewBillForm({
      vendor_id: '',
      vendor_name: '',
      vendor_category: 'nutrients',
      bill_number: '',
      bill_date: new Date().toISOString().split('T')[0],
      due_date: '',
      subtotal: 0,
      tax_amount: 0,
      is_cogs: true,
      notes: '',
    });
    setBillFile(null);
    setBillUploadError(null);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const resetVendorForm = () => {
    setVendorForm({
      name: '',
      category: 'nutrients',
      contact_email: '',
      contact_phone: '',
      payment_terms: '',
    });
  };

  // PDF Upload Handler
  const handlePDFUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      setBillUploadError('Please upload a PDF file');
      return;
    }

    setBillUploadLoading(true);
    setBillUploadError(null);

    try {
      const parsedData = await parseInvoicePDF(file);

      setNewBillForm(prev => ({
        ...prev,
        vendor_name: parsedData.vendor_name || prev.vendor_name,
        bill_number: parsedData.invoice_number || prev.bill_number,
        bill_date: parsedData.invoice_date || prev.bill_date,
        due_date: parsedData.due_date || prev.due_date,
        subtotal: parsedData.subtotal || prev.subtotal,
        tax_amount: parsedData.tax_amount || prev.tax_amount,
      }));

      setBillFile(file);
      if (parsedData.confidence === 'low') {
        setBillUploadError('PDF parsed with low confidence. Please verify details.');
      }
    } catch (err) {
      setBillUploadError(`Failed to parse PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setBillUploadLoading(false);
    }
  };

  // Save New Bill Handler
  const handleSaveBill = async () => {
    if (!newBillForm.vendor_name || !newBillForm.vendor_category) {
      alert('Please fill in vendor name and category');
      return;
    }

    setBillUploadLoading(true);
    try {
      // Create vendor if new
      let vendorId = newBillForm.vendor_id;
      if (!vendorId) {
        const { data: newVendor, error: vendorError } = await supabase
          .from('vendors')
          .insert([{
            name: newBillForm.vendor_name,
            category: newBillForm.vendor_category,
          }])
          .select('id')
          .single();

        if (vendorError) throw vendorError;
        vendorId = newVendor.id;
      }

      // Create bill
      const { error: billError } = await supabase
        .from('vendor_bills')
        .insert([{
          vendor_id: vendorId,
          vendor_name: newBillForm.vendor_name,
          vendor_category: newBillForm.vendor_category,
          bill_number: newBillForm.bill_number || null,
          bill_date: newBillForm.bill_date,
          due_date: newBillForm.due_date || null,
          amount: newBillForm.subtotal,
          tax_amount: newBillForm.tax_amount,
          total_amount: newBillForm.subtotal + newBillForm.tax_amount,
          is_cogs: newBillForm.is_cogs,
          notes: newBillForm.notes || null,
          status: 'unpaid',
          created_by: user?.id || null,
        }]);

      if (billError) throw billError;

      // Upload PDF if provided
      if (billFile) {
        try {
          await uploadInvoicePDF(billFile, vendorId);
        } catch (err) {
          console.warn('Failed to upload PDF:', err);
        }
      }

      await loadData();
      setShowNewBillModal(false);
      resetNewBillForm();
    } catch (err) {
      alert(`Failed to save bill: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setBillUploadLoading(false);
    }
  };

  // Record Payment Handler
  const handleRecordPayment = async () => {
    if (!selectedBill || paymentForm.amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    setPaymentLoading(true);
    try {
      const { error: paymentError } = await supabase
        .from('bill_payments')
        .insert([{
          vendor_bill_id: selectedBill.id,
          amount: paymentForm.amount,
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method || 'check',
          notes: paymentForm.notes || null,
          recorded_by: user?.id || null,
        }]);

      if (paymentError) throw paymentError;

      // Update bill payment_amount and status
      const newPaidTotal = (selectedBill.paid_amount || 0) + paymentForm.amount;
      const newBalance = Math.max(0, selectedBill.total_amount - newPaidTotal);
      const newStatus = newBalance === 0 ? 'paid' : 'partial';

      const { error: updateError } = await supabase
        .from('vendor_bills')
        .update({
          payment_amount: newPaidTotal,
          payment_date: paymentForm.payment_date,
          status: newStatus,
        })
        .eq('id', selectedBill.id);

      if (updateError) throw updateError;

      await loadData();
      setShowPaymentModal(false);
      setSelectedBill(null);
      resetPaymentForm();
    } catch (err) {
      alert(`Failed to record payment: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Add Vendor Handler
  const handleAddVendor = async () => {
    if (!vendorForm.name || !vendorForm.category) {
      alert('Please fill in vendor name and category');
      return;
    }

    setVendorLoading(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .insert([{
          name: vendorForm.name,
          category: vendorForm.category,
          contact_email: vendorForm.contact_email || null,
          contact_phone: vendorForm.contact_phone || null,
          payment_terms: vendorForm.payment_terms || null,
        }]);

      if (error) throw error;

      await loadData();
      setShowAddVendorModal(false);
      resetVendorForm();
    } catch (err) {
      alert(`Failed to add vendor: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setVendorLoading(false);
    }
  };

  // Void Bill Handler
  const handleVoidBill = async (billId: string) => {
    if (!confirm('Are you sure you want to void this bill?')) return;

    try {
      const { error } = await supabase
        .from('vendor_bills')
        .update({ status: 'void' })
        .eq('id', billId);

      if (error) throw error;

      await loadData();
      setSelectedBill(null);
    } catch (err) {
      alert(`Failed to void bill: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [overviewRes, vendorsRes, billsRes] = await Promise.all([
        supabase.from('v_ap_overview').select('*').single(),
        supabase.from('v_ap_overview_by_vendor').select('*'),
        supabase.from('v_ap_aging').select('*'),
      ]);

      if (overviewRes.data) setOverview(overviewRes.data as APOverview);
      if (vendorsRes.data) setVendors(vendorsRes.data as VendorSummary[]);
      if (billsRes.data) setBills(billsRes.data as Bill[]);
    } catch (err) {
      console.error('Failed to load AP data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Computed values
  const ageBucketsData = useMemo(() => {
    const data: Record<string, number> = {
      current: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
    };

    bills.forEach(bill => {
      if (bill.amount_due <= 0) return;
      const daysOld = Math.floor((Date.now() - new Date(bill.due_date || bill.bill_date).getTime()) / (1000 * 60 * 60 * 24));
      const bucket = AGE_BUCKETS.find(b => daysOld >= b.min && daysOld <= b.max);
      if (bucket) data[bucket.key]++;
    });

    return data;
  }, [bills]);

  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      if (bill.amount_due <= 0) return false;
      if (ageBucketFilter === 'all') return true;

      const bucket = AGE_BUCKETS.find(b => b.key === ageBucketFilter);
      if (!bucket) return true;

      const daysOld = Math.floor((Date.now() - new Date(bill.due_date || bill.bill_date).getTime()) / (1000 * 60 * 60 * 24));
      return daysOld >= bucket.min && daysOld <= bucket.max;
    });
  }, [bills, ageBucketFilter]);

  const vendorBills = useMemo(() => {
    return expandedVendor
      ? bills.filter(b => b.vendor_id === expandedVendor && b.amount_due > 0)
      : [];
  }, [bills, expandedVendor]);

  // Formatting utilities
  const fmt = {
    currency: (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val),
    date: (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
    category: (cat: string) => VENDOR_CATEGORIES.find(c => c.value === cat)?.label || cat,
    daysSince: (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24)),
  };

  // Export CSV
  async function handleExport() {
    const headers = viewMode === 'vendors'
      ? ['Vendor', 'Outstanding', 'Paid', 'Bills', 'Oldest (Days)']
      : ['Vendor', 'Bill #', 'Date', 'Due Date', 'Amount', 'Status', 'Days Overdue'];

    const rows = viewMode === 'vendors'
      ? vendors.map(v => [
          v.vendor_name,
          v.total_outstanding,
          v.total_paid,
          v.open_bill_count,
          v.oldest_days_outstanding,
        ])
      : filteredBills.map(b => [
          b.vendor_name,
          b.bill_number || '—',
          fmt.date(b.bill_date),
          b.due_date ? fmt.date(b.due_date) : '—',
          b.amount_due,
          b.status,
          fmt.daysSince(b.due_date || b.bill_date),
        ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ap-${viewMode}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Show notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Summary Cards
  const SummaryCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'Total Outstanding', value: overview?.total_outstanding || 0, subtext: `${fmt.currency(overview?.outstanding_cogs || 0)} COGS` },
        { label: 'Overdue Amount', value: overview?.total_overdue || 0, subtext: 'Past due' },
        { label: 'Open Bills', value: overview?.total_open_bills || 0, subtext: 'awaiting payment' },
        { label: 'OpEx Outstanding', value: overview?.outstanding_operating || 0, subtext: 'Operating expense' },
      ].map((card, i) => (
        <div key={i} className="bg-cult-surface border border-cult-border rounded-cult p-4">
          <div className="text-cult-text-muted text-xs uppercase tracking-wide">{card.label}</div>
          <div className="text-2xl font-bold text-cult-white mt-2">{
            typeof card.value === 'number' && card.value >= 1000 ? fmt.currency(card.value) : card.value
          }</div>
          <div className="text-cult-text-muted text-xs mt-1">{card.subtext}</div>
        </div>
      ))}
    </div>
  );

  // View Toggle & Actions
  const ViewControls = () => (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-2 bg-cult-black/50 rounded-cult p-1 border border-cult-border">
        {(['vendors', 'bills'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => { setViewMode(mode); setAgeBucketFilter('all'); }}
            className={`px-4 py-1.5 rounded-cult text-sm font-medium transition-colors ${
              viewMode === mode
                ? 'bg-cult-white text-cult-black'
                : 'text-cult-light-gray hover:text-cult-white'
            }`}
          >
            {mode === 'vendors' ? 'Vendors' : 'Bills'}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label
          className="flex items-center gap-2 bg-cult-success text-white px-3 py-1.5 rounded-cult text-sm font-semibold hover:bg-cult-success/80 transition-colors cursor-pointer"
        >
          <FileUp className="w-4 h-4" />
          Scan Invoice
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                setShowNewBillModal(true);
                setTimeout(() => handlePDFUpload(file), 100);
              }
              e.target.value = '';
            }}
          />
        </label>
        <button
          onClick={() => setShowNewBillModal(true)}
          className="flex items-center gap-2 bg-cult-white text-cult-black px-3 py-1.5 rounded-cult text-sm font-semibold hover:bg-cult-light-gray transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Bill
        </button>
        <button
          onClick={() => setShowAddVendorModal(true)}
          className="flex items-center gap-2 bg-cult-border text-cult-light-gray px-3 py-1.5 rounded-cult text-sm hover:text-cult-white transition-colors"
        >
          Add Vendor
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-cult-border text-cult-light-gray px-3 py-1.5 rounded-cult text-sm hover:text-cult-white transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
    </div>
  );

  // Age Bucket Filter (Bills view)
  const AgeBucketFilter = () => viewMode === 'bills' ? (
    <div className="flex items-center gap-2 flex-wrap">
      {[{ key: 'all', label: 'All' }, ...AGE_BUCKETS].map(bucket => (
        <button
          key={bucket.key}
          onClick={() => setAgeBucketFilter(bucket.key)}
          className={`px-3 py-1.5 rounded-cult text-xs font-medium transition-colors ${
            ageBucketFilter === bucket.key
              ? 'bg-cult-white text-cult-black'
              : 'bg-cult-black/50 text-cult-light-gray border border-cult-border hover:text-cult-white'
          }`}
        >
          {bucket.label} {bucket.key !== 'all' && `(${ageBucketsData[bucket.key]})`}
        </button>
      ))}
    </div>
  ) : null;

  // Vendors View
  const VendorsView = () => (
    <div className="space-y-2">
      {vendors.length === 0 ? (
        <div className="text-center py-12 text-cult-text-muted">No vendors</div>
      ) : (
        vendors.map(vendor => (
          <div key={vendor.vendor_id} className="bg-cult-surface border border-cult-border rounded-cult overflow-hidden">
            {/* Vendor Row */}
            <button
              onClick={() => setExpandedVendor(expandedVendor === vendor.vendor_id ? null : vendor.vendor_id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-cult-black/30 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                {expandedVendor === vendor.vendor_id ? <ChevronUp className="w-4 h-4 text-cult-light-gray" /> : <ChevronDown className="w-4 h-4 text-cult-light-gray" />}
                <div className="flex-1 text-left">
                  <div className="text-cult-white font-medium">{vendor.vendor_name}</div>
                  <div className="text-xs text-cult-text-muted">{vendor.open_bill_count} open bills</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-cult-white font-mono text-sm">{fmt.currency(vendor.total_outstanding)}</div>
                <div className="text-xs text-cult-text-muted">{vendor.oldest_days_outstanding}d oldest</div>
              </div>
            </button>

            {/* Expanded Bills */}
            {expandedVendor === vendor.vendor_id && vendorBills.length > 0 && (
              <div className="bg-cult-black/30 border-t border-cult-border divide-y divide-cult-border">
                {vendorBills.map(bill => (
                  <div
                    key={bill.id}
                    onClick={() => setSelectedBill(bill as BillDetails)}
                    className="px-8 py-3 flex items-center justify-between hover:bg-cult-black/50 transition-colors cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="text-cult-light-gray text-sm">{bill.bill_number || '—'} • {fmt.date(bill.bill_date)}</div>
                      <div className="text-xs text-cult-text-muted mt-0.5">{bill.is_cogs ? 'COGS' : 'OpEx'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-cult-white font-mono text-sm">{fmt.currency(bill.amount_due)}</div>
                      <div className="text-xs text-cult-danger">{fmt.daysSince(bill.due_date || bill.bill_date)} days old</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  // Bills View
  const BillsView = () => (
    <div className="bg-cult-surface border border-cult-border rounded-cult overflow-hidden">
      {filteredBills.length === 0 ? (
        <div className="text-center py-12 text-cult-text-muted">No bills matching filter</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-cult-text-muted text-left border-b border-cult-border">
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Bill #</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-right">Balance</th>
                <th className="px-4 py-3 font-medium text-center">Days</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map(bill => (
                <tr
                  key={bill.id}
                  onClick={() => setSelectedBill(bill as BillDetails)}
                  className="border-b border-cult-border/50 hover:bg-cult-black/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-cult-white font-medium">{bill.vendor_name}</td>
                  <td className="px-4 py-3 text-cult-light-gray">{bill.bill_number || '—'}</td>
                  <td className="px-4 py-3 text-cult-text-muted">{fmt.date(bill.bill_date)}</td>
                  <td className="px-4 py-3 text-cult-white text-right font-mono">{fmt.currency(bill.total_amount)}</td>
                  <td className="px-4 py-3 text-cult-white text-right font-mono">{fmt.currency(bill.amount_due)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold ${fmt.daysSince(bill.due_date || bill.bill_date) > 30 ? 'text-cult-danger' : 'text-cult-light-gray'}`}>
                      {fmt.daysSince(bill.due_date || bill.bill_date)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      bill.status === 'paid' ? 'bg-cult-success-muted text-cult-success' :
                      bill.status === 'partial' ? 'bg-cult-warning-muted text-cult-warning' :
                      bill.status === 'void' ? 'bg-cult-border text-cult-text-muted' :
                      'bg-cult-danger-muted text-cult-danger'
                    }`}>
                      {bill.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Load bill details with payment records
  const loadBillDetails = async (billId: string) => {
    try {
      const { data: bill, error } = await supabase
        .from('vendor_bills')
        .select('*, vendor_payments(*)')
        .eq('id', billId)
        .single();

      if (error) throw error;
      setSelectedBill(bill as BillDetails);
    } catch (err) {
      console.error('Failed to load bill details:', err);
    }
  };

  // Bill Detail Drawer
  const BillDetailDrawer = () => selectedBill ? (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setSelectedBill(null)}>
      <div
        className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-cult-surface border-l border-cult-border overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-cult-surface border-b border-cult-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-cult-white">Bill Details</h2>
          <button onClick={() => setSelectedBill(null)} className="text-cult-light-gray hover:text-cult-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Vendor Info */}
          <div>
            <div className="text-xs uppercase text-cult-text-muted tracking-wide">Vendor</div>
            <div className="text-cult-white font-semibold mt-1">{selectedBill.vendor_name}</div>
            <div className="text-xs text-cult-light-gray mt-0.5">{fmt.category(selectedBill.vendor_category)} • {selectedBill.is_cogs ? 'COGS' : 'OpEx'}</div>
          </div>

          {/* Bill Details */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Bill #', value: selectedBill.bill_number || '—' },
              { label: 'Bill Date', value: fmt.date(selectedBill.bill_date) },
              { label: 'Due Date', value: selectedBill.due_date ? fmt.date(selectedBill.due_date) : '—' },
              { label: 'Status', value: selectedBill.status },
            ].map((item, i) => (
              <div key={i}>
                <div className="text-xs text-cult-text-muted">{item.label}</div>
                <div className="text-cult-white font-medium text-sm mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Amounts */}
          <div className="bg-cult-black/50 rounded-cult p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-cult-text-muted">Subtotal</span>
              <span className="text-cult-white font-mono">{fmt.currency(selectedBill.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-cult-text-muted">Tax</span>
              <span className="text-cult-white font-mono">{fmt.currency(selectedBill.tax_amount)}</span>
            </div>
            <div className="border-t border-cult-border pt-2 flex justify-between text-sm">
              <span className="text-cult-white font-medium">Total</span>
              <span className="text-cult-white font-mono font-bold">{fmt.currency(selectedBill.total_amount)}</span>
            </div>
            <div className="border-t border-cult-border pt-2 flex justify-between">
              <span className="text-cult-light-gray">Balance Due</span>
              <span className={`font-mono font-bold ${selectedBill.amount_due > 0 ? 'text-cult-danger' : 'text-cult-success'}`}>
                {fmt.currency(selectedBill.amount_due)}
              </span>
            </div>
          </div>

          {/* Line Items */}
          {selectedBill.line_items && selectedBill.line_items.length > 0 && (
            <div>
              <div className="text-xs uppercase text-cult-text-muted tracking-wide mb-2">Line Items</div>
              <div className="space-y-1 text-xs">
                {selectedBill.line_items.map((item, i) => (
                  <div key={i} className="flex justify-between text-cult-light-gray">
                    <span>{item.description}</span>
                    <span className="font-mono">{fmt.currency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Records */}
          {selectedBill.payment_records && selectedBill.payment_records.length > 0 && (
            <div>
              <div className="text-xs uppercase text-cult-text-muted tracking-wide mb-2">Payment History</div>
              <div className="space-y-2">
                {selectedBill.payment_records.map((payment, i) => (
                  <div key={i} className="bg-cult-black/30 rounded-cult p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-cult-white font-mono">{fmt.currency(payment.amount)}</div>
                      <div className="text-xs text-cult-text-muted mt-0.5">{fmt.date(payment.payment_date)}</div>
                    </div>
                    {payment.notes && <div className="text-xs text-cult-light-gray max-w-xs text-right">{payment.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {selectedBill.notes && (
            <div>
              <div className="text-xs uppercase text-cult-text-muted tracking-wide">Notes</div>
              <div className="text-cult-light-gray text-sm mt-1 bg-cult-black/30 rounded p-2">{selectedBill.notes}</div>
            </div>
          )}

          {/* Actions */}
          {selectedBill.amount_due > 0 && (
            <div className="space-y-2 border-t border-cult-border pt-6">
              <button
                onClick={() => { setShowPaymentModal(true); }}
                className="w-full bg-cult-success hover:bg-cult-success/80 text-white px-4 py-2 rounded-cult text-sm font-semibold transition-colors"
              >
                Record Payment
              </button>
              <button
                onClick={() => handleVoidBill(selectedBill.id)}
                className="w-full bg-cult-danger-muted hover:bg-cult-danger-muted/80 text-cult-danger px-4 py-2 rounded-cult text-sm font-semibold transition-colors"
              >
                Void Bill
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  // New Bill Modal
  const NewBillModal = () => showNewBillModal ? (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowNewBillModal(false)}>
      <div
        className="bg-cult-surface border border-cult-border rounded-cult w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-cult-surface border-b border-cult-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-cult-white">New Vendor Bill</h2>
          <button
            onClick={() => {
              setShowNewBillModal(false);
              resetNewBillForm();
            }}
            className="text-cult-light-gray hover:text-cult-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* PDF Upload Zone */}
          <div
            className={`border-2 border-dashed rounded-cult p-8 text-center transition-all cursor-pointer ${
              billUploadLoading
                ? 'border-cult-text-muted bg-cult-black/30'
                : billFile
                  ? 'border-cult-success/50 bg-cult-success-muted'
                  : 'border-cult-border hover:border-cult-white'
            }`}
            onDragOver={e => !billUploadLoading && e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handlePDFUpload(file);
            }}
            onClick={() => !billUploadLoading && fileInputRef.current?.click()}
          >
            {billUploadLoading ? (
              <>
                <Loader className="w-8 h-8 text-cult-light-gray mx-auto mb-2 animate-spin" />
                <div className="text-sm text-cult-light-gray">Parsing PDF...</div>
              </>
            ) : billFile ? (
              <>
                <CheckCircle className="w-8 h-8 text-cult-success mx-auto mb-2" />
                <div className="text-sm text-cult-success font-medium">{billFile.name}</div>
                <div className="text-xs text-cult-text-muted mt-1">Click to replace</div>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-cult-light-gray mx-auto mb-2" />
                <div className="text-sm text-cult-light-gray">Drag invoice PDF or click to upload</div>
                <div className="text-xs text-cult-text-muted mt-1">Auto-parses vendor, invoice #, dates, and amounts</div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handlePDFUpload(file);
              }}
            />
          </div>

          {billUploadError && (
            <div className="bg-cult-danger-muted border border-cult-danger/50 rounded-cult p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-cult-danger flex-shrink-0 mt-0.5" />
              <div className="text-sm text-cult-danger">{billUploadError}</div>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              placeholder="Vendor Name"
              value={newBillForm.vendor_name}
              onChange={e => setNewBillForm(p => ({ ...p, vendor_name: e.target.value }))}
              className="col-span-2 bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
            />
            <select
              value={newBillForm.vendor_category}
              onChange={e => setNewBillForm(p => ({ ...p, vendor_category: e.target.value }))}
              className="bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
            >
              {VENDOR_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input
              placeholder="Bill #"
              value={newBillForm.bill_number}
              onChange={e => setNewBillForm(p => ({ ...p, bill_number: e.target.value }))}
              className="bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
            />
            <div>
              <label className="text-xs text-cult-text-muted">Bill Date</label>
              <input
                type="date"
                value={newBillForm.bill_date}
                onChange={e => setNewBillForm(p => ({ ...p, bill_date: e.target.value }))}
                className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
              />
            </div>
            <div>
              <label className="text-xs text-cult-text-muted">Due Date (optional)</label>
              <input
                type="date"
                value={newBillForm.due_date}
                onChange={e => setNewBillForm(p => ({ ...p, due_date: e.target.value }))}
                className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
              />
            </div>
            <div>
              <label className="text-xs text-cult-text-muted">Subtotal</label>
              <input
                type="number"
                step="0.01"
                value={newBillForm.subtotal}
                onChange={e => setNewBillForm(p => ({ ...p, subtotal: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
              />
            </div>
            <div>
              <label className="text-xs text-cult-text-muted">Tax (optional)</label>
              <input
                type="number"
                step="0.01"
                value={newBillForm.tax_amount}
                onChange={e => setNewBillForm(p => ({ ...p, tax_amount: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
              />
            </div>
            <textarea
              placeholder="Notes (optional)"
              value={newBillForm.notes}
              onChange={e => setNewBillForm(p => ({ ...p, notes: e.target.value }))}
              className="col-span-2 bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white h-16 resize-none"
            />
          </div>

          {/* COGS Toggle */}
          <div className="flex items-center gap-3 bg-cult-black/50 rounded-cult p-4 border border-cult-border">
            <button
              type="button"
              onClick={() => setNewBillForm(p => ({ ...p, is_cogs: !p.is_cogs }))}
              className={`w-10 h-6 rounded-full relative flex-shrink-0 transition-colors ${newBillForm.is_cogs ? 'bg-cult-success' : 'bg-cult-border'}`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${newBillForm.is_cogs ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            <div>
              <div className="text-sm font-medium text-cult-white">COGS (Cost of Goods Sold)</div>
              <div className="text-xs text-cult-text-muted mt-0.5">Directly related to cannabis production (IRS 280E compliance)</div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-cult-border">
            <button
              onClick={() => {
                setShowNewBillModal(false);
                resetNewBillForm();
              }}
              className="flex-1 bg-cult-border text-cult-light-gray px-4 py-2.5 rounded-cult text-sm font-semibold hover:text-cult-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveBill}
              disabled={billUploadLoading}
              className="flex-1 bg-cult-white text-cult-black px-4 py-2.5 rounded-cult text-sm font-semibold hover:bg-cult-light-gray transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {billUploadLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Bill'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // Payment Modal
  const PaymentModal = () => showPaymentModal && selectedBill ? (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
      <div
        className="bg-cult-surface border border-cult-border rounded-cult w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b border-cult-border px-6 py-4">
          <h2 className="text-lg font-bold text-cult-white">Record Payment</h2>
          <div className="text-xs text-cult-text-muted mt-1">{selectedBill.vendor_name}</div>
        </div>

        <div className="p-6 space-y-4">
          {/* Balance Display */}
          <div className="bg-cult-black/50 rounded-cult p-4">
            <div className="text-xs text-cult-text-muted">Current Balance Due</div>
            <div className="text-3xl font-bold text-cult-white mt-2">{fmt.currency(selectedBill.amount_due)}</div>
            <div className="text-xs text-cult-text-muted mt-2">
              Bill: {selectedBill.bill_number || 'N/A'} • {fmt.date(selectedBill.bill_date)}
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-medium text-cult-text-muted mb-2">Payment Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-cult-light-gray">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={selectedBill.amount_due}
                placeholder="0.00"
                value={paymentForm.amount}
                onChange={e => setPaymentForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-cult-black border border-cult-border rounded-cult pl-7 pr-3 py-2.5 text-cult-white text-sm focus:outline-none focus:border-cult-white"
              />
            </div>
            {paymentForm.amount > selectedBill.amount_due && (
              <div className="text-xs text-cult-warning mt-1">Amount exceeds balance due by {fmt.currency(paymentForm.amount - selectedBill.amount_due)}</div>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-cult-text-muted mb-2">Payment Date</label>
            <input
              type="date"
              value={paymentForm.payment_date}
              onChange={e => setPaymentForm(p => ({ ...p, payment_date: e.target.value }))}
              className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2.5 text-cult-white text-sm focus:outline-none focus:border-cult-white"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-cult-text-muted mb-2">Notes (optional)</label>
            <textarea
              placeholder="Check #, ACH reference, memo..."
              value={paymentForm.notes}
              onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white h-16 resize-none"
            />
          </div>

          {/* Summary */}
          {paymentForm.amount > 0 && (
            <div className="bg-cult-success-muted border border-cult-success/30 rounded-cult p-3">
              <div className="text-xs text-cult-success">New Balance: {fmt.currency(Math.max(0, selectedBill.amount_due - paymentForm.amount))}</div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-cult-border">
            <button
              onClick={() => {
                setShowPaymentModal(false);
                resetPaymentForm();
              }}
              className="flex-1 bg-cult-border text-cult-light-gray px-4 py-2.5 rounded-cult text-sm font-semibold hover:text-cult-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRecordPayment}
              disabled={paymentLoading || paymentForm.amount <= 0}
              className="flex-1 bg-cult-success hover:bg-cult-success/80 text-white px-4 py-2.5 rounded-cult text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {paymentLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Recording...
                </>
              ) : (
                'Record Payment'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // Add Vendor Modal
  const AddVendorModal = () => showAddVendorModal ? (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddVendorModal(false)}>
      <div
        className="bg-cult-surface border border-cult-border rounded-cult w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b border-cult-border px-6 py-4">
          <h2 className="text-lg font-bold text-cult-white">Add New Vendor</h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Vendor Name */}
          <div>
            <label className="block text-sm font-medium text-cult-text-muted mb-2">Vendor Name *</label>
            <input
              placeholder="Enter vendor name"
              value={vendorForm.name}
              onChange={e => setVendorForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2.5 text-cult-white text-sm focus:outline-none focus:border-cult-white"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-cult-text-muted mb-2">Category *</label>
            <select
              value={vendorForm.category}
              onChange={e => setVendorForm(p => ({ ...p, category: e.target.value }))}
              className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2.5 text-cult-white text-sm focus:outline-none focus:border-cult-white"
            >
              {VENDOR_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-cult-text-muted mb-2">Email (optional)</label>
            <input
              type="email"
              placeholder="vendor@example.com"
              value={vendorForm.contact_email}
              onChange={e => setVendorForm(p => ({ ...p, contact_email: e.target.value }))}
              className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2.5 text-cult-white text-sm focus:outline-none focus:border-cult-white"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-cult-text-muted mb-2">Phone (optional)</label>
            <input
              type="tel"
              placeholder="(555) 123-4567"
              value={vendorForm.contact_phone}
              onChange={e => setVendorForm(p => ({ ...p, contact_phone: e.target.value }))}
              className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2.5 text-cult-white text-sm focus:outline-none focus:border-cult-white"
            />
          </div>

          {/* Payment Terms */}
          <div>
            <label className="block text-sm font-medium text-cult-text-muted mb-2">Payment Terms (optional)</label>
            <input
              placeholder="e.g., Net 30, Net 60"
              value={vendorForm.payment_terms}
              onChange={e => setVendorForm(p => ({ ...p, payment_terms: e.target.value }))}
              className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2.5 text-cult-white text-sm focus:outline-none focus:border-cult-white"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-cult-border">
            <button
              onClick={() => {
                setShowAddVendorModal(false);
                resetVendorForm();
              }}
              className="flex-1 bg-cult-border text-cult-light-gray px-4 py-2.5 rounded-cult text-sm font-semibold hover:text-cult-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddVendor}
              disabled={vendorLoading || !vendorForm.name || !vendorForm.category}
              className="flex-1 bg-cult-white text-cult-black px-4 py-2.5 rounded-cult text-sm font-semibold hover:bg-cult-light-gray transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {vendorLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Vendor'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // Notification Component
  const Notification = () => notification ? (
    <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top">
      <div className={`rounded-cult px-4 py-3 flex items-center gap-3 ${
        notification.type === 'success'
          ? 'bg-cult-success-muted border border-cult-success/50 text-cult-success'
          : 'bg-cult-danger-muted border border-cult-danger/50 text-cult-danger'
      }`}>
        {notification.type === 'success' ? (
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        )}
        <span className="text-sm font-medium">{notification.message}</span>
      </div>
    </div>
  ) : null;

  // Main Render
  return (
    <div
      className="space-y-6 pb-8 stagger-fade-in"
      onDragEnter={e => {
        e.preventDefault();
        dragCounterRef.current++;
        setIsDraggingPage(true);
      }}
      onDragLeave={e => {
        e.preventDefault();
        dragCounterRef.current--;
        if (dragCounterRef.current === 0) setIsDraggingPage(false);
      }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault();
        dragCounterRef.current = 0;
        setIsDraggingPage(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
          setShowNewBillModal(true);
          setTimeout(() => handlePDFUpload(file), 100);
        }
      }}
    >
      <div>
        <h1 className="text-3xl font-bold text-cult-white">Accounts Payable</h1>
        <p className="text-cult-light-gray mt-2">Manage vendor bills, track payment status, and monitor aging</p>
      </div>

      {/* Full-page drag overlay */}
      {isDraggingPage && (
        <div className="border-2 border-dashed border-cult-success bg-cult-success-muted rounded-cult p-8 flex flex-col items-center justify-center text-center transition-all">
          <FileUp className="w-10 h-10 text-cult-success mb-3" />
          <div className="text-lg font-semibold text-cult-success">Drop invoice PDF to scan</div>
          <div className="text-sm text-cult-text-muted mt-1">We'll extract vendor, amounts, dates, and line items automatically</div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-cult-text-muted">Loading AP data...</div>
      ) : (
        <>
          <SummaryCards />

          <div className="space-y-4">
            <ViewControls />
            <AgeBucketFilter />
          </div>

          {viewMode === 'vendors' ? <VendorsView /> : <BillsView />}

          <BillDetailDrawer />
          <NewBillModal />
          <PaymentModal />
          <AddVendorModal />
        </>
      )}

      <Notification />
    </div>
  );
}
