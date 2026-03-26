import { useState, useEffect } from 'react';
import { Plus, Receipt, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

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

interface VendorBill {
  id: string;
  vendor_name: string;
  vendor_category: string;
  bill_number: string | null;
  bill_date: string;
  due_date: string | null;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  is_cogs: boolean;
  notes: string | null;
  created_at: string;
}

const emptyForm = {
  vendor_name: '',
  vendor_category: 'nutrients',
  bill_number: '',
  bill_date: new Date().toISOString().split('T')[0],
  due_date: '',
  amount: '',
  tax_amount: '0',
  is_cogs: true,
  notes: '',
};

export function VendorBillEntry() {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadBills();
  }, []);

  async function loadBills() {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('vendor_bills')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);

      if (fetchError) throw fetchError;
      setBills(data || []);
    } catch (err: any) {
      console.error('Failed to load vendor bills:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!form.vendor_name.trim()) {
      setError('Vendor name is required');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setSaving(true);
      const { error: insertError } = await supabase
        .from('vendor_bills')
        .insert({
          vendor_name: form.vendor_name.trim(),
          vendor_category: form.vendor_category,
          bill_number: form.bill_number.trim() || null,
          bill_date: form.bill_date,
          due_date: form.due_date || null,
          amount: parseFloat(form.amount),
          tax_amount: parseFloat(form.tax_amount) || 0,
          status: 'unpaid',
          is_cogs: form.is_cogs,
          notes: form.notes.trim() || null,
          created_by: user?.id || null,
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setForm(emptyForm);
      await loadBills();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  }

  function formatCurrency(val: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  }

  function formatCategory(cat: string) {
    return VENDOR_CATEGORIES.find(c => c.value === cat)?.label || cat;
  }

  return (
    <div className="space-y-6 pb-8 stagger-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">Accounts Payable</h1>
        <p className="text-cult-light-gray mt-2">Enter vendor bills and track expense classification for 280E</p>
      </div>

      {/* Entry Form */}
      <form onSubmit={handleSubmit} className="bg-cult-surface border border-cult-border rounded-cult p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Receipt className="w-5 h-5 text-cult-white" />
          <h2 className="text-lg font-semibold text-cult-white">New Vendor Bill</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-cult-text-muted mb-1">Vendor Name *</label>
            <input
              type="text"
              value={form.vendor_name}
              onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))}
              className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
              placeholder="e.g. Athena Nutrients"
            />
          </div>
          <div>
            <label className="block text-sm text-cult-text-muted mb-1">Category *</label>
            <select
              value={form.vendor_category}
              onChange={e => setForm(f => ({ ...f, vendor_category: e.target.value }))}
              className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
            >
              {VENDOR_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-cult-text-muted mb-1">Bill Number</label>
            <input
              type="text"
              value={form.bill_number}
              onChange={e => setForm(f => ({ ...f, bill_number: e.target.value }))}
              className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
              placeholder="INV-001"
            />
          </div>
          <div>
            <label className="block text-sm text-cult-text-muted mb-1">Bill Date *</label>
            <input
              type="date"
              value={form.bill_date}
              onChange={e => setForm(f => ({ ...f, bill_date: e.target.value }))}
              className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
            />
          </div>
          <div>
            <label className="block text-sm text-cult-text-muted mb-1">Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
            />
          </div>
          <div>
            <label className="block text-sm text-cult-text-muted mb-1">Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm text-cult-text-muted mb-1">Tax Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.tax_amount}
              onChange={e => setForm(f => ({ ...f, tax_amount: e.target.value }))}
              className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
              placeholder="0.00"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm text-cult-text-muted mb-1">Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full bg-cult-black border border-cult-border rounded-cult px-3 py-2 text-cult-white text-sm focus:outline-none focus:border-cult-white"
              placeholder="Optional notes"
            />
          </div>
        </div>

        {/* COGS Toggle */}
        <div className="flex items-start gap-3 p-4 bg-cult-black/50 rounded-cult border border-cult-border">
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, is_cogs: !f.is_cogs }))}
            className={`mt-0.5 flex-shrink-0 w-10 h-6 rounded-full transition-colors relative ${
              form.is_cogs ? 'bg-green-600' : 'bg-cult-border'
            }`}
          >
            <span className={`block w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
              form.is_cogs ? 'translate-x-5' : 'translate-x-1'
            }`} />
          </button>
          <div>
            <span className="text-sm font-medium text-cult-white">
              {form.is_cogs ? 'COGS (Cost of Goods Sold)' : 'Operating Expense'}
            </span>
            <p className="text-xs text-cult-text-muted mt-1">
              COGS = directly related to cannabis production (nutrients, packaging, lab tests, cultivation labor).
              Under IRS 280E, only COGS is deductible for cannabis operators.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            Bill saved successfully
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-cult-white text-cult-black px-5 py-2.5 rounded-cult text-sm font-semibold hover:bg-cult-light-gray transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {saving ? 'Saving...' : 'Add Bill'}
        </button>
      </form>

      {/* Recent Bills List */}
      <div className="bg-cult-surface border border-cult-border rounded-cult overflow-hidden">
        <div className="px-6 py-4 border-b border-cult-border">
          <h2 className="text-lg font-semibold text-cult-white">Recent Bills</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-cult-text-muted">Loading bills...</div>
          </div>
        ) : bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-cult-text-muted">
            <Receipt className="w-8 h-8 mb-2 opacity-50" />
            <p>No vendor bills yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-cult-text-muted text-left border-b border-cult-border">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Bill #</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium text-center">Type</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <tr key={bill.id} className="border-b border-cult-border/50 hover:bg-cult-black/30 transition-colors">
                    <td className="px-4 py-3 text-cult-light-gray">
                      {new Date(bill.bill_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-cult-white font-medium">{bill.vendor_name}</td>
                    <td className="px-4 py-3 text-cult-light-gray">{formatCategory(bill.vendor_category)}</td>
                    <td className="px-4 py-3 text-cult-text-muted">{bill.bill_number || '—'}</td>
                    <td className="px-4 py-3 text-cult-white text-right font-mono">
                      {formatCurrency(bill.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        bill.is_cogs
                          ? 'bg-green-900/40 text-green-400 border border-green-800/50'
                          : 'bg-amber-900/40 text-amber-400 border border-amber-800/50'
                      }`}>
                        {bill.is_cogs ? 'COGS' : 'OpEx'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        bill.status === 'paid' ? 'bg-green-900/40 text-green-400' :
                        bill.status === 'partial' ? 'bg-amber-900/40 text-amber-400' :
                        bill.status === 'void' ? 'bg-cult-border text-cult-text-muted' :
                        'bg-red-900/40 text-red-400'
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
    </div>
  );
}
