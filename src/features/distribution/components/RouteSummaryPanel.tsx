/**
 * RouteSummaryPanel — C Hybrid (gapped outer card, hairline interior rows).
 * Per-zone driver assignment rows: one row per zone touched today, with
 * driver name + ETA window + 2px-left --accent rule on the active zone
 * (the zone with the most stops; or the first zone if tied).
 */

import { useMemo } from 'react';
import { formatDuration } from '@/features/delivery/services/routing.service';
import { formatCurrency } from '@/lib/utils';
import { getRouteZoneId } from '@/features/delivery/utils';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import type { DeliveryDriver } from '@/types';
import type { DriverAssignment } from '../constants';
import { ZONE_HEX, ZONE_LABELS, ZONE_TOKEN } from '../constants';

interface RouteSummaryPanelProps {
  orders: CalendarOrder[];
  driversForDate: DriverAssignment[];
  driverList: DeliveryDriver[];
  selectedDate: string | null;
  onAssignDriver: (date: string, staffId: string, zoneId: string) => void;
}

export function RouteSummaryPanel({
  orders,
  driversForDate,
  driverList,
  selectedDate,
  onAssignDriver,
}: RouteSummaryPanelProps) {
  const zoneBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; durationSec: number }>();
    orders.forEach((o) => {
      const zid = getRouteZoneId(o.customer_lat, o.customer_lon);
      const cur = map.get(zid) || { count: 0, durationSec: 0 };
      cur.count += 1;
      cur.durationSec += o.cached_duration_seconds || 0;
      map.set(zid, cur);
    });
    return Array.from(map.entries())
      .map(([zoneId, agg]) => ({ zoneId, count: agg.count, durationSec: agg.durationSec }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  const totalRevenue = useMemo(() => orders.reduce((s, o) => s + o.total_amount, 0), [orders]);

  const dateLabel = useMemo(() => {
    if (!selectedDate) return "Routes";
    const d = new Date(selectedDate + 'T00:00:00');
    return `Routes · ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
  }, [selectedDate]);

  const driverByZone = new Map(driversForDate.map((d) => [d.zoneId, d]));
  const activeZoneId = zoneBreakdown[0]?.zoneId;
  const unassignedZoneCount = zoneBreakdown.filter((z) => !driverByZone.get(z.zoneId)).length;

  return (
    <div
      style={{
        background: 'var(--op-surface)',
        border: '1px solid var(--op-line)',
        borderRadius: 'var(--r-md)',
      }}
    >
      {/* Panel head */}
      <div
        className="flex items-baseline justify-between"
        style={{ padding: '12px 14px 10px' }}
      >
        <span
          className="font-mono uppercase"
          style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--op-ink-3)' }}
        >
          {dateLabel}
        </span>
        <span
          className="font-mono tabular-nums"
          style={{
            fontSize: 10,
            color: unassignedZoneCount > 0 ? 'var(--status-bad)' : 'var(--op-ink-3)',
          }}
        >
          {orders.length} stop{orders.length !== 1 ? 's' : ''}
          {unassignedZoneCount > 0 ? ` · ${unassignedZoneCount} unassigned` : ` · ${formatCurrency(totalRevenue)}`}
        </span>
      </div>

      {/* Hairline interior rows */}
      {orders.length === 0 ? (
        <div
          className="text-center"
          style={{
            padding: '14px',
            fontSize: 11,
            color: 'var(--op-ink-3)',
            borderTop: '1px solid var(--op-line)',
          }}
        >
          No deliveries
        </div>
      ) : (
        zoneBreakdown.map((z, i) => {
          const zoneDriver = driverByZone.get(z.zoneId);
          const isActive = z.zoneId === activeZoneId;
          const isLast = i === zoneBreakdown.length - 1;
          const tokenName = ZONE_TOKEN[z.zoneId] || 'other';

          return (
            <div
              key={z.zoneId}
              style={{
                padding: '10px 14px',
                borderBottom: isLast ? 'none' : '1px solid var(--op-line)',
                borderTop: i === 0 ? '1px solid var(--op-line)' : undefined,
                boxShadow: isActive ? 'inset 2px 0 0 var(--accent)' : undefined,
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <span
                className={`zone-dot ${tokenName}`}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: ZONE_HEX[z.zoneId],
                  flexShrink: 0,
                }}
              />

              <div className="min-w-0">
                <div className="font-sans" style={{ fontSize: 12, color: 'var(--op-ink)' }}>
                  {ZONE_LABELS[z.zoneId] || z.zoneId}
                </div>
                <div
                  className="font-mono tabular-nums"
                  style={{ fontSize: 11, color: 'var(--op-ink-3)' }}
                >
                  {z.count} stop{z.count !== 1 ? 's' : ''}
                  {z.durationSec > 0 ? ` · ~${formatDuration(z.durationSec)}` : ''}
                </div>
              </div>

              {selectedDate ? (
                <select
                  value={zoneDriver?.staffId || ''}
                  onChange={(e) => onAssignDriver(selectedDate, e.target.value, z.zoneId)}
                  className="font-sans"
                  style={{
                    fontSize: 11,
                    padding: '3px 6px',
                    background: 'var(--op-canvas)',
                    border: '1px solid var(--op-line)',
                    borderRadius: 'var(--r-xs)',
                    color: zoneDriver
                      ? 'var(--op-ink-2)'
                      : 'var(--status-warn)',
                    fontStyle: zoneDriver ? 'normal' : 'italic',
                    minWidth: 110,
                    outline: 'none',
                  }}
                >
                  <option value="">unassigned</option>
                  {driverList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.first_name} {d.last_name}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className="font-sans"
                  style={{
                    fontSize: 11,
                    color: zoneDriver ? 'var(--op-ink-2)' : 'var(--op-ink-4)',
                    fontStyle: zoneDriver ? 'normal' : 'italic',
                  }}
                >
                  {zoneDriver?.staffName || 'unassigned'}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
