import { ShoppingCart, ArrowRight } from 'lucide-react';

interface OrderFormMiniCartProps {
  itemCount: number;
  totalAmount: number;
  onViewCart: () => void;
}

export function OrderFormMiniCart({
  itemCount,
  totalAmount,
  onViewCart,
}: OrderFormMiniCartProps) {
  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 bg-cult-surface border-2 border-cult-green rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-cult-green" />
          <div>
            <div className="text-sm font-bold text-cult-text-primary">
              {itemCount} item{itemCount !== 1 ? 's' : ''} in cart
            </div>
            <div className="text-xs text-cult-text-muted">
              ${totalAmount.toFixed(2)}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onViewCart}
          className="px-4 py-2 bg-cult-green text-cult-black rounded-lg font-bold text-sm hover:bg-cult-green-bright transition-colors flex items-center gap-1"
        >
          View Cart
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
