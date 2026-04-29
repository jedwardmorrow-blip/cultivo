import { Edit3, AlertCircle } from 'lucide-react';
import type { OrderFormCustomer, OrderFormProduct, OrderFormItem } from '../types';

interface OrderFormReviewStepProps {
  selectedCustomer: OrderFormCustomer | undefined;
  priority: string;
  requestedDeliveryDate: string;
  deliveryNotes: string;
  internalNotes: string;
  products: OrderFormProduct[];
  orderItems: OrderFormItem[];
  totalAmount: number;
  totalUnits: number;
  dateError: string | null;
  onEditDetails: () => void;
  onEditCart: () => void;
}

export function OrderFormReviewStep({
  selectedCustomer,
  priority,
  requestedDeliveryDate,
  deliveryNotes,
  internalNotes,
  products,
  orderItems,
  totalAmount,
  totalUnits,
  dateError,
  onEditDetails,
  onEditCart,
}: OrderFormReviewStepProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-cult-surface border border-cult-border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-cult-border pb-3">
          <h2 className="text-lg font-bold text-cult-text-primary uppercase tracking-wide">
            Review Order
          </h2>
          <button
            type="button"
            onClick={onEditDetails}
            className="text-sm text-cult-green hover:text-cult-green-bright flex items-center gap-1"
          >
            <Edit3 className="w-3 h-3" />
            Edit
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-cult-text-muted">Dispensary:</span>
            <span className="text-cult-text-primary font-semibold text-right">
              {selectedCustomer?.name || 'Not selected'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-cult-text-muted">Priority:</span>
            <span className={`font-semibold uppercase text-xs px-2 py-1 rounded ${
              priority === 'urgent' ? 'bg-cult-danger-muted text-cult-danger' :
              priority === 'high' ? 'bg-cult-warning-muted text-cult-warning' :
              'bg-cult-green/20 text-cult-green'
            }`}>
              {priority}
            </span>
          </div>
          {requestedDeliveryDate && (
            <div className="flex justify-between">
              <span className="text-cult-text-muted">Delivery Date:</span>
              <span className="text-cult-text-primary font-semibold">
                {new Date(requestedDeliveryDate).toLocaleDateString()}
              </span>
            </div>
          )}
          {deliveryNotes && (
            <div>
              <div className="text-cult-text-muted mb-1">Delivery Notes:</div>
              <div className="text-cult-text-primary bg-cult-surface p-2 rounded text-xs">
                {deliveryNotes}
              </div>
            </div>
          )}
          {internalNotes && (
            <div>
              <div className="text-cult-text-muted mb-1">Internal Notes:</div>
              <div className="text-cult-text-primary bg-cult-surface p-2 rounded text-xs">
                {internalNotes}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-cult-surface border border-cult-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-cult-border pb-3">
          <h2 className="text-lg font-bold text-cult-text-primary uppercase tracking-wide">
            Order Items
          </h2>
          <button
            type="button"
            onClick={onEditCart}
            className="text-sm text-cult-green hover:text-cult-green-bright flex items-center gap-1"
          >
            <Edit3 className="w-3 h-3" />
            Edit
          </button>
        </div>

        <div className="space-y-2">
          {orderItems.map((item, index) => {
            const selectedProduct = products.find(p => p.id === item.product_id);
            if (!selectedProduct) return null;

            const lineTotal = item.quantity * item.unit_price;
            const hasCustomPrice = selectedProduct.price_per_unit !== item.unit_price;

            return (
              <div
                key={index}
                className="flex items-start justify-between gap-3 p-3 bg-cult-surface rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-cult-text-primary text-sm mb-1 truncate">
                    {selectedProduct.name}
                  </div>
                  <div className="text-xs text-cult-text-muted space-y-0.5">
                    <div>{selectedProduct.strain}</div>
                    <div className="flex items-center gap-2">
                      <span>{item.quantity} {selectedProduct.pricing_unit} × ${item.unit_price.toFixed(2)}</span>
                      {hasCustomPrice && (
                        <span className="text-cult-warning">★</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-cult-green font-bold text-sm whitespace-nowrap">
                  ${lineTotal.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t-2 border-cult-green pt-3 mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-cult-text-muted uppercase tracking-wide">Order Total</span>
            <span className="text-2xl font-bold text-cult-green">${totalAmount.toFixed(2)}</span>
          </div>
          <div className="text-xs text-cult-text-muted text-right">
            {orderItems.length} item{orderItems.length !== 1 ? 's' : ''} • {totalUnits.toFixed(2)} units
          </div>
        </div>
      </div>

      {!selectedCustomer && (
        <div className="bg-cult-danger-muted border border-cult-danger rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-cult-danger flex-shrink-0 mt-0.5" />
          <div className="text-sm text-cult-danger">
            Please select a dispensary before submitting
          </div>
        </div>
      )}

      {dateError && (
        <div className="bg-cult-danger-muted border border-cult-danger rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-cult-danger flex-shrink-0 mt-0.5" />
          <div className="text-sm text-cult-danger">
            {dateError}
          </div>
        </div>
      )}
    </div>
  );
}
