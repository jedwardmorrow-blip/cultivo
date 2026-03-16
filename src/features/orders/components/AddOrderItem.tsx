import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, X, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { notificationService } from '@/services/notification.service';

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

type CategoryFilter = 'all' | 'packaged' | 'preroll' | 'fresh_frozen';

/** Strip the leading prefix (e.g. "Packaged - ", "Bulk - ") to show a clean display name */
function displayName(product: Product): string {
  const prefixes = ['Packaged - ', 'Prerolls - ', 'Bulk - '];
  let name = product.name;
  for (const prefix of prefixes) {
    if (name.startsWith(prefix)) {
      name = name.slice(prefix.length);
      break;
    }
  }
  // Also strip the strain prefix if the name starts with it (e.g. "Stay Puft - 3.5g Flower")
  if (product.strain && name.startsWith(product.strain + ' - ')) {
    name = name.slice(product.strain.length + 3);
  }
  return name;
}

function isFreshFrozen(product: Product): boolean {
  return product.name.toLowerCase().includes('fresh frozen');
}

function getCategoryLabel(cat: CategoryFilter): string {
  switch (cat) {
    case 'all': return 'All';
    case 'packaged': return 'Packaged';
    case 'preroll': return 'Preroll';
    case 'fresh_frozen': return 'Fresh Frozen';
  }
}

export function AddOrderItem({ orderId, products, onAdd }: AddOrderItemProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdd = async () => {
    if (!productId || quantity < 1) {
      notificationService.warning('Please select a product and enter a valid quantity.');
      return;
    }

    await onAdd(orderId, productId, quantity);
    setIsAdding(false);
    setProductId('');
    setQuantity(1);
    setSearch('');
    setCategory('all');
    setIsDropdownOpen(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setProductId('');
    setQuantity(1);
    setSearch('');
    setCategory('all');
    setIsDropdownOpen(false);
  };

  const handleSelectProduct = (product: Product) => {
    setProductId(product.id);
    setIsDropdownOpen(false);
    setSearch(product.name);
  };

  // Filter and group products
  const { groupedProducts, totalCount } = useMemo(() => {
    const searchLower = search.toLowerCase();

    const filtered = products.filter(product => {
      // Category filter
      if (category === 'fresh_frozen') {
        if (!isFreshFrozen(product)) return false;
      } else if (category === 'packaged') {
        if (product.product_category !== 'packaged' || isFreshFrozen(product)) return false;
      } else if (category === 'preroll') {
        if (product.product_category !== 'preroll') return false;
      }

      // Text search
      if (searchLower) {
        return product.name.toLowerCase().includes(searchLower) ||
               (product.strain && product.strain.toLowerCase().includes(searchLower));
      }

      return true;
    });

    // Group by strain
    const groups = new Map<string, Product[]>();
    for (const product of filtered) {
      const strain = product.strain || 'Other';
      if (!groups.has(strain)) {
        groups.set(strain, []);
      }
      groups.get(strain)!.push(product);
    }

    // Sort strains alphabetically, sort products within each strain by display name
    const sorted = new Map(
      [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([strain, prods]) => [
          strain,
          prods.sort((a, b) => displayName(a).localeCompare(displayName(b)))
        ])
    );

    return { groupedProducts: sorted, totalCount: filtered.length };
  }, [products, search, category]);

  const selectedProduct = products.find(p => p.id === productId);

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

  const categories: CategoryFilter[] = ['all', 'packaged', 'preroll', 'fresh_frozen'];

  return (
    <div className="mt-4 bg-cult-near-black border-2 border-cult-medium-gray p-4">
      <h4 className="text-sm font-bold text-cult-white mb-3 uppercase tracking-wider">Add Item to Order</h4>
      <div className="space-y-3">
        {/* Category filter tabs */}
        <div>
          <label className="block text-xs font-medium text-cult-light-gray mb-1 uppercase tracking-wider">Category</label>
          <div className="flex gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setProductId(''); setSearch(''); }}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 transition-all ${
                  category === cat
                    ? 'border-green-500 bg-green-900/30 text-green-400'
                    : 'border-cult-medium-gray text-cult-light-gray hover:border-cult-lighter-gray'
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Search + dropdown */}
        <div ref={dropdownRef} className="relative">
          <label className="block text-xs font-medium text-cult-light-gray mb-1 uppercase tracking-wider">
            Search Products
            {totalCount > 0 && (
              <span className="ml-2 text-cult-lighter-gray font-normal normal-case">
                ({totalCount} products)
              </span>
            )}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cult-light-gray w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setIsDropdownOpen(true);
                if (productId) setProductId('');
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Type strain name or product..."
              className="w-full pl-10 pr-10 py-2 text-sm border-2 border-cult-medium-gray bg-cult-dark-gray text-cult-white focus:outline-none focus:border-cult-white"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setProductId(''); searchInputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cult-light-gray hover:text-cult-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dropdown results grouped by strain */}
          {isDropdownOpen && search.length > 0 && (
            <div className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto bg-cult-dark-gray border-2 border-cult-medium-gray shadow-lg">
              {groupedProducts.size === 0 ? (
                <div className="px-3 py-4 text-sm text-cult-light-gray text-center">
                  No products found
                </div>
              ) : (
                [...groupedProducts.entries()].map(([strain, strainProducts]) => (
                  <div key={strain}>
                    {/* Strain header */}
                    <div className="px-3 py-1.5 bg-cult-near-black text-xs font-bold text-green-400 uppercase tracking-wider sticky top-0 border-b border-cult-medium-gray">
                      {strain}
                    </div>
                    {/* Products under this strain */}
                    {strainProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-cult-medium-gray/50 transition-colors flex justify-between items-center ${
                          productId === product.id ? 'bg-green-900/30 text-green-400' : 'text-cult-white'
                        }`}
                      >
                        <span>{displayName(product)}</span>
                        <span className="text-xs text-cult-light-gray ml-2 whitespace-nowrap">
                          ${formatCurrency(Number(product.price_per_unit))}
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected product display + quantity */}
        {selectedProduct && (
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-cult-light-gray mb-1 uppercase tracking-wider">Selected</label>
              <div className="px-3 py-2 text-sm border-2 border-green-600 bg-green-900/20 text-green-400 flex justify-between items-center">
                <span>{selectedProduct.name}</span>
                <span className="text-xs text-green-300">
                  ${formatCurrency(Number(selectedProduct.price_per_unit))}/{selectedProduct.pricing_unit || 'unit'}
                </span>
              </div>
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-cult-light-gray mb-1 uppercase tracking-wider">Quantity</label>
              <input
                type="number"
                min={selectedProduct.allows_fractional_quantity ? 0.1 : 1}
                step={selectedProduct.allows_fractional_quantity ? 0.1 : 1}
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm border-2 border-cult-medium-gray bg-cult-dark-gray text-cult-white focus:outline-none focus:border-cult-white"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border-2 border-cult-medium-gray text-cult-white hover:border-cult-white transition-all text-sm font-medium uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!productId}
            className={`px-4 py-2 border-2 transition-all text-sm font-medium uppercase tracking-wider ${
              productId
                ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                : 'bg-cult-medium-gray text-cult-light-gray border-cult-medium-gray cursor-not-allowed'
            }`}
          >
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
}
