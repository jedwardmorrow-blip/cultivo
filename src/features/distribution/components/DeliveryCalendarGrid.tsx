/**
 * DeliveryCalendarGrid — A Hairline marquee.
 *
 * The calendar is a hairline grid (7 columns × 6 rows of day cells +
 * a row of day-of-week labels). Cells share a single outer container
 * divided by 1px --op-line hairlines. Per-cell state surfaces via 2px
 * left rules ONLY (--accent for today, --accent + 1px --op-line-strong
 * for dragover, --status-bad for overdue, --op-line-strong for suggest).
 * No fills, no scale transforms.
 *
 * Header sits above the hairline grid: month label on the left, calendar
 * nav (‹ Today ›) on the right; optional Quick Dispatch sits next to nav.
 */

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { getRouteZoneId } from '@/features/delivery/utils';
import { formatCurrencyShort } from '@/shared/utils/format';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import {
  ZONE_HEX,
  formatDateToLocal,
  isToday as isTodayFn,
  getDaysInMonthInfo,
} from '../constants';
import type { ViewSwitch } from './ViewSwitch';

interface DeliveryCalendarGridProps {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
  ordersByDate: Map<string, CalendarOrder[]>;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  onQuickDispatch: () => void;
  draggedOrder: CalendarOrder | null;
  dragOverDate: string | null;
  suggestedDates: Set<string>;
  overdueDates?: Set<string>;
  onDragOver: (e: React.DragEvent, date: Date) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
  dimmed?: boolean;
  getDriverName?: (date: string) => string | null;
  /** Optional element rendered to the right of the month label
   *  (e.g. ViewSwitch chips). */
  headerExtras?: React.ReactNode;
}

type DayState = 'today' | 'dragover' | 'overdue' | 'suggest' | 'other-month' | 'normal';

interface DayCellProps {
  date: Date | null;
  monthIndex: number;
  orders: CalendarOrder[];
  state: DayState;
  driverName: string | null;
  onSelect: () => void;
  onDragOver: (e: React.DragEvent, date: Date) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
}

function DayCell({
  date,
  monthIndex,
  orders,
  state,
  driverName,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop,
}: DayCellProps) {
  const totalRevenue = useMemo(
    () => orders.reduce((s, o) => s + o.total_amount, 0),
    [orders],
  );

  // Distinct zones present on this day (for the dot row)
  const zoneColors = useMemo(() => {
    const seen = new Map<string, string>();
    for (const o of orders) {
      const zid = getRouteZoneId(o.customer_lat, o.customer_lon);
      if (!seen.has(zid)) seen.set(zid, ZONE_HEX[zid] || ZONE_HEX.other);
    }
    return Array.from(seen.values()).slice(0, 3);
  }, [orders]);

  if (!date) {
    return <div style={{ background: 'var(--op-canvas)', minHeight: 86 }} />;
  }

  const isOtherMonth = state === 'other-month';
  const numColor = isOtherMonth
    ? 'var(--op-ink-4)'
    : state === 'today'
    ? 'var(--op-ink)'
    : state === 'dragover'
    ? 'var(--accent)'
    : 'var(--op-ink-2)';

  const stateShadow =
    state === 'today'
      ? 'inset 2px 0 0 var(--accent)'
      : state === 'dragover'
      ? 'inset 2px 0 0 var(--accent), inset 0 0 0 1px var(--op-line-strong)'
      : state === 'overdue'
      ? 'inset 2px 0 0 var(--status-bad)'
      : state === 'suggest'
      ? 'inset 2px 0 0 var(--op-line-strong)'
      : undefined;

  return (
    <div
      onDragOver={(e) => onDragOver(e, date)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, date)}
      onClick={orders.length > 0 ? onSelect : undefined}
      style={{
        background: 'var(--op-canvas)',
        minHeight: 86,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        position: 'relative',
        cursor: orders.length > 0 ? 'pointer' : 'default',
        boxShadow: stateShadow,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: 12, color: numColor }}
        >
          {date.getDate()}
        </span>
        {driverName && orders.length > 0 && (
          <span
            className="font-mono uppercase truncate"
            style={{ fontSize: 8, letterSpacing: '0.08em', color: 'var(--op-ink-3)', maxWidth: 60 }}
            title={driverName}
          >
            {driverName.split(' ')[0]}
          </span>
        )}
      </div>

      {orders.length > 0 && (
        <div className="flex" style={{ gap: 3 }}>
          {zoneColors.map((color, i) => (
            <span
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                display: 'inline-block',
              }}
            />
          ))}
        </div>
      )}

      {orders.length > 0 && (
        <span
          className="font-mono tabular-nums"
          style={{
            fontSize: 11,
            color: 'var(--op-ink)',
            marginTop: 'auto',
          }}
        >
          {orders.length} stop{orders.length !== 1 ? 's' : ''}
        </span>
      )}

      {orders.length > 0 && (
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: 10, color: 'var(--op-ink-3)' }}
        >
          {formatCurrencyShort(totalRevenue)}
        </span>
      )}

      {state === 'dragover' && (
        <span
          className="font-mono uppercase"
          style={{
            position: 'absolute',
            bottom: 6,
            right: 8,
            fontSize: 9,
            letterSpacing: '0.1em',
            color: 'var(--accent)',
          }}
        >
          drop here
        </span>
      )}
    </div>
  );
}

