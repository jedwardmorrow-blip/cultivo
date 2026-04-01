import { List, UserPlus, AlertCircle } from 'lucide-react';
import { Customer } from '@/types';
import { validateDate, getDateInputConstraints } from '@/lib/utils';

interface OrderFormDetailsProps {
  customers: Customer[];
  selectedCustomerId: string;
  priority: string;
  requestedDeliveryDate: string;
  deliveryNotes: string;
  internalNotes: string;
  dateError: string | null;
  onCustomerChange: (customerId: string) => void;
  onPriorityChange: (priority: string) => void;
  onDeliveryDateChange: (date: string) => void;
  onDeliveryNotesChange: (notes: string) => void;
  onInternalNotesChange: (notes: string) => void;
  onDateError: (error: string | null) => void;
  onNewCustomer: () => void;
  onNext: () => void;
}

export function OrderFormDetails({
  customers,
  selectedCustomerId,
  priority,
  requestedDeliveryDate,
  deliveryNotes,
  internalNotes,
  dateError,
  onCustomerChange,
  onPriorityChange,
  onDeliveryDateChange,
  onDeliveryNotesChange,
  onInternalNotesChange,
  onDateError,
  onNewCustomer,
  onNext,
}: OrderFormDetailsProps) {
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
              onClick={onNewCustomer}
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
          <label className="block text-sm font-medium text-cult-off-white mb-2">
            Requested Delivery Date
          </label>
          <input
            type="date"
            value={requestedDeliveryDate}
            onChange={(e) => {
              const value = e.target.value;
              onDeliveryDateChange(value);
              const validation = validateDate(value);
              onDateError(validation.isValid ? null : validation.error || 'Invalid date');
            }}
            min={getDateInputConstraints().min}
            max={getDateInputConstraints().max}
            className={`w-full px-4 py-3 bg-cult-black border rounded-cult text-cult-off-white focus:outline-none focus:ring-2 text-base transition-all duration-300 ${
              dateError
                ? 'border-cult-danger focus:ring-cult-danger/50'
                : 'border-cult-charcoal focus:ring-cult-danger/50 focus:border-cult-danger'
            }`}
          />
          {dateError && (
            <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
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
      </button>
    </div>
  );
}
