import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, MapPin, Phone, Mail, Copy, Trash2, ChevronRight,
  Building2, Clock, Calendar, Shield, Gift, Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, parseDeliveryDate, toDateInputValue } from '@/lib/utils';
import { getStatusColor } from '../utils/orderGrouping';
import { getOrderAge } from '../utils/orderAttention';
import { OrderDetailsView } from './OrderDetailsView';
import { ConfirmDialog } from './ConfirmDialog';
import { StatusActionPanel } from './StatusActionPanel';
import { useOrdersContext } from '../hooks';
import type { Order, Product } from '../types';
import type { OrderExtended } from '@/types';

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

interface OrderDrawerProps {
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

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  accepted: 'Accepted',
  processing: 'Processing',
  ready_for_delivery: 'Ready for Delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const TIMELINE_STEPS = ['submitted', 'accepted', 'processing', 'ready_for_delivery', 'completed'];

function OrderTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = TIMELINE_STEPS.indexOf(currentStatus);

  if (currentStatus === 'cancelled') {
    return (
      <div className="flex items-center gap-1 px-4 py-2 bg-cult-danger-muted border border-cult-danger/50 rounded">
        <X className="w-3.5 h-3.5 text-cult-danger" />
        <span className="text-xs font-semibold text-cult-danger uppercase tracking-wider">Cancelled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto py-1">
      {TIMELINE_STEPS.map((step, index) => {
        const isComplete = index <= currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <div key={step} className="flex items-center">
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${
              isCurrent
                ? 'bg-cult-green/20 text-cult-green border border-cult-green/40'
                : isComplete
                  ? 'bg-cult-charcoal text-cult-silver'
                  : 'bg-transparent text-cult-lighter-gray/50'
            }`}>
              {STATUS_LABELS[step]?.replace('for Delivery', '') || step}
            </div>
            {index < TIMELINE_STEPS.length - 1 && (
              <ChevronRight className={`w-3 h-3 flex-shrink-0 ${
                isComplete ? 'text-cult-silver' : 'text-cult-charcoal'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CustomerCard({ customer }: { customer: CustomerInfo }) {
  const deliveryAddr = [
    customer.delivery_address,
    customer.delivery_city,
    customer.delivery_state,
    customer.delivery_postal_code,
  ].filter(Boolean).join(', ') || customer.address || 'No address';

  return (
    <div className="bg-cult-opaque-near-black border border-cult-charcoal rounded-cult p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-cult-silver" />
          <h4 className="text-sm font-bold text-cult-off-white">{customer.name}</h4>
        </div>
        {customer.order_count !== undefined && (
          <span className="text-xs text-cult-silver bg-cult-charcoal px-2 py-0.5 rounded">
            {customer.order_count} orders
          </span>
        )}
      </div>
      <div className="space-y-2 text-xs">
        {customer.contact_name && (
          <div className="text-cult-silver">{customer.contact_name}</div>
        )}
        <div className="flex items-start gap-2 text-cult-silver">
          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-cult-lighter-gray" />
          <span>{deliveryAddr}</span>
        </div>
        {customer.phone && (
          <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-cult-silver hover:text-cult-green transition-colors">
            <Phone className="w-3 h-3 text-cult-lighter-gray" />
            {customer.phone}
          </a>
        )}
        {customer.email && (
          <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-cult-silver hover:text-cult-green transition-colors">
            <Mail className="w-3 h-3 text-cult-lighter-gray" />
            {customer.email}
          </a>
        )}
        {customer.license_number && (
          <div className="flex items-center gap-2 text-cult-silver">
            <Shield className="w-3 h-3 text-cult-lighter-gray" />
            License: {customer.license_number}
          </div>
        )}
        {customer.account_credit_balance != null && customer.account_credit_balance !== 0 && (
          <div className={`flex items-center gap-2 font-semibold ${
            customer.account_credit_balance > 0 ? 'text-cult-success' : 'text-cult-danger'
          }`}>
            <span className="text-cult-lighter-gray">Credit:</span>
            {formatCurrency(customer.account_credit_balance)}
          </div>
        )}
      </div>
    </div>
  );
}

export function OrderDrawer({
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
}: OrderDrawerProps) {
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [tempDate, setTempDate] = useState('');
  const [dateSaved, setDateSaved] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const { orderDetails, loading } = useOrdersContext();

  const deliveryDate = order.scheduled_delivery_date || order.requested_delivery_date;

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

  const items = orderDetails?.get(order.id) || [];
  const isLoadingItems = loading?.orderDetails?.has(order.id) || false;

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDelete = async () => {
    await onDeleteOrder(order.id);
    onClose();
  };

  const statusColors = getStatusColor(order.status || 'submitted');

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-cult-opaque-black border-l border-cult-charcoal z-50 flex flex-col animate-slide-in-right shadow-2xl">

        <div className="flex items-center justify-between px-5 py-4 border-b border-cult-charcoal bg-cult-opaque-near-black">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-bold text-cult-off-white tracking-wide truncate">
              {order.order_number}
            </h2>
            <span className={`px-2.5 py-1 text-xs font-bold border rounded uppercase tracking-wider select-none ${statusColors}`}>
              {STATUS_LABELS[order.status || 'submitted'] || order.status}
            </span>
            {(order as OrderExtended).is_sample && (
              <span className="px-2 py-0.5 text-xs font-bold bg-cult-warning-muted text-cult-warning border border-cult-warning/40 rounded uppercase flex items-center gap-1">
                <Gift className="w-3 h-3" />
                Sample
              </span>
            )}
            {order.priority === 'urgent' && (
              <span className="px-2 py-0.5 text-xs font-bold bg-cult-danger-muted text-cult-danger border border-cult-danger/70 rounded uppercase">
                Urgent
              </span>
            )}
            {order.priority === 'high' && (
              <span className="px-2 py-0.5 text-xs font-bold bg-cult-warning-muted text-cult-warning border border-cult-warning/70 rounded uppercase">
                High
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-cult-silver hover:text-cult-white hover:bg-cult-charcoal rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-4">

            <div className="flex items-center justify-between text-xs text-cult-silver">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Created {getOrderAge(order.created_at)}
                </span>

                {isEditingDate ? (
                  <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Calendar className="w-3 h-3" />
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={tempDate}
                      onChange={(e) => setTempDate(e.target.value)}
                      onBlur={(e) => handleDateSave(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleDateSave(tempDate);
                        if (e.key === 'Escape') {
                          setIsEditingDate(false);
                          setTempDate('');
                        }
                      }}
                      autoFocus
                      className="bg-cult-charcoal border border-cult-silver/30 rounded px-1.5 py-0.5 text-xs text-cult-off-white outline-none focus:border-cult-green transition-colors"
                      style={{ colorScheme: 'dark' }}
                    />
                  </span>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDateEditStart(); }}
                    className="flex items-center gap-1 hover:text-cult-green transition-colors group/date"
                  >
                    {dateSaved ? (
                      <Check className="w-3 h-3 text-cult-green" />
                    ) : (
                      <Calendar className="w-3 h-3" />
                    )}
                    {deliveryDate
                      ? <span className={dateSaved ? 'text-cult-green transition-colors' : ''}>
                          Delivery: {parseDeliveryDate(deliveryDate)?.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }) ?? 'No date'}
                          {dateSaved && <span className="ml-1.5 text-cult-green font-semibold animate-pulse">Saved</span>}
                        </span>
                      : <span className="text-cult-lighter-gray group-hover/date:text-cult-green">Set delivery date</span>
                    }
                  </button>
                )}
              </div>
              <span className="font-bold text-cult-success text-sm">
                {formatCurrency(order.total_amount || 0)}
              </span>
            </div>

            <OrderTimeline currentStatus={order.status || 'submitted'} />

            <StatusActionPanel
              order={order}
              onStatusUpdate={onStatusUpdate}
              onUpdateDeliveryDate={onUpdateDeliveryDate}
            />

            {customer && <CustomerCard customer={customer} />}

            <OrderDetailsView
              order={order}
              items={items}
              products={products}
              isLoading={isLoadingItems}
              onItemStatusUpdate={onItemStatusUpdate}
              onItemQuantityUpdate={onItemQuantityUpdate}
              onItemPriceUpdate={onItemPriceUpdate}
              onItemBatchUpdate={onItemBatchUpdate}
              onItemSampleToggle={onItemSampleToggle}
              onItemDelete={onItemDelete}
              onAddItem={onAddItem}
              onGenerateInvoice={onGenerateInvoice}
            />

            {(order.internal_notes || order.delivery_notes) && (
              <div className="space-y-3 pt-2">
                {order.delivery_notes && (
                  <div>
                    <h4 className="text-xs font-semibold text-cult-silver uppercase tracking-wider mb-1.5">Delivery Notes</h4>
                    <p className="text-xs text-cult-silver bg-cult-opaque-near-black border border-cult-charcoal rounded-cult p-3">
                      {order.delivery_notes}
                    </p>
                  </div>
                )}
                {order.internal_notes && (
                  <div>
                    <h4 className="text-xs font-semibold text-cult-silver uppercase tracking-wider mb-1.5">Internal Notes</h4>
                    <p className="text-xs text-cult-silver bg-cult-opaque-near-black border border-cult-charcoal rounded-cult p-3">
                      {order.internal_notes}
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        <div className="px-5 py-3 border-t border-cult-charcoal bg-cult-opaque-near-black flex items-center gap-2">
          <button
            onClick={() => onCloneOrder(order)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-cult-silver hover:text-cult-white bg-cult-charcoal hover:bg-cult-medium-gray rounded transition-all uppercase tracking-wider"
          >
            <Copy className="w-3.5 h-3.5" />
            Clone
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-cult-danger hover:text-cult-danger/80 bg-cult-danger-muted hover:bg-cult-danger-muted/80 border border-cult-danger/50 rounded transition-all uppercase tracking-wider ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

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
    </>
  );
}
