import { memo } from 'react';
import { OrderHeader } from './OrderHeader';
import { OrderDetailsView } from './OrderDetailsView';
import { useOrdersContext } from '../hooks';
import type { Order, Product } from '../types';

interface OrdersListProps {
  orders: Order[];
  expandedOrders: Set<string>;
  products: Product[];
  selectedOrderId?: string | null;
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

export const OrdersList = memo(function OrdersList({
  orders,
  expandedOrders,
  products,
  selectedOrderId,
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
  getFulfillmentColor,
}: OrdersListProps) {
  const { orderDetails, workflowSummaries, loading } = useOrdersContext();

  return (
    <>
      {orders.map((order) => {
        const isExpanded = expandedOrders.has(order.id);
        const items = orderDetails?.get(order.id) || [];
        const isLoadingItems = loading?.orderDetails?.has(order.id) || false;
        const workflow = workflowSummaries?.get(order.id);

        return (
          <div
            key={order.id}
            className={`bg-cult-near-black border-2 overflow-hidden hover:border-cult-white transition-all ${
              selectedOrderId === order.id
                ? 'border-cult-info shadow-lg shadow-cult-info/50'
                : 'border-cult-light-gray'
            }`}
          >
            <OrderHeader
              order={order}
              isExpanded={isExpanded}
              workflow={workflow}
              onToggle={() => onToggleOrder(order.id)}
              onStatusChange={(status) => onStatusUpdate(order.id, status)}
              onDelete={() => onDeleteOrder(order.id)}
              onUpdateDeliveryDate={(orderId, newDate) => onUpdateDeliveryDate(orderId, newDate)}
              getStatusColor={getStatusColor}
              getFulfillmentColor={getFulfillmentColor}
            />

            {isExpanded && (
              <div className="border-t-2 border-cult-medium-gray bg-cult-black" onClick={(e) => e.stopPropagation()}>
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
              </div>
            )}
          </div>
        );
      })}
    </>
  );
});
