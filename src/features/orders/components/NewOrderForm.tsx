import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { validateDate, getDateInputConstraints } from '@/lib/utils';
import { useOrderableProducts } from '@/hooks';
import {
  X, Plus, Minus, Gift, ShoppingCart, Trash2,
  AlertCircle, ChevronDown, Package, Calendar,
  FileText, User, Lock, Unlock, RotateCcw, ClipboardList, Leaf,
} from 'lucide-react';
import { notificationService } from '@/services/notification.service';
import { getActivePricesForCustomer } from '@/features/crm/services/priceList.service';
import { StrainCatalog, type BatchSelection } from './StrainCatalog';

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
  batch_id?: string;
  batch_number?: string | null;
  strain?: string | null;
  grade_code?: string | null;
  grade_label?: string | null;
}

interface NewOrderFormProps {
  onClose: () => void;
  onSuccess: (orderData?: { id: string; order_number: string; customer_id: string }) => void;
  cloneFrom?: any;
  preSelectedCustomerId?: string;
  sampleMode?: boolean;
}

type MobileTab = 'details' | 'products' | 'cart';

// ─── Sub-Components ──────────────────────────────────────────────────────────

function OrderDetailsPanel({
  customers,
  selectedCustomerId,
  onCustomerChange,
  preSelectedCustomerId,
  priority,
  onPriorityChange,
  requestedDeliveryDate,
  onDeliveryDateChange,
  dateError,
  showNotes,
  onToggleNotes,
  deliveryNotes,
  onDeliveryNotesChange,
  internalNotes,
  onInternalNotesChange,
}: {
  customers: Customer[];
  selectedCustomerId: string;
  onCustomerChange: (id: string) => void;
  preSelectedCustomerId?: string;
  priority: string;
  onPriorityChange: (p: string) => void;
  requestedDeliveryDate: string;
  onDeliveryDateChange: (date: string) => void;
  dateError: string | null;
  showNotes: boolean;
  onToggleNotes: () => void;
  deliveryNotes: string;
  onDeliveryNotesChange: (notes: string) => void;
  internalNotes: string;
  onInternalNotesChange: (notes: string) => void;
}) {
  return (
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
          onChange={(e) => onCustomerChange(e.target.value)}
          disabled={!!preSelectedCustomerId}
          className={`w-full px-3 py-3 bg-cult-surface-raised border border-cult-border rounded-cult text-body text-cult-text-primary focus:outline-none focus:ring-1 focus:ring-cult-accent/40 focus:border-cult-border-strong transition-colors ${
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
        <div className="grid grid-cols-3 gap-1.5">
          {(['normal', 'high', 'urgent'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => onPriorityChange(p)}
              className={`py-2.5 text-caption font-semibold rounded-cult capitalize transition-all ${
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
          onChange={(e) => onDeliveryDateChange(e.target.value)}
          min={getDateInputConstraints().min}
          max={getDateInputConstraints().max}
          className="w-full px-3 py-3 bg-cult-surface-raised border border-cult-border rounded-cult text-body text-cult-text-primary focus:outline-none focus:ring-1 focus:ring-cult-accent/40 focus:border-cult-border-strong transition-colors"
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
          onClick={onToggleNotes}
          className="flex items-center gap-1.5 text-caption font-medium text-cult-text-muted hover:text-cult-text-secondary transition-colors py-1"
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
                onChange={(e) => onDeliveryNotesChange(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 bg-cult-surface-raised border border-cult-border rounded-cult text-body text-cult-text-primary placeholder-cult-text-muted focus:outline-none focus:ring-1 focus:ring-cult-accent/40 resize-none"
                placeholder="Delivery instructions…"
              />
            </div>
            <div>
              <label className="text-caption text-cult-text-muted mb-1 block">Internal Notes</label>
              <textarea
                value={internalNotes}
                onChange={(e) => onInternalNotesChange(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 bg-cult-surface-raised border border-cult-border rounded-cult text-body text-cult-text-primary placeholder-cult-text-muted focus:outline-none focus:ring-1 focus:ring-cult-accent/40 resize-none"
                placeholder="Internal notes…"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CartPanel({
  cartItems,
  products,
  customerPrices,
  totalAmount,
  totalUnits,
  canSubmit,
  loading,
  onAdjustQuantity,
  onSetQuantity,
  onSetPrice,
  onToggleSample,
  onRemove,
  onResetPrice,
  onTogglePriceLock,
  onSubmit,
  onClose,
}: {
  cartItems: CartItem[];
  products: any[];
  customerPrices: Map<string, number> | null;
  totalAmount: number;
  totalUnits: number;
  canSubmit: boolean;
  loading: boolean;
  onAdjustQuantity: (index: number, delta: number) => void;
  onSetQuantity: (index: number, qty: number) => void;
  onSetPrice: (index: number, price: number) => void;
  onToggleSample: (index: number) => void;
  onRemove: (index: number) => void;
  onResetPrice: (index: number) => void;
  onTogglePriceLock: (index: number) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Cart Header — hidden on mobile (shown in parent tab bar instead) */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-cult-border hidden lg:flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-cult-text-muted" />
          <span className="text-body font-semibold text-cult-text-primary">Cart</span>
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
          <div className="flex flex-col items-center justify-center h-full px-6 text-center py-16">
            <Package className="w-10 h-10 text-cult-text-faint mb-3" />
            <p className="text-body text-cult-text-muted mb-1">Cart is empty</p>
            <p className="text-caption text-cult-text-muted">Click products to add them</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {cartItems.map((item, index) => {
              const product = products.find((p: any) => p.id === item.product_id);
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
                      {item.batch_number ? (
                        <p className="text-[10px] text-cult-text-muted flex items-center gap-1.5">
                          <span className="font-mono">{item.batch_number}</span>
                          {item.grade_code && item.grade_code !== 'UNDEFINED' && (
                            <span className="text-cult-text-secondary">{item.grade_code}</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-caption text-cult-text-muted">
                          {item.strain || product?.strain?.name || ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => onToggleSample(index)}
                        className={`p-2 rounded-cult transition-colors ${
                          item.is_sample
                            ? 'bg-cult-warning/15 text-cult-warning'
                            : 'text-cult-text-faint hover:text-cult-text-muted'
                        }`}
                        title={item.is_sample ? 'Remove sample flag' : 'Mark as sample'}
                      >
                        <Gift className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="p-2 text-cult-text-faint hover:text-cult-danger rounded-cult transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => onAdjustQuantity(index, -1)}
                      className="w-9 h-9 flex items-center justify-center bg-cult-surface border border-cult-border rounded-cult text-cult-text-secondary hover:border-cult-border-strong active:bg-cult-surface-overlay transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      step={product?.allows_fractional_quantity ? '0.25' : '1'}
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) onSetQuantity(index, val);
                      }}
                      className="flex-1 text-center px-1 py-1 bg-cult-surface border border-cult-border rounded-cult text-body font-semibold text-cult-text-primary tabular-nums focus:outline-none focus:ring-1 focus:ring-cult-accent/40 focus:border-cult-border-strong transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-caption text-cult-text-muted">
                      {product?.pricing_unit || 'unit'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAdjustQuantity(index, 1)}
                      className="w-9 h-9 flex items-center justify-center bg-cult-surface border border-cult-border rounded-cult text-cult-text-secondary hover:border-cult-border-strong active:bg-cult-surface-overlay transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Price Row */}
                  <div className="flex items-center justify-between text-caption">
                    <div className="flex items-center gap-1.5">
                      <span className="text-cult-text-faint">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) onSetPrice(index, val);
                        }}
                        disabled={item.price_locked}
                        className="w-16 px-1.5 py-1 bg-cult-surface border border-cult-border rounded-cult text-caption text-cult-text-primary tabular-nums text-right focus:outline-none focus:ring-1 focus:ring-cult-accent/40 focus:border-cult-border-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-cult-text-faint">/{product?.pricing_unit || 'unit'}</span>
                      {hasCustomPrice && (
                        <button
                          type="button"
                          onClick={() => onResetPrice(index)}
                          className="text-cult-warning hover:text-cult-warning/80 transition-colors p-1"
                          title="Reset to default price"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onTogglePriceLock(index)}
                        className={`flex items-center gap-0.5 px-1.5 py-1 rounded-cult text-[10px] transition-colors ${
                          item.price_locked
                            ? 'bg-cult-surface-overlay text-cult-text-secondary'
                            : 'text-cult-text-faint hover:text-cult-text-muted'
                        }`}
                        title={item.price_locked ? 'Unlock price' : 'Lock price'}
                      >
                        {item.price_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        <span>{item.price_locked ? 'Locked' : 'Lock'}</span>
                      </button>
                    </div>
                    <span className="font-semibold text-cult-text-primary">
                      ${lineTotal.toFixed(2)}
                    </span>
                  </div>

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
          onClick={onSubmit}
          disabled={!canSubmit}
          className="w-full py-3.5 bg-cult-text-primary text-cult-surface rounded-cult font-semibold text-body hover:bg-cult-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          className="w-full py-2.5 text-cult-text-muted hover:text-cult-text-secondary text-caption font-medium transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function NewOrderForm({ onClose, onSuccess, cloneFrom, preSelectedCustomerId, sampleMode }: NewOrderFormProps) {
  // Data state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { products, loading: productsLoading } = useOrderableProducts();
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

  // Notes expansion
  const [showNotes, setShowNotes] = useState(false);

  // Mobile tab
  const [mobileTab, setMobileTab] = useState<MobileTab>('details');

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

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const totalUnits = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const orderNumberPreview = selectedCustomer
    ? `${selectedCustomer.dispensary_code}${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`
    : null;

  const canSubmit = !!selectedCustomerId && cartItems.length > 0 && !dateError && !loading && !dataLoading && cartItems.every(item => !!item.batch_id);

  // ─── Cart Actions ────────────────────────────────────────────────────────

  function addToCart(product: any, batch?: BatchSelection, quantity?: number) {
    // When a batch is specified, match on product_id + batch_id
    // When no batch, match on product_id + no batch_id (legacy behavior)
    const existingIndex = cartItems.findIndex(item =>
      item.product_id === product.id &&
      (batch ? item.batch_id === batch.batch_id : !item.batch_id)
    );

    const addQty = quantity ?? (product.allows_fractional_quantity ? 0.25 : 1);

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: parseFloat((updated[existingIndex].quantity + addQty).toFixed(2)),
      };
      setCartItems(updated);
    } else {
      const customPrice = customerPrices?.get(product.id);
      const isSample = !!sampleMode;
      const newItem: CartItem = {
        product_id: product.id,
        product_name: product.name,
        quantity: addQty,
        unit_price: isSample ? 0 : (customPrice ?? product.price_per_unit ?? 0),
        is_sample: isSample,
        price_locked: false,
        batch_id: batch?.batch_id,
        batch_number: batch?.batch_number || null,
        strain: batch?.strain || product.strain?.name || null,
        grade_code: batch?.grade_code || null,
        grade_label: batch?.grade_label || null,
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

  function setCartPrice(index: number, price: number) {
    const updated = [...cartItems];
    updated[index] = { ...updated[index], unit_price: Math.max(0, price) };
    setCartItems(updated);
  }

  function setCartQuantity(index: number, qty: number) {
    if (qty <= 0) {
      removeFromCart(index);
      return;
    }
    const updated = [...cartItems];
    updated[index] = { ...updated[index], quantity: parseFloat(qty.toFixed(2)) };
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

  function handleDeliveryDateChange(value: string) {
    setRequestedDeliveryDate(value);
    const validation = validateDate(value);
    setDateError(validation.isValid ? null : validation.error || 'Invalid date');
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
        status: 'trimming' as const,
        batch_id: item.batch_id ?? null,
        strain: item.strain || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Fulfillment summary notification
      const batchAssigned = cartItems.filter(i => i.batch_id).length;
      const uniqueStrains = new Set(cartItems.map(i => i.strain).filter(Boolean)).size;
      const summaryParts = [`${cartItems.length} item${cartItems.length !== 1 ? 's' : ''}`];
      if (uniqueStrains > 0) summaryParts.push(`${uniqueStrains} strain${uniqueStrains !== 1 ? 's' : ''}`);
      if (batchAssigned > 0) summaryParts.push(`${batchAssigned} with batch`);
      notificationService.success(
        `Order #${orderData.order_number} created — ${summaryParts.join(', ')}`
      );

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
      <div className="flex-shrink-0 bg-cult-surface-raised border-b border-cult-border px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 lg:gap-4 min-w-0">
          <h1 className="text-body lg:text-h3 text-cult-text-primary font-semibold tracking-wide">New Order</h1>
          {sampleMode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] lg:text-caption font-semibold bg-cult-warning/15 text-cult-warning border border-cult-warning/30 rounded-cult uppercase tracking-wider">
              <Gift className="w-3 h-3" />
              Sample
            </span>
          )}
          {orderNumberPreview && (
            <span className="text-caption text-cult-text-muted font-mono hidden sm:inline">
              <span className="text-cult-text-secondary">{orderNumberPreview}</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            const hasDirtyForm = !!selectedCustomerId || cartItems.length > 0;
            if (hasDirtyForm && !window.confirm('Close order form? Unsaved changes will be lost.')) return;
            onClose();
          }}
          disabled={loading}
          className="p-2.5 text-cult-text-muted hover:text-cult-text-primary hover:bg-cult-surface-overlay rounded-cult transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Desktop: Three-Column Body (lg+) ────────────────────────────────── */}
      <div className="flex-1 hidden lg:flex min-h-0 overflow-hidden">
        {/* Left: Order Details */}
        <div className="w-72 flex-shrink-0 border-r border-cult-border bg-cult-surface overflow-y-auto">
          <OrderDetailsPanel
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            onCustomerChange={setSelectedCustomerId}
            preSelectedCustomerId={preSelectedCustomerId}
            priority={priority}
            onPriorityChange={setPriority}
            requestedDeliveryDate={requestedDeliveryDate}
            onDeliveryDateChange={handleDeliveryDateChange}
            dateError={dateError}
            showNotes={showNotes}
            onToggleNotes={() => setShowNotes(!showNotes)}
            deliveryNotes={deliveryNotes}
            onDeliveryNotesChange={setDeliveryNotes}
            internalNotes={internalNotes}
            onInternalNotesChange={setInternalNotes}
          />
        </div>

        {/* Center: Strain Catalog */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <StrainCatalog
            products={products}
            customerId={selectedCustomerId || null}
            customerName={selectedCustomer?.name || null}
            cartItems={cartItems}
            customerPrices={customerPrices}
            onAddToCart={addToCart}
          />
        </div>

        {/* Right: Cart Sidebar */}
        <div className="w-80 flex-shrink-0 border-l border-cult-border bg-cult-surface flex flex-col">
          <CartPanel
            cartItems={cartItems}
            products={products}
            customerPrices={customerPrices}
            totalAmount={totalAmount}
            totalUnits={totalUnits}
            canSubmit={canSubmit}
            loading={loading}
            onAdjustQuantity={adjustCartQuantity}
            onSetQuantity={setCartQuantity}
            onSetPrice={setCartPrice}
            onToggleSample={toggleSample}
            onRemove={removeFromCart}
            onResetPrice={resetCartPrice}
            onTogglePriceLock={togglePriceLock}
            onSubmit={handleSubmit}
            onClose={onClose}
          />
        </div>
      </div>

      {/* ── Mobile: Tabbed View (<lg) ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:hidden min-h-0 overflow-hidden">
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {mobileTab === 'details' && (
            <OrderDetailsPanel
              customers={customers}
              selectedCustomerId={selectedCustomerId}
              onCustomerChange={setSelectedCustomerId}
              preSelectedCustomerId={preSelectedCustomerId}
              priority={priority}
              onPriorityChange={setPriority}
              requestedDeliveryDate={requestedDeliveryDate}
              onDeliveryDateChange={handleDeliveryDateChange}
              dateError={dateError}
              showNotes={showNotes}
              onToggleNotes={() => setShowNotes(!showNotes)}
              deliveryNotes={deliveryNotes}
              onDeliveryNotesChange={setDeliveryNotes}
              internalNotes={internalNotes}
              onInternalNotesChange={setInternalNotes}
            />
          )}
          {mobileTab === 'products' && (
            <StrainCatalog
              products={products}
              customerId={selectedCustomerId || null}
              customerName={selectedCustomer?.name || null}
              cartItems={cartItems}
              customerPrices={customerPrices}
              onAddToCart={addToCart}
            />
          )}
          {mobileTab === 'cart' && (
            <CartPanel
              cartItems={cartItems}
              products={products}
              customerPrices={customerPrices}
              totalAmount={totalAmount}
              totalUnits={totalUnits}
              canSubmit={canSubmit}
              loading={loading}
              onAdjustQuantity={adjustCartQuantity}
              onToggleSample={toggleSample}
              onRemove={removeFromCart}
              onResetPrice={resetCartPrice}
              onTogglePriceLock={togglePriceLock}
              onSubmit={handleSubmit}
              onClose={onClose}
            />
          )}
        </div>

        {/* Mobile Bottom Tab Bar */}
        <div className="flex-shrink-0 border-t border-cult-border bg-cult-surface-raised">
          {/* Mini cart summary — show on non-cart tabs when items exist */}
          {mobileTab !== 'cart' && cartItems.length > 0 && (
            <button
              type="button"
              onClick={() => setMobileTab('cart')}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-cult-surface-overlay border-b border-cult-border"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-cult-text-secondary" />
                <span className="text-caption font-semibold text-cult-text-primary">
                  {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-body font-semibold text-cult-text-primary">
                ${totalAmount.toFixed(2)}
              </span>
            </button>
          )}

          {/* Tab buttons */}
          <div className="grid grid-cols-3">
            {([
              { tab: 'details' as MobileTab, icon: ClipboardList, label: 'Details' },
              { tab: 'products' as MobileTab, icon: Leaf, label: 'Strains' },
              { tab: 'cart' as MobileTab, icon: ShoppingCart, label: 'Cart' },
            ]).map(({ tab, icon: Icon, label }) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMobileTab(tab)}
                className={`flex flex-col items-center gap-1 py-3 transition-colors relative ${
                  mobileTab === tab
                    ? 'text-cult-text-primary'
                    : 'text-cult-text-muted'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {tab === 'cart' && cartItems.length > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 w-4 h-4 bg-cult-text-primary text-cult-surface text-[9px] font-bold rounded-full flex items-center justify-center">
                      {cartItems.length}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
                {mobileTab === tab && (
                  <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-cult-text-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
