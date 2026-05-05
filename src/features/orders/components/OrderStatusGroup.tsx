import { memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { OrdersList } from './OrdersList';
import { getStatusColorMap } from '../utils/orderGrouping';
import type { StatusGroup, Product } from '../types';

interface OrderStatusGroupProps {
  statusGroup: StatusGroup;
  monthKey: string;
  isExpanded: boolean;
  expandedOrders: Set<string>;
  products: Product[];
  selectedOrderId?: string | null;
  onToggleStatus: (monthStatus: string) => void;
  onToggleOrder: (orderId: string) => void;
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
  getStatusColor: (status: string) => string;
  getFulfillmentColor: (percentage: number) => string;
}

export const OrderStatusGroup = memo(function OrderStatusGroup({
  statusGroup,
  monthKey,
  isExpanded,
  expandedOrders,
  products,
  selectedOrderId,
  onToggleStatus,
  onToggleOrder,
  onStatusUpdate,
  onDeleteOrder,
  onUpdateDeliveryDate,
  onItemStatusUpdate,
  onItemQuantityUpdate,
  onItemPriceUpdate,
  onItemBatchUpdate,
  onItemDelete,
  onAddItem,
  onGenerateInvoice,
  getStatusColor,
  getFulfillmentColor
}: OrderStatusGroupProps) {
  const monthStatusKey = `${monthKey}-${statusGroup.status}`;
  const statusColor = getStatusColorMap(statusGroup.status);

  return (
    <div className={`border-2 ${statusColor}`}>
      <button
        onClick={() => onToggleStatus(monthStatusKey)}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-cult-surface/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-cult-text-primary" />
          ) : (
            <ChevronRight className="w-5 h-5 text-cult-text-muted" />
          )}
          <div className="text-left">
            <h3 className="text-lg font-bold text-cult-text-primary uppercase tracking-wide">
              {statusGroup.statusName}
            </h3>
            <p className="text-xs text-cult-text-muted mt-0.5">
              {statusGroup.orders.length} {statusGroup.orders.length === 1 ? 'order' : 'orders'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-cult-text-muted">Total Value</p>
          <p className="text-lg font-semibold text-cult-text-primary">
            ${statusGroup.orders.reduce((sum, o) => sum + (o.total_amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t-2 border-cult-border p-4 space-y-4">
          <OrdersList
            orders={statusGroup.orders}
            expandedOrders={expandedOrders}
            products={products}
            selectedOrderId={selectedOrderId}
            onToggleOrder={onToggleOrder}
            onStatusUpdate={onStatusUpdate}
            onDeleteOrder={onDeleteOrder}
            onUpdateDeliveryDate={onUpdateDeliveryDate}
            onItemStatusUpdate={onItemStatusUpdate}
            onItemQuantityUpdate={onItemQuantityUpdate}
            onItemPriceUpdate={onItemPriceUpdate}
            onItemBatchUpdate={onItemBatchUpdate}
            onItemDelete={onItemDelete}
            onAddItem={onAddItem}
            onGenerateInvoice={onGenerateInvoice}
            getStatusColor={getStatusColor}
            getFulfillmentColor={getFulfillmentColor}
          />
        </div>
      )}
    </div>
  );
});
