import { memo, useState } from 'react';
import { Receipt, FileText } from 'lucide-react';
import { OrderItemRow } from './OrderItemRow';
import { AddOrderItem } from './AddOrderItem';
import { ManifestModal } from './ManifestModal';
import { CoversheetButton } from './CoversheetButton';
import { OrderLabelGenerator } from './OrderLabelGenerator';
import type { OrderItem, Product } from '../types';

interface Order {
  id: string;
  order_number: string;
  internal_notes: string | null;
  delivery_notes: string | null;
}

interface OrderDetailsViewProps {
  order: Order;
  items: OrderItem[];
  products: Product[];
  isLoading: boolean;
  onItemStatusUpdate: (itemId: string, orderId: string, newStatus: string) => Promise<void>;
  onItemQuantityUpdate: (itemId: string, orderId: string, newQuantity: number) => Promise<void>;
  onItemPriceUpdate: (itemId: string, orderId: string, newPrice: number) => Promise<void>;
  onItemBatchUpdate: (itemId: string, orderId: string, batchId: string | null, strain: string | null) => Promise<void>;
  onItemSampleToggle?: (itemId: string, orderId: string, isSample: boolean) => Promise<void>;
  onItemDelete: (itemId: string, orderId: string) => Promise<void>;
  onAddItem: (orderId: string, productId: string, quantity: number) => Promise<void>;
  onGenerateInvoice: (orderId: string, orderNumber: string) => void;
}

export const OrderDetailsView = memo(function OrderDetailsView({
  order,
  items,
  products,
  isLoading,
  onItemStatusUpdate,
  onItemQuantityUpdate,
  onItemPriceUpdate,
  onItemBatchUpdate,
  onItemSampleToggle,
  onItemDelete,
  onAddItem,
  onGenerateInvoice,
}: OrderDetailsViewProps) {
  const [showManifestModal, setShowManifestModal] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 text-center text-cult-light-gray">
        Loading items...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center text-cult-danger">
        Error: Order data not available
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider">Order Details</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowManifestModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cult-info text-white hover:bg-cult-info/80 border-2 border-cult-info transition-all font-medium uppercase tracking-wider text-sm"
          >
            <FileText className="w-4 h-4" />
            Generate Manifest
          </button>
          <button
            onClick={() => onGenerateInvoice(order.id, order.order_number)}
            className="flex items-center gap-2 px-4 py-2 bg-cult-success text-white hover:bg-cult-success/80 border-2 border-cult-success transition-all font-medium uppercase tracking-wider text-sm"
          >
            <Receipt className="w-4 h-4" />
            Generate Invoice
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center text-cult-light-gray py-6">
          No items found
        </div>
      ) : (
        <div className="mb-4">
          <h3 className="text-sm font-bold text-cult-white mb-4 uppercase tracking-wider border-b-2 border-cult-medium-gray pb-2">Order Items</h3>
          <div className="bg-cult-near-black border-2 border-cult-medium-gray overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-cult-black border-b-2 border-cult-medium-gray">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-bold text-cult-light-gray uppercase tracking-wider whitespace-nowrap">
                    Product
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-cult-light-gray uppercase tracking-wider whitespace-nowrap">
                    Strain
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-cult-light-gray uppercase tracking-wider whitespace-nowrap">
                    Batch
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-cult-light-gray uppercase tracking-wider whitespace-nowrap">
                    Qty
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-cult-light-gray uppercase tracking-wider whitespace-nowrap">
                    Unit Price
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-cult-light-gray uppercase tracking-wider whitespace-nowrap">
                    Subtotal
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-cult-light-gray uppercase tracking-wider whitespace-nowrap sticky right-0 bg-cult-black border-l border-cult-medium-gray z-10">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-cult-medium-gray">
                {items.map((item) => (
                  <OrderItemRow
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
              </tbody>
            </table>
          </div>

          <AddOrderItem
            orderId={order.id}
            products={products || []}
            onAdd={onAddItem}
          />
        </div>
      )}

      <div className="space-y-4 mt-6 pt-6 border-t-2 border-cult-medium-gray">
        <CoversheetButton orderId={order.id} orderNumber={order.order_number} />
        <OrderLabelGenerator orderId={order.id} orderNumber={order.order_number} />

        {(order.internal_notes || order.delivery_notes) && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-cult-white mb-4 uppercase tracking-wider">Order Notes</h3>
            {order.internal_notes && (
              <div>
                <h4 className="text-xs font-semibold text-cult-lighter-gray mb-2 uppercase tracking-wider">Internal Notes</h4>
                <p className="text-sm text-cult-light-gray bg-cult-near-black border-2 border-cult-medium-gray p-3">
                  {order.internal_notes}
                </p>
              </div>
            )}
            {order.delivery_notes && (
              <div>
                <h4 className="text-xs font-semibold text-cult-lighter-gray mb-2 uppercase tracking-wider">Delivery Notes</h4>
                <p className="text-sm text-cult-light-gray bg-cult-near-black border-2 border-cult-medium-gray p-3">
                  {order.delivery_notes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {showManifestModal && (
        <ManifestModal
          orderId={order.id}
          orderNumber={order.order_number}
          onClose={() => setShowManifestModal(false)}
        />
      )}
    </div>
  );
});
