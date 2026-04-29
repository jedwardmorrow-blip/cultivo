import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Circle, Send, ChevronDown } from 'lucide-react';
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
import { GLASS, ZONE_HEX } from '../constants';
import { FulfillmentLineItem } from './FulfillmentLineItem';
import { InventoryDrawer } from './InventoryDrawer';

// ─── Sub-components ────────────────────────────────────────────────────────

function ReadinessChip({ label, status }: { label: string; status: 'good' | 'warning' | 'pending' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold
      ${status === 'good' ? 'text-emerald-400' : status === 'warning' ? 'text-amber-400' : 'text-white/30'}`}>
      {status === 'good' ? <CheckCircle2 className="w-3 h-3" /> : status === 'warning' ? <AlertTriangle className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
      {label}
    </span>
  );
}

function DocPill({ label, sent, overdue, orderId, orderNumber, docType, onSent }: {
  label: string; sent: boolean; overdue?: boolean;
  orderId: string; orderNumber: string; docType: 'invoice' | 'coa' | 'manifest';
  onSent?: () => void;
}) {
  const [sending, setSending] = useState(false);

  async function handleSend() {
    setSending(true);
    await sendDocument(orderId, orderNumber, docType);
    setSending(false);
    onSent?.();
  }

  if (sent) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
        <CheckCircle2 className="w-2.5 h-2.5" />{label}
      </span>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleSend(); }}
      disabled={sending}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition-all
        ${overdue ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'} disabled:opacity-50`}
    >
      <Send className={`w-2.5 h-2.5 ${sending ? 'animate-spin' : ''}`} />{label}
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

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
  const zoneColor = ZONE_HEX[zone.id] || '#A6A6A6';

  const allocStatus = readiness.itemsAllocated >= readiness.itemsTotal ? 'good'
    : readiness.itemsAllocated > 0 ? 'warning' : 'pending';
  const docStatus = readiness.allDocsSent ? 'good'
    : readiness.hasOverdueDoc ? 'warning' : 'pending';
  const allReady = allocStatus === 'good' && readiness.allDocsSent;

  // Load line items when card expands
  const loadLineItems = useCallback(async () => {
    setLoadingLineItems(true);
    try {
      const { data, error } = await supabase
        .from('v_production_queue_by_order')
        .select(`
          order_id, order_number, order_item_id, customer_name,
          strain_name, format_label, quantity,
          units_assigned, units_remaining, urgency,
          requested_delivery_date, scheduled_delivery_date,
          unit_price, subtotal, weight_per_unit_g, line_demand_g, is_sample,
          batch_number, batch_quality_grade, batch_grade_code, batch_grade_color
        `)
        .eq('order_id', order.id)
        .order('units_remaining', { ascending: false });

      if (error) throw error;

      // Also fetch items that are fully assigned (the view only has units_remaining > 0)
      const { data: allItems } = await supabase
        .from('order_items')
        .select(`
          id, order_id, quantity, strain, status,
          products!inner(name, net_weight)
        `)
        .eq('order_id', order.id);

      // Merge: view data for unfulfilled items, basic data for fulfilled items
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

        // Fully assigned item — not in the view
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

      // Sort: unfulfilled first (by units_remaining desc), then fulfilled
      items.sort((a, b) => b.units_remaining - a.units_remaining);
      setLineItems(items);

      // Fetch dispatch items for these line items
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
    loadLineItems(); // Refresh after any actions taken
  }

  return (
    <>
      <motion.div
        layout
        className={`${GLASS} overflow-hidden transition-all duration-200
          ${highlighted ? 'ring-1 ring-white/20 shadow-[0_0_16px_rgba(232,224,212,0.08)]' : ''}`}
        style={{ borderLeftWidth: '3px', borderLeftColor: zoneColor }}
        id={`order-${order.id}`}
      >
        {/* Header — always visible */}
        <div
          className="p-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: zoneColor }} />
              <span className="text-sm font-semibold text-white truncate">{order.customer_name}</span>
              <span className="text-[10px] text-white/30 font-mono flex-shrink-0">{order.order_number}</span>
            </div>
            {allReady && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />Ready
              </span>
            )}
          </div>

          <div className="text-[10px] text-white/30 mb-2">
            {zone.label}{order.customer_city ? ` · ${order.customer_city}` : ''}
          </div>

          <div className="flex items-center gap-3 mb-1.5">
            <ReadinessChip label={`${readiness.itemsAllocated}/${readiness.itemsTotal}`} status={allocStatus} />
            <ReadinessChip
              label={readiness.allDocsSent ? 'Docs sent' : readiness.hasOverdueDoc ? 'Docs overdue' : 'Docs pending'}
              status={docStatus}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[11px] text-white/40">
              <span className="font-semibold text-white/60">{formatCurrency(order.total_amount)}</span>
              <span>{order.item_count} items</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-white/20 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Expanded: Line items + Documents */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pt-1 border-t border-white/[0.06]">
                {/* Line Items */}
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Line Items</div>

                {loadingLineItems ? (
                  <div className="text-[10px] text-white/20 text-center py-3">Loading items...</div>
                ) : lineItems.length === 0 ? (
                  <div className="text-[10px] text-white/20 text-center py-3">No line items found</div>
                ) : (
                  <div className="space-y-1.5 mb-3">
                    {lineItems.map((item) => (
                      <FulfillmentLineItem
                        key={item.order_item_id}
                        item={item}
                        dispatchItems={dispatchItems}
                        onTap={() => setSelectedLineItem(item)}
                      />
                    ))}
                  </div>
                )}

                {/* Documents */}
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Documents</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DocPill label="Invoice" sent={readiness.invoiceSent} overdue={readiness.hasOverdueDoc && !readiness.invoiceSent} orderId={order.id} orderNumber={order.order_number} docType="invoice" onSent={onSendDoc} />
                  <DocPill label="COA" sent={readiness.coaSent} overdue={readiness.hasOverdueDoc && !readiness.coaSent} orderId={order.id} orderNumber={order.order_number} docType="coa" onSent={onSendDoc} />
                  <DocPill label="Manifest" sent={readiness.manifestSent} overdue={readiness.hasOverdueDoc && !readiness.manifestSent} orderId={order.id} orderNumber={order.order_number} docType="manifest" onSent={onSendDoc} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Inventory Drawer (opened when tapping an unfulfilled line item) */}
      <InventoryDrawer
        isOpen={!!selectedLineItem}
        onClose={handleInventoryClose}
        lineItem={selectedLineItem}
        onReload={() => {
          loadLineItems();
          onSendDoc?.(); // Trigger parent reload too
        }}
      />
    </>
  );
}
