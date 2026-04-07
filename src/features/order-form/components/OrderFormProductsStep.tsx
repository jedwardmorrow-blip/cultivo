import { useState } from 'react';
import { Search, X, Plus, Minus } from 'lucide-react';
import { formatProductPrice, getCategoryBadge } from '@/services';
import type { OrderFormProduct, OrderFormItem } from '../types';

interface OrderFormProductsStepProps {
  products: OrderFormProduct[];
  orderItems: OrderFormItem[];
  onAddProduct: (product: OrderFormProduct) => void;
  onAdjustQuantity: (index: number, delta: number) => void;
}

export function OrderFormProductsStep({
  products,
  orderItems,
  onAddProduct,
  onAdjustQuantity,
}: OrderFormProductsStepProps) {
  const [productSearchTerm, setProductSearchTerm] = useState('');

  const filteredProducts = products.filter(product => {
    const strainName = product.strain?.name || '';
    const typeName = product.type?.name || '';
    return (
      product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      strainName.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      typeName.toLowerCase().includes(productSearchTerm.toLowerCase())
    );
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-cult-near-black border-b border-cult-medium-gray">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cult-light-gray w-5 h-5" />
          <input
            type="text"
            value={productSearchTerm}
            onChange={(e) => setProductSearchTerm(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-10 py-3 bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-cult-white placeholder-cult-light-gray focus:outline-none focus:ring-2 focus:ring-cult-green focus:border-cult-green text-base"
            autoFocus
          />
          {productSearchTerm && (
            <button
              type="button"
              onClick={() => setProductSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cult-light-gray hover:text-cult-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {productSearchTerm && (
          <p className="text-xs text-cult-light-gray mt-2">
            {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-cult-medium-gray mx-auto mb-3" />
            <p className="text-cult-light-gray">No products found</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const priceDisplay = formatProductPrice(product);
            const categoryBadge = getCategoryBadge(product.product_category);
            const strainName = product.strain?.name || 'N/A';
            const typeName = product.type?.name || 'N/A';
            const inCart = orderItems.some(item => item.product_id === product.id);
            const cartItem = orderItems.find(item => item.product_id === product.id);

            return (
              <div
                key={product.id}
                className={`p-4 border rounded-lg transition-all ${
                  inCart
                    ? 'bg-cult-green bg-opacity-10 border-cult-green'
                    : 'bg-cult-dark-gray border-cult-medium-gray'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl flex-shrink-0">{categoryBadge}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-semibold text-cult-white">{product.name}</div>
                      {inCart && (
                        <span className="text-xs bg-cult-green text-cult-black px-2 py-0.5 rounded font-bold whitespace-nowrap">
                          IN CART
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-cult-light-gray space-y-0.5">
                      <div>{strainName} • {typeName}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-cult-green font-semibold">{priceDisplay}</span>
                        <span className={(product.available_quantity || 0) > 0 ? 'text-cult-green' : 'text-cult-danger'}>
                          {product.available_quantity || 0} available
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {inCart && cartItem ? (
                  <div className="flex items-center gap-2 pt-3 border-t border-cult-medium-gray">
                    <button
                      type="button"
                      onClick={() => {
                        const index = orderItems.findIndex(item => item.product_id === product.id);
                        onAdjustQuantity(index, -1);
                      }}
                      className="w-10 h-10 flex items-center justify-center bg-cult-near-black border border-cult-medium-gray rounded-lg text-cult-white hover:bg-cult-medium-gray transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-center">
                      <div className="text-lg font-bold text-cult-white">
                        {cartItem.quantity} {product.pricing_unit}
                      </div>
                      <div className="text-xs text-cult-light-gray">
                        ${(cartItem.quantity * cartItem.unit_price).toFixed(2)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const index = orderItems.findIndex(item => item.product_id === product.id);
                        onAdjustQuantity(index, 1);
                      }}
                      className="w-10 h-10 flex items-center justify-center bg-cult-green text-cult-black border border-cult-green rounded-lg hover:bg-cult-green-bright transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAddProduct(product)}
                    className="w-full py-2.5 bg-cult-green text-cult-black rounded-lg font-bold hover:bg-cult-green-bright transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add to Cart
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
