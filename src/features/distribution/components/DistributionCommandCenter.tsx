/**
 * DistributionCommandCenter — v2 container.
 *
 * Layout (1366 landscape):
 *   - Header: title + OverdueChip + KpiStrip (A Hairline)
 *   - Bento (3fr / 2fr):
 *       primary  → calendar | map | unscheduled (view-switch driven)
 *       secondary → mini-cal · routes · upstream readiness · in-production
 *                   When primary = map, mini-cal moves to secondary head
 *                   and ViewSwitch lives there as a tile.
 *                   When primary = calendar, ViewSwitch lives in the
 *                   calendar header (next to month label).
 *   - DayDetailStrip below (B Gapped card list, auto-fill columns)
 *
 * Portrait collapse: under 1100px wide the bento collapses to single column
 * (primary above secondary). The DayDetailStrip stays one column.
 */

import { useState, useCallback, useMemo } from 'react';
import { LayoutGroup, AnimatePresence, motion } from 'framer-motion';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import { getRouteZoneId } from '@/features/delivery/utils';
import { QuickDispatchModal } from '@/features/delivery/components/QuickDispatchModal';
import { PageSkeleton } from '@/shared/components';
import { useDistributionData } from '../hooks/useDistributionData';
import { useDriverAssignments } from '../hooks/useDriverAssignments';
import { type FocusedCard, formatDateToLocal } from '../constants';

import { DistributionKpiStrip } from './DistributionKpiStrip';
import { DeliveryCalendarGrid } from './DeliveryCalendarGrid';
import { DeliveryCalendarMini } from './DeliveryCalendarMini';
import { DistributionMap } from './DistributionMap';
import { DayDetailStrip } from './DayDetailStrip';
import { UnscheduledCompact, UnscheduledExpanded } from './UnscheduledPanel';
import { RouteSummaryPanel } from './RouteSummaryPanel';
import { InProductionPanel } from './InProductionPanel';
import { UpstreamReadinessPanel } from './UpstreamReadinessPanel';
import { OverdueChip } from './OverdueChip';
import { ViewSwitch, type PrimaryView } from './ViewSwitch';

const fadeIn = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
};

