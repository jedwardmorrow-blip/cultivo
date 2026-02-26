import { ShoppingCart, Edit3, Trash2, Minus, Plus, ArrowLeft, ArrowRight, DollarSign, RotateCcw, Lock, Unlock, AlertCircle } from 'lucide-react';
import { Product, OrderItem } from '@/types';

interface OrderFormCartProps {
  products: Product[];
  orderItems: OrderItem[];
  editingItemIndex: number | null;
  onEditItem: (index: number | null) => void;
  onRemoveItem: (index: number) => void;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onUpdatePrice: (index: number, price: number) => void;
  onAdjustQuantity: (index: number, delta: number) => void;
  onResetPrice: (index: number) => void;
  onTogglePriceLock: (index: number) => void;
  onBackToProducts: () => void;
  onProceedToReview: () => void;
  canProceed: boolean;
}

export function OrderFormCart({
  products,
  orderItems,
  editingItemIndex,
  onEditItem,
  onRemoveItem,
  onUpdateQuantity,
  onUpdatePrice,
  onAdjustQuantity,
  onResetPrice,
  onTogglePriceLock,
  onBackToProducts,
  onProceedToReview,
  canProceed,
}: OrderFormCartProps) {
  const totalAmount = orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const totalUnits = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  if (orderItems.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-cult-near-black border-2 border-dashed border-cult-medium-gray rounded-lg p-12 text-center">
          <ShoppingCart className="w-16 h-16 text-cult-medium-gray mx-auto mb-4" />
          <p className="text-cult-light-gray text-lg mb-2">No items in cart</p>
          <p className="text-cult-medium-gray text-sm mb-6">Add products to get started</p>
          <button
            type="button"
            onClick={onBackToProducts}
            className="px-6 py-3 bg-cult-green text-cult-black rounded-lg font-bold hover:bg-cult-green-bright transition-colors"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-cult-white uppercase tracking-wide">
          Cart Items
        </h2>
        <span className="text-sm text-cult-light-gray">
          {orderItems.length} item{orderItems.length !== 1 ? 's' : ''}
        </span>
      </div>

      {orderItems.map((item, index) => {
        const selectedProduct = products.find(p => p.id === item.product_id);
        if (!selectedProduct) return null;

        const lineTotal = item.quantity * item.unit_price;
        const hasCustomPrice = selectedProduct.price_per_unit !== item.unit_price;
        const isEditing = editingItemIndex === index;

        return (
          <div
            key={index}
            className={`bg-cult-near-black border rounded-lg p-4 space-y-3 transition-all ${
              isEditing ? 'border-cult-green shadow-lg' : 'border-cult-medium-gray'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">
                    {selectedProduct.product_category === 'bulk' ? '🔲' :
                     selectedProduct.product_category === 'preroll' ? '🚬' : '📦'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-cult-white truncate">{selectedProduct.name}</div>
                    <div className="text-xs text-cult-light-gray">{selectedProduct.strain}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEditItem(isEditing ? null : index)}
                  className={`p-2 rounded-lg transition-colors ${
                    isEditing
                      ? 'bg-cult-green text-cult-black'
                      : 'bg-cult-dark-gray text-cult-light-gray hover:text-cult-white'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveItem(index)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-cult-dark-gray rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isEditing ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-cult-light-gray mb-2">
                    Quantity ({selectedProduct.pricing_unit})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onAdjustQuantity(index, -1)}
                      className="w-12 h-12 flex items-center justify-center bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-cult-white hover:bg-cult-medium-gray active:bg-cult-green active:text-cult-black transition-colors"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <input
                      type="number"
                      required
                      min="0"
                      step={selectedProduct.allows_fractional_quantity ? "0.01" : "1"}
                      value={item.quantity || ''}
                      onChange={(e) => onUpdateQuantity(index, parseFloat(e.target.value) || 0)}
                      className="flex-1 px-4 py-3 bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-cult-white text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-cult-green focus:border-cult-green"
                    />
                    <button
                      type="button"
                      onClick={() => onAdjustQuantity(index, 1)}
                      className="w-12 h-12 flex items-center justify-center bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-cult-white hover:bg-cult-medium-gray active:bg-cult-green active:text-cult-black transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-cult-light-gray">
                      Unit Price
                    </label>
                    <div className="flex items-center gap-2">
                      {hasCustomPrice && (
                        <button
                          type="button"
                          onClick={() => onResetPrice(index)}
                          className="text-xs text-cult-green hover:text-cult-green-bright flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onTogglePriceLock(index)}
                        className={`p-1.5 rounded transition-colors ${
                          item.price_locked
                            ? 'bg-cult-green text-cult-black'
                            : 'bg-cult-dark-gray text-cult-light-gray hover:text-cult-white'
                        }`}
                      >
                        {item.price_locked ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cult-light-gray w-5 h-5" />
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={item.unit_price === 0 ? '0' : item.unit_price || ''}
                      onChange={(e) => onUpdatePrice(index, e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                      disabled={item.price_locked}
                      className={`w-full pl-10 pr-4 py-3 bg-cult-dark-gray border rounded-lg text-cult-white text-lg font-semibold focus:outline-none focus:ring-2 ${
                        item.price_locked
                          ? 'border-cult-green opacity-75 cursor-not-allowed'
                          : 'border-cult-medium-gray focus:ring-cult-green focus:border-cult-green'
                      }`}
                    />
                  </div>
                  {hasCustomPrice && !item.price_locked && (
                    <p className="mt-1 text-xs text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Custom price (default: ${selectedProduct.price_per_unit.toFixed(2)})
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-cult-light-gray">
                    {item.quantity} {selectedProduct.pricing_unit} × ${item.unit_price.toFixed(2)}
                  </div>
                  <div className="text-cult-green font-semibold text-lg">
                    ${lineTotal.toFixed(2)}
                  </div>
                </div>
                {hasCustomPrice && (
                  <div className="text-xs text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Custom pricing
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="bg-cult-green bg-opacity-10 border-2 border-cult-green rounded-lg p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-cult-light-gray uppercase tracking-wide">Cart Total</span>
          <span className="text-3xl font-bold text-cult-green">${totalAmount.toFixed(2)}</span>
        </div>
        <div className="text-xs text-cult-light-gray text-right">
          {orderItems.length} item{orderItems.length !== 1 ? 's' : ''} • {totalUnits.toFixed(2)} units
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBackToProducts}
          className="flex-1 py-3 bg-cult-dark-gray text-cult-white rounded-lg font-bold hover:bg-cult-medium-gray transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Add More
        </button>
        <button
          type="button"
          onClick={onProceedToReview}
          disabled={!canProceed}
          className="flex-1 py-3 bg-cult-green text-cult-black rounded-lg font-bold hover:bg-cult-green-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Review Order
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
