import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { validateDate, getDateInputConstraints } from '@/lib/utils';
import { useOrderableProducts } from '@/hooks';
import { formatProductPrice, getCategoryBadge, groupProductsByCategory } from '@/services';
import {
  X, Plus, Minus, Search, Gift, ShoppingCart, Trash2,
  AlertCircle, ChevronDown, ChevronRight, Package, Calendar,
  FileText, User, Lock, Unlock, RotateCcw,
} from 'lucide-react';
import { notificationService } from '@/services/notification.service';
import { getActivePricesForCustomer } from '@/features/crm/services/priceList.service';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  dispensary_code: string;
}

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  is_sample: boolean;
  price_locked: boolean;
}

interface NewOrderFormProps {
  onClose: () => void;
  onSuccess: (orderData?: { id: string; order_number: string; customer_id: string }) => void;
  cloneFrom?: any;
  preSelectedCustomerId?: string;
  sampleMode?: boolean;
}

// ─── Category Labels ─────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  packaged: 'Packaged Flower',
  preroll: 'Pre-Rolls',
  bulk: 'Bulk',
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function NewOrderForm({ onClose, onSuccess, cloneFrom, preSelectedCustomerId, sampleMode }: NewOrderFormProps) {
  // Data state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { products, loading: productsLoading, error: productsError } = useOrderableProducts();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [customerPrices, setCustomerPrices] = useState<Map<string, number> | null>(null);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Notes expansion
  const [showNotes, setShowNotes] = useState(false);

  // Refs
  const catalogRef = useRef<HTMLDivElement>(null);

  // ─── Data Loading ────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadData() {
      setDataLoading(true);
      await loadCustomers();
      setDataLoading(false);
    }
    loadData();
  }, []);

  useEffect(() => {
    setDataLoading(productsLoading);
  }, [productsLoading]);

  useEffect(() => {
    const custId = preSelectedCustomerId || selectedCustomerId;
    if (custId) {
      getActivePricesForCustomer(custId).then(({ data }) => {
        if (data) setCustomerPrices(data);
      });
    }
  }, [preSelectedCustomerId, selectedCustomerId]);

  async function loadCustomers() {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    if (data) {
      setCustomers(data);
      if (cloneFrom && data.length > 0) {
        prefillFromClone(data);
      } else if (preSelectedCustomerId) {
        setSelectedCustomerId(preSelectedCustomerId);
      }
    }
  }

  async function prefillFromClone(loadedCustomers: Customer[]) {
    if (!cloneFrom?.id) return;
    const matchingCustomer = loadedCustomers.find(c => c.name === cloneFrom.customer_name);
    if (matchingCustomer) {
      setSelectedCustomerId(matchingCustomer.id);
    }
    setPriority(cloneFrom.priority || 'normal');
    setDeliveryNotes(cloneFrom.delivery_notes || '');
    setInternalNotes(cloneFrom.internal_notes || '');
    if (cloneFrom.delivery_notes || cloneFrom.internal_notes) setShowNotes(true);

    const { data: itemsData } = await supabase
      .from('order_items')
      .select('product_id, quantity, unit_price, is_sample')
      .eq('order_id', cloneFrom.id);
    if (itemsData && itemsData.length > 0) {
      setCartItems(itemsData.map((item: any) => ({
        product_id: item.product_id,
        product_name: products.find(p => p.id === item.product_id)?.name || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        is_sample: item.is_sample ?? false,
        price_locked: false,
      })));
    }
  }

  // ─── Derived Data ────────────────────────────────────────────────────────

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const term = productSearch.toLowerCase();
    return products.filter(product => {
      const strainName = product.strain?.name || '';
      const typeName = product.type?.name || '';
      return (
        product.name.toLowerCase().includes(term) ||
        strainName.toLowerCase().includes(term) ||
        typeName.toLowerCase().includes(term)
      );
    });
  }, [products, productSearch]);

  const groupedProducts = useMemo(() => {
    return groupProductsByCategory(filteredProducts);
  }, [filteredProducts]);

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const totalUnits = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const orderNumberPreview = selectedCustomer
    ? `${selectedCustomer.dispensary_code}${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`
    : null;

  const canSubmit = selectedCustomerId && cartItems.length > 0 && !dateError && !loading && !dataLoading;

  // ─── Cart Actions ────────────────────────────────────────────────────────

  function addToCart(product: any) {
    const existingIndex = cartItems.findIndex(item => item.product_id === product.id);

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      const step = product.allows_fractional_quantity ? 0.25 : 1;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: parseFloat((updated[existingIndex].quantity + step).toFixed(2)),
      };
      setCartItems(updated);
    } else {
      const customPrice = customerPrices?.get(product.id);
      const isSample = !!sampleMode;
      const newItem: CartItem = {
        product_id: product.id,
        product_name: product.name,
        quantity: product.allows_fractional_quantity ? 0.25 : 1,
        unit_price: isSample ? 0 : (customPrice ?? product.price_per_unit ?? 0),
        is_sample: isSample,
        price_locked: false,
      };
      setCartItems([...cartItems, newItem]);
    }
  }

  function adjustCartQuantity(index: number, delta: number) {
    const item = cartItems[index];
    const product = products.find(p => p.id === item.product_id);
    const step = product?.allows_fractional_quantity ? 0.25 : 1;
    const newQty = parseFloat((item.quantity + delta * step).toFixed(2));
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const updated = [...cartItems];
    updated[index] = { ...updated[index], quantity: newQty };
    setCartItems(updated);
  }

  function updateCartPrice(index: number, price: number) {
    const updated = [...cartItems];
    updated[index] = { ...updated[index], unit_price: price };
    setCartItems(updated);
  }

  function resetCartPrice(index: number) {
    const item = cartItems[index];
    const product = products.find(p => p.id === item.product_id);
    if (product) {
      const customPrice = customerPrices?.get(item.product_id);
      const updated = [...cartItems];
      updated[index] = { ...updated[index], unit_price: customPrice ?? product.price_per_unit ?? 0 };
      setCartItems(updated);
    }
  }

  function togglePriceLock(index: number) {
    const updated = [...cartItems];
    updated[index] = { ...updated[index], price_locked: !updated[index].price_locked };
    setCartItems(updated);
  }

  function toggleSample(index: number) {
    const updated = [...cartItems];
    const newIsSample = !updated[index].is_sample;
    updated[index] = {
      ...updated[index],
      is_sample: newIsSample,
      unit_price: newIsSample ? 0 : (products.find(p => p.id === updated[index].product_id)?.price_per_unit ?? updated[index].unit_price),
    };
    setCartItems(updated);
  }

  function removeFromCart(index: number) {
    setCartItems(cartItems.filter((_, i) => i !== index));
  }

  function getCartQuantity(productId: string): number {
    return cartItems.find(item => item.product_id === productId)?.quantity || 0;
  }

  function toggleCategory(category: string) {
    const next = new Set(collapsedCategories);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    setCollapsedCategories(next);
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!canSubmit) return;

    const dateValidation = validateDate(requestedDeliveryDate);
    if (requestedDeliveryDate && !dateValidation.isValid) {
      setDateError(dateValidation.error || 'Invalid date');
      return;
    }

    setLoading(true);

    try {
      const allSamples = cartItems.every(item => item.is_sample);
      const anySamples = cartItems.some(item => item.is_sample);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: selectedCustomerId,
          priority,
          requested_delivery_date: requestedDeliveryDate || null,
          delivery_notes: deliveryNotes || null,
          internal_notes: internalNotes || null,
          status: 'submitted',
          is_sample: anySamples,
          ...(allSamples ? { order_source: 'sample' } : {}),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const itemsToInsert = cartItems.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.is_sample ? 0 : item.unit_price,
        notes: item.notes || null,
        status: 'trimming',
        is_sample: item.is_sample,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      onSuccess({
        id: orderData.id,
        order_number: orderData.order_number,
        customer_id: orderData.customer_id,
      });
    } catch (error) {
      console.error('Error creating order:', error);
      notificationService.error('Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Render: Loading State ───────────────────────────────────────────────

  if (dataLoading) {
    return (
      <div className="fixed inset-0 bg-cult-surface/95 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-cult-text-muted border-t-cult-text-primary rounded-full animate-spin" />
          <p className="text-cult-text-secondary text-body">Loading products and customers…</p>
        </div>
      </div>
    );
  }

  // ─── Render: Main Layout ─────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-cult-surface/95 backdrop-blur-sm z-50 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-cult-surface-raised border-b border-cult-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-h3 text-cult-text-primary font-semibold tracking-wide">New Order</h1>
          {sampleMode && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-caption font-semibold bg-cult-warning/15 text-cult-warning border border-cult-warning/30 rounded-cult uppercase tracking-wider">
              <Gift className="w-3.5 h-3.5" />
              Sample
            </span>
          )}
          {orderNumberPreview && (
            <span className="text-caption text-cult-text-muted font-mono">
              Preview: <span className="text-cult-text-secondary">{orderNumberPreview}</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="p-2 text-cult-text-muted hover:text-cult-text-primary hover:bg-cult-surface-overlay rounded-cult transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Three-Column Body ──────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── Left: Order Details ────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 border-r border-cult-border bg-cult-surface overflow-y-auto">
          <div className="p-4 space-y-5">
            {/* Customer Picker */}
            <div>
              <label className="flex items-center gap-1.5 text-caption font-medium text-cult-text-secondary uppercase tracking-wider mb-2">
                <User className="w-3.5 h-3.5" />
                Dispensary
              </label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                disabled={!!preSelectedCustomerId}
                className={`w-full px-3 py-2.5 bg-cult-surface-raised border border-cult-border rounded-cult text-body text-cult-text-primary focus:outline-none focus:ring-1 focus:ring-cult-accent/40 focus:border-cult-border-strong transition-colors ${
                  preSelectedCustomerId ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                <option value="">Select dispensary…</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {!selectedCustomerId && (
                <p className="mt-1.5 text-caption text-cult-danger flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Required
                </p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="text-caption font-medium text-cult-text-secondary uppercase tracking-wider mb-2 block">
                Priority
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['normal', 'high', 'urgent'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 text-caption font-semibold rounded-cult capitalize transition-all ${
                      priority === p
                        ? p === 'urgent'
                          ? 'bg-cult-danger/20 text-cult-danger border border-cult-danger/40'
                          : p === 'high'
                          ? 'bg-cult-warning/20 text-cult-warning border border-cult-warning/40'
                          : 'bg-cult-surface-overlay text-cult-text-primary border border-cult-border-strong'
                        : 'bg-cult-surface-raised text-cult-text-muted border border-transparent hover:border-cult-border hover:text-cult-text-secondary'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Date */}
            <div>
              <label className="flex items-center gap-1.5 text-caption font-medium text-cult-text-secondary uppercase tracking-wider mb-2">
                <Calendar className="w-3.5 h-3.5" />
                Delivery Date
              </label>
              <input
                type="date"
                value={requestedDeliveryDate}
                onChange={(e) => {
                  setRequestedDeliveryDate(e.target.value);
                  const validation = validateDate(e.target.value);
                  setDateError(validation.isValid ? null : validation.error || 'Invalid date');
                }}
                min={getDateInputConstraints().min}
                max={getDateInputConstraints().max}
                className="w-full px-3 py-2.5 bg-cult-surface-raised border border-cult-border rounded-cult text-body text-cult-text-primary focus:outline-none focus:ring-1 focus:ring-cult-accent/40 focus:border-cult-border-strong transition-colors"
              />
              {dateError && (
                <p className="mt-1.5 text-caption text-cult-danger flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {dateError}
                </p>
              )}
            </div>

            {/* Notes Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center gap-1.5 text-caption font-medium text-cult-text-muted hover:text-cult-text-secondary transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                {showNotes ? 'Hide' : 'Add'} Notes
                <ChevronDown className={`w-3 h-3 transition-transform ${showNotes ? 'rotate-180' : ''}`} />
              </button>
              {showNotes && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-caption text-cult-text-muted mb-1 block">Delivery Notes</label>
                    <textarea
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-cult-surface-raised border border-cult-border rounded-cult text-body text-cult-text-primary placeholder-cult-text-muted focus:outline-none focus:ring-1 focus:ring-cult-accent/40 resize-none"
                      placeholder="Delivery instructions…"
                    />
                  </div>
                  <div>
                    <label className="text-caption text-cult-text-muted mb-1 block">Internal Notes</label>
                    <textarea
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-cult-surface-raised border border-cult-border rounded-cult text-body text-cult-text-primary placeholder-cult-text-muted focus:outline-none focus:ring-1 focus:ring-cult-accent/40 resize-none"
                      placeholder="Internal notes…"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Center: Product Catalog ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden" ref={catalogRef}>
          {/* Search Bar */}
          <div className="flex-shrink-0 px-5 py-3 border-b border-cult-border bg-cult-surface">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cult-text-muted w-4 h-4" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by name, strain, or type…"
                className="w-full pl-10 pr-10 py-2.5 bg-cult-surface-raised border border-cult-border rounded-cult text-body text-cult-text-primary placeholder-cult-text-muted focus:outline-none focus:ring-1 focus:ring-cult-accent/40 focus:border-cult-border-strong transition-colors"
                autoFocus
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cult-text-muted hover:text-cult-text-primary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {productSearch && (
              <p className="mt-1.5 text-caption text-cult-text-muted">
                {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {productsError ? (
              <div className="flex flex-col items-center justify-center py-16 text-cult-danger">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p className="text-body">Failed to load products</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Search className="w-8 h-8 text-cult-text-muted mb-2" />
                <p className="text-body text-cult-text-muted">No products found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                  <div key={category}>
                    {/* Category Header */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="flex items-center gap-2 mb-3 group"
                    >
                      <ChevronRight className={`w-4 h-4 text-cult-text-muted transition-transform ${
                        !collapsedCategories.has(category) ? 'rotate-90' : ''
                      }`} />
                      <span className="text-caption font-semibold text-cult-text-secondary uppercase tracking-wider">
                        {getCategoryBadge(category)} {CATEGORY_LABELS[category] || category}
                      </span>
                      <span className="text-caption text-cult-text-muted">
                        ({categoryProducts.length})
                      </span>
                    </button>

                    {/* Product Grid */}
                    {!collapsedCategories.has(category) && (
                      <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {categoryProducts.map(product => {
                          const inCart = getCartQuantity(product.id);
                          const strainName = product.strain?.name || '';
                          const priceDisplay = formatProductPrice(product);

                          return (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => addToCart(product)}
                              className={`relative text-left p-3 rounded-cult border transition-all group ${
                                inCart
                                  ? 'bg-cult-accent/5 border-cult-accent/20'
                                  : 'bg-cult-surface-raised border-cult-border hover:border-cult-border-strong'
                              }`}
                            >
                              {/* In-cart badge */}
                              {inCart > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-cult-text-primary text-cult-surface text-[10px] font-bold rounded-full flex items-center justify-center">
                                  {inCart}
                                </span>
                              )}

                              <div className="text-body font-medium text-cult-text-primary truncate mb-0.5">
                                {product.name}
                              </div>
                              <div className="text-caption text-cult-text-muted truncate">
                                {strainName}
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-caption font-semibold text-cult-text-secondary">{priceDisplay}</span>
                                {customerPrices?.has(product.id) && (
                                  <span className="text-[10px] text-cult-warning font-semibold uppercase">Custom</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Cart Sidebar ─────────────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 border-l border-cult-border bg-cult-surface flex flex-col">
          {/* Cart Header */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-cult-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-cult-text-muted" />
              <span className="text-body font-semibold text-cult-text-primary">
                Cart
              </span>
              {cartItems.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-cult-text-primary text-cult-surface rounded-full">
                  {cartItems.length}
                </span>
              )}
            </div>
            {cartItems.length > 0 && (
              <span className="text-caption text-cult-text-muted">
                {totalUnits.toFixed(totalUnits % 1 === 0 ? 0 : 2)} units
              </span>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                <Package className="w-10 h-10 text-cult-text-faint mb-3" />
                <p className="text-body text-cult-text-muted mb-1">Cart is empty</p>
                <p className="text-caption text-cult-text-muted">Click products to add them</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {cartItems.map((item, index) => {
                  const product = products.find(p => p.id === item.product_id);
                  const lineTotal = item.quantity * item.unit_price;
                  const defaultPrice = customerPrices?.get(item.product_id) ?? product?.price_per_unit ?? 0;
                  const hasCustomPrice = item.unit_price !== defaultPrice;

                  return (
                    <div
                      key={`${item.product_id}-${index}`}
                      className="bg-cult-surface-raised border border-cult-border rounded-cult p-3"
                    >
                      {/* Item Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-body font-medium text-cult-text-primary truncate">
                            {item.product_name || product?.name}
                          </p>
                          <p className="text-caption text-cult-text-muted">
                            {product?.strain?.name || ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleSample(index)}
                            className={`p-1 rounded-cult transition-colors ${
                              item.is_sample
                                ? 'bg-cult-warning/15 text-cult-warning'
                                : 'text-cult-text-faint hover:text-cult-text-muted'
                            }`}
                            title={item.is_sample ? 'Remove sample flag' : 'Mark as sample'}
                          >
                            <Gift className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(index)}
                            className="p-1 text-cult-text-faint hover:text-cult-danger rounded-cult transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => adjustCartQuantity(index, -1)}
                          className="w-7 h-7 flex items-center justify-center bg-cult-surface border border-cult-border rounded-cult text-cult-text-secondary hover:border-cult-border-strong transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <div className="flex-1 text-center">
                          <span className="text-body font-semibold text-cult-text-primary">
                            {item.quantity}
                          </span>
                          <span className="text-caption text-cult-text-muted ml-1">
                            {product?.pricing_unit || 'units'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => adjustCartQuantity(index, 1)}
                          className="w-7 h-7 flex items-center justify-center bg-cult-surface border border-cult-border rounded-cult text-cult-text-secondary hover:border-cult-border-strong transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Price Row */}
                      <div className="flex items-center justify-between text-caption">
                        <div className="flex items-center gap-1.5">
                          <span className="text-cult-text-muted">
                            ${item.unit_price.toFixed(2)}/{product?.pricing_unit || 'unit'}
                          </span>
                          {hasCustomPrice && (
                            <button
                              type="button"
                              onClick={() => resetCartPrice(index)}
                              className="text-cult-warning hover:text-cult-warning/80 transition-colors"
                              title="Reset to default price"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => togglePriceLock(index)}
                            className={`transition-colors ${
                              item.price_locked
                                ? 'text-cult-text-secondary'
                                : 'text-cult-text-faint hover:text-cult-text-muted'
                            }`}
                            title={item.price_locked ? 'Unlock price' : 'Lock price'}
                          >
                            {item.price_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </button>
                        </div>
                        <span className="font-semibold text-cult-text-primary">
                          ${lineTotal.toFixed(2)}
                        </span>
                      </div>

                      {/* Sample indicator */}
                      {item.is_sample && (
                        <div className="mt-1.5 text-[10px] font-semibold text-cult-warning uppercase tracking-wider">
                          Sample — $0.00
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Footer: Total + Submit */}
          <div className="flex-shrink-0 border-t border-cult-border bg-cult-surface-raised p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-caption font-medium text-cult-text-muted uppercase tracking-wider">Total</span>
              <span className="text-h3 font-semibold text-cult-text-primary">${totalAmount.toFixed(2)}</span>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-3 bg-cult-text-primary text-cult-surface rounded-cult font-semibold text-body hover:bg-cult-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-cult-surface border-t-transparent rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                <>Create Order</>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full py-2 text-cult-text-muted hover:text-cult-text-secondary text-caption font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