export function DistributionCommandCenter() {
  const data = useDistributionData();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [primaryView, setPrimaryView] = useState<PrimaryView>('calendar');
  const [docFilterActive, setDocFilterActive] = useState(false);
  const [showQuickDispatch, setShowQuickDispatch] = useState(false);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

  // Drag state
  const [draggedOrder, setDraggedOrder] = useState<CalendarOrder | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Month range
  const monthStart = useMemo(() => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return formatDateToLocal(d);
  }, [currentDate]);
  const monthEnd = useMemo(() => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return formatDateToLocal(d);
  }, [currentDate]);

  const drivers = useDriverAssignments(monthStart, monthEnd);

  // Dates with overdue documents — surfaces calendar/mini-cal --status-bad rule
  const overdueDates = useMemo(() => {
    const set = new Set<string>();
    for (const o of data.ordersWithOverdueDocs) {
      if (o.requested_delivery_date) set.add(o.requested_delivery_date);
    }
    return set;
  }, [data.ordersWithOverdueDocs]);

  // Selected day orders (drives strip + map highlight)
  const selectedDayOrders = useMemo(
    () => (selectedDate ? data.ordersByDate.get(selectedDate) || [] : []),
    [selectedDate, data.ordersByDate],
  );

  // RouteSummaryPanel orders fall back to today when no date selected
  const routeSummaryOrders = useMemo(() => {
    if (selectedDate) return selectedDayOrders;
    return data.ordersByDate.get(data.todayStr) || [];
  }, [selectedDate, selectedDayOrders, data.ordersByDate, data.todayStr]);

  // Smart date suggestions during drag
  const suggestedDates = useMemo(() => {
    if (!draggedOrder) return new Set<string>();
    const suggestions = new Set<string>();
    const draggedZoneId = getRouteZoneId(draggedOrder.customer_lat, draggedOrder.customer_lon);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const scored: Array<{ dateStr: string; score: number }> = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      if (d < now) continue;
      const dateStr = formatDateToLocal(d);
      const dayOrders = data.ordersByDate.get(dateStr) || [];
      let score = 0;
      const dayZoneIds = new Set(dayOrders.map((o) => getRouteZoneId(o.customer_lat, o.customer_lon)));
      if (dayZoneIds.has(draggedZoneId) && dayOrders.length > 0) score += 3;
      if (draggedOrder.preferred_delivery_day) {
        const dow = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][d.getDay()];
        if (dow === draggedOrder.preferred_delivery_day.toLowerCase()) score += 2;
      }
      if (dayOrders.length === 0) score += 1;
      else if (dayOrders.length <= 3) score += 0.5;
      if (score >= 2) scored.push({ dateStr, score });
    }
    scored.sort((a, b) => b.score - a.score);
    scored.slice(0, 3).forEach((s) => suggestions.add(s.dateStr));
    return suggestions;
  }, [draggedOrder, currentDate, data.ordersByDate]);

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleSelectDate = useCallback((date: string | null) => {
    setSelectedDate(date);
    setDocFilterActive(false);
    setHighlightedOrderId(null);
    if (date) setPrimaryView('calendar'); // mini-cal click swaps back
  }, []);

  const handleShippingTodayClick = useCallback(() => {
    setSelectedDate(data.todayStr);
    setDocFilterActive(false);
    setPrimaryView('calendar');
  }, [data.todayStr]);

  const handleOverdueChipClick = useCallback(() => {
    setDocFilterActive((v) => !v);
    setSelectedDate(null);
  }, []);

  const handleDocsPendingClick = useCallback(() => {
    setDocFilterActive((prev) => !prev);
    if (!docFilterActive) setSelectedDate(null);
  }, [docFilterActive]);

  const handleUnscheduledClick = useCallback(() => {
    setPrimaryView((v) => (v === 'unscheduled' ? 'calendar' : 'unscheduled'));
  }, []);

  const handlePinClick = useCallback((orderId: string) => {
    setHighlightedOrderId(orderId);
    const el = document.getElementById(`order-${orderId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, order: CalendarOrder) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', order.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(formatDateToLocal(date));
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDate(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, date: Date) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverDate(null);
      if (draggedOrder) {
        await data.updateDeliveryDate(draggedOrder.id, formatDateToLocal(date));
        setDraggedOrder(null);
        data.reload();
      }
    },
    [draggedOrder, data],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedOrder(null);
    setDragOverDate(null);
  }, []);

  const _focusedCard: FocusedCard = useMemo(() => {
    if (primaryView === 'map') return 'map';
    if (primaryView === 'unscheduled') return 'unscheduled';
    return null;
  }, [primaryView]);

  if (data.loading) return <PageSkeleton variant="table" />;

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div onDragEnd={handleDragEnd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header: title (left) + overdue chip + kpi strip (right) */}
      <header
        className="distribution-header"
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: 24,
          alignItems: 'center',
        }}
      >
        <div>
          <div
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              color: 'var(--op-ink-3)',
              marginBottom: 4,
            }}
          >
            Cultivo · Operations
          </div>
          <h1
            className="font-sans"
            style={{
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: '-0.005em',
              color: 'var(--op-ink)',
              margin: 0,
            }}
          >
            Distribution
          </h1>
        </div>

        <div
          className="distribution-header-right"
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: 24,
            alignItems: 'center',
          }}
        >
          <OverdueChip
            count={data.docsOverdue}
            active={docFilterActive}
            onClick={handleOverdueChipClick}
          />
          <DistributionKpiStrip
            shippingToday={data.shippingToday}
            docsPending={data.docsPending}
            docsOverdue={data.docsOverdue}
            unscheduledCount={data.unscheduledCount}
            monthRevenue={data.monthRevenue}
            todayZones={data.todayZones}
            docFilterActive={docFilterActive}
            shippingTodayActive={selectedDate === data.todayStr}
            onShippingTodayClick={handleShippingTodayClick}
            onDocsPendingClick={handleDocsPendingClick}
            onUnscheduledClick={handleUnscheduledClick}
          />
        </div>
      </header>

      {/* Bento (3fr / 2fr) */}
      <LayoutGroup>
        <div className="distribution-bento">
          {/* Primary panel */}
          <div className="distribution-primary">
            <AnimatePresence mode="wait" initial={false}>
              {primaryView === 'map' ? (
                <motion.div key="panel-map" {...fadeIn} style={{ height: '100%' }}>
                  <DistributionMap
                    expanded
                    orders={data.allOrders}
                    selectedDayOrders={selectedDayOrders}
                    onPinClick={handlePinClick}
                  />
                </motion.div>
              ) : primaryView === 'unscheduled' ? (
                <motion.div key="panel-unscheduled" {...fadeIn} style={{ height: '100%' }}>
                  <UnscheduledExpanded
                    orders={data.unscheduledOrders}
                    onDragStart={handleDragStart}
                  />
                </motion.div>
              ) : (
                <motion.div key="panel-calendar" {...fadeIn} style={{ height: '100%' }}>
                  <DeliveryCalendarGrid
                    currentDate={currentDate}
                    onMonthChange={setCurrentDate}
                    ordersByDate={data.ordersByDate}
                    selectedDate={selectedDate}
                    onSelectDate={handleSelectDate}
                    onQuickDispatch={() => setShowQuickDispatch(true)}
                    draggedOrder={draggedOrder}
                    dragOverDate={dragOverDate}
                    suggestedDates={suggestedDates}
                    overdueDates={overdueDates}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    dimmed={docFilterActive}
                    getDriverName={(date) => drivers.getDriverForDate(date)?.staffName || null}
                    headerExtras={
                      <ViewSwitch active={primaryView} onChange={setPrimaryView} compact />
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Secondary panel */}
          <aside className="distribution-secondary">
            {primaryView === 'map' && (
              <>
                <DeliveryCalendarMini
                  currentDate={currentDate}
                  onMonthChange={setCurrentDate}
                  ordersByDate={data.ordersByDate}
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                  overdueDates={overdueDates}
                />
                {/* ViewSwitch tile: present in map mode */}
                <div
                  style={{
                    background: 'var(--op-surface)',
                    border: '1px solid var(--op-line)',
                    borderRadius: 'var(--r-md)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    className="font-mono uppercase"
                    style={{ fontSize: 9, letterSpacing: '0.16em', color: 'var(--op-ink-3)' }}
                  >
                    Primary view
                  </span>
                  <ViewSwitch active={primaryView} onChange={setPrimaryView} compact />
                </div>
              </>
            )}

            {primaryView === 'unscheduled' && (
              <DeliveryCalendarMini
                currentDate={currentDate}
                onMonthChange={setCurrentDate}
                ordersByDate={data.ordersByDate}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                overdueDates={overdueDates}
              />
            )}

            {primaryView === 'calendar' && (
              <DistributionMap
                expanded={false}
                orders={data.allOrders}
                selectedDayOrders={selectedDayOrders}
                onPinClick={handlePinClick}
                onClick={() => setPrimaryView('map')}
              />
            )}

            {primaryView !== 'unscheduled' && (
              <UnscheduledCompact
                orders={data.unscheduledOrders}
                isActive={false}
                onClick={() => setPrimaryView('unscheduled')}
                onDragStart={handleDragStart}
              />
            )}

            <RouteSummaryPanel
              orders={routeSummaryOrders}
              driversForDate={drivers.getDriversForDate(selectedDate || data.todayStr)}
              driverList={drivers.drivers}
              selectedDate={selectedDate || data.todayStr}
              onAssignDriver={drivers.assignDriver}
            />

            <UpstreamReadinessPanel />

            <InProductionPanel />
          </aside>
        </div>
      </LayoutGroup>

      {/* Day Detail Strip */}
      <DayDetailStrip
        date={selectedDate}
        orders={selectedDayOrders}
        readinessMap={data.readinessMap}
        driversForDate={drivers.getDriversForDate(selectedDate || '')}
        driverList={drivers.drivers}
        onAssignDriver={drivers.assignDriver}
        onReload={data.reload}
        highlightedOrderId={highlightedOrderId}
        docFilterMode={docFilterActive}
        docFilterOrders={docFilterActive ? data.ordersWithOverdueDocs : undefined}
      />

      {/* Quick Dispatch Modal */}
      <QuickDispatchModal
        isOpen={showQuickDispatch}
        onClose={() => setShowQuickDispatch(false)}
        onDispatched={data.reload}
      />

      {/* Container layout + portrait collapse */}
      <style>{`
        .distribution-bento {
          display: grid;
          grid-template-columns: 3fr 2fr;
          gap: 16px;
        }
        .distribution-primary,
        .distribution-secondary {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        @media (max-width: 1100px) {
          .distribution-bento {
            grid-template-columns: 1fr;
          }
          .distribution-header {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .distribution-header-right {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
