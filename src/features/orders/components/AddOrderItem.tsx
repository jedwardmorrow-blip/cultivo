import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, X } from 'lucide-react';
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

function displayName(product: Product): string {
  const prefixes = ['Packaged - ', 'Prerolls - ', 'Bulk - '];
  let name = product.name;
  for (const prefix of prefixes) {
    if (name.startsWith(prefix)) {
      name = name.slice(prefix.length);
      break;
    }
  }
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

  const { groupedProducts, totalCount } = useMemo(() => {
    const searchLower = search.toLowerCase();

    const filtered = products.filter(product => {
      if (category === 'fresh_frozen') {
        if (!isFreshFrozen(product)) return false;
      } else if (category === 'packaged') {
        if (product.product_category !== 'packaged' || isFreshFrozen(product)) return false;
      } else if (category === 'preroll') {
        if (product.product_category !== 'preroll') return false;
      }

      if (searchLower) {
        return product.name.toLowerCase().includes(searchLower) ||
               (product.strain && product.strain.toLowerCase().includes(searchLower));
      }

      return true;
    });

    const groups = new Map<string, Product[]>();
    for (const product of filtered) {
      const strain = product.strain || 'Other';
      if (!groups.has(strain)) {
        groups.set(strain, []);
      }
      groups.get(strain)!.push(product);
    }

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
        className="mt-4 flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-cult-success border border-cult-success/30 rounded-cult hover:bg-cult-success/10 transition-all uppercase tracking-wider"
      >
        <Plus className="w-4 h-4" />
        Add Item
      </button>
    );
  }

  const categories: CategoryFilter[] = ['all', 'packaged', 'preroll', 'fresh_frozen'];

  return (
    <div className="mt-4 bg-cult-surface-raised border border-cult-border rounded-cult p-4">
      <h4 className="text-sm font-bold text-cult-text-primary mb-3 uppercase tracking-wider">Add Item to Order</h4>
      <div className="space-y-3">
        {/* Category filter tabs */}
        <div>
          <label className="block text-xs font-semibold text-cult-text-muted mb-1.5 uppercase tracking-wider">Category</label>
          <div className="flex gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setProductId(''); setSearch(''); }}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border rounded-cult transition-all ${
                  category === cat
                    ? 'border-cult-success/50 bg-cult-success/10 text-cult-success'
                    : 'border-cult-border text-cult-text-secondary hover:border-cult-border-strong'
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Search + dropdown */}
        <div ref={dropdownRef} className="relative">
          <label className="block text-xs font-semibold text-cult-text-muted mb-1.5 uppercase tracking-wider">
            Search Products
            {totalCount > 0 && (
              <span className="ml-2 text-cult-text-muted font-normal normal-case">
                ({totalCount} products)
              </span>
            )}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cult-text-muted w-4 h-4" />
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
              className="w-full pl-10 pr-10 py-2.5 text-sm border border-cult-border bg-cult-surface text-cult-text-primary rounded-cult focus:outline-none focus:border-cult-success transition-colors"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setProductId(''); searchInputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cult-text-muted hover:text-cult-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dropdown results grouped by strain */}
          {isDropdownOpen && search.length > 0 && (
            <div className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto bg-cult-surface-sunken border border-cult-border rounded-cult shadow-lg">
              {groupedProducts.size === 0 ? (
                <div className="px-3 py-4 text-sm text-cult-text-muted text-center">
                  No products found
                </div>
              ) : (
                [...groupedProducts.entries()].map(([strain, strainProducts]) => (
                  <div key={strain}>
                    <div className="px-3 py-1.5 bg-cult-surface-raised text-xs font-bold text-cult-success uppercase tracking-wider sticky top-0 border-b border-cult-border">
                      {strain}
                    </div>
                    {strainProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-cult-surface-overlay transition-colors flex justify-between items-center ${
                          productId === product.id ? 'bg-cult-success/10 text-cult-success' : 'text-cult-text-primary'
                        }`}
                      >
                        <span>{displayName(product)}</span>
                        <span className="text-xs text-cult-text-muted ml-2 whitespace-nowrap">
                          {formatCurrency(Number(product.price_per_unit))}
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
              <label className="block text-xs font-semibold text-cult-text-muted mb-1.5 uppercase tracking-wider">Selected</label>
              <div className="px-3 py-2.5 text-sm border border-cult-success/40 bg-cult-success/10 text-cult-success rounded-cult flex justify-between items-center">
                <span>{selectedProduct.name}</span>
                <span className="text-xs text-cult-success/80">
                  {formatCurrency(Number(selectedProduct.price_per_unit))}/{selectedProduct.pricing_unit || 'unit'}
                </span>
              </div>
            </div>
            <div className="w-24">
              <label className="block text-xs font-semibold text-cult-text-muted mb-1.5 uppercase tracking-wider">Qty</label>
              <input
                type="number"
                min={selectedProduct.allows_fractional_quantity ? 0.1 : 1}
                step={selectedProduct.allows_fractional_quantity ? 0.1 : 1}
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2.5 text-sm border border-cult-border bg-cult-surface text-cult-text-primary rounded-cult focus:outline-none focus:border-cult-success transition-colors"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-cult-border text-cult-text-secondary hover:text-cult-text-primary hover:border-cult-border-strong rounded-cult transition-all text-sm font-semibold uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!productId}
            className={`px-4 py-2 rounded-cult transition-all text-sm font-bold uppercase tracking-wider ${
              productId
                ? 'bg-cult-success text-cult-black hover:bg-cult-success-bright'
                : 'bg-cult-surface-overlay text-cult-text-muted cursor-not-allowed'
            }`}
          >
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
}
