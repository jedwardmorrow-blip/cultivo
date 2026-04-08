import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Circle, Send, ChevronDown, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { getRouteZone } from '@/features/delivery/utils';
import { sendDocument } from '@/features/delivery/services/dispatch.service';
import type { CalendarOrder } from '@/features/delivery/services/delivery.service';
import type { OrderReadiness } from '../constants';
import { GLASS, ZONE_HEX } from '../constants';

interface OrderReadinessCardProps {
  order: CalendarOrder;
  readiness: OrderReadiness;
  highlighted?: boolean;
  onSendDoc?: () => void;
}

function ReadinessChip({
  label,
  status,
}: {
  label: string;
  status: 'good' | 'warning' | 'pending';
}) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold
      ${status === 'good' ? 'text-emerald-400' : status === 'warning' ? 'text-amber-400' : 'text-white/30'}`}
    >
      {status === 'good' ? <CheckCircle2 className="w-3 h-3" /> : status === 'warning' ? <AlertTriangle className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
      {label}
    </span>
  );
}

function DocPill({
  label,
  sent,
  overdue,
  orderId,
  orderNumber,
  docType,
  onSent,
}: {
  label: string;
  sent: boolean;
  overdue?: boolean;
  orderId: string;
  orderNumber: string;
  docType: 'invoice' | 'coa' | 'manifest';
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
        <CheckCircle2 className="w-2.5 h-2.5" />
        {label}
      </span>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleSend(); }}
      disabled={sending}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition-all
        ${overdue
          ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
        } disabled:opacity-50`}
    >
      <Send className={`w-2.5 h-2.5 ${sending ? 'animate-spin' : ''}`} />
      {label}
    </button>
  );
}

export function OrderReadinessCard({ order, readiness, highlighted, onSendDoc }: OrderReadinessCardProps) {
  const [expanded, setExpanded] = useState(false);
  const zone = getRouteZone(order.customer_lat, order.customer_lon);
  const zoneColor = ZONE_HEX[zone.id] || '#A6A6A6';

  const allocStatus = readiness.itemsAllocated >= readiness.itemsTotal ? 'good'
    : readiness.itemsAllocated > 0 ? 'warning'
    : 'pending';

  const docStatus = readiness.allDocsSent ? 'good'
    : readiness.hasOverdueDoc ? 'warning'
    : 'pending';

  const allReady = allocStatus === 'good' && readiness.allDocsSent;

  return (
    <motion.div
      layout
      className={`${GLASS} overflow-hidden transition-all duration-200
        ${highlighted ? 'ring-1 ring-white/20 shadow-[0_0_16px_rgba(232,224,212,0.08)]' : ''}`}
      style={{ borderLeftWidth: '3px', borderLeftColor: zoneColor }}
      id={`order-${order.id}`}
    >
      <div
        className="p-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Top row: customer + order number */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: zoneColor }} />
            <span className="text-sm font-semibold text-white truncate">{order.customer_name}</span>
            <span className="text-[10px] text-white/30 font-mono flex-shrink-0">{order.order_number}</span>
          </div>
          {allReady && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              Ready
            </span>
          )}
        </div>

        {/* Zone + city */}
        <div className="text-[10px] text-white/30 mb-2">
          {zone.label}{order.customer_city ? ` · ${order.customer_city}` : ''}
        </div>

        {/* Readiness row */}
        <div className="flex items-center gap-3 mb-1.5">
          <ReadinessChip
            label={`${readiness.itemsAllocated}/${readiness.itemsTotal}`}
            status={allocStatus}
          />
          <ReadinessChip
            label={readiness.allDocsSent ? 'Docs sent' : readiness.hasOverdueDoc ? 'Docs overdue' : 'Docs pending'}
            status={docStatus}
          />
        </div>

        {/* Bottom row: revenue + items + expand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[11px] text-white/40">
            <span className="font-semibold text-white/60">{formatCurrency(order.total_amount)}</span>
            <span>{order.item_count} items</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-white/20 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded: doc pills with send actions */}
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
  );
}
