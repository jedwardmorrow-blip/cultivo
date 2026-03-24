import { Calendar, Package, Gift, AlertTriangle, ArrowRight, CalendarCheck } from 'lucide-react';
import { formatCurrency, parseDeliveryDate } from '@/lib/utils';
import { getStatusColor } from '../utils/orderGrouping';
import { getAttentionFlags, getOrderAge, getOrderAgeColor, type AttentionFlag } from '../utils/orderAttention';
import { getNextStatus, getTransitionLabel } from '../utils/orderTransitions';
import type { Order } from '../types';
import type { OrderExtended } from '@/types';

interface OrderCardProps {
  order: Order;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: (orderId: string) => void;
  onCheck: (orderId: string, shiftKey: boolean) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

function AttentionFlag({ flag }: { flag: AttentionFlag }) {
  const isHigh = flag.severity === 'high';
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-cult ${
      isHigh
        ? 'bg-cult-danger/15 text-cult-danger border border-cult-danger/30'
        : 'bg-cult-warning/15 text-cult-warning border border-cult-warning/30'
    }`}>
      <AlertTriangle className="w-2.5 h-2.5" />
      {flag.label}
    </span>
  );
}

export function OrderCard({
  order,
  isSelected,
  isChecked,
  onSelect,
  onCheck,
  onStatusChange,
}: OrderCardProps) {
  const flags = getAttentionFlags(order);
  const deliveryDate = order.scheduled_delivery_date || order.requested_delivery_date;
  const age = getOrderAge(order.created_at);
  const ageColor = getOrderAgeColor(order.created_at, order.status);
  const nextStatus = getNextStatus(order.status || 'submitted');

  return (
    <div
      onClick={() => onSelect(order.id)}
      className={`
        group relative border rounded-cult p-3.5 cursor-pointer transition-all duration-150
        ${isSelected
          ? 'border-cult-success/50 bg-cult-surface-raised ring-1 ring-cult-success/20'
          : 'border-cult-border bg-cult-surface hover:bg-cult-surface-raised hover:border-cult-border-strong'
        }
      `}
    >
      {/* Top row: checkbox + order number + badges */}
      <div className="flex items-start gap-2.5 mb-2">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => {
            e.stopPropagation();
            onCheck(order.id, e.nativeEvent instanceof MouseEvent && e.nativeEvent.shiftKey);
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 w-3.5 h-3.5 rounded border-cult-border bg-cult-surface text-cult-success focus:ring-cult-success/50 focus:ring-offset-0 cursor-pointer accent-emerald-500"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-cult-text-primary tracking-wide">
              {order.order_number}
            </span>
            {(order as OrderExtended).is_sample && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold bg-cult-warning/15 text-cult-warning border border-cult-warning/30 rounded-cult uppercase">
                <Gift className="w-2.5 h-2.5" />
                Sample
              </span>
            )}
            {order.scheduled_at && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold bg-cult-success/15 text-cult-success border border-cult-success/30 rounded-cult uppercase">
                <CalendarCheck className="w-2.5 h-2.5" />
                Scheduled
              </span>
            )}
            {order.priority === 'urgent' && (
              <span className="px-1.5 py-0.5 text-xs font-bold bg-cult-danger/15 text-cult-danger border border-cult-danger/30 rounded-cult uppercase">
                Urgent
              </span>
            )}
            {order.priority === 'high' && (
              <span className="px-1.5 py-0.5 text-xs font-bold bg-cult-warning/15 text-cult-warning border border-cult-warning/30 rounded-cult uppercase">
                High
              </span>
            )}
          </div>
          {flags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {flags.map((flag, i) => (
                <AttentionFlag key={i} flag={flag} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Customer name */}
      <div className="text-sm text-cult-text-primary mb-2 pl-6">
        {order.customer_name || 'Unknown Customer'}
      </div>

      {/* Bottom row: delivery, items, total, age */}
      <div className="flex items-center gap-3 text-xs text-cult-text-secondary pl-6">
        {deliveryDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-cult-text-muted" />
            {parseDeliveryDate(deliveryDate)?.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }) ?? 'No date'}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Package className="w-3 h-3 text-cult-text-muted" />
          {order.item_count || 0}
        </span>
        <span className="font-semibold text-cult-success">
          {formatCurrency(order.total_amount || 0)}
        </span>
        {age && (
          <span className={`${ageColor} ml-auto`}>{age}</span>
        )}
      </div>

      {/* Quick advance button — appears on hover */}
      {onStatusChange && nextStatus && (
        <button
          title={getTransitionLabel(order.status || 'submitted', nextStatus)}
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange(order.id, nextStatus);
          }}
          className="absolute top-2.5 right-2.5 p-2.5 rounded-cult bg-cult-surface-overlay border border-cult-border text-cult-text-muted hover:text-cult-success hover:border-cult-success/30 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
