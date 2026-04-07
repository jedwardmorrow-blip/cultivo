import { useState } from 'react';
import { Printer, Send, X } from 'lucide-react';
import type { TripPlanWithDetails } from '@/types';
import { TripPlanPrintView } from './TripPlanPrintView';
import { dispatchTripPlan } from '../services/tripPlan.service';

interface TripPlanSignoffModalProps {
  plan: TripPlanWithDetails;
  onClose: () => void;
  onDispatched: () => void;
}

export function TripPlanSignoffModal({ plan, onClose, onDispatched }: TripPlanSignoffModalProps) {
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDispatch() {
    setDispatching(true);
    setError(null);
    const { error: err } = await dispatchTripPlan(plan.id);
    setDispatching(false);
    if (err) {
      setError('Failed to dispatch. Please try again.');
    } else {
      onDispatched();
    }
  }

  function handlePrint() {
    window.print();
  }

  const driverName = `${plan.driver.first_name} ${plan.driver.last_name}`;
  const vehicleLabel = [plan.vehicle.year, plan.vehicle.make, plan.vehicle.model]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-white font-semibold">Pre-Dispatch Sign-Off</h2>
            <p className="text-gray-400 text-sm mt-0.5">Review trip plan before dispatching</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="px-5 py-3 border-b border-gray-700 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Driver</p>
            <p className="text-white font-medium">{driverName}</p>
            <p className="text-gray-400 text-xs">FA# {plan.driver.fa_number}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Vehicle</p>
            <p className="text-white font-medium">{vehicleLabel || '—'}</p>
            {plan.vehicle.license_plate && (
              <p className="text-gray-400 text-xs">Plate: {plan.vehicle.license_plate}</p>
            )}
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Stops</p>
            <p className="text-white font-medium">{plan.stops.length}</p>
          </div>
        </div>

        {/* Print preview area */}
        <div className="flex-1 overflow-y-auto bg-white rounded-b-none rounded-t-none">
          <TripPlanPrintView plan={plan} />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-700 flex items-center justify-between gap-3">
          {error && <p className="text-cult-danger text-sm flex-1">{error}</p>}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleDispatch}
              disabled={dispatching}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-cult-success hover:bg-cult-success/85 disabled:opacity-50 rounded-md"
            >
              <Send className="w-4 h-4" />
              {dispatching ? 'Dispatching…' : 'Confirm & Dispatch'}
            </button>
          </div>
        </div>
      </div>

      {/* Print-only version: shown only when printing */}
      <div className="hidden print:block">
        <TripPlanPrintView plan={plan} />
      </div>
    </div>
  );
}
