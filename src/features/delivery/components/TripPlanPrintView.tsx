import type { TripPlanWithDetails } from '@/types';

interface TripPlanPrintViewProps {
  plan: TripPlanWithDetails;
}

function fmt(dt: string | null | undefined): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TripPlanPrintView({ plan }: TripPlanPrintViewProps) {
  const driverName = `${plan.driver.first_name} ${plan.driver.last_name}`;
  const vehicleLabel = [plan.vehicle.year, plan.vehicle.make, plan.vehicle.model]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="trip-plan-print-area bg-white text-black font-sans text-sm p-8 max-w-3xl mx-auto print:p-0 print:max-w-none">
      {/* Header */}
      <div className="border-b-2 border-black pb-3 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wide">CULT Cannabis</h1>
            <p className="text-xs text-gray-500">Licensed Cannabis Distributor</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold uppercase tracking-widest">Trip Plan</h2>
            <p className="text-xs text-gray-500">R9-18-312 Compliance Document</p>
          </div>
        </div>
      </div>

      {/* Driver / Vehicle / Dates */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
        <div className="space-y-1">
          <div>
            <span className="font-semibold uppercase tracking-wide text-gray-500">Driver: </span>
            {driverName}
            <span className="ml-2 text-gray-500">FA# {plan.driver.fa_number}</span>
          </div>
          <div>
            <span className="font-semibold uppercase tracking-wide text-gray-500">Vehicle: </span>
            {vehicleLabel || '—'}
            {plan.vehicle.license_plate && (
              <span className="ml-2 text-gray-500">Plate: {plan.vehicle.license_plate}</span>
            )}
          </div>
        </div>
        <div className="space-y-1 text-right">
          <div>
            <span className="font-semibold uppercase tracking-wide text-gray-500">Departure: </span>
            {fmt(plan.departure_time)}
          </div>
          {plan.end_time && (
            <div>
              <span className="font-semibold uppercase tracking-wide text-gray-500">Return: </span>
              {fmt(plan.end_time)}
            </div>
          )}
          <div>
            <span className="font-semibold uppercase tracking-wide text-gray-500">Status: </span>
            <span className="capitalize">{plan.status}</span>
          </div>
        </div>
      </div>

      {plan.anticipated_route && (
        <div className="mb-4 text-xs">
          <span className="font-semibold uppercase tracking-wide text-gray-500">Anticipated Route: </span>
          {plan.anticipated_route}
        </div>
      )}

      {/* Stops */}
      {plan.stops.length > 0 && (
        <div className="mb-4">
          <h3 className="font-bold text-xs uppercase tracking-wide text-gray-500 border-b border-gray-300 pb-1 mb-2">
            Delivery Stops
          </h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-left">#</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Location</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Address</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Est. Arrive</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Est. Depart</th>
              </tr>
            </thead>
            <tbody>
              {plan.stops.map((stop) => (
                <tr key={stop.id}>
                  <td className="border border-gray-300 px-2 py-1">{stop.stop_order}</td>
                  <td className="border border-gray-300 px-2 py-1 font-medium">{stop.location_name}</td>
                  <td className="border border-gray-300 px-2 py-1">{stop.address}</td>
                  <td className="border border-gray-300 px-2 py-1">{fmt(stop.estimated_arrival)}</td>
                  <td className="border border-gray-300 px-2 py-1">{fmt(stop.estimated_departure)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Manifest */}
      {plan.product_manifest.length > 0 && (
        <div className="mb-4">
          <h3 className="font-bold text-xs uppercase tracking-wide text-gray-500 border-b border-gray-300 pb-1 mb-2">
            Product Manifest
          </h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-left">Product</th>
                <th className="border border-gray-300 px-2 py-1 text-left">SKU</th>
                <th className="border border-gray-300 px-2 py-1 text-right">Qty</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Unit</th>
              </tr>
            </thead>
            <tbody>
              {plan.product_manifest.map((item, i) => (
                <tr key={i}>
                  <td className="border border-gray-300 px-2 py-1">{item.product_name}</td>
                  <td className="border border-gray-300 px-2 py-1 font-mono">{item.sku}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{item.quantity}</td>
                  <td className="border border-gray-300 px-2 py-1">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {plan.notes && (
        <div className="mb-4 text-xs">
          <span className="font-semibold uppercase tracking-wide text-gray-500">Notes: </span>
          {plan.notes}
        </div>
      )}

      {/* Signature Block */}
      <div className="mt-8 pt-4 border-t border-gray-300 grid grid-cols-2 gap-8 text-xs">
        <div>
          <div className="border-b border-black pb-6 mb-1" />
          <p className="text-gray-500">Driver Signature</p>
        </div>
        <div>
          <div className="border-b border-black pb-6 mb-1" />
          <p className="text-gray-500">Authorized Dispatcher Signature</p>
        </div>
      </div>

      <style>{`
        @media print {
          .trip-plan-print-area { font-size: 10pt; }
        }
      `}</style>
    </div>
  );
}
