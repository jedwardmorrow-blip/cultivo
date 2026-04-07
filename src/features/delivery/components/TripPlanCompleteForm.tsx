import { useState } from 'react';
import { Plus, Trash2, X, CheckCircle } from 'lucide-react';
import type { TripPlanWithDetails } from '@/types';
import { completeTripPlan } from '../services/tripPlan.service';

interface TripPlanCompleteFormProps {
  plan: TripPlanWithDetails;
  onClose: () => void;
  onCompleted: () => void;
}

interface DeviationRow {
  deviation_type: string;
  description: string;
}

export function TripPlanCompleteForm({ plan, onClose, onCompleted }: TripPlanCompleteFormProps) {
  const [endTime, setEndTime] = useState(() => {
    // Default to now in local datetime-local format
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  });
  const [deviations, setDeviations] = useState<DeviationRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addDeviation() {
    setDeviations([...deviations, { deviation_type: '', description: '' }]);
  }

  function removeDeviation(i: number) {
    setDeviations(deviations.filter((_, idx) => idx !== i));
  }

  function updateDeviation(i: number, field: keyof DeviationRow, value: string) {
    setDeviations(
      deviations.map((d, idx) => (idx === i ? { ...d, [field]: value } : d))
    );
  }

  async function handleSubmit() {
    if (!endTime) {
      setError('End time is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: err } = await completeTripPlan(plan.id, {
      end_time: new Date(endTime).toISOString(),
      deviations: deviations.filter((d) => d.deviation_type && d.description),
    });
    setSaving(false);
    if (err) {
      setError('Failed to complete trip. Please try again.');
    } else {
      onCompleted();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-white font-semibold">Complete Trip</h2>
            <p className="text-gray-400 text-sm">
              Driver: {plan.driver.first_name} {plan.driver.last_name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* End time */}
          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-wide mb-1">
              Actual Return Time <span className="text-cult-danger">*</span>
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cult-success"
            />
          </div>

          {/* Route deviations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-400 text-xs uppercase tracking-wide">
                Route Deviations
              </label>
              <button
                onClick={addDeviation}
                className="flex items-center gap-1 text-xs text-cult-success hover:text-cult-success/80"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            {deviations.length === 0 && (
              <p className="text-gray-600 text-xs">No deviations — leave empty if route was followed as planned.</p>
            )}
            {deviations.map((d, i) => (
              <div key={i} className="mb-2 p-3 bg-gray-800 rounded space-y-2">
                <div className="flex gap-2">
                  <select
                    value={d.deviation_type}
                    onChange={(e) => updateDeviation(i, 'deviation_type', e.target.value)}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-cult-success"
                  >
                    <option value="">— Type —</option>
                    <option value="route_change">Route Change</option>
                    <option value="stop_added">Stop Added</option>
                    <option value="stop_skipped">Stop Skipped</option>
                    <option value="delay">Delay</option>
                    <option value="incident">Incident</option>
                    <option value="other">Other</option>
                  </select>
                  <button
                    onClick={() => removeDeviation(i)}
                    className="text-gray-500 hover:text-cult-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  placeholder="Describe the deviation…"
                  value={d.description}
                  onChange={(e) => updateDeviation(i, 'description', e.target.value)}
                  rows={2}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs resize-none focus:outline-none focus:border-cult-success"
                />
              </div>
            ))}
          </div>

          {error && <p className="text-cult-danger text-sm">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-cult-success hover:bg-cult-success/85 disabled:opacity-50 rounded-md"
          >
            <CheckCircle className="w-4 h-4" />
            {saving ? 'Saving…' : 'Complete Trip'}
          </button>
        </div>
      </div>
    </div>
  );
}
