import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Loader2, CheckCircle2, DollarSign, Search, Calendar } from 'lucide-react';
import { validateDate, getDateInputConstraints } from '../../lib/utils';

interface Product {
  id: string;
  name: string;
  type: string;
  strain: string | null;
  unit: string;
  price_per_unit: number;
  available_quantity: number;
  product_category: string;
  pricing_unit: string;
  allows_fractional_quantity: boolean;
}

interface Customer {
  id: string;
  name: string;
  dispensary_code: string;
}

export function PublicMenu() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [orderItems, setOrderItems] = useState<Map<string, number>>(new Map());
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [dispensarySearch, setDispensarySearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [productsRes, customersRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .eq('is_archived', false)
          .gt('available_quantity', 0)
          .order('product_category')
          .order('name'),
        supabase
          .from('customers')
          .select('*')
          .order('name')
      ]);

      if (productsRes.error) throw productsRes.error;
      if (customersRes.error) throw customersRes.error;

      if (productsRes.data) setProducts(productsRes.data);
      if (customersRes.data) setCustomers(customersRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function setQuantityDirect(productId: string, value: string, product: Product) {
    const newItems = new Map(orderItems);
    const qty = parseFloat(value) || 0;

    if (qty > product.available_quantity) return;

    if (qty === 0 || value === '') {
      newItems.delete(productId);
    } else {
      newItems.set(productId, qty);
    }
    setOrderItems(newItems);
  }

  async function handleSubmit() {
    if (!selectedCustomer || !deliveryDate || orderItems.size === 0) {
      alert('Please fill in all required fields and add at least one item');
      return;
    }

    const validation = validateDate(deliveryDate);
    if (!validation.isValid) {
      setDateError(validation.error || 'Invalid date');
      return;
    }

    setSubmitting(true);
    try {
      const customer = customers.find(c => c.id === selectedCustomer);
      if (!customer) throw new Error('Customer not found');

      const { data: lastOrder } = await supabase
        .from('orders')
        .select('order_number')
        .like('order_number', `${customer.dispensary_code}-%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextSequence = 1;
      if (lastOrder?.order_number) {
        const parts = lastOrder.order_number.split('-');
        if (parts.length === 2) {
          nextSequence = parseInt(parts[1]) + 1;
        }
      }

      const orderNumber = `${customer.dispensary_code}-${String(nextSequence).padStart(4, '0')}`;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: selectedCustomer,
          order_number: orderNumber,
          scheduled_delivery_date: deliveryDate,
          notes: orderNotes || null,
          status: 'pending',
          is_archived: false
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const items = Array.from(orderItems.entries()).map(([product_id, quantity]) => ({
        order_id: order.id,
        product_id,
        quantity,
        status: 'pending'
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(items);

      if (itemsError) throw itemsError;

      setOrderSuccess(true);
      setTimeout(() => {
        setOrderSuccess(false);
        setOrderItems(new Map());
        setSelectedCustomer('');
        setDeliveryDate('');
        setOrderNotes('');
        setProductSearch('');
        setDispensarySearch('');
      }, 3000);
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const categories = [
    { id: 'all', label: 'All', icon: '📦' },
    { id: 'bulk', label: 'Bulk', icon: '🔲' },
    { id: 'packaged', label: 'Packaged', icon: '📦' },
    { id: 'preroll', label: 'Pre-Rolls', icon: '🚬' },
  ];

  const filteredCustomers = dispensarySearch
    ? customers.filter(c =>
        c.name.toLowerCase().includes(dispensarySearch.toLowerCase()) ||
        c.dispensary_code.toLowerCase().includes(dispensarySearch.toLowerCase())
      )
    : customers;

  const filteredProducts = products
    .filter(p => selectedCategory === 'all' || p.product_category === selectedCategory)
    .filter(p => !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.strain && p.strain.toLowerCase().includes(productSearch.toLowerCase())) ||
      p.type.toLowerCase().includes(productSearch.toLowerCase())
    );

  const cartTotal = Array.from(orderItems.entries()).reduce((total, [productId, qty]) => {
    const product = products.find(p => p.id === productId);
    return total + (product ? product.price_per_unit * qty : 0);
  }, 0);

  const cartItemCount = orderItems.size;

  if (loading) {
    return (
      <div className="min-h-screen bg-cult-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cult-green animate-spin" />
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-cult-black flex items-center justify-center p-4">
        <div className="bg-cult-near-black border-2 border-cult-green rounded-lg p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-cult-green mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-cult-white mb-2">Order Submitted!</h2>
          <p className="text-cult-light-gray mb-6">Your order has been received and will be processed shortly.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-cult-green text-cult-black rounded-lg font-semibold hover:bg-opacity-90"
          >
            Place Another Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cult-black text-cult-white">
      <div className="sticky top-0 z-20 bg-cult-near-black border-b border-cult-medium-gray shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="/Cult Cannabis Co Final White Outline 320x320@3x.png"
              alt="Cult Cannabis Co"
              className="h-12 w-auto"
            />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-cult-white uppercase tracking-wide">
                Quick Order
              </h1>
              <p className="text-xs text-cult-light-gray">Sales Order Form</p>
            </div>
            {cartItemCount > 0 && (
              <div className="text-right">
                <div className="text-xs text-cult-light-gray">Items</div>
                <div className="text-lg font-bold text-cult-green">{cartItemCount}</div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-cult-light-gray mb-1 uppercase tracking-wide">
                Select Dispensary
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cult-light-gray pointer-events-none" />
                <input
                  type="text"
                  value={dispensarySearch}
                  onChange={(e) => setDispensarySearch(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="Search dispensaries..."
                  className="w-full pl-10 pr-4 py-3 bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-cult-white focus:outline-none focus:ring-2 focus:ring-cult-green text-base"
                />
              </div>
              {dispensarySearch && filteredCustomers.length > 0 && (
                <div className="mt-1 bg-cult-dark-gray border border-cult-medium-gray rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                  {filteredCustomers.slice(0, 5).map(customer => (
                    <button
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomer(customer.id);
                        setDispensarySearch(customer.name);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-cult-medium-gray transition-colors border-b border-cult-medium-gray last:border-b-0"
                    >
                      <div className="text-cult-white font-medium">{customer.name}</div>
                      <div className="text-xs text-cult-light-gray">{customer.dispensary_code}</div>
                    </button>
                  ))}
                </div>
              )}
              {!dispensarySearch && (
                <select
                  value={selectedCustomer}
                  onChange={(e) => {
                    setSelectedCustomer(e.target.value);
                    const customer = customers.find(c => c.id === e.target.value);
                    if (customer) setDispensarySearch(customer.name);
                  }}
                  className="w-full mt-1 px-4 py-3 bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-cult-white focus:outline-none focus:ring-2 focus:ring-cult-green text-base"
                >
                  <option value="">Choose from list...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-cult-light-gray mb-1 uppercase tracking-wide">
                <Calendar className="inline w-3 h-3 mr-1" />
                Requested Delivery Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => {
                  setDeliveryDate(e.target.value);
                  const validation = validateDate(e.target.value);
                  setDateError(validation.isValid ? null : validation.error || 'Invalid date');
                }}
                min={getDateInputConstraints().min}
                max={getDateInputConstraints().max}
                className={`w-full px-4 py-3 bg-cult-dark-gray border rounded-lg text-cult-white focus:outline-none focus:ring-2 text-base ${
                  dateError
                    ? 'border-red-500 focus:ring-red-500'
                    : deliveryDate
                    ? 'border-cult-green focus:ring-cult-green'
                    : 'border-cult-medium-gray focus:ring-cult-green'
                }`}
                placeholder="Select date"
              />
              {dateError && (
                <p className="mt-1 text-sm text-red-500">{dateError}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-cult-light-gray mb-1 uppercase tracking-wide">
                Order Notes (Optional)
              </label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Special instructions, delivery notes, etc..."
                rows={2}
                className="w-full px-4 py-3 bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-cult-white focus:outline-none focus:ring-2 focus:ring-cult-green text-base resize-none"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-cult-light-gray mb-2 uppercase tracking-wide">
              <Search className="inline w-3 h-3 mr-1" />
              Search Products
            </label>
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search by name, strain, or type..."
              className="w-full px-4 py-3 bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-cult-white focus:outline-none focus:ring-2 focus:ring-cult-green text-base"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto mt-4 pb-1">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm ${
                  selectedCategory === category.id
                    ? 'bg-cult-green text-cult-black'
                    : 'bg-cult-dark-gray text-cult-light-gray'
                }`}
              >
                {category.icon} {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="space-y-2">
          {filteredProducts.map(product => {
            const quantity = orderItems.get(product.id) || 0;
            const step = product.allows_fractional_quantity ? 0.25 : 1;
            const priceDisplay = product.pricing_unit === 'lb'
              ? `$${product.price_per_unit.toFixed(0)}/lb`
              : product.pricing_unit === 'unit'
              ? `$${product.price_per_unit.toFixed(0)}/ea`
              : `$${product.price_per_unit.toFixed(2)}/g`;

            return (
              <div
                key={product.id}
                className={`bg-cult-near-black border rounded-lg p-4 transition-all ${
                  quantity > 0 ? 'border-cult-green bg-opacity-50' : 'border-cult-medium-gray'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-cult-white text-base leading-tight mb-1">
                      {product.name}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-cult-light-gray">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {priceDisplay}
                      </span>
                      <span className={`font-medium ${
                        product.available_quantity > 10 ? 'text-cult-green' :
                        product.available_quantity > 0 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {product.available_quantity} avail
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <input
                      type="number"
                      value={quantity || ''}
                      onChange={(e) => setQuantityDirect(product.id, e.target.value, product)}
                      step={step}
                      min="0"
                      max={product.available_quantity}
                      placeholder="0"
                      inputMode="decimal"
                      className="w-20 px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-cult-white text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-cult-green focus:border-cult-green"
                    />
                  </div>
                </div>

                {quantity > 0 && (
                  <div className="mt-2 pt-2 border-t border-cult-medium-gray flex items-center justify-between">
                    <span className="text-xs text-cult-light-gray">Line Total</span>
                    <span className="text-cult-green font-bold">
                      ${(product.price_per_unit * quantity).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-cult-medium-gray mx-auto mb-4" />
              <p className="text-cult-light-gray">
                {productSearch ? 'No products match your search' : 'No products available'}
              </p>
            </div>
          )}
        </div>
      </div>

      {cartItemCount > 0 && (
        <div className="sticky bottom-0 z-20 bg-cult-near-black border-t-2 border-cult-green p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-cult-light-gray uppercase tracking-wide">Order Total</div>
              <div className="text-2xl font-bold text-cult-green">${cartTotal.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-cult-light-gray uppercase tracking-wide">Items</div>
              <div className="text-lg font-bold text-cult-white">{cartItemCount}</div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedCustomer || !deliveryDate || orderItems.size === 0}
            className="w-full py-4 bg-cult-green text-cult-black rounded-lg font-bold text-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Submit Order
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
