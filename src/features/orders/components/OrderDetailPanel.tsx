import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, MapPin, Phone, Mail, Copy, Trash2, ChevronRight,
  Building2, Clock, Calendar, Shield, Gift, Check,
  ArrowRight, Undo2, XCircle, RotateCcw, AlertTriangle,
  FileText, Receipt,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, parseDeliveryDate, toDateInputValue } from '@/lib/utils';
import { getStatusColor } from '../utils/orderGrouping';
import { getOrderAge } from '../utils/orderAttention';
import {
  getNextStatus,
  getPreviousStatus,
  getTransitionLabel,
  requiresDeliveryDate,
  getStatusLabel,
} from '../utils/orderTransitions';
import { OrderItemCard } from './OrderItemCard';
import { AddOrderItem } from './AddOrderItem';
import { ManifestModal } from './ManifestModal';
import { CoversheetButton } from './CoversheetButton';
import { OrderLabelGenerator } from './OrderLabelGenerator';
import { ConfirmDialog } from './ConfirmDialog';
import { useOrdersContext } from '../hooks';
import type { Order, OrderItem, Product } from '../types';
import type { OrderExtended } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CustomerInfo {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_postal_code: string | null;
  license_number: string | null;
  license_name: string | null;
  account_credit_balance: number | null;
  dispensary_code: string;
  order_count?: number;
}

interface OrderDetailPanelProps {
  order: Order;
  products: Product[];
  onClose: () => void;
  onStatusUpdate: (orderId: string, newStatus: string) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
  onUpdateDeliveryDate: (orderId: string, newDate: string) => Promise<void>;
  onItemStatusUpdate: (itemId: string, orderId: string, newStatus: string) => Promise<void>;
  onItemQuantityUpdate: (itemId: string, orderId: string, newQuantity: number) => Promise<void>;
  onItemPriceUpdate: (itemId: string, orderId: string, newPrice: number) => Promise<void>;
  onItemBatchUpdate: (itemId: string, orderId: string, batchId: string | null, strain: string | null) => Promise<void>;
  onItemSampleToggle?: (itemId: string, orderId: string, isSample: boolean) => Promise<void>;
  onItemDelete: (itemId: string, orderId: string) => Promise<void>;
  onAddItem: (orderId: string, productId: string, quantity: number) => Promise<void>;
  onGenerateInvoice: (orderId: string, orderNumber: string) => void;
  onCloneOrder: (order: Order) => void;
}

// ─── Status Timeline ────────────────────────────────────────────────────────

const TIMELINE_STEPS = ['submitted', 'accepted', 'processing', 'ready_for_delivery', 'completed'] as const;

const STEP_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  accepted: 'Accepted',
  processing: 'Processing',
  ready_for_delivery: 'Ready',
  completed: 'Completed',
};

