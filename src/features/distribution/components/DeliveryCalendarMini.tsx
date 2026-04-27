/**
 * DeliveryCalendarMini — A Hairline mini month grid wrapped in a B Gapped
 * panel head ("Month nav · ..."). Used in the secondary column when the
 * primary panel is in map or unscheduled mode.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import { formatDateToLocal, isToday as isTodayFn, getDaysInMonthInfo } from '../constants';

interface DeliveryCalendarMiniProps {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
  ordersByDate: Map<string, CalendarOrder[]>;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  /** Optional click handler for the panel container (e.g. "click to swap
   *  primary panel back to calendar"). Day-cell clicks always preempt. */
  onClick?: () => void;
  overdueDates?: Set<string>;
}

export function DeliveryCalendarMini({
  currentDate,
  onMonthChange,
  ordersByDate,
  selectedDate,
  onSelectDate,
  onClick,
  overdueDates,
}: DeliveryCalendarMiniProps) {
  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonthInfo(currentDate);
  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const days: Array<Date | null> = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
  while (days.length < 42) days.push(null);

  const overdueCount = overdueDates ? overdueDates.size : 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--op-surface)',
        border: '1px solid var(--op-line)',
        borderRadius: 'var(--r-md)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Panel head */}
      <div
        className="flex items-baseline justify-between"
        style={{ padding: '12px 14px 8px' }}
      >
        <div className="flex items-center" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMonthChange(new Date(year, month - 1, 1));
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 2,
              cursor: 'pointer',
              color: 'var(--op-ink-3)',
            }}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span
            className="font-mono uppercase"
            style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--op-ink-3)' }}
          >
            Month nav · {monthLabel}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMonthChange(new Date(year, month + 1, 1));
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 2,
              cursor: 'pointer',
              color: 'var(--op-ink-3)',
            }}
            aria-label="Next month"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <span
          className="font-mono tabular-nums"
          style={{
            fontSize: 10,
            color: overdueCount > 0 ? 'var(--status-bad)' : 'var(--op-ink-3)',
          }}
        >
          {overdueCount > 0 ? `${overdueCount} overdue` : ''}
        </span>
      </div>

      {/* Hairline grid */}
      <div
        style={{
          margin: '0 12px 12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 1,
          background: 'var(--op-line)',
          border: '1px solid var(--op-line)',
          borderRadius: 'var(--r-sm)',
          overflow: 'hidden',
        }}
      >
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div
            key={i}
            className="font-mono uppercase text-center"
            style={{
              padding: '5px 0',
              fontSize: 8,
              letterSpacing: '0.1em',
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
              <div key={`e-${i}`} style={{ background: 'var(--op-canvas)', padding: '5px 0' }} />
            );
          }
          const dateStr = formatDateToLocal(date);
          const isSel = selectedDate === dateStr;
          const isTod = isTodayFn(date);
          const hasOrders = (ordersByDate.get(dateStr) || []).length > 0;
          const isOverdue = overdueDates?.has(dateStr) ?? false;

          const cellColor = isOverdue
            ? 'var(--status-bad)'
            : isTod || isSel
            ? 'var(--accent)'
            : hasOrders
            ? 'var(--op-ink)'
            : 'var(--op-ink-3)';

          return (
            <button
              key={dateStr}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDate(isSel ? null : dateStr);
              }}
              className="font-mono tabular-nums"
              style={{
                padding: '5px 0',
                background: 'var(--op-canvas)',
                border: 'none',
                fontSize: 10,
                color: cellColor,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
