import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { validateDate, getDateInputConstraints } from '@/lib/utils';
import { useOrderableProducts } from '@/hooks';
import { formatProductPrice } from '@/services';
import { X, Plus, Trash2, Search, ChevronDown } from 'lucide-react';
import type { OrderableProduct } from '@/types';
// import { Calendar, SearchableSelect } from './common';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  dispensary_code: string;
}


interface OrderItem {
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

export function NewOrderForm({ onClose, onSuccess, cloneFrom }: {
  onClose: () => void;
  onSuccess: () => void;
  cloneFrom?: any;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { products, loading: productsLoading, error: productsError } = useOrderableProducts();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [dateError, setDateError] = useState<string | null>(null);
  const [productSearchTerms, setProductSearchTerms] = useState<{ [key: number]: string }>({});
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const dropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

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

  async function loadCustomers() {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    if (data) {
      setCustomers(data);
      if (cloneFrom && data.length > 0) {
        prefillFromClone(data);
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
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('product_id, quantity, unit_price')
      .eq('order_id', cloneFrom.id);
    if (itemsData && itemsData.length > 0) {
      setOrderItems(itemsData.map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })));
    }
  }

  function addOrderItem() {
    setOrderItems([...orderItems, {
      product_id: '',
      quantity: 0,
      unit_price: 0,
    }]);
  }

  function updateOrderItem(index: number, field: keyof OrderItem, value: any) {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updated[index].unit_price = product.price_per_unit || 0;
        updated[index].product_name = product.name;
      }
    }

