import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  type: string;
  strain: string;
  price_per_unit: number;
  pricing_unit: string;
  product_category: string;
  allows_fractional_quantity: boolean;
}

interface AddOrderItemProps {
  orderId: string;
  products: Product[];
  onAdd: (orderId: string, productId: string, quantity: number) => Promise<void>;
}

export function AddOrderItem({ orderId, products, onAdd }: AddOrderItemProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [search, setSearch] = useState('');

  const handleAdd = async () => {
    if (!productId || quantity < 1) {
      alert('Please select a product and enter a valid quantity.');
      return;
    }

    await onAdd(orderId, productId, quantity);
    setIsAdding(false);
    setProductId('');
    setQuantity(1);
    setSearch('');
  };

  const handleCancel = () => {
    setIsAdding(false);
    setProductId('');
    setQuantity(1);
    setSearch('');
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-400 border-2 border-green-600 hover:bg-green-900/30 transition-all uppercase tracking-wider"
      >
        <Plus className="w-4 h-4" />
        Add Item to Order
      </button>
    );
  }

  const filteredProducts = products.filter(product => {
    const searchLower = search.toLowerCase();
    return product.name.toLowerCase().includes(searchLower) ||
           (product.strain && product.strain.toLowerCase().includes(searchLower));
  });

  return (
    <div className="mt-4 bg-cult-near-black border-2 border-cult-medium-gray p-4">
      <h4 className="text-sm font-bold text-cult-white mb-3 uppercase tracking-wider">Add Item to Order</h4>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-cult-light-gray mb-1 uppercase tracking-wider">Search Products</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cult-light-gray w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or strain..."
              className="w-full pl-10 pr-3 py-2 text-sm border-2 border-cult-medium-gray bg-cult-dark-gray text-cult-white focus:outline-none focus:border-cult-white"
            />
          </div>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-cult-light-gray mb-1 uppercase tracking-wider">Product</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 border-cult-medium-gray bg-cult-dark-gray text-cult-white focus:outline-none focus:border-cult-white max-h-48"
              size={5}
            >
              <option value="">Select product</option>
              {filteredProducts.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.strain} (${formatCurrency(Number(product.price_per_unit))})
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-xs font-medium text-cult-light-gray mb-1 uppercase tracking-wider">Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="w-full px-3 py-2 text-sm border-2 border-cult-medium-gray bg-cult-dark-gray text-cult-white focus:outline-none focus:border-cult-white"
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border-2 border-cult-medium-gray text-cult-white hover:border-cult-white transition-all text-sm font-medium uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-green-600 text-white border-2 border-green-600 hover:bg-green-700 transition-all text-sm font-medium uppercase tracking-wider"
          >
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
}
