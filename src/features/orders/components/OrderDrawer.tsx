import { useState, useEffect, useCallback } from 'react';
import {
  X,
  MapPin,
  Phone,
  Mail,
  Copy,
  Trash2,
  ChevronRight,
  Building2,
  Clock,
  Calendar,
  Shield,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { getStatusColor } from '../utils/orderGrouping';
import { getOrderAge } from '../utils/orderAttention';
import { OrderDetailsView } from './OrderDetailsView';
import { ConfirmDialog } from './ConfirmDialog';
import { useOrdersContext } from '../hooks';
import type { Order, Product } from '../types';

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
      <div className="flex items-center gap-1 px-4 py-2 bg-red-900/20 border border-red-800/50 rounded">
        <X className="w-3.5 h-3.5 text-red-400" />
        <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Cancelled</span>
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
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${
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
    <div className="bg-cult-near-black border border-cult-charcoal rounded-cult p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-cult-silver" />
          <h4 className="text-sm font-bold text-cult-off-white">{customer.name}</h4>
        </div>
        {customer.order_count !== undefined && (
          <span className="text-[10px] text-cult-silver bg-cult-charcoal px-2 py-0.5 rounded">
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
            customer.account_credit_balance > 0 ? 'text-green-400' : 'text-red-400'
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
  onItemStatusUpdate,
  onItemQuantityUpdate,
  onItemPriceUpdate,
  onItemBatchUpdate,
  onItemDelete,
  onAddItem,
  onGenerateInvoice,
  onCloneOrder,
}: OrderDrawerProps) {
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { orderDetails, loading } = useOrdersContext();

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

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'cancelled') {
      setConfirmCancel(true);
      return;
    }
    await onStatusUpdate(order.id, newStatus);
  };

  const handleDelete = async () => {
    await onDeleteOrder(order.id);
    onClose();
  };

  const statusColors = getStatusColor(order.status || 'submitted');

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-cult-black border-l border-cult-charcoal z-50 flex flex-col animate-slide-in-right shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-cult-charcoal bg-cult-near-black">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-bold text-cult-off-white tracking-wide truncate">
              {order.order_number}
            </h2>
            <select
              value={order.status || 'submitted'}
              onChange={(e) => handleStatusChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className={`px-2.5 py-1 text-[11px] font-bold border rounded uppercase tracking-wider cursor-pointer ${statusColors} bg-cult-near-black hover:opacity-80 transition-all`}
            >
              <option value="submitted">Submitted</option>
              <option value="accepted">Accepted</option>
              <option value="processing">Processing</option>
              <option value="ready_for_delivery">Ready for Delivery</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {order.priority === 'urgent' && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-red-900/40 text-red-400 border border-red-700 rounded uppercase">
                Urgent
              </span>
            )}
            {order.priority === 'high' && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-900/30 text-amber-400 border border-amber-700 rounded uppercase">
                High
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-cult-silver hover:text-cult-white hover:bg-cult-charcoal rounded transition-colors"
          >
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
                {(order.scheduled_delivery_date || order.requested_delivery_date) && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Delivery: {new Date((order.scheduled_delivery_date || order.requested_delivery_date) + (order.requested_delivery_date && !order.scheduled_delivery_date ? 'T00:00:00' : '')).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
              <span className="font-bold text-green-400 text-sm">
                {formatCurrency(order.total_amount || 0)}
              </span>
            </div>

            <OrderTimeline currentStatus={order.status || 'submitted'} />

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
              onItemDelete={onItemDelete}
              onAddItem={onAddItem}
              onGenerateInvoice={onGenerateInvoice}
            />

            {(order.internal_notes || order.delivery_notes) && (
              <div className="space-y-3 pt-2">
                {order.delivery_notes && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-cult-silver uppercase tracking-wider mb-1.5">Delivery Notes</h4>
                    <p className="text-xs text-cult-silver bg-cult-near-black border border-cult-charcoal rounded-cult p-3">
                      {order.delivery_notes}
                    </p>
                  </div>
                )}
                {order.internal_notes && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-cult-silver uppercase tracking-wider mb-1.5">Internal Notes</h4>
                    <p className="text-xs text-cult-silver bg-cult-near-black border border-cult-charcoal rounded-cult p-3">
                      {order.internal_notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-cult-charcoal bg-cult-near-black flex items-center gap-2">
          <button
            onClick={() => onCloneOrder(order)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-cult-silver hover:text-cult-white bg-cult-charcoal hover:bg-cult-medium-gray rounded transition-all uppercase tracking-wider"
          >
            <Copy className="w-3.5 h-3.5" />
            Clone
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 border border-red-800/50 rounded transition-all uppercase tracking-wider ml-auto"
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

      {confirmCancel && (
        <ConfirmDialog
          title="Cancel Order"
          message={`Are you sure you want to cancel order ${order.order_number}? This will mark the order as cancelled.`}
          confirmLabel="Cancel Order"
          variant="danger"
          onConfirm={async () => {
            setConfirmCancel(false);
            await onStatusUpdate(order.id, 'cancelled');
          }}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </>
  );
}
