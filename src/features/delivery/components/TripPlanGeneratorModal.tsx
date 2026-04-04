import { useEffect, useState } from 'react';
import { Plus, Trash2, X, Truck } from 'lucide-react';
import type { DeliveryDriver, DeliveryVehicle, TripPlanStop } from '@/types';
import { getActiveDrivers, getActiveVehicles, createTripPlan } from '../services/tripPlan.service';

interface StopRow {
  location_name: string;
  address: string;
  estimated_arrival: string;
  estimated_departure: string;
}

interface TripPlanGeneratorModalProps {
  onClose: () => void;
  onCreated: (planId: string) => void;
}

function localNow(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function emptyStop(): StopRow {
  return { location_name: '', address: '', estimated_arrival: '', estimated_departure: '' };
}

export function TripPlanGeneratorModal({ onClose, onCreated }: TripPlanGeneratorModalProps) {
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [vehicles, setVehicles] = useState<DeliveryVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [departureTime, setDepartureTime] = useState(localNow());
  const [anticipatedRoute, setAnticipatedRoute] = useState('');
  const [notes, setNotes] = useState('');
  const [stops, setStops] = useState<StopRow[]>([emptyStop()]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([getActiveDrivers(), getActiveVehicles()]).then(([d, v]) => {
      setDrivers(d);
      setVehicles(v);
      setLoading(false);
    });
  }, []);

  function addStop() {
    setStops([...stops, emptyStop()]);
  }

  function removeStop(i: number) {
    if (stops.length === 1) return;
    setStops(stops.filter((_, idx) => idx !== i));
  }

  function updateStop(i: number, field: keyof StopRow, value: string) {
    setStops(stops.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!driverId) errs.driver = 'Driver is required.';
    if (!vehicleId) errs.vehicle = 'Vehicle is required.';
    stops.forEach((s, i) => {
      if (!s.location_name) errs[`stop_${i}_name`] = 'Location name required.';
      if (!s.address) errs[`stop_${i}_addr`] = 'Address required.';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    const mappedStops: Omit<TripPlanStop, 'id' | 'trip_plan_id' | 'created_at'>[] = stops.map(
      (s, i) => ({
        stop_order: i + 1,
        location_name: s.location_name,
        address: s.address,
        estimated_arrival: s.estimated_arrival ? new Date(s.estimated_arrival).toISOString() : null,
        estimated_departure: s.estimated_departure
          ? new Date(s.estimated_departure).toISOString()
          : null,
        actual_arrival: null,
        actual_departure: null,
        order_ids: [],
      })
    );

    const { data, error } = await createTripPlan({
      driver_id: driverId,
      vehicle_id: vehicleId,
      departure_time: departureTime ? new Date(departureTime).toISOString() : null,
      anticipated_route: anticipatedRoute || null,
      notes: notes || null,
      stops: mappedStops,
    });

    setSaving(false);
    if (error || !data) {
      setErrors({ form: 'Failed to create trip plan. Please try again.' });
    } else {
      onCreated(data.id);
    }
  }

  const selectedDriver = drivers.find((d) => d.id === driverId);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-green-400" />
            <h2 className="text-white font-semibold">Generate Trip Plan</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Loading…</div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Driver + Vehicle */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wide mb-1">
                  Driver <span className="text-red-400">*</span>
                </label>
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="">— Select driver —</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.first_name} {d.last_name}
                      {d.fa_number ? ` (FA# ${d.fa_number})` : ''}
                    </option>
                  ))}
                </select>
                {errors.driver && <p className="text-red-400 text-xs mt-0.5">{errors.driver}</p>}
              </div>
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wide mb-1">
                  Vehicle <span className="text-red-400">*</span>
                </label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="">— Select vehicle —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {[v.year, v.make, v.model].filter(Boolean).join(' ')}
                      {v.license_plate ? ` · ${v.license_plate}` : ''}
                    </option>
                  ))}
                </select>
                {errors.vehicle && (
                  <p className="text-red-400 text-xs mt-0.5">{errors.vehicle}</p>
                )}
              </div>
            </div>

            {/* Departure + Route */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wide mb-1">
                  Departure Date/Time
                </label>
                <input
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wide mb-1">
                  Anticipated Route
                </label>
                <input
                  type="text"
                  value={anticipatedRoute}
                  onChange={(e) => setAnticipatedRoute(e.target.value)}
                  placeholder="e.g. I-5 North → Hwy 101"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            {/* Stops */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-400 text-xs uppercase tracking-wide">
                  Delivery Stops
                </label>
                <button
                  onClick={addStop}
                  className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300"
                >
                  <Plus className="w-3 h-3" />
                  Add Stop
                </button>
              </div>
              <div className="space-y-3">
                {stops.map((stop, i) => (
                  <div key={i} className="p-3 bg-gray-800 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs font-medium">Stop {i + 1}</span>
                      {stops.length > 1 && (
                        <button
                          onClick={() => removeStop(i)}
                          className="text-gray-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="text"
                          placeholder="Location name *"
                          value={stop.location_name}
                          onChange={(e) => updateStop(i, 'location_name', e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-green-500"
                        />
                        {errors[`stop_${i}_name`] && (
                          <p className="text-red-400 text-xs">{errors[`stop_${i}_name`]}</p>
                        )}
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Address *"
                          value={stop.address}
                          onChange={(e) => updateStop(i, 'address', e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-green-500"
                        />
                        {errors[`stop_${i}_addr`] && (
                          <p className="text-red-400 text-xs">{errors[`stop_${i}_addr`]}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-gray-500 text-xs">Est. Arrival</label>
                        <input
                          type="datetime-local"
                          value={stop.estimated_arrival}
                          onChange={(e) => updateStop(i, 'estimated_arrival', e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs">Est. Departure</label>
                        <input
                          type="datetime-local"
                          value={stop.estimated_departure}
                          onChange={(e) => updateStop(i, 'estimated_departure', e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-green-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wide mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes for this trip…"
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Preview chip */}
            {(selectedDriver || selectedVehicle) && (
              <div className="flex gap-2 flex-wrap">
                {selectedDriver && (
                  <span className="px-2 py-0.5 bg-gray-700 text-green-300 text-xs rounded">
                    {selectedDriver.first_name} {selectedDriver.last_name}
                    {selectedDriver.fa_number ? ` · FA# ${selectedDriver.fa_number}` : ''}
                  </span>
                )}
                {selectedVehicle && (
                  <span className="px-2 py-0.5 bg-gray-700 text-blue-300 text-xs rounded">
                    {[selectedVehicle.year, selectedVehicle.make, selectedVehicle.model]
                      .filter(Boolean)
                      .join(' ')}
                    {selectedVehicle.license_plate ? ` · ${selectedVehicle.license_plate}` : ''}
                  </span>
                )}
              </div>
            )}

            {errors.form && <p className="text-red-400 text-sm">{errors.form}</p>}
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div className="px-5 py-4 border-t border-gray-700 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md"
            >
              {saving ? 'Creating…' : 'Create Trip Plan'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