    setOrderItems(updated);
  }

  function removeOrderItem(index: number) {
    setOrderItems(orderItems.filter((_, i) => i !== index));
    const newSearchTerms = { ...productSearchTerms };
    delete newSearchTerms[index];
    setProductSearchTerms(newSearchTerms);
    if (activeDropdown === index) {
      setActiveDropdown(null);
    }
  }

  function getFilteredProducts(searchTerm: string) {
    if (!searchTerm) return [];
    return products.filter(product => {
      const strainName = product.strain?.name || '';
      const typeName = product.type?.name || '';
      return (
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        strainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        typeName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (activeDropdown !== null) {
        const dropdownElement = dropdownRefs.current[activeDropdown];
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setActiveDropdown(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  const totalAmount = orderItems.reduce((sum, item) => {
    const product = products.find(p => p.id === item.product_id);
    if (product?.pricing_unit === 'lb') {
      return sum + (item.quantity * item.unit_price);
    }
    return sum + (item.quantity * item.unit_price);
  }, 0);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const orderNumberPreview = selectedCustomer
    ? `${selectedCustomer.dispensary_code}${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const dateValidation = validateDate(requestedDeliveryDate);
    if (!dateValidation.isValid) {
      setDateError(dateValidation.error || 'Invalid date');
      return;
    }

    setLoading(true);

    try {
      const customer = customers.find(c => c.id === selectedCustomerId);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: selectedCustomerId,
          priority,
          requested_delivery_date: requestedDeliveryDate || null,
          delivery_notes: deliveryNotes || null,
          internal_notes: internalNotes || null,
          status: 'submitted',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const itemsToInsert = orderItems.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        notes: item.notes || null,
        status: 'trimming',
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      onSuccess();
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4"
    >
      <div
        className="bg-cult-near-black border-2 border-cult-medium-gray rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-cult-near-black border-b-2 border-cult-medium-gray px-6 py-5 flex items-center justify-between z-10 rounded-t-lg">
          <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wider">New Order</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-cult-light-gray hover:text-cult-white transition-colors p-2 hover:bg-cult-dark-gray rounded-lg disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {dataLoading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cult-green border-t-transparent mb-4"></div>
            <p className="text-cult-light-gray">Loading customers and products...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {orderNumberPreview && (
            <div className="bg-cult-dark-gray border border-cult-green rounded-lg p-4">
              <p className="text-sm text-cult-light-gray mb-1">Order Number Preview</p>
              <p className="text-2xl font-bold text-cult-green tracking-wide">{orderNumberPreview}</p>
              <p className="text-xs text-cult-medium-gray mt-1">
                Format: {selectedCustomer?.dispensary_code} (Dispensary) + {new Date().toISOString().slice(2, 10).replace(/-/g, '')} (Date: YYMMDD)
              </p>
            </div>
          )}

          <div className="border-b border-cult-medium-gray pb-6">
            <h3 className="text-lg font-semibold text-cult-white mb-4 uppercase tracking-wide">Order Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-cult-white mb-2">
                Dispensary *
              </label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-4 py-3 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:outline-none focus:ring-2 focus:ring-cult-green focus:border-cult-green"
              >
                <option value="">Select dispensary...</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - Code: {customer.dispensary_code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-cult-white mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-3 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:outline-none focus:ring-2 focus:ring-cult-green focus:border-cult-green"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-cult-white mb-2">
                Requested Delivery Date
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
                className="w-full px-4 py-3 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:outline-none focus:ring-2 focus:ring-cult-green focus:border-cult-green"
              />
              {dateError && <p className="text-red-500 text-sm mt-1">{dateError}</p>}
            </div>
            </div>
          </div>

          <div className="border-b border-cult-medium-gray pb-6">
            <h3 className="text-lg font-semibold text-cult-white mb-4 uppercase tracking-wide">Additional Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cult-white mb-2">
                  Delivery Notes
                </label>
            <textarea
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white placeholder-cult-light-gray focus:outline-none focus:ring-2 focus:ring-cult-green focus:border-cult-green"
              placeholder="Special delivery instructions..."
            />
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-white mb-2">
                  Internal Notes
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white placeholder-cult-light-gray focus:outline-none focus:ring-2 focus:ring-cult-green focus:border-cult-green"
                  placeholder="Internal team notes..."
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-cult-white uppercase tracking-wide">
                Order Items *
              </h3>
              <button
                type="button"
                onClick={addOrderItem}
                className="flex items-center px-4 py-2 bg-cult-green text-cult-black rounded-lg hover:bg-cult-green-bright transition-all text-sm font-bold shadow-lg hover:shadow-cult-green/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {orderItems.map((item, index) => {
                const selectedProduct = products.find(p => p.id === item.product_id);
                const lineTotal = item.quantity * item.unit_price;

                return (
                  <div key={index} className="bg-cult-dark-gray border border-cult-medium-gray rounded-lg p-4 hover:border-cult-green transition-colors">
                    <div className="flex flex-col lg:flex-row gap-3">
                      <div className="flex-1 min-w-0" ref={(el) => (dropdownRefs.current[index] = el)}>
                        <label className="block text-xs font-medium text-cult-light-gray mb-2">
                          Product *
                        </label>
                        <div className="relative">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cult-light-gray w-4 h-4" />
                            <input
                              type="text"
                              value={productSearchTerms[index] || ''}
                              onChange={(e) => {
                                setProductSearchTerms({ ...productSearchTerms, [index]: e.target.value });
                                setActiveDropdown(index);
                              }}
                              onFocus={() => setActiveDropdown(index)}
                              placeholder="Search for product..."
                              className="w-full pl-10 pr-10 py-2 bg-cult-black border border-cult-medium-gray rounded text-cult-white placeholder-cult-light-gray focus:outline-none focus:ring-2 focus:ring-cult-green focus:border-cult-green"
                            />
                            {item.product_id && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateOrderItem(index, 'product_id', '');
                                  setProductSearchTerms({ ...productSearchTerms, [index]: '' });
                                  setActiveDropdown(index);
                                }}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cult-light-gray hover:text-cult-white"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            {!item.product_id && (
                              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cult-light-gray w-4 h-4" />
                            )}
                          </div>
                          {activeDropdown === index && (() => {
                            const searchTerm = productSearchTerms[index] || '';
                            const filteredProducts = getFilteredProducts(searchTerm);
                            return (
                              <div className="absolute z-50 w-full mt-1 bg-cult-black border border-cult-medium-gray rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                                {productsError ? (
                                  <div className="p-4 text-center text-red-400 text-sm">
                                    Error loading products
                                  </div>
                                ) : !searchTerm ? (
                                  <div className="p-4 text-center text-cult-light-gray text-sm">
                                    Type to search products...
                                  </div>
                                ) : filteredProducts.length === 0 ? (
                                  <div className="p-4 text-center text-cult-light-gray text-sm">
                                    No products found
                                  </div>
                                ) : (
                                  <>
                                    <div className="px-3 py-2 text-xs text-cult-light-gray border-b border-cult-medium-gray bg-cult-near-black">
                                      {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}
                                    </div>
                                    {filteredProducts.map(product => {
                                      const priceDisplay = formatProductPrice(product);
                                      const strainName = product.strain?.name || 'N/A';
                                      const isSelected = item.product_id === product.id;
                                      return (
                                        <button
                                          key={product.id}
                                          type="button"
                                          onClick={() => {
                                            updateOrderItem(index, 'product_id', product.id);
                                            setProductSearchTerms({ ...productSearchTerms, [index]: `${product.name} - ${strainName}` });
                                            setActiveDropdown(null);
                                          }}
                                          className={`w-full px-3 py-2.5 text-left hover:bg-cult-dark-gray transition-colors border-b border-cult-medium-gray last:border-b-0 ${
                                            isSelected ? 'bg-cult-green bg-opacity-10' : ''
                                          }`}
                                        >
                                          <div className="text-sm text-cult-white font-medium">
                                            {product.name}
                                          </div>
                                          <div className="text-xs text-cult-light-gray mt-0.5">
                                            {strainName} • {priceDisplay}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        {item.product_id && !productSearchTerms[index] && (() => {
                          const selectedProd = products.find(p => p.id === item.product_id);
                          if (selectedProd) {
                            const strainName = selectedProd.strain?.name || 'N/A';
                            setProductSearchTerms({ ...productSearchTerms, [index]: `${selectedProd.name} - ${strainName}` });
                          }
                          return null;
                        })()}
                      </div>
                      <div className="w-full lg:w-36">
                        <label className="block text-xs font-medium text-cult-light-gray mb-2">
                          Quantity * {selectedProduct && `(${selectedProduct.pricing_unit})`}
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step={selectedProduct?.allows_fractional_quantity ? "0.01" : "1"}
                          value={item.quantity || ''}
                          onChange={(e) => updateOrderItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-3 py-2.5 bg-cult-near-black border border-cult-medium-gray rounded text-cult-white placeholder-cult-light-gray focus:outline-none focus:ring-2 focus:ring-cult-green focus:border-cult-green text-sm"
                        />
                      </div>
                      <div className="w-full lg:w-36">
                        <label className="block text-xs font-medium text-cult-light-gray mb-2">
                          Unit Price *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={item.unit_price || ''}
                          onChange={(e) => updateOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full px-3 py-2.5 bg-cult-near-black border border-cult-medium-gray rounded text-cult-white placeholder-cult-light-gray focus:outline-none focus:ring-2 focus:ring-cult-green focus:border-cult-green text-sm"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeOrderItem(index)}
                          className="w-full lg:w-auto px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-cult-near-black rounded transition-colors flex items-center justify-center gap-2"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="lg:hidden">Remove</span>
                        </button>
                      </div>
                    </div>
                    {item.quantity > 0 && item.unit_price > 0 && (
                      <div className="mt-3 pt-3 border-t border-cult-medium-gray flex justify-between items-center text-sm">
                        <span className="text-cult-light-gray">Line Total:</span>
                        <span className="text-cult-green font-semibold">${lineTotal.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {orderItems.length === 0 && (
                <div className="border-2 border-dashed border-cult-medium-gray rounded-lg p-12 text-center">
                  <div className="flex justify-center mb-4">
                    <Plus className="w-12 h-12 text-cult-medium-gray" />
                  </div>
                  <p className="text-cult-light-gray text-sm mb-2">No items added yet</p>
                  <p className="text-cult-medium-gray text-xs">Click "Add Item" above to start building your order</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-cult-dark-gray border-t-2 border-cult-green rounded-lg p-4 mt-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-cult-light-gray uppercase tracking-wide mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-cult-green">${totalAmount.toFixed(2)}</p>
              </div>
              <div className="text-right text-xs text-cult-light-gray">
                <p>{orderItems.length} item{orderItems.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 border-2 border-cult-medium-gray text-cult-white rounded-lg hover:bg-cult-dark-gray hover:border-cult-green transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || orderItems.length === 0 || !selectedCustomerId || dataLoading}
              className="px-6 py-3 bg-cult-green text-cult-black rounded-lg hover:bg-cult-green-bright transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-cult-green/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-cult-black border-t-transparent"></span>
                  Creating Order...
                </span>
              ) : (
                'Create Order'
              )}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
