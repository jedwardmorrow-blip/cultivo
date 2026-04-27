/**
 * OrderReadinessCard — collapsed state is B Gapped (single card with
 * customer name, zone dot + meta row, and a docs pill row). Expanded
 * state is C Hybrid: header summary line ("60 / 60 · ready to load"),
 * doc chips ABOVE the line list, two-column hairline line list (no
 * per-line bars, no per-line stage dots).
 *
 * Per-zone left rule (2px) replaces the legacy thick zone-tinted border;
 * --status-bad rule replaces it when overdue.
 */

import { useState, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { getRouteZone } from '@/features/delivery/utils';
import { sendDocument } from '@/features/delivery/services/dispatch.service';
import {
  fetchOrderDispatchItems,
  type OrderLineItem,
  type DispatchItemStatus,
} from '@/features/delivery/hooks/useOrderFulfillment';
import { supabase } from '@/lib/supabase';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import type { OrderReadiness } from '../constants';
import { ZONE_HEX, ZONE_TOKEN } from '../constants';
import { FulfillmentLineItem } from './FulfillmentLineItem';
import { InventoryDrawer } from './InventoryDrawer';

// ─── Doc pill ─────────────────────────────────────────────────────────────

function DocPill({
  label,
  state,
  orderId,
  orderNumber,
  docType,
  onSent,
}: {
  label: string;
  state: 'sent' | 'pending' | 'overdue';
  orderId: string;
  orderNumber: string;
  docType: 'invoice' | 'coa' | 'manifest';
  onSent?: () => void;
}) {
  const [sending, setSending] = useState(false);

  async function handleSend(e: React.MouseEvent) {
    e.stopPropagation();
    setSending(true);
    await sendDocument(orderId, orderNumber, docType);
    setSending(false);
    onSent?.();
  }

  const color =
    state === 'sent'
      ? 'var(--status-ok)'
      : state === 'overdue'
      ? 'var(--status-bad)'
      : 'var(--op-ink-3)';
  const borderColor =
    state === 'sent'
      ? 'rgba(110,170,141,0.4)'
      : state === 'overdue'
      ? 'rgba(197,106,106,0.5)'
      : 'var(--op-line)';

  if (state === 'sent') {
    return (
      <span
        className="font-mono uppercase"
        style={{
          padding: '3px 8px',
          border: `1px solid ${borderColor}`,
          borderRadius: 'var(--r-xs)',
          fontSize: 9,
          letterSpacing: '0.1em',
          color,
          background: 'var(--op-canvas)',
        }}
      >
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSend}
      disabled={sending}
      className={`font-mono uppercase inline-flex items-center ${state === 'overdue' ? 'animate-pulse' : ''}`}
      style={{
        gap: 4,
        padding: '3px 8px',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--r-xs)',
        fontSize: 9,
        letterSpacing: '0.1em',
        color,
        background: 'var(--op-canvas)',
        cursor: 'pointer',
        opacity: sending ? 0.5 : 1,
      }}
    >
      <Send className={`w-2.5 h-2.5 ${sending ? 'animate-spin' : ''}`} />
      {label}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

interface OrderReadinessCardProps {
  order: CalendarOrder;
  readiness: OrderReadiness;
  highlighted?: boolean;
  onSendDoc?: () => void;
}

export function OrderReadinessCard({ order, readiness, highlighted, onSendDoc }: OrderReadinessCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([]);
  const [dispatchItems, setDispatchItems] = useState<DispatchItemStatus[]>([]);
  const [loadingLineItems, setLoadingLineItems] = useState(false);
  const [selectedLineItem, setSelectedLineItem] = useState<OrderLineItem | null>(null);

  const zone = getRouteZone(order.customer_lat, order.customer_lon);
  const tokenName = ZONE_TOKEN[zone.id] || 'other';

  // Aggregate progress (single mono summary line)
  const allReady = readiness.itemsAllocated >= readiness.itemsTotal && readiness.allDocsSent;
  const progressState: 'full' | 'partial' | 'empty' | 'blocked' = readiness.hasOverdueDoc
    ? 'blocked'
    : readiness.itemsAllocated >= readiness.itemsTotal
    ? 'full'
    : readiness.itemsAllocated > 0
    ? 'partial'
    : 'empty';
  const progressColor =
    progressState === 'full'
      ? 'var(--status-ok)'
      : progressState === 'partial'
      ? 'var(--accent)'
      : progressState === 'blocked'
      ? 'var(--status-bad)'
      : 'var(--op-ink-3)';
  const progressLabel =
    progressState === 'full'
      ? `${readiness.itemsAllocated} / ${readiness.itemsTotal} · ready to load`
      : progressState === 'blocked'
      ? `${readiness.itemsAllocated} / ${readiness.itemsTotal} · cannot dispatch`
      : `${readiness.itemsAllocated} / ${readiness.itemsTotal}`;

  // Card state: overdue dominates highlighted/expanded for left-rule color
  const cardLeftRule = readiness.hasOverdueDoc
    ? 'inset 2px 0 0 var(--status-bad)'
    : highlighted
    ? 'inset 2px 0 0 var(--accent)'
    : undefined;

  // Load line items when expanded
  const loadLineItems = useCallback(async () => {
    setLoadingLineItems(true);
    try {
      const { data, error } = await supabase
        .from('v_production_queue_by_order')
        .select(
          `
          order_id, order_number, order_item_id, customer_name,
          strain_name, format_label, quantity,
          units_assigned, units_remaining, urgency,
          requested_delivery_date, scheduled_delivery_date,
          unit_price, subtotal, weight_per_unit_g, line_demand_g, is_sample,
          batch_number, batch_quality_grade, batch_grade_code, batch_grade_color
          `,
        )
        .eq('order_id', order.id)
        .order('units_remaining', { ascending: false });

      if (error) throw error;

      const { data: allItems } = await supabase
        .from('order_items')
        .select(
          `id, order_id, quantity, strain, status, products!inner(name, net_weight)`,
        )
        .eq('order_id', order.id);

      const viewMap = new Map((data || []).map((d: any) => [d.order_item_id, d]));

      const items: OrderLineItem[] = (allItems || []).map((item: any) => {
        const viewRow = viewMap.get(item.id);
        if (viewRow) {
          return {
            order_id: viewRow.order_id,
            order_number: viewRow.order_number,
            order_item_id: viewRow.order_item_id,
            customer_name: viewRow.customer_name,
            strain_name: viewRow.strain_name,
            format_label: viewRow.format_label,
            quantity: viewRow.quantity,
            units_assigned: viewRow.units_assigned,
            units_remaining: viewRow.units_remaining,
            urgency: viewRow.urgency,
            requested_delivery_date: viewRow.requested_delivery_date,
            scheduled_delivery_date: viewRow.scheduled_delivery_date,
            unit_price: viewRow.unit_price,
            subtotal: viewRow.subtotal,
            weight_per_unit_g: viewRow.weight_per_unit_g,
            line_demand_g: viewRow.line_demand_g,
            is_sample: viewRow.is_sample ?? false,
            batch_id: null,
            batch_number: viewRow.batch_number,
            batch_grade_code: viewRow.batch_grade_code,
            batch_grade_label: viewRow.batch_quality_grade,
            batch_grade_color: viewRow.batch_grade_color,
            coa_status: null,
            thc_percentage: null,
          } as OrderLineItem;
        }
        return {
          order_id: item.order_id,
          order_number: order.order_number,
          order_item_id: item.id,
          customer_name: order.customer_name,
          strain_name: item.strain || item.products?.name || 'Unknown',
          format_label: item.products?.name || '',
          quantity: item.quantity,
          units_assigned: item.quantity,
          units_remaining: 0,
          urgency: 'normal',
          requested_delivery_date: null,
          scheduled_delivery_date: null,
          unit_price: null,
          subtotal: null,
          weight_per_unit_g: item.products?.net_weight || null,
          line_demand_g: null,
          is_sample: false,
          batch_id: null,
          batch_number: null,
          batch_grade_code: null,
          batch_grade_label: null,
          batch_grade_color: null,
          coa_status: null,
          thc_percentage: null,
        } as OrderLineItem;
      });

      items.sort((a, b) => b.units_remaining - a.units_remaining);
      setLineItems(items);

      const itemIds = items.map((i) => i.order_item_id);
      if (itemIds.length > 0) {
        const dispatched = await fetchOrderDispatchItems(itemIds);
        setDispatchItems(dispatched);
      }
    } catch (err) {
      console.error('Failed to load line items:', err);
    } finally {
      setLoadingLineItems(false);
    }
  }, [order.id, order.order_number, order.customer_name]);

  useEffect(() => {
    if (expanded) loadLineItems();
  }, [expanded, loadLineItems]);

  function handleInventoryClose() {
    setSelectedLineItem(null);
    loadLineItems();
  }

  return (
    <>
      <motion.article
        layout
        id={`order-${order.id}`}
        onClick={() => setExpanded((v) => !v)}
        style={{
          background: 'var(--op-surface)',
          border: `1px solid ${expanded ? 'var(--op-line-strong)' : 'var(--op-line)'}`,
          borderRadius: 'var(--r-md)',
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          cursor: 'pointer',
          boxShadow: cardLeftRule,
        }}
      >
        {/* Order head */}
        <div className="flex items-baseline justify-between" style={{ gap: 10 }}>
          <div className="min-w-0">
            <div
              className="font-sans truncate"
              style={{ fontSize: 13, fontWeight: 500, color: 'var(--op-ink)' }}
            >
              {order.customer_name}
            </div>
            <div
              className="font-mono tabular-nums truncate"
              style={{ fontSize: 10, color: 'var(--op-ink-3)' }}
            >
              {order.order_number}
            </div>
          </div>
          <div
            className="font-mono tabular-nums"
            style={{ fontSize: 13, color: 'var(--op-ink)' }}
          >
            {formatCurrency(order.total_amount)}
          </div>
        </div>

        {/* Order meta row */}
        <div
          className="flex items-center font-sans"
          style={{ gap: 8, fontSize: 11, color: 'var(--op-ink-2)' }}
        >
          <span
            className={`zone-dot ${tokenName}`}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: ZONE_HEX[zone.id],
              flexShrink: 0,
              display: 'inline-block',
            }}
          />
          <span className="truncate">
            {zone.label} · {order.item_count} line items
          </span>
        </div>

        {/* Doc pills row (always visible) */}
        <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
          <DocPill
            label={readiness.invoiceSent ? 'Invoice sent' : readiness.hasOverdueDoc && !readiness.invoiceSent ? 'Invoice overdue' : 'Invoice'}
            state={readiness.invoiceSent ? 'sent' : readiness.hasOverdueDoc && !readiness.invoiceSent ? 'overdue' : 'pending'}
            orderId={order.id}
            orderNumber={order.order_number}
            docType="invoice"
            onSent={onSendDoc}
          />
          <DocPill
            label={readiness.coaSent ? 'COA sent' : readiness.hasOverdueDoc && !readiness.coaSent ? 'COA overdue' : 'COA'}
            state={readiness.coaSent ? 'sent' : readiness.hasOverdueDoc && !readiness.coaSent ? 'overdue' : 'pending'}
            orderId={order.id}
            orderNumber={order.order_number}
            docType="coa"
            onSent={onSendDoc}
          />
          <DocPill
            label={readiness.manifestSent ? 'Manifest sent' : readiness.hasOverdueDoc && !readiness.manifestSent ? 'Manifest overdue' : 'Manifest'}
            state={readiness.manifestSent ? 'sent' : readiness.hasOverdueDoc && !readiness.manifestSent ? 'overdue' : 'pending'}
            orderId={order.id}
            orderNumber={order.order_number}
            docType="manifest"
            onSent={onSendDoc}
          />
          {allReady && (
            <span
              className="font-mono uppercase"
              style={{
                marginLeft: 'auto',
                fontSize: 9,
                letterSpacing: '0.1em',
                color: 'var(--status-ok)',
              }}
            >
              Ready
            </span>
          )}
        </div>

        {/* Expanded: aggregate summary line + hairline line list */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: 'hidden' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-baseline justify-between"
                style={{
                  padding: '8px 0',
                  borderTop: '1px solid var(--op-line)',
                  borderBottom: '1px solid var(--op-line)',
                  marginTop: 4,
                }}
              >
                <span
                  className="font-mono uppercase"
                  style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--op-ink-3)' }}
                >
                  Items packed
                  {progressState === 'blocked' ? ' · blocked by docs' : ''}
                </span>
                <span
                  className="font-mono tabular-nums"
                  style={{ fontSize: 13, color: progressColor, fontWeight: 500 }}
                >
                  {progressLabel}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 4 }}>
                {loadingLineItems ? (
                  <div
                    className="text-center"
                    style={{ padding: 12, fontSize: 10, color: 'var(--op-ink-3)' }}
                  >
                    Loading items…
                  </div>
                ) : lineItems.length === 0 ? (
                  <div
                    className="text-center"
                    style={{ padding: 12, fontSize: 10, color: 'var(--op-ink-3)' }}
                  >
                    No line items
                  </div>
                ) : (
                  lineItems.map((item, i) => (
                    <FulfillmentLineItem
                      key={item.order_item_id}
                      item={item}
                      dispatchItems={dispatchItems}
                      onTap={() => setSelectedLineItem(item)}
                      isLast={i === lineItems.length - 1}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>

      <InventoryDrawer
        isOpen={!!selectedLineItem}
        onClose={handleInventoryClose}
        lineItem={selectedLineItem}
        onReload={() => {
          loadLineItems();
          onSendDoc?.();
        }}
      />
    </>
  );
}
