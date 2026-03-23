import { useState, useEffect } from 'react';
import { FileText, Send, Plus, Eye } from 'lucide-react';
import { getAllInvoices, getPendingInvoices, createInvoiceFromOrder } from '../services/invoiceService';
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/services/notification.service';

interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  customer_id: string;
  customer_name?: string;
  order_number?: string;
  issue_date: string;
  due_date: string;
  payment_terms: string;
  line_items: any[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  notes: string;
  created_at: string;
}

interface PendingInvoice {
  order_id: string;
  order_number: string;
  order_status: string;
  customer_name: string;
  customer_id: string;
  total_amount: number;
  scheduled_delivery_date: string;
  has_invoice: boolean;
  invoice_number: string;
  invoice_status: string;
}

export function InvoiceManagement() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadInvoices();
    loadPendingInvoices();
  }, []);

  async function loadInvoices() {
    try {
      const { data, error } = await getAllInvoices();
      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPendingInvoices() {
    try {
      const { data, error } = await getPendingInvoices();
      if (error) throw error;
      setPendingInvoices(data || []);
    } catch (error) {
      console.error('Error loading pending invoices:', error);
    }
  }

  async function generateInvoice(pendingInvoice: PendingInvoice) {
    try {
      const { error: insertError } = await createInvoiceFromOrder(
        pendingInvoice.order_id,
        pendingInvoice.customer_id,
        pendingInvoice.order_number
      );

      if (insertError) throw insertError;

      await loadInvoices();
      await loadPendingInvoices();
    } catch (error) {
      console.error('Error generating invoice:', error);
      notificationService.error('Failed to generate invoice. Please try again.');
    }
  }

  async function updateInvoiceStatus(invoiceId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);

      if (error) throw error;
      await loadInvoices();
    } catch (error) {
      console.error('Error updating invoice status:', error);
      notificationService.error('Failed to update status. Please try again.');
    }
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      draft: 'bg-cult-surface-overlay text-cult-text-secondary',
      sent: 'bg-blue-900/30 text-blue-400 border-blue-600',
      paid: 'bg-green-900/30 text-green-400 border-green-600',
      overdue: 'bg-red-900/30 text-red-400 border-red-600',
      cancelled: 'bg-cult-surface/30 text-cult-text-muted border-cult-border-strong',
    };
    return colors[status] || colors.draft;
  }

  if (loading) {
    return <div className="text-cult-text-muted">Loading invoices...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Invoice Management</h2>
      </div>

      {pendingInvoices.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Orders Ready for Invoicing ({pendingInvoices.length})
          </h3>
          <div className="space-y-2">
            {pendingInvoices.map(pending => (
              <div key={pending.order_id} className="flex items-center justify-between p-3 bg-cult-surface/50 rounded">
                <div>
                  <div className="text-white font-medium">{pending.order_number}</div>
                  <div className="text-sm text-cult-text-muted">{pending.customer_name}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-semibold">${pending.total_amount.toFixed(2)}</span>
                  <button
                    onClick={() => generateInvoice(pending)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Generate Invoice
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-cult-surface-raised/50 border border-cult-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cult-surface/50 border-b border-cult-border">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-cult-text-muted">Invoice #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-cult-text-muted">Customer</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-cult-text-muted">Order</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-cult-text-muted">Issue Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-cult-text-muted">Due Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-cult-text-muted">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-cult-text-muted">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-cult-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cult-border">
              {invoices.map(invoice => (
                <tr key={invoice.id} className="hover:bg-cult-surface/30">
                  <td className="px-4 py-3 text-white font-mono">{invoice.invoice_number}</td>
                  <td className="px-4 py-3 text-white">{invoice.customer_name}</td>
                  <td className="px-4 py-3 text-cult-text-muted">{invoice.order_number}</td>
                  <td className="px-4 py-3 text-cult-text-muted">{new Date(invoice.issue_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-cult-text-muted">{new Date(invoice.due_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-white font-semibold">${invoice.total_amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={invoice.status}
                      onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                      className={`px-2 py-1 rounded text-sm border ${getStatusColor(invoice.status)}`}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowPreview(true);
                        }}
                        className="p-2 hover:bg-cult-surface-overlay rounded transition-colors"
                        title="Preview & Print"
                      >
                        <Eye className="w-4 h-4 text-cult-text-muted" />
                      </button>
                      <button className="p-2 hover:bg-cult-surface-overlay rounded transition-colors" title="Send">
                        <Send className="w-4 h-4 text-cult-text-muted" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPreview && selectedInvoice && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-cult-surface border border-cult-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-cult-border flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Invoice Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-cult-text-muted hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-8 bg-white text-black">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">INVOICE</h1>
                <p className="text-xl">{selectedInvoice.invoice_number}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold mb-2">Bill To:</h3>
                  <p>{selectedInvoice.customer_name}</p>
                </div>
                <div className="text-right">
                  <p><strong>Issue Date:</strong> {new Date(selectedInvoice.issue_date).toLocaleDateString()}</p>
                  <p><strong>Due Date:</strong> {new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                  <p><strong>Terms:</strong> {selectedInvoice.payment_terms}</p>
                </div>
              </div>

              <table className="w-full mb-8">
                <thead className="border-b-2 border-black">
                  <tr>
                    <th className="text-left py-2">Product</th>
                    <th className="text-right py-2">Quantity</th>
                    <th className="text-right py-2">Unit Price</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.line_items.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2">{item.product_name}</td>
                      <td className="text-right py-2">{item.quantity}</td>
                      <td className="text-right py-2">${item.unit_price.toFixed(2)}</td>
                      <td className="text-right py-2">${item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2">
                    <span>Subtotal:</span>
                    <span>${selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Tax ({(selectedInvoice.tax_rate * 100).toFixed(1)}%):</span>
                    <span>${selectedInvoice.tax_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t-2 border-black font-bold text-lg">
                    <span>Total:</span>
                    <span>${selectedInvoice.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="mt-8 pt-4 border-t">
                  <p className="text-sm text-cult-text-faint">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
