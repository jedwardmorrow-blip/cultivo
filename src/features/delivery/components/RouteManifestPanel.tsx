import { useEffect, useMemo } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { formatCurrency, formatCurrencyShort } from '@/shared/utils/format';
import { getRouteZone, getAllZones } from '../utils';
import { formatDuration } from '../services/routing.service';
import type { CalendarOrder } from '../services/delivery.service';
import { OrderItemsExpander } from './OrderItemsExpander';
import { ReadinessBadge } from './ReadinessBadge';

interface RouteManifestPanelProps {
  date: Date;
  orders: CalendarOrder[];
  onClose: () => void;
  onSelectOrder?: (orderId: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function groupByZone(orders: CalendarOrder[]): Map<string, CalendarOrder[]> {
  const groups = new Map<string, CalendarOrder[]>();
  for (const order of orders) {
    const zone = getRouteZone(order.customer_lat, order.customer_lon);
    const existing = groups.get(zone.id) || [];
    existing.push(order);
    groups.set(zone.id, existing);
  }
  return groups;
}

function loadLabel(routeCount: number): { label: string; dotClass: string } {
  if (routeCount === 0) return { label: 'No routes', dotClass: 'bg-cult-medium-gray' };
  if (routeCount === 1) return { label: 'Light', dotClass: 'bg-cult-success' };
  if (routeCount === 2) return { label: 'Moderate', dotClass: 'bg-cult-warning' };
  return { label: 'Heavy', dotClass: 'bg-cult-danger' };
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function RouteManifestPanel({ date, orders, onClose, onSelectOrder }: RouteManifestPanelProps) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const grouped = useMemo(() => groupByZone(orders), [orders]);
  const zones = useMemo(() => getAllZones().filter(z => grouped.has(z.id)), [grouped]);

  const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalDuration = orders.reduce((sum, o) => sum + (o.cached_duration_seconds || 0), 0);
  const load = loadLabel(zones.length);

  const dayLabel = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).toUpperCase();

  const handleViewOrder = (orderId: string) => {
    onSelectOrder?.(orderId);
    onClose();
  };

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        className="fixed inset-0 bg-black/40 z-30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — right-anchored on desktop, bottom-sheet on tablet */}
      <div
        className="fixed z-40 bg-cult-near-black border-l-2 border-cult-medium-gray shadow-2xl
                   right-0 top-0 bottom-0 w-[420px] max-w-full
                   md:w-[420px]
                   flex flex-col
                   animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label={`Route manifest for ${dayLabel}`}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="p-4 border-b-2 border-cult-medium-gray bg-cult-black flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] font-semibold text-cult-white uppercase tracking-wider truncate">
                {dayLabel}
              </h2>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${load.dotClass}`} />
                  <span className="text-[11px] text-cult-lighter-gray font-medium">
                    {load.label} · {orders.length} order{orders.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                <span className="text-[11px] text-cult-light-gray font-medium">
                  {formatCurrency(totalRevenue)} total
                </span>
                {totalDuration > 0 && (
                  <span className="text-[11px] text-cult-lighter-gray">
                    ~{formatDuration(totalDuration)} est. drive
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-cult-light-gray hover:text-cult-white transition-colors rounded-sm hover:bg-cult-charcoal flex-shrink-0"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Route Manifest Body ──────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">
          {zones.length === 0 ? (
            <div className="p-8 text-center text-[12px] text-cult-light-gray">
              No orders scheduled.
            </div>
          ) : (
            zones.map((zone, routeIndex) => {
              const zoneOrders = grouped.get(zone.id) || [];
              const zoneRevenue = zoneOrders.reduce((sum, o) => sum + o.total_amount, 0);

              return (
                <div key={zone.id} className="border-b border-cult-charcoal/50">
                  {/* Route section header */}
                  <div className={`flex items-center justify-between px-4 py-2.5 ${zone.bgColor}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full ${zone.dotColor} flex-shrink-0`} />
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${zone.color} truncate`}>
                        Route {routeIndex + 1} — {zone.label}
                      </span>
                      <span className="text-[10px] text-cult-lighter-gray flex-shrink-0">
                        ({zoneOrders.length})
                      </span>
                    </div>
                    <span className="text-[11px] text-cult-light-gray font-semibold tabular-nums flex-shrink-0">
                      {formatCurrencyShort(zoneRevenue)}
                    </span>
                  </div>

                  {/* Stop rows */}
                  <div>
                    {zoneOrders.map(order => (
                      <div key={order.id} className="px-4 py-2.5 border-t border-cult-charcoal/30 hover:bg-cult-black/40 transition-colors">
                        <div className="flex items-start gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${zone.dotColor} flex-shrink-0 mt-1.5`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[12px] font-medium text-cult-white truncate">
                                {order.customer_name}
                              </span>
                              <ReadinessBadge status={order.status} />
                            </div>
                            <div className="text-[10px] text-cult-lighter-gray mt-0.5">
                              {order.order_number} · {formatCurrency(order.total_amount)}
                            </div>
                            <div className="mt-1">
                              <OrderItemsExpander orderId={order.id} onSelectOrder={onSelectOrder} />
                            </div>
                          </div>
                          {onSelectOrder && (
                            <button
                              onClick={() => handleViewOrder(order.id)}
                              className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 transition-colors flex-shrink-0 px-1.5 py-0.5 rounded hover:bg-sky-900/20"
                              title="Open order detail"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer: Zone legend + total ──────────────────────────── */}
        <div className="p-3 border-t-2 border-cult-medium-gray bg-cult-black flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {zones.map(zone => (
                <div key={zone.id} className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${zone.dotColor}`} />
                  <span className="text-[10px] text-cult-lighter-gray truncate">{zone.label}</span>
                </div>
              ))}
            </div>
            <div className="text-[12px] text-cult-white font-semibold flex-shrink-0">
              Total: <span className="text-cult-success">{formatCurrency(totalRevenue)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
