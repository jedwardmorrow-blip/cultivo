import { List, ArrowRight, AlertCircle, UserPlus } from 'lucide-react';
import { getDateInputConstraints } from '@/lib/utils';
import type { OrderFormCustomer } from '../types';

interface OrderFormDetailsStepProps {
  customers: OrderFormCustomer[];
  selectedCustomerId: string;
  onCustomerChange: (id: string) => void;
  priority: string;
  onPriorityChange: (priority: string) => void;
  requestedDeliveryDate: string;
  onDeliveryDateChange: (date: string) => void;
  deliveryNotes: string;
  onDeliveryNotesChange: (notes: string) => void;
  internalNotes: string;
  onInternalNotesChange: (notes: string) => void;
  dateError: string | null;
  onDateValidation: (value: string) => void;
  onNext: () => void;
  onAddNewCustomer: () => void;
}

export function OrderFormDetailsStep({
  customers,
  selectedCustomerId,
  onCustomerChange,
  priority,
  onPriorityChange,
  requestedDeliveryDate,
  onDeliveryDateChange,
  deliveryNotes,
  onDeliveryNotesChange,
  internalNotes,
  onInternalNotesChange,
  dateError,
  onDateValidation,
  onNext,
  onAddNewCustomer,
}: OrderFormDetailsStepProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-cult-medium-gray pb-3">
          <List className="w-5 h-5 text-cult-green" />
          <h2 className="text-lg font-bold text-cult-white uppercase tracking-wide">
            Order Information
          </h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-cult-white mb-2">
            Dispensary *
          </label>
          <div className="flex gap-2">
            <select
              required
              value={selectedCustomerId}
              onChange={(e) => onCustomerChange(e.target.value)}
              className="flex-1 px-4 py-3 bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-cult-white focus:outline-none focus:ring-2 focus:ring-cult-green focus:border-cult-green text-base"
            >
              <option value="">Select dispensary</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onAddNewCustomer}
              className="px-4 py-3 bg-cult-green text-cult-black rounded-lg hover:bg-cult-green-bright transition-colors flex items-center gap-2 font-bold whitespace-nowrap"
              title="Add New Dispensary"
            >
              <UserPlus className="w-5 h-5" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-cult-white mb-2">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="w-full px-4 py-3 bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-cult-white focus:outline-none focus:ring-2 focus:ring-cult-green focus:border-cult-green text-base"
          >
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-cult-white mb-2">
            Requested Delivery Date
          </label>
          <input
            type="date"
            value={requestedDeliveryDate}
            onChange={(e) => {
              const value = e.target.value;
              onDeliveryDateChange(value);
              onDateValidation(value);
            }}
            min={getDateInputConstraints().min}
            max={getDateInputConstraints().max}
            className={`w-full px-4 py-3 bg-cult-dark-gray border rounded-lg text-cult-white focus:outline-none focus:ring-2 text-base ${
              dateError
                ? 'border-cult-danger focus:ring-cult-danger focus:border-cult-danger'
                : 'border-cult-medium-gray focus:ring-cult-green focus:border-cult-green'
            }`}
          />
          {dateError && (
            <p className="mt-2 text-sm text-cult-danger flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {dateError}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-cult-white mb-2">
            Delivery Notes
          </label>
          <textarea
            value={deliveryNotes}
            onChange={(e) => onDeliveryNotesChange(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-cult-white placeholder-cult-light-gray focus:outline-none focus:ring-2 focus:ring-cult-green focus:border-cult-green text-base"
            placeholder="Special delivery instructions..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-cult-white mb-2">
            Internal Notes
          </label>
          <textarea
            value={internalNotes}
            onChange={(e) => onInternalNotesChange(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-cult-white placeholder-cult-light-gray focus:outline-none focus:ring-2 focus:ring-cult-green focus:border-cult-green text-base"
            placeholder="Internal team notes..."
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="w-full py-4 bg-cult-green text-cult-black rounded-lg font-bold text-base uppercase tracking-wide hover:bg-cult-green-bright transition-colors shadow-lg flex items-center justify-center gap-2"
      >
        <span>Next: Add Products</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
