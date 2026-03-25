import { Truck, MapPin } from 'lucide-react';
import { formatCurrencyShort } from '@/shared/utils/format';
import type { DeliveryDayData } from '../hooks/useRevenuePipeline';

// ─── Delivery Load Balancer ─────────────────────────────────────────────────
// Shows Mon-Fri columns with revenue bars + route dot indicators.
// Click a day to filter the strain queue below to that day's orders.

interface Props {
  days: DeliveryDayData[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  weekLabel?: string;
}

function routeIndicator(count: number) {
  if (count === 0) return null;
  const color = count >= 3 ? 'bg-red-400' : count === 2 ? 'bg-amber-400' : 'bg-emerald-400';
  const label = count >= 3 ? 'Heavy' : count === 2 ? 'Moderate' : 'Light';

  return (
    <div className="flex items-center gap-1.5" title={`${count} route${count !== 1 ? 's' : ''} — ${label}`}>
      {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
        <div key={i} className={`w-2 h-2 rounded-full ${color}`} />
      ))}
      {count > 4 && <span className="text-xs text-gray-500">+{count - 4}</span>}
    </div>
  );
}

export function DeliveryLoadBalancer({ days, selectedDate, onSelectDate, weekLabel }: Props) {
  const maxRevenue = Math.max(...days.map(d => d.totalRevenue), 1);

  function handleClick(date: string) {
    onSelectDate(selectedDate === date ? null : date);
  }

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-cult p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-cult bg-sky-500/10 border border-sky-500/20">
            <Truck className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Delivery Load</div>
            <div className="text-sm text-gray-400">{weekLabel || 'This week'} &middot; click a day to filter</div>
          </div>
        </div>

        {/* Route legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-gray-500">1 route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs text-gray-500">2 routes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-xs text-gray-500">3+ routes</span>
          </div>
        </div>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-5 gap-3">
        {days.map(day => {
          const isSelected = selectedDate === day.date;
          const barHeight = day.totalRevenue > 0 ? Math.max((day.totalRevenue / maxRevenue) * 100, 8) : 0;

          return (
            <button
              key={day.date}
              onClick={() => handleClick(day.date)}
              className={`relative flex flex-col items-center rounded-cult p-3 transition-all duration-200 border ${
                isSelected
                  ? 'bg-white/5 border-white/20 ring-1 ring-white/10'
                  : day.isToday
                    ? 'bg-sky-500/5 border-sky-500/20 hover:bg-sky-500/10'
                    : day.isPast
                      ? 'bg-gray-800/30 border-gray-700/30 hover:bg-gray-800/50'
                      : 'bg-cult-dark-gray/50 border-cult-medium-gray/50 hover:bg-cult-dark-gray'
              }`}
            >
              {/* Day label */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-xs font-semibold uppercase ${
                  day.isToday ? 'text-sky-400' : day.isPast ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {day.dayLabel}
                </span>
                {day.isToday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                )}
              </div>
              <span className={`text-xs mb-3 ${day.isPast ? 'text-gray-600' : 'text-gray-500'}`}>
                {day.dateLabel}
              </span>

              {/* Revenue bar */}
              <div className="w-full h-16 flex items-end justify-center mb-2">
                {barHeight > 0 ? (
                  <div
                    className={`w-full max-w-[3rem] rounded-t transition-all duration-300 ${
                      day.isPast ? 'bg-gray-700' : 'bg-gradient-to-t from-sky-600 to-sky-400'
                    }`}
                    style={{ height: `${barHeight}%` }}
                  />
                ) : (
                  <div className="text-xs text-gray-600">—</div>
                )}
              </div>

              {/* Revenue label */}
              <span className={`text-sm font-bold tabular-nums ${
                day.totalRevenue > 0
                  ? (day.isPast ? 'text-gray-500' : 'text-white')
                  : 'text-gray-700'
              }`}>
                {day.totalRevenue > 0 ? formatCurrencyShort(day.totalRevenue) : '$0'}
              </span>

              {/* Order count */}
              <span className="text-xs text-gray-500 mt-0.5">
                {day.orders.length} order{day.orders.length !== 1 ? 's' : ''}
              </span>

              {/* Route indicators */}
              <div className="mt-2 h-3 flex items-center">
                {routeIndicator(day.routeCount)}
              </div>

              {/* Today marker */}
              {day.isToday && (
                <div className="absolute -top-px left-0 right-0 h-0.5 bg-sky-400 rounded-t-cult" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail strip */}
      {selectedDate && (() => {
        const day = days.find(d => d.date === selectedDate);
        if (!day || day.orders.length === 0) return null;
        return (
          <div className="mt-3 pt-3 border-t border-cult-medium-gray/50">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                {day.dayLabel} {day.dateLabel} — {day.orders.length} orders, {day.routeCount} route{day.routeCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {day.orders.map(o => (
                <div
                  key={o.orderId}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-cult-dark-gray rounded-cult border border-cult-medium-gray/50 text-xs"
                >
                  <span className="text-gray-400 font-mono">{o.orderNumber}</span>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-300">{o.customerName}</span>
                  <span className="text-gray-500">·</span>
                  <span className="text-white font-semibold">{formatCurrencyShort(o.revenue)}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                    o.status === 'delivered' || o.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : o.status === 'ready_for_delivery'
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : o.status === 'processing'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {o.status === 'ready_for_delivery' ? 'Staged' : o.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