function StatusStepper({ currentStatus }: { currentStatus: string }) {
  const currentIndex = TIMELINE_STEPS.indexOf(currentStatus as typeof TIMELINE_STEPS[number]);

  if (currentStatus === 'cancelled') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-cult-danger/10 border border-cult-danger/30 rounded-cult">
        <XCircle className="w-4 h-4 text-cult-danger" />
        <span className="text-sm font-bold text-cult-danger uppercase tracking-wider">Order Cancelled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center w-full">
      {TIMELINE_STEPS.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center gap-1">
              {/* Step indicator */}
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${isCurrent
                  ? 'bg-cult-success text-cult-black ring-2 ring-cult-success/30 ring-offset-2 ring-offset-cult-surface'
                  : isComplete
                    ? 'bg-cult-success/20 text-cult-success'
                    : 'bg-cult-surface-overlay text-cult-text-muted'
                }
              `}>
                {isComplete ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              {/* Label */}
              <span className={`text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${
                isCurrent ? 'text-cult-success' : isComplete ? 'text-cult-text-secondary' : 'text-cult-text-muted'
              }`}>
                {STEP_LABELS[step]}
              </span>
            </div>
            {/* Connector line */}
            {index < TIMELINE_STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mt-[-18px] ${
                index < currentIndex ? 'bg-cult-success/40' : 'bg-cult-border'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Status Actions (inline) ────────────────────────────────────────────────

const STATUS_HINTS: Record<string, string> = {
  'submitted->accepted': 'Confirms the order and begins fulfillment planning.',
  'accepted->processing': 'Indicates batch allocation and processing have started.',
  'processing->ready_for_delivery': 'All items prepared. Ready for manifest and delivery.',
  'ready_for_delivery->completed': 'Inventory will be permanently deducted for all assigned packages.',
};

function StatusActions({
  order,
  onStatusUpdate,
  onUpdateDeliveryDate,
}: {
  order: Order;
  onStatusUpdate: (orderId: string, newStatus: string) => Promise<void>;
  onUpdateDeliveryDate: (orderId: string, newDate: string) => Promise<void>;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showDatePrompt, setShowDatePrompt] = useState(false);
  const [pendingDate, setPendingDate] = useState('');

  const currentStatus = order.status || 'submitted';
  const nextStatus = getNextStatus(currentStatus);
  const prevStatus = getPreviousStatus(currentStatus);
  const isCancelled = currentStatus === 'cancelled';
  const isCompleted = currentStatus === 'completed';
  const deliveryDate = order.scheduled_delivery_date || order.requested_delivery_date;

  const handleTransition = async (toStatus: string) => {
    if (requiresDeliveryDate(currentStatus, toStatus) && !deliveryDate) {
      setShowDatePrompt(true);
      return;
    }
    setUpdating(toStatus);
    try {
      await onStatusUpdate(order.id, toStatus);
    } finally {
      setUpdating(null);
    }
  };

  const handleDateSubmitAndAdvance = async () => {
    if (!pendingDate) return;
    setUpdating('ready_for_delivery');
    try {
      await onUpdateDeliveryDate(order.id, pendingDate);
      await onStatusUpdate(order.id, 'ready_for_delivery');
    } finally {
      setUpdating(null);
      setShowDatePrompt(false);
      setPendingDate('');
    }
  };

  const forwardKey = nextStatus ? `${currentStatus}->${nextStatus}` : '';
  const hint = STATUS_HINTS[forwardKey] || '';

  return (
    <>
      <div className="space-y-2">
        {showDatePrompt && (
          <div className="bg-cult-warning/10 border border-cult-warning/30 rounded-cult p-3 space-y-2">
            <div className="flex items-center gap-2 text-cult-warning text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              Delivery date required
            </div>
            <p className="text-xs text-cult-text-secondary">
              Set a delivery date before marking this order as ready.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={pendingDate}
                onChange={(e) => setPendingDate(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-cult-surface border border-cult-border rounded-cult text-xs text-cult-text-primary focus:outline-none focus:border-cult-success transition-colors"
                style={{ colorScheme: 'dark' }}
              />
              <button
                onClick={handleDateSubmitAndAdvance}
                disabled={!pendingDate || !!updating}
                className="px-3 py-1.5 bg-cult-success text-cult-black text-xs font-bold rounded-cult hover:bg-cult-success-bright transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Set & Advance'}
              </button>
              <button
                onClick={() => { setShowDatePrompt(false); setPendingDate(''); }}
                className="px-2 py-1.5 text-xs text-cult-text-secondary hover:text-cult-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isCancelled ? (
          <button
            onClick={() => setConfirmReopen(true)}
            disabled={!!updating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cult-stage-wash hover:bg-cult-stage-wash/80 text-white text-sm font-bold rounded-cult transition-all disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" />
            {updating === 'submitted' ? 'Reopening...' : 'Reopen Order'}
          </button>
        ) : (
          <>
            {nextStatus && !showDatePrompt && (
              <div className="space-y-1">
                <button
                  onClick={() => handleTransition(nextStatus)}
                  disabled={!!updating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cult-success hover:bg-cult-success-bright text-cult-black text-sm font-bold rounded-cult transition-all disabled:opacity-40"
                >
                  <ArrowRight className="w-4 h-4" />
                  {updating === nextStatus ? 'Updating...' : getTransitionLabel(currentStatus, nextStatus)}
                </button>
                {hint && (
                  <p className="text-xs text-cult-text-muted leading-relaxed px-1">{hint}</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              {prevStatus && (
                <button
                  onClick={() => handleTransition(prevStatus)}
                  disabled={!!updating}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-cult-border text-cult-text-secondary hover:text-cult-text-primary hover:border-cult-border-strong text-xs font-semibold rounded-cult transition-all disabled:opacity-40"
                >
                  <Undo2 className="w-3 h-3" />
                  {updating === prevStatus ? 'Reverting...' : getTransitionLabel(currentStatus, prevStatus)}
                </button>
              )}

              {!isCompleted && (
                <button
                  onClick={() => setConfirmCancel(true)}
                  disabled={!!updating}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-cult-danger hover:text-cult-danger/80 text-xs font-semibold transition-all disabled:opacity-40"
                >
                  <XCircle className="w-3 h-3" />
                  Cancel
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {confirmCancel && (
        <ConfirmDialog
          title="Cancel Order"
          message={`Cancel order ${order.order_number}${order.customer_name ? ` for ${order.customer_name}` : ''}? Any reserved inventory will be released back to available stock.`}
          confirmLabel="Cancel Order"
          variant="danger"
          onConfirm={async () => {
            setConfirmCancel(false);
            setUpdating('cancelled');
            try {
              await onStatusUpdate(order.id, 'cancelled');
            } finally {
              setUpdating(null);
            }
          }}
          onCancel={() => setConfirmCancel(false)}
        />
      )}

      {confirmReopen && (
        <ConfirmDialog
          title="Reopen Order"
          message={`Reopen order ${order.order_number}? It will be moved back to ${getStatusLabel('submitted')} status.`}
          confirmLabel="Reopen Order"
          variant="default"
          onConfirm={async () => {
            setConfirmReopen(false);
            setUpdating('submitted');
            try {
              await onStatusUpdate(order.id, 'submitted');
            } finally {
              setUpdating(null);
            }
          }}
          onCancel={() => setConfirmReopen(false)}
        />
      )}
    </>
  );
}

// ─── Customer Info Card ─────────────────────────────────────────────────────

function CustomerCard({ customer }: { customer: CustomerInfo }) {
  const deliveryAddr = [
    customer.delivery_address,
    customer.delivery_city,
    customer.delivery_state,
    customer.delivery_postal_code,
  ].filter(Boolean).join(', ') || customer.address || 'No address';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-cult-text-secondary" />
          <h4 className="text-sm font-bold text-cult-text-primary">{customer.name}</h4>
        </div>
        {customer.order_count !== undefined && (
          <span className="text-xs text-cult-text-secondary bg-cult-surface-overlay px-2 py-0.5 rounded-cult">
            {customer.order_count} orders
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs">
        {customer.contact_name && (
          <span className="text-cult-text-secondary">{customer.contact_name}</span>
        )}
        <div className="flex items-start gap-2 text-cult-text-secondary">
          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-cult-text-muted" />
          <span>{deliveryAddr}</span>
        </div>
        <div className="flex items-center gap-4">
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-cult-text-secondary hover:text-cult-success transition-colors">
              <Phone className="w-3 h-3 text-cult-text-muted" />
              {customer.phone}
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 text-cult-text-secondary hover:text-cult-success transition-colors truncate">
              <Mail className="w-3 h-3 text-cult-text-muted" />
              {customer.email}
            </a>
          )}
        </div>
        <div className="flex items-center gap-4">
          {customer.license_number && (
            <div className="flex items-center gap-1.5 text-cult-text-secondary">
              <Shield className="w-3 h-3 text-cult-text-muted" />
              {customer.license_number}
            </div>
          )}
          {customer.account_credit_balance != null && customer.account_credit_balance !== 0 && (
            <div className={`flex items-center gap-1.5 font-semibold ${
              customer.account_credit_balance > 0 ? 'text-cult-success' : 'text-cult-danger'
            }`}>
              Credit: {formatCurrency(customer.account_credit_balance)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Detail Panel ──────────────────────────────────────────────────────

export function OrderDetailPanel({
  order,
  products,
  onClose,
  onStatusUpdate,
  onDeleteOrder,
  onUpdateDeliveryDate,
  onItemStatusUpdate,
  onItemQuantityUpdate,
  onItemPriceUpdate,
  onItemBatchUpdate,
  onItemSampleToggle,
  onItemDelete,
  onAddItem,
  onGenerateInvoice,
  onCloneOrder,
}: OrderDetailPanelProps) {
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [tempDate, setTempDate] = useState('');
  const [dateSaved, setDateSaved] = useState(false);
  const [showManifestModal, setShowManifestModal] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const { orderDetails, loading } = useOrdersContext();

  const deliveryDate = order.scheduled_delivery_date || order.requested_delivery_date;
  const items = orderDetails?.get(order.id) || [];
  const isLoadingItems = loading?.orderDetails?.has(order.id) || false;
  const statusColors = getStatusColor(order.status || 'submitted');

  // ─── Date editing ───────────────────────────────────────────────────────

  const handleDateSave = useCallback(async (newDate: string) => {
    if (newDate && newDate !== deliveryDate) {
      await onUpdateDeliveryDate(order.id, newDate);
      setDateSaved(true);
      setTimeout(() => setDateSaved(false), 2000);
    }
    setIsEditingDate(false);
    setTempDate('');
  }, [deliveryDate, onUpdateDeliveryDate, order.id]);

  const handleDateEditStart = useCallback(() => {
    setIsEditingDate(true);
    setTempDate(toDateInputValue(deliveryDate));
  }, [deliveryDate]);

  // ─── Customer loading ───────────────────────────────────────────────────

  const loadCustomer = useCallback(async () => {
    if (!order.id) return;
    const { data: orderData } = await supabase
      .from('orders')
      .select('customer_id')
      .eq('id', order.id)
      .maybeSingle();

    if (!orderData?.customer_id) return;

    const [customerResult, countResult] = await Promise.all([
      supabase
        .from('customers')
        .select('id, name, contact_name, phone, email, address, delivery_address, delivery_city, delivery_state, delivery_postal_code, license_number, license_name, account_credit_balance, dispensary_code')
        .eq('id', orderData.customer_id)
        .maybeSingle(),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', orderData.customer_id),
    ]);

    if (customerResult.data) {
      setCustomer({
        ...customerResult.data,
        order_count: countResult.count || 0,
      });
    }
  }, [order.id]);

  useEffect(() => { loadCustomer(); }, [loadCustomer]);

  // ─── Keyboard ───────────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // ─── Delete handler ─────────────────────────────────────────────────────

  const handleDelete = async () => {
    await onDeleteOrder(order.id);
    onClose();
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-4xl bg-cult-surface border-l border-cult-border z-50 flex flex-col animate-slide-in-right shadow-2xl">

        {/* ─── Header ────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-cult-border bg-cult-surface-raised">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-h3 text-cult-text-primary tracking-wide truncate">
                {order.order_number}
              </h2>
              <span className={`px-2.5 py-1 text-xs font-bold border rounded-cult uppercase tracking-wider select-none ${statusColors}`}>
                {getStatusLabel(order.status || 'submitted')}
              </span>
              {(order as OrderExtended).is_sample && (
                <span className="px-2 py-0.5 text-xs font-bold bg-cult-warning/15 text-cult-warning border border-cult-warning/30 rounded-cult uppercase flex items-center gap-1">
                  <Gift className="w-3 h-3" />
                  Sample
                </span>
              )}
              {order.priority === 'urgent' && (
                <span className="px-2 py-0.5 text-xs font-bold bg-cult-danger/15 text-cult-danger border border-cult-danger/30 rounded-cult uppercase">
                  Urgent
                </span>
              )}
              {order.priority === 'high' && (
                <span className="px-2 py-0.5 text-xs font-bold bg-cult-warning/15 text-cult-warning border border-cult-warning/30 rounded-cult uppercase">
                  High
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 text-cult-text-secondary hover:text-cult-text-primary hover:bg-cult-surface-overlay rounded-cult transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status stepper — always visible in header */}
          <StatusStepper currentStatus={order.status || 'submitted'} />
        </div>

        {/* ─── Body: Two Columns ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex min-h-full">

            {/* LEFT COLUMN: Order Meta + Actions */}
            <div className="w-80 flex-shrink-0 border-r border-cult-border p-5 space-y-5 bg-cult-surface-raised/50">

              {/* Order meta */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-cult-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Created {getOrderAge(order.created_at)}
                  </span>
                </div>

                {/* Delivery date */}
                <div className="text-xs">
                  {isEditingDate ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Calendar className="w-3 h-3 text-cult-text-muted" />
                      <input
                        ref={dateInputRef}
                        type="date"
                        value={tempDate}
                        onChange={(e) => setTempDate(e.target.value)}
                        onBlur={(e) => handleDateSave(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleDateSave(tempDate);
                          if (e.key === 'Escape') { setIsEditingDate(false); setTempDate(''); }
                        }}
                        autoFocus
                        className="bg-cult-surface-overlay border border-cult-border rounded-cult px-2 py-1 text-xs text-cult-text-primary outline-none focus:border-cult-success transition-colors"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDateEditStart(); }}
                      className="flex items-center gap-1.5 text-cult-text-secondary hover:text-cult-success transition-colors"
                    >
                      {dateSaved ? <Check className="w-3 h-3 text-cult-success" /> : <Calendar className="w-3 h-3" />}
                      {deliveryDate
                        ? <span className={dateSaved ? 'text-cult-success' : ''}>
                            Delivery: {parseDeliveryDate(deliveryDate)?.toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            }) ?? 'No date'}
                            {dateSaved && <span className="ml-1 text-cult-success font-semibold">Saved</span>}
                          </span>
                        : <span className="text-cult-text-muted">Set delivery date</span>
                      }
                    </button>
                  )}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between py-2 border-t border-cult-border">
                  <span className="text-xs text-cult-text-secondary uppercase tracking-wider font-semibold">Total</span>
                  <span className="text-body font-bold text-cult-success">
                    {formatCurrency(order.total_amount || 0)}
                  </span>
                </div>
              </div>

              {/* Status actions */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-cult-text-muted uppercase tracking-wider">Actions</h4>
                <StatusActions
                  order={order}
                  onStatusUpdate={onStatusUpdate}
                  onUpdateDeliveryDate={onUpdateDeliveryDate}
                />
              </div>

              {/* Customer card */}
              {customer && (
                <div className="bg-cult-surface border border-cult-border rounded-cult p-4">
                  <CustomerCard customer={customer} />
                </div>
              )}

              {/* Notes */}
              {(order.delivery_notes || order.internal_notes) && (
                <div className="space-y-3">
                  {order.delivery_notes && (
                    <div>
                      <h4 className="text-xs font-semibold text-cult-text-muted uppercase tracking-wider mb-1.5">Delivery Notes</h4>
                      <p className="text-xs text-cult-text-secondary bg-cult-surface border border-cult-border rounded-cult p-3 leading-relaxed">
                        {order.delivery_notes}
                      </p>
                    </div>
                  )}
                  {order.internal_notes && (
                    <div>
                      <h4 className="text-xs font-semibold text-cult-text-muted uppercase tracking-wider mb-1.5">Internal Notes</h4>
                      <p className="text-xs text-cult-text-secondary bg-cult-surface border border-cult-border rounded-cult p-3 leading-relaxed">
                        {order.internal_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Document actions */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-cult-text-muted uppercase tracking-wider">Documents</h4>
                <button
                  onClick={() => setShowManifestModal(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-cult-surface border border-cult-border rounded-cult text-xs font-semibold text-cult-text-secondary hover:text-cult-text-primary hover:border-cult-border-strong transition-all uppercase tracking-wider"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Generate Manifest
                </button>
                <button
                  onClick={() => onGenerateInvoice(order.id, order.order_number)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-cult-surface border border-cult-border rounded-cult text-xs font-semibold text-cult-text-secondary hover:text-cult-text-primary hover:border-cult-border-strong transition-all uppercase tracking-wider"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Generate Invoice
                </button>
                <CoversheetButton orderId={order.id} orderNumber={order.order_number} />
                <OrderLabelGenerator orderId={order.id} orderNumber={order.order_number} />
              </div>
            </div>

            {/* RIGHT COLUMN: Items + Fulfillment */}
            <div className="flex-1 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-cult-text-primary uppercase tracking-wider">
                  Order Items
                  {items.length > 0 && (
                    <span className="ml-2 text-cult-text-muted font-normal">({items.length})</span>
                  )}
                </h3>
              </div>

              {isLoadingItems ? (
                <div className="py-12 text-center text-cult-text-muted text-sm">
                  Loading items...
                </div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center text-cult-text-muted text-sm">
                  No items in this order
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <OrderItemCard
                      key={item.id}
                      item={item}
                      orderId={order.id}
                      onStatusUpdate={onItemStatusUpdate}
                      onQuantityUpdate={onItemQuantityUpdate}
                      onPriceUpdate={onItemPriceUpdate}
                      onBatchUpdate={onItemBatchUpdate}
                      onSampleToggle={onItemSampleToggle}
                      onDelete={onItemDelete}
                    />
                  ))}
                </div>
              )}

              <AddOrderItem
                orderId={order.id}
                products={products || []}
                onAdd={onAddItem}
              />
            </div>
          </div>
        </div>

        {/* ─── Footer ────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-cult-border bg-cult-surface-raised flex items-center gap-2">
          <button
            onClick={() => onCloneOrder(order)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-cult-text-secondary hover:text-cult-text-primary bg-cult-surface-overlay hover:bg-cult-border-strong rounded-cult transition-all uppercase tracking-wider"
          >
            <Copy className="w-3.5 h-3.5" />
            Clone
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-cult-danger hover:text-cult-danger/80 bg-cult-danger/10 hover:bg-cult-danger/15 border border-cult-danger/20 rounded-cult transition-all uppercase tracking-wider ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Modals */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Order"
          message={`Are you sure you want to delete order ${order.order_number}${order.customer_name ? ` for ${order.customer_name}` : ''}? This action cannot be undone.`}
          confirmLabel="Delete Order"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {showManifestModal && (
        <ManifestModal
          orderId={order.id}
          orderNumber={order.order_number}
          onClose={() => setShowManifestModal(false)}
        />
      )}
    </>
  );
}
