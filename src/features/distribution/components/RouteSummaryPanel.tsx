import { useMemo } from 'react';
import { Truck } from 'lucide-react';
import { formatDuration } from '@/features/delivery/services/routing.service';
import { formatCurrency } from '@/lib/utils';
import { getRouteZoneId } from '@/features/delivery/utils';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import type { DriverAssignment } from '../constants';
import { GLASS, GLASS_HOVER, ZONE_HEX, ZONE_LABELS } from '../constants';

interface RouteSummaryPanelProps {
  orders: CalendarOrder[];
  driver: DriverAssignment | null;
  staffList: { id: string; display_name?: string; first_name?: string }[];
  selectedDate: string | null;
  onAssignDriver: (date: string, staffId: string) => void;
}

export function RouteSummaryPanel({
  orders,
  driver,
  staffList,
  selectedDate,
  onAssignDriver,
}: RouteSummaryPanelProps) {
  const zoneBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const zid = getRouteZoneId(o.customer_lat, o.customer_lon);
      map.set(zid, (map.get(zid) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([zoneId, count]) => ({ zoneId, count }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  const totalDuration = useMemo(() => orders.reduce((s, o) => s + (o.cached_duration_seconds || 0), 0), [orders]);
  const totalRevenue = useMemo(() => orders.reduce((s, o) => s + o.total_amount, 0), [orders]);

  const dateLabel = useMemo(() => {
    if (!selectedDate) return "Today's Routes";
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, [selectedDate]);

  return (
    <div className={`${GLASS} ${GLASS_HOVER} p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <Truck className="w-3.5 h-3.5 text-teal-400/60" />
        <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">{dateLabel}</span>
      </div>

      {orders.length === 0 ? (
        <div className="text-[10px] text-white/20 text-center py-2">No deliveries</div>
      ) : (
        <>
          {/* Zone breakdown */}
          <div className="space-y-1 mb-2">
            {zoneBreakdown.map((z) => (
              <div key={z.zoneId} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: ZONE_HEX[z.zoneId] || '#A6A6A6' }} />
                  <span className="text-white/50">{ZONE_LABELS[z.zoneId] || z.zoneId}</span>
                </div>
                <span className="text-white/30">{z.count} stop{z.count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>

          {/* Summary line */}
          <div className="text-[10px] text-white/25 mb-2">
            {totalDuration > 0 && <span>~{formatDuration(totalDuration)} · </span>}
            <span>{formatCurrency(totalRevenue)}</span>
          </div>

          {/* Driver assignment */}
          {selectedDate && (
            <div className="pt-2 border-t border-white/[0.06]">
              <label className="text-[9px] text-white/25 uppercase tracking-wider font-medium">Driver</label>
              <select
                value={driver?.staffId || ''}
                onChange={(e) => {
                  if (e.target.value && selectedDate) onAssignDriver(selectedDate, e.target.value);
                }}
                className="w-full mt-1 px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[11px] text-white focus:outline-none focus:border-white/[0.15]"
              >
                <option value="">Unassigned</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.display_name || s.first_name}</option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
    </div>
  );
}