export function DeliveryCalendarGrid({
  currentDate,
  onMonthChange,
  ordersByDate,
  selectedDate,
  onSelectDate,
  onQuickDispatch,
  draggedOrder: _draggedOrder,
  dragOverDate,
  suggestedDates,
  overdueDates,
  onDragOver,
  onDragLeave,
  onDrop,
  dimmed,
  getDriverName,
  headerExtras,
}: DeliveryCalendarGridProps) {
  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonthInfo(currentDate);
  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekNumber = getWeekNumber(currentDate);

  const days: Array<Date | null> = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
  // Pad to 42 cells (6 rows × 7 cols)
  while (days.length < 42) days.push(null);

  return (
    <div style={{ opacity: dimmed ? 0.6 : 1, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '0 4px 12px' }}
      >
        <div className="flex items-center" style={{ gap: 12 }}>
          <h2
            className="font-sans"
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--op-ink)',
              letterSpacing: '-0.005em',
              margin: 0,
            }}
          >
            {monthLabel} · Week {weekNumber}
          </h2>
          {headerExtras}
        </div>

        <div className="flex items-center" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={onQuickDispatch}
            className="font-mono uppercase tracking-wider flex items-center"
            style={{
              gap: 4,
              padding: '4px 10px',
              fontSize: 9,
              letterSpacing: '0.1em',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              borderRadius: 'var(--r-xs)',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <Zap className="w-2.5 h-2.5" />
            Quick Dispatch
          </button>
          <div className="flex items-center" style={{ gap: 4 }}>
            <CalNavButton onClick={() => onMonthChange(new Date(year, month - 1, 1))} ariaLabel="Previous month">
              <ChevronLeft className="w-3 h-3" />
            </CalNavButton>
            <CalNavButton
              onClick={() => onMonthChange(new Date())}
              ariaLabel="Today"
              wide
            >
              Today
            </CalNavButton>
            <CalNavButton onClick={() => onMonthChange(new Date(year, month + 1, 1))} ariaLabel="Next month">
              <ChevronRight className="w-3 h-3" />
            </CalNavButton>
          </div>
        </div>
      </div>

      {/* Hairline grid: dow row + 6 weeks of day cells */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 1,
          background: 'var(--op-line)',
          border: '1px solid var(--op-line)',
          borderRadius: 'var(--r-md)',
          overflow: 'hidden',
        }}
      >
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div
            key={d}
            className="font-mono uppercase"
            style={{
              padding: '8px 10px',
              fontSize: 9,
              letterSpacing: '0.14em',
              color: 'var(--op-ink-3)',
              background: 'var(--op-canvas)',
            }}
          >
            {d}
          </div>
        ))}

        {days.map((date, i) => {
          if (!date) {
            return (
              <DayCell
                key={`empty-${i}`}
                date={null}
                monthIndex={month}
                orders={[]}
                state="other-month"
                driverName={null}
                onSelect={() => undefined}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              />
            );
          }
          const dateStr = formatDateToLocal(date);
          const dayOrders = ordersByDate.get(dateStr) || [];
          const isSelected = selectedDate === dateStr;
          const isToday = isTodayFn(date);
          const isDragOver = dragOverDate === dateStr;
          const isOverdue = overdueDates?.has(dateStr) ?? false;
          const isSuggested = suggestedDates.has(dateStr);

          let state: DayState = 'normal';
          if (isDragOver) state = 'dragover';
          else if (isToday) state = 'today';
          else if (isOverdue) state = 'overdue';
          else if (isSelected) state = 'today'; // selection mirrors today rule
          else if (isSuggested) state = 'suggest';

          return (
            <DayCell
              key={dateStr}
              date={date}
              monthIndex={month}
              orders={dayOrders}
              state={state}
              driverName={getDriverName?.(dateStr) || null}
              onSelect={() => onSelectDate(isSelected ? null : dateStr)}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function CalNavButton({
  children,
  onClick,
  ariaLabel,
  wide,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="font-mono"
      style={{
        background: 'transparent',
        border: '1px solid var(--op-line)',
        color: 'var(--op-ink-2)',
        fontSize: 11,
        padding: wide ? '4px 10px' : '4px 6px',
        borderRadius: 'var(--r-xs)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {children}
    </button>
  );
}

function getWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNumber = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}
