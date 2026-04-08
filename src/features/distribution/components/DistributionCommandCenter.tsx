import { useState, useCallback, useMemo } from 'react';
import { Zap } from 'lucide-react';
import { LayoutGroup, AnimatePresence, motion } from 'framer-motion';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import { getRouteZoneId } from '@/features/delivery/utils';
import { QuickDispatchModal } from '@/features/delivery/components/QuickDispatchModal';
import { PageSkeleton } from '@/shared/components';
import { useDistributionData } from '../hooks/useDistributionData';
import { useDriverAssignments } from '../hooks/useDriverAssignments';
import {
  type FocusedCard,
  springTransition,
  fadeInVariants,
  formatDateToLocal,
} from '../constants';

import { DistributionKpiStrip } from './DistributionKpiStrip';
import { DeliveryCalendarGrid } from './DeliveryCalendarGrid';
import { DeliveryCalendarMini } from './DeliveryCalendarMini';
import { DistributionMap } from './DistributionMap';
import { DayDetailStrip } from './DayDetailStrip';
import { UnscheduledCompact, UnscheduledExpanded } from './UnscheduledPanel';
import { RouteSummaryPanel } from './RouteSummaryPanel';

export function DistributionCommandCenter() {
  // ─── Data ──────────────────────────────────────────────────────────────
  const data = useDistributionData();

  // ─── UI State ──────────────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [focusedCard, setFocusedCard] = useState<FocusedCard>(null);
  const [docFilterActive, setDocFilterActive] = useState(false);
  const [showQuickDispatch, setShowQuickDispatch] = useState(false);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

  // Drag state
  const [draggedOrder, setDraggedOrder] = useState<CalendarOrder | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Month range for driver assignments
  const monthStart = useMemo(() => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return formatDateToLocal(d);
  }, [currentDate]);
  const monthEnd = useMemo(() => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return formatDateToLocal(d);
  }, [currentDate]);

  const drivers = useDriverAssignments(monthStart, monthEnd);

  // ─── Derived ───────────────────────────────────────────────────────────

  const selectedDayOrders = useMemo(
    () => (selectedDate ? data.ordersByDate.get(selectedDate) || [] : []),
    [selectedDate, data.ordersByDate],
  );

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
    const { year, month } = { year: currentDate.getFullYear(), month: currentDate.getMonth() };
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
        const dow = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d.getDay()];
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

  // ─── Handlers ──────────────────────────────────────────────────────────

  const toggleCard = useCallback((card: FocusedCard) => {
    setFocusedCard((prev) => (prev === card ? null : card));
  }, []);

  const handleSelectDate = useCallback((date: string | null) => {
    setSelectedDate(date);
    setDocFilterActive(false);
    setHighlightedOrderId(null);
  }, []);

  const handleShippingTodayClick = useCallback(() => {
    setSelectedDate(data.todayStr);
    setDocFilterActive(false);
  }, [data.todayStr]);

  const handleDocsPendingClick = useCallback(() => {
    setDocFilterActive((prev) => !prev);
    if (!docFilterActive) setSelectedDate(null);
  }, [docFilterActive]);

  const handleUnscheduledClick = useCallback(() => {
    toggleCard('unscheduled');
  }, [toggleCard]);

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

  // ─── Render ────────────────────────────────────────────────────────────

  if (data.loading) {
    return <PageSkeleton variant="table" />;
  }

  return (
    <div onDragEnd={handleDragEnd}>
      {/* KPI Strip */}
      <DistributionKpiStrip
        shippingToday={data.shippingToday}
        docsPending={data.docsPending}
        docsOverdue={data.docsOverdue}
        unscheduledCount={data.unscheduledCount}
        monthRevenue={data.monthRevenue}
        todayZones={data.todayZones}
        docFilterActive={docFilterActive}
        onShippingTodayClick={handleShippingTodayClick}
        onDocsPendingClick={handleDocsPendingClick}
        onUnscheduledClick={handleUnscheduledClick}
      />

      {/* Quick Dispatch — always accessible */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowQuickDispatch(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl
            bg-[#E8E0D4]/10 text-[#E8E0D4] border border-[#E8E0D4]/20
            hover:bg-[#E8E0D4]/15 hover:border-[#E8E0D4]/30 transition-all
            shadow-[0_0_12px_rgba(232,224,212,0.06)]"
        >
          <Zap className="w-3.5 h-3.5" />
          Quick Dispatch
        </button>
      </div>

      {/* Main Bento Layout */}
      <LayoutGroup>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Primary Panel (3/5) */}
          <div className="lg:col-span-3" style={{ minHeight: '500px' }}>
            <AnimatePresence mode="wait" initial={false}>
              {focusedCard === 'map' ? (
                <motion.div
                  key="panel-map"
                  initial={fadeInVariants.initial}
                  animate={fadeInVariants.animate}
                  exit={fadeInVariants.exit}
                  transition={fadeInVariants.transition}
                  className="h-full"
                >
                  <DistributionMap
                    expanded
                    orders={data.allOrders}
                    selectedDayOrders={selectedDayOrders}
                    onPinClick={handlePinClick}
                  />
                </motion.div>
              ) : focusedCard === 'unscheduled' ? (
                <motion.div
                  key="panel-unscheduled"
                  initial={fadeInVariants.initial}
                  animate={fadeInVariants.animate}
                  exit={fadeInVariants.exit}
                  transition={fadeInVariants.transition}
                  className="h-full"
                >
                  <UnscheduledExpanded
                    orders={data.unscheduledOrders}
                    onDragStart={handleDragStart}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="panel-calendar"
                  initial={fadeInVariants.initial}
                  animate={fadeInVariants.animate}
                  exit={fadeInVariants.exit}
                  transition={fadeInVariants.transition}
                  className="h-full"
                >
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
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    dimmed={docFilterActive}
                    getDriverName={(date) => drivers.getDriverForDate(date)?.staffName || null}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Secondary Panel (2/5) */}
          <div className="lg:col-span-2 space-y-3">
            {focusedCard === 'map' ? (
              // Calendar mini when map is expanded
              <DeliveryCalendarMini
                currentDate={currentDate}
                onMonthChange={setCurrentDate}
                ordersByDate={data.ordersByDate}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                onClick={() => toggleCard('map')}
              />
            ) : (
              // Map compact when calendar is primary
              <DistributionMap
                expanded={false}
                orders={data.allOrders}
                selectedDayOrders={selectedDayOrders}
                onPinClick={handlePinClick}
                onClick={() => toggleCard('map')}
              />
            )}

            {focusedCard !== 'unscheduled' && (
              <UnscheduledCompact
                orders={data.unscheduledOrders}
                isActive={false}
                onClick={() => toggleCard('unscheduled')}
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
          </div>
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
        docFilterOrders={docFilterActive ? data.ordersNeedingDocs : undefined}
      />

      {/* Quick Dispatch Modal */}
      <QuickDispatchModal
        isOpen={showQuickDispatch}
        onClose={() => setShowQuickDispatch(false)}
        onDispatched={data.reload}
      />
    </div>
  );
}
