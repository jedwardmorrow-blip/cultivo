import { useState, useRef } from 'react';
import { Package, CheckCircle2, ArrowRight, Check, Save } from 'lucide-react';
import { notificationService } from '@/services/notification.service';
import * as orderFormService from '../services/orderForm.service';
import { NewCustomerModal } from '../../customers/components/NewCustomerModal';
import { useOrderFormState } from '../hooks/useOrderFormState';
import { OrderFormDetailsStep } from './OrderFormDetailsStep';
import { OrderFormProductsStep } from './OrderFormProductsStep';
import { OrderFormCartStep } from './OrderFormCartStep';
import { OrderFormReviewStep } from './OrderFormReviewStep';
import type { MobileView } from '../types';

export function StandaloneOrderFormRefactored() {
  const [submitted, setSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [mobileView, setMobileView] = useState<MobileView>('details');
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const sessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`).current;

  const {
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
    dateError,
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
  } = useOrderFormState(sessionId);

  function handleCustomerCreated(customerId: string) {
    loadCustomers();
    setSelectedCustomerId(customerId);
    setShowNewCustomerModal(false);
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!selectedCustomerId) {
      notificationService.warning('Please select a dispensary.');
      setMobileView('details');
      return;
    }

    if (orderItems.length === 0) {
      notificationService.warning('Please add at least one item to the order.');
      setMobileView('products');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        customer_id: selectedCustomerId,
        priority,
        requested_delivery_date: requestedDeliveryDate || null,
        delivery_notes: deliveryNotes || null,
        internal_notes: internalNotes || null,
        status: 'submitted',
      };

      const itemsToSubmit = orderItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        notes: item.notes || null,
        status: 'trimming',
      }));

      const { data: order, error } = await orderFormService.createOrder(orderData, itemsToSubmit);

      if (error || !order) {
        notificationService.error('Failed to create order. Please try again.');
        return;
      }

      await clearDraft();

      setOrderNumber(order.order_number);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  }

  function handleResetForm() {
    resetForm();
    setSubmitted(false);
    setOrderNumber('');
    setMobileView('details');
  }

  const getStepStatus = (step: MobileView) => {
    switch (step) {
      case 'details':
        return selectedCustomerId ? 'complete' : 'incomplete';
      case 'products':
        return orderItems.length > 0 ? 'complete' : 'incomplete';
      case 'cart':
        return orderItems.length > 0 ? 'active' : 'incomplete';
      case 'review':
        return canProceedToReview() ? 'active' : 'incomplete';
      default:
        return 'incomplete';
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-cult-black flex items-center justify-center p-4">
        <div className="bg-cult-near-black border border-cult-medium-gray max-w-md w-full p-8 text-center rounded-lg">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-cult-green rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-cult-black" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-cult-white mb-2 uppercase tracking-wide">
            Order Submitted
          </h2>
          <p className="text-cult-light-gray mb-1">Order Number:</p>
          <p className="text-cult-green text-3xl font-bold mb-6">{orderNumber}</p>
          <p className="text-cult-light-gray mb-8">
            Your order has been received and will be processed soon.
          </p>
          <button
            onClick={handleResetForm}
            className="w-full px-6 py-4 bg-cult-green text-cult-black rounded-lg hover:bg-cult-green-bright transition-colors font-bold uppercase tracking-wide"
          >
            Submit Another Order
          </button>
        </div>
      </div>
    );
  }

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="min-h-screen bg-cult-black flex flex-col" ref={formRef}>
      <div className="sticky top-0 z-40 bg-cult-near-black border-b-2 border-cult-medium-gray shadow-lg">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Package className="w-6 h-6 text-cult-green flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-cult-white uppercase tracking-wide truncate">
                New Order
              </h1>
              <div className="flex items-center gap-2 text-xs text-cult-light-gray">
                <span>{orderItems.length} item{orderItems.length !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span className="text-cult-green font-semibold">${totalAmount.toFixed(2)}</span>
                {savingDraft && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-cult-green">
                      <Save className="w-3 h-3" />
                      Saved
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {['details', 'products', 'cart', 'review'].map((step, index) => {
                const status = getStepStatus(step as MobileView);
                const isActive = mobileView === step;
                return (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-cult-green text-cult-black ring-2 ring-cult-green ring-offset-2 ring-offset-cult-near-black'
                          : status === 'complete'
                          ? 'bg-cult-green bg-opacity-30 text-cult-green border-2 border-cult-green'
                          : 'bg-cult-dark-gray text-cult-medium-gray border-2 border-cult-medium-gray'
                      }`}
                    >
                      {status === 'complete' && !isActive ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    {index < 3 && (
                      <div
                        className={`w-4 h-0.5 ${
                          status === 'complete' ? 'bg-cult-green' : 'bg-cult-dark-gray'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { view: 'details' as MobileView, label: 'Details' },
              { view: 'products' as MobileView, label: 'Products' },
              { view: 'cart' as MobileView, label: 'Cart' },
              { view: 'review' as MobileView, label: 'Review' },
            ].map(({ view, label }) => (
              <button
                key={view}
                type="button"
                onClick={() => setMobileView(view)}
                disabled={view === 'review' && !canProceedToReview()}
                className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-all relative ${
                  mobileView === view
                    ? 'bg-cult-green text-cult-black'
                    : view === 'review' && !canProceedToReview()
                    ? 'bg-cult-dark-gray text-cult-medium-gray opacity-50 cursor-not-allowed'
                    : 'bg-cult-dark-gray text-cult-light-gray hover:bg-cult-medium-gray'
                }`}
              >
                <span className="text-xs font-semibold">{label}</span>
                {view === 'cart' && orderItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-cult-green text-cult-black text-xs font-bold rounded-full flex items-center justify-center">
                    {orderItems.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {mobileView === 'details' && (
          <OrderFormDetailsStep
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            onCustomerChange={setSelectedCustomerId}
            priority={priority}
            onPriorityChange={setPriority}
            requestedDeliveryDate={requestedDeliveryDate}
            onDeliveryDateChange={setRequestedDeliveryDate}
            deliveryNotes={deliveryNotes}
            onDeliveryNotesChange={setDeliveryNotes}
            internalNotes={internalNotes}
            onInternalNotesChange={setInternalNotes}
            dateError={dateError}
            onDateValidation={validateDeliveryDate}
            onNext={() => setMobileView('products')}
            onAddNewCustomer={() => setShowNewCustomerModal(true)}
          />
        )}

        {mobileView === 'products' && (
          <OrderFormProductsStep
            products={products}
            orderItems={orderItems}
            onAddProduct={addProductToOrder}
            onAdjustQuantity={adjustQuantity}
          />
        )}

        {mobileView === 'cart' && (
          <OrderFormCartStep
            products={products}
            orderItems={orderItems}
            totalAmount={totalAmount}
            totalUnits={totalUnits}
            canProceedToReview={canProceedToReview()}
            onUpdateItem={updateOrderItem}
            onAdjustQuantity={adjustQuantity}
            onResetToDefaultPrice={resetToDefaultPrice}
            onTogglePriceLock={togglePriceLock}
            onRemoveItem={removeOrderItem}
            onBackToProducts={() => setMobileView('products')}
            onNext={() => setMobileView('review')}
          />
        )}

        {mobileView === 'review' && (
          <OrderFormReviewStep
            selectedCustomer={selectedCustomer}
            priority={priority}
            requestedDeliveryDate={requestedDeliveryDate}
            deliveryNotes={deliveryNotes}
            internalNotes={internalNotes}
            products={products}
            orderItems={orderItems}
            totalAmount={totalAmount}
            totalUnits={totalUnits}
            dateError={dateError}
            onEditDetails={() => setMobileView('details')}
            onEditCart={() => setMobileView('cart')}
          />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-cult-near-black border-t-2 border-cult-medium-gray shadow-2xl">
        <div className="px-4 py-4">
          {mobileView === 'review' ? (
            <button
              type="button"
              disabled={loading || !canProceedToReview()}
              onClick={handleSubmit}
              className="w-full px-6 py-4 bg-cult-green text-cult-black rounded-lg hover:bg-cult-green-bright transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg uppercase tracking-wide"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-cult-black border-t-transparent"></span>
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Submit Order • ${totalAmount.toFixed(2)}
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (mobileView === 'details') {
                  if (!selectedCustomerId) {
                    notificationService.warning('Please select a dispensary first');
                    return;
                  }
                  setMobileView('products');
                } else if (mobileView === 'products') {
                  if (orderItems.length === 0) {
                    notificationService.warning('Please add at least one item');
                    return;
                  }
                  setMobileView('cart');
                } else if (mobileView === 'cart') {
                  if (canProceedToReview()) {
                    setMobileView('review');
                  } else {
                    notificationService.warning('Please complete all required fields');
                  }
                }
              }}
              className="w-full px-6 py-4 bg-cult-green text-cult-black rounded-lg hover:bg-cult-green-bright transition-all font-bold shadow-lg text-lg uppercase tracking-wide flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {showNewCustomerModal && (
        <NewCustomerModal
          onClose={() => setShowNewCustomerModal(false)}
          onCustomerCreated={handleCustomerCreated}
        />
      )}
    </div>
  );
}
