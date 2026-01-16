import { memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { OrderStatusGroup } from './OrderStatusGroup';
import type { MonthGroup, Product } from '../types';

interface OrderMonthGroupProps {
  monthGroup: MonthGroup;
  isExpanded: boolean;
  expandedStatuses: Set<string>;
  expandedOrders: Set<string>;
  products: Product[];
  selectedOrderId?: string | null;
  onToggleMonth: (month: string) => void;
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

export const OrderMonthGroup = memo(function OrderMonthGroup({
  monthGroup,
  isExpanded,
  expandedStatuses,
  expandedOrders,
  products,
  selectedOrderId,
  onToggleMonth,
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
}: OrderMonthGroupProps) {
  return (
    <div className="bg-cult-dark-gray border-2 border-cult-medium-gray">
      <button
        onClick={() => onToggleMonth(monthGroup.month)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-cult-near-black transition-colors"
      >
        <div className="flex items-center gap-4">
          {isExpanded ? (
            <ChevronDown className="w-6 h-6 text-cult-white" />
          ) : (
            <ChevronRight className="w-6 h-6 text-cult-light-gray" />
          )}
          <div className="text-left">
            <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wide">
              {monthGroup.monthName}
            </h2>
            <p className="text-sm text-cult-light-gray mt-1">
              {monthGroup.totalOrders} {monthGroup.totalOrders === 1 ? 'order' : 'orders'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-cult-light-gray uppercase tracking-wider">Month Total</p>
          <p className="text-2xl font-bold text-cult-white">
            ${monthGroup.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t-2 border-cult-medium-gray p-4 space-y-4">
          {monthGroup.statusGroups?.map((statusGroup) => (
            <OrderStatusGroup
              key={statusGroup.status}
              statusGroup={statusGroup}
              monthKey={monthGroup.month}
              isExpanded={expandedStatuses.has(`${monthGroup.month}-${statusGroup.status}`)}
              expandedOrders={expandedOrders}
              products={products}
              selectedOrderId={selectedOrderId}
              onToggleStatus={onToggleStatus}
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
          ))}
        </div>
      )}
    </div>
  );
});
