import { useState, useEffect, useRef } from 'react';
import { validateDate } from '@/lib/utils';
import { useOrderableProducts } from '@/hooks';
import * as orderFormService from '../services/orderForm.service';
import type { Customer, OrderItem, OrderFormState } from '../types';
import type { OrderableProduct } from '@/types';

export function useOrderFormState(sessionId: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { products, loading: productsLoading } = useOrderableProducts();
  const [loading, setLoading] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [dateError, setDateError] = useState<string | null>(null);

  const draftTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadCustomers();
    loadDraftOrder();
  }, []);

  useEffect(() => {
    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }
    draftTimeoutRef.current = setTimeout(() => {
      if (selectedCustomerId || orderItems.length > 0) {
        saveDraftOrder();
      }
    }, 2000);

    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
    };
  }, [selectedCustomerId, priority, requestedDeliveryDate, deliveryNotes, internalNotes, orderItems]);

  async function loadCustomers() {
    const { data } = await orderFormService.getCustomers();
    if (data) setCustomers(data);
  }


  async function loadDraftOrder() {
    const { data } = await orderFormService.getDraftOrder(sessionId);

    if (data) {
      setDraftId(data.id);
      setSelectedCustomerId(data.customer_id || '');
      setPriority(data.priority || 'normal');
      setRequestedDeliveryDate(data.requested_delivery_date || '');
      setDeliveryNotes(data.delivery_notes || '');
      setInternalNotes(data.internal_notes || '');
      setOrderItems((data.order_items as OrderItem[]) || []);
    }
  }

  async function saveDraftOrder() {
    setSavingDraft(true);
    try {
      const draftData = {
        customer_id: selectedCustomerId || null,
        priority,
        requested_delivery_date: requestedDeliveryDate || null,
        delivery_notes: deliveryNotes || null,
        internal_notes: internalNotes || null,
        order_items: orderItems,
        session_id: sessionId,
      };

      if (draftId) {
        await orderFormService.updateDraftOrder(draftId, draftData);
      } else {
        const { data } = await orderFormService.createDraftOrder(draftData);
        if (data) setDraftId(data.id);
      }
    } finally {
      setSavingDraft(false);
    }
  }

  async function clearDraft() {
    if (draftId) {
      await orderFormService.deleteDraftOrder(draftId);
      setDraftId(null);
    }
  }

  function addProductToOrder(product: OrderableProduct) {
    const existingIndex = orderItems.findIndex(item => item.product_id === product.id);

    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += (product.allows_fractional_quantity ? 0.25 : 1);
      setOrderItems(updated);
    } else {
      const newItem: OrderItem = {
        product_id: product.id,
        product_name: product.name,
        quantity: product.allows_fractional_quantity ? 0.25 : 1,
        unit_price: product.price_per_unit || 0,
        price_locked: false,
      };
      setOrderItems([...orderItems, newItem]);
    }
  }

  function updateOrderItem(index: number, field: keyof OrderItem, value: any) {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    setOrderItems(updated);
  }

  function adjustQuantity(index: number, delta: number) {
    const item = orderItems[index];
    const product = products.find(p => p.id === item.product_id);
    const step = product?.allows_fractional_quantity ? 0.25 : 1;
    const newQuantity = Math.max(step, item.quantity + (delta * step));
    updateOrderItem(index, 'quantity', parseFloat(newQuantity.toFixed(2)));
  }

  function resetToDefaultPrice(index: number) {
    const item = orderItems[index];
    const product = products.find(p => p.id === item.product_id);
    if (product) {
      updateOrderItem(index, 'unit_price', product.price_per_unit || 0);
    }
  }

  function togglePriceLock(index: number) {
    updateOrderItem(index, 'price_locked', !orderItems[index].price_locked);
  }

  function removeOrderItem(index: number) {
    if (confirm('Remove this item from the order?')) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  }

  function validateDeliveryDate(value: string) {
    const validation = validateDate(value);
    setDateError(validation.isValid ? null : validation.error || 'Invalid date');
  }

  function resetForm() {
    clearDraft();
    setSelectedCustomerId('');
    setPriority('normal');
    setRequestedDeliveryDate('');
    setDeliveryNotes('');
    setInternalNotes('');
    setOrderItems([]);
    setDateError(null);
  }

  const totalAmount = orderItems.reduce((sum, item) =>
    sum + (item.quantity * item.unit_price), 0
  );

  const totalUnits = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const canProceedToReview = () => {
    return selectedCustomerId && orderItems.length > 0 && !dateError;
  };

  return {
    customers,
    products,
    loading,
    setLoading,
    savingDraft,
    selectedCustomerId,
    setSelectedCustomerId,
    priority,
    setPriority,
    requestedDeliveryDate,
    setRequestedDeliveryDate,
    deliveryNotes,
    setDeliveryNotes,
    internalNotes,
    setInternalNotes,
    orderItems,
    setOrderItems,
    dateError,
    setDateError,
    addProductToOrder,
    updateOrderItem,
    adjustQuantity,
    resetToDefaultPrice,
    togglePriceLock,
    removeOrderItem,
    validateDeliveryDate,
    resetForm,
    clearDraft,
    totalAmount,
    totalUnits,
    canProceedToReview,
    loadCustomers,
  };
}
