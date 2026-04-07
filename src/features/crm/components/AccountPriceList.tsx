import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Search, Tag, Calendar, X, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/services/notification.service';
import { getCustomerPriceList, createPriceOverride, deletePriceOverride } from '../services/priceList.service';
import { formatDate } from '@/shared/utils/format';
import type { CustomerPriceOverride } from '../types';

interface AccountPriceListProps {
  customerId: string;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string | null;
  price_per_unit: number | null;
}

export function AccountPriceList({ customerId }: AccountPriceListProps) {
  const [overrides, setOverrides] = useState<CustomerPriceOverride[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [customerId]);

  async function loadData() {
    setLoading(true);
    const [priceResult, productsResult] = await Promise.all([
      getCustomerPriceList(customerId),
      supabase.from('products').select('id, name, sku, price_per_unit').order('name'),
    ]);
    if (priceResult.data) setOverrides(priceResult.data);
    if (productsResult.data) setProducts(productsResult.data as ProductOption[]);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const { error } = await deletePriceOverride(id);
    if (!error) {
      setOverrides((prev) => prev.filter((o) => o.id !== id));
      notificationService.success('Price override removed');
    }
  }

  async function handleAdd(input: { product_id: string; custom_price: number; effective_date: string; expires_at: string; notes: string }) {
    const { error } = await createPriceOverride({
      customer_id: customerId,
      product_id: input.product_id,
      custom_price: input.custom_price,
      effective_date: input.effective_date || undefined,
      expires_at: input.expires_at || null,
      notes: input.notes || undefined,
    });
    if (!error) {
      notificationService.success('Price override created');
      setShowAddForm(false);
      loadData();
    }
  }

  const today = new Date().toISOString().split('T')[0];

  const activeOverrides = overrides.filter((o) => {
    const isEffective = o.effective_date <= today;
    const notExpired = !o.expires_at || o.expires_at >= today;
    return isEffective && notExpired;
  });

  const expiredOverrides = overrides.filter((o) => {
    return o.expires_at && o.expires_at < today;
  });

  const futureOverrides = overrides.filter((o) => {
    return o.effective_date > today;
  });

  if (loading) {
    return (
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-cult-green border-t-transparent" />
          <span className="text-cult-silver text-sm">Loading price list...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg">
        <div className="px-5 py-4 border-b border-cult-charcoal/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-cult-green" />
            <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">
              Active Price Overrides
            </h3>
            <span className="text-xs text-cult-silver bg-cult-dark-gray px-2 py-0.5 rounded-full">
              {activeOverrides.length}
            </span>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cult-green text-cult-black rounded-lg hover:bg-cult-green-bright transition-all text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Override
          </button>
        </div>

        {showAddForm && (
          <AddOverrideForm
            products={products}
            existingProductIds={overrides.map((o) => o.product_id)}
            onSubmit={handleAdd}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {activeOverrides.length === 0 ? (
          <div className="p-8 text-center">
            <Tag className="w-8 h-8 text-cult-medium-gray mx-auto mb-2" />
            <p className="text-cult-silver text-sm">No active price overrides</p>
            <p className="text-cult-medium-gray text-xs mt-1">
              Add custom pricing for specific products
            </p>
          </div>
        ) : (
          <div className="divide-y divide-cult-charcoal/30">
            {activeOverrides.map((override) => (
              <PriceRow key={override.id} override={override} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {futureOverrides.length > 0 && (
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg">
          <div className="px-5 py-3 border-b border-cult-charcoal/50 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cult-info" />
            <h3 className="text-xs font-semibold text-cult-silver uppercase tracking-wider">Scheduled</h3>
            <span className="text-xs text-cult-silver bg-cult-dark-gray px-2 py-0.5 rounded-full">
              {futureOverrides.length}
            </span>
          </div>
          <div className="divide-y divide-cult-charcoal/30">
            {futureOverrides.map((override) => (
              <PriceRow key={override.id} override={override} onDelete={handleDelete} variant="future" />
            ))}
          </div>
        </div>
      )}

      {expiredOverrides.length > 0 && (
        <details className="bg-cult-near-black border border-cult-medium-gray rounded-lg">
          <summary className="px-5 py-3 cursor-pointer text-xs font-semibold text-cult-silver uppercase tracking-wider hover:text-cult-white transition-colors">
            Expired Overrides ({expiredOverrides.length})
          </summary>
          <div className="divide-y divide-cult-charcoal/30 border-t border-cult-charcoal/50">
            {expiredOverrides.map((override) => (
              <PriceRow key={override.id} override={override} onDelete={handleDelete} variant="expired" />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function PriceRow({ override, onDelete, variant }: {
  override: CustomerPriceOverride;
  onDelete: (id: string) => void;
  variant?: 'future' | 'expired';
}) {
  const discount = override.standard_price && override.standard_price > 0
    ? ((override.standard_price - override.custom_price) / override.standard_price * 100)
    : null;

  const opacityClass = variant === 'expired' ? 'opacity-50' : '';

  return (
    <div className={`px-5 py-3 flex items-center justify-between gap-4 group hover:bg-cult-dark-gray/30 transition-colors ${opacityClass}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-cult-white truncate">{override.product_name}</p>
          {override.product_sku && (
            <span className="text-xs font-mono text-cult-medium-gray">{override.product_sku}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {override.standard_price != null && (
            <span className="text-xs text-cult-medium-gray line-through">
              ${override.standard_price.toFixed(2)}
            </span>
          )}
          <span className="text-xs font-semibold text-cult-success">
            ${override.custom_price.toFixed(2)}
          </span>
          {discount !== null && discount > 0 && (
            <span className="text-xs font-bold text-cult-warning bg-cult-warning-muted px-1.5 py-0.5 rounded">
              {discount.toFixed(0)}% off
            </span>
          )}
          {discount !== null && discount < 0 && (
            <span className="text-xs font-bold text-cult-danger bg-cult-danger-muted px-1.5 py-0.5 rounded">
              +{Math.abs(discount).toFixed(0)}% premium
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right">
          <p className="text-xs text-cult-medium-gray">
            {variant === 'future' ? 'Starts' : 'Since'} {formatDate(override.effective_date)}
          </p>
          {override.expires_at && (
            <p className="text-xs text-cult-medium-gray">
              {variant === 'expired' ? 'Expired' : 'Expires'} {formatDate(override.expires_at)}
            </p>
          )}
        </div>
        {override.notes && (
          <span className="text-xs text-cult-silver max-w-[120px] truncate" title={override.notes}>
            {override.notes}
          </span>
        )}
        <button
          onClick={() => onDelete(override.id)}
          className="p-1.5 text-cult-medium-gray hover:text-cult-danger opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-cult-danger-muted"
          title="Remove override"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function AddOverrideForm({ products, existingProductIds, onSubmit, onCancel }: {
  products: ProductOption[];
  existingProductIds: string[];
  onSubmit: (input: { product_id: string; custom_price: number; effective_date: string; expires_at: string; notes: string }) => void;
  onCancel: () => void;
}) {
  const [productId, setProductId] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find((p) => p.id === productId);

  const availableProducts = products.filter((p) => {
    if (existingProductIds.includes(p.id)) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(term) || (p.sku && p.sku.toLowerCase().includes(term));
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !customPrice) return;
    setSaving(true);
    await onSubmit({
      product_id: productId,
      custom_price: parseFloat(customPrice),
      effective_date: effectiveDate,
      expires_at: expiresAt,
      notes,
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 bg-cult-dark-gray/30 border-b border-cult-charcoal/50">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="sm:col-span-2" ref={dropdownRef}>
          <label className="block text-xs font-medium text-cult-silver uppercase tracking-wider mb-1">Product</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cult-medium-gray" />
            <input
              type="text"
              value={selectedProduct ? `${selectedProduct.name}${selectedProduct.sku ? ` (${selectedProduct.sku})` : ''}` : searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setProductId('');
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search products..."
              className="w-full pl-8 pr-8 py-2 bg-cult-near-black border border-cult-medium-gray rounded text-sm text-cult-white placeholder-cult-medium-gray focus:outline-none focus:ring-1 focus:ring-cult-green"
            />
            {productId ? (
              <button
                type="button"
                onClick={() => { setProductId(''); setSearchTerm(''); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cult-medium-gray hover:text-cult-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cult-medium-gray" />
            )}
            {showDropdown && !productId && (
              <div className="absolute z-50 w-full mt-1 bg-cult-near-black border border-cult-medium-gray rounded-lg shadow-2xl max-h-48 overflow-y-auto">
                {availableProducts.length === 0 ? (
                  <div className="p-3 text-center text-cult-medium-gray text-xs">
                    {searchTerm ? 'No matching products' : 'Type to search...'}
                  </div>
                ) : (
                  availableProducts.slice(0, 20).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setProductId(p.id);
                        setSearchTerm('');
                        setShowDropdown(false);
                        if (p.price_per_unit != null && !customPrice) {
                          setCustomPrice(String(p.price_per_unit));
                        }
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-cult-dark-gray transition-colors text-sm"
                    >
                      <span className="text-cult-white">{p.name}</span>
                      {p.sku && <span className="text-cult-medium-gray text-xs ml-2">{p.sku}</span>}
                      {p.price_per_unit != null && (
                        <span className="text-cult-silver text-xs float-right">${p.price_per_unit}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-cult-silver uppercase tracking-wider mb-1">Custom Price</label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 bg-cult-near-black border border-cult-medium-gray rounded text-sm text-cult-white placeholder-cult-medium-gray focus:outline-none focus:ring-1 focus:ring-cult-green"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-cult-silver uppercase tracking-wider mb-1">Effective Date</label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="w-full px-3 py-2 bg-cult-near-black border border-cult-medium-gray rounded text-sm text-cult-white focus:outline-none focus:ring-1 focus:ring-cult-green"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        <div>
          <label className="block text-xs font-medium text-cult-silver uppercase tracking-wider mb-1">Expires (optional)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            min={effectiveDate}
            className="w-full px-3 py-2 bg-cult-near-black border border-cult-medium-gray rounded text-sm text-cult-white focus:outline-none focus:ring-1 focus:ring-cult-green"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-cult-silver uppercase tracking-wider mb-1">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Volume discount, promo, etc."
            className="w-full px-3 py-2 bg-cult-near-black border border-cult-medium-gray rounded text-sm text-cult-white placeholder-cult-medium-gray focus:outline-none focus:ring-1 focus:ring-cult-green"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={!productId || !customPrice || saving}
            className="flex-1 px-3 py-2 bg-cult-green text-cult-black rounded text-xs font-bold hover:bg-cult-green-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 border border-cult-medium-gray text-cult-silver rounded text-xs hover:bg-cult-dark-gray transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
