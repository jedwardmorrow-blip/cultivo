import { useState, useCallback } from 'react';
import { ChevronDown, Scissors, Package, Tag, FileWarning, CheckCircle2, Loader2, ExternalLink, FlaskConical } from 'lucide-react';
import { QualityGradeBadge } from '@/shared/components';
import { formatCurrency } from '@/shared/utils/format';
import { getOrderItemsForCalendar, type CalendarOrderItem } from '../services/delivery.service';

const ITEM_STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; Icon: typeof Scissors }> = {
  trimming: { bg: 'bg-cyan-900/30', text: 'text-cyan-400', border: 'border-cyan-600', label: 'Trim', Icon: Scissors },
  packaging: { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-600', label: 'Pkg', Icon: Package },
  labeling: { bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-600', label: 'Label', Icon: Tag },
  pending_coa: { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-600', label: 'COA', Icon: FileWarning },
  ready_for_delivery: { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-600', label: 'Ready', Icon: CheckCircle2 },
};

function ItemStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const cfg = ITEM_STATUS_CONFIG[status];
  if (!cfg) return null;
  const { bg, text, border, label, Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${bg} ${text} border ${border} rounded-sm`}>
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

interface OrderItemsExpanderProps {
  orderId: string;
  onSelectOrder?: (orderId: string) => void;
}

export function OrderItemsExpander({ orderId, onSelectOrder }: OrderItemsExpanderProps) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<CalendarOrderItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (items !== null) return;
    setLoading(true);
    const { data } = await getOrderItemsForCalendar(orderId);
    setItems(data);
    setLoading(false);
  }, [expanded, items, orderId]);

  const readyCount = items?.filter(i => i.status === 'ready_for_delivery').length ?? 0;
  const totalCount = items?.length ?? 0;

  return (
    <div>
      <button
        onClick={toggle}
        className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-cult-lighter-gray hover:text-cult-white transition-colors rounded hover:bg-cult-charcoal/50"
      >
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        <span className="uppercase tracking-wider font-medium">Items</span>
      </button>

      {expanded && (
        <div className="mt-1.5 ml-1 border-l border-cult-charcoal/50 pl-2.5 space-y-1" onClick={(e) => e.stopPropagation()}>
          {loading ? (
            <div className="flex items-center gap-1.5 py-2">
              <Loader2 className="w-3 h-3 text-cult-lighter-gray animate-spin" />
              <span className="text-xs text-cult-lighter-gray">Loading items...</span>
            </div>
          ) : items && items.length > 0 ? (
            <>
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-2 py-1 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-cult-white font-medium truncate">{item.product_name}</span>
                      {item.is_sample && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-xs font-semibold uppercase tracking-wider bg-pink-900/30 text-pink-400 border border-pink-600 rounded-sm">
                          <FlaskConical className="w-2 h-2" />
                          Sample
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.strain_name && (
                        <span className="text-cult-lighter-gray">{item.strain_name}</span>
                      )}
                      <span className="text-cult-medium-gray">&middot;</span>
                      <span className="text-cult-light-gray">
                        {item.quantity} {item.pricing_unit || 'units'}
                      </span>
                      {item.unit_price > 0 && (
                        <>
                          <span className="text-cult-medium-gray">&middot;</span>
                          <span className="text-cult-lighter-gray">{formatCurrency(item.unit_price)}/{item.pricing_unit || 'unit'}</span>
                        </>
                      )}
                      {item.total_price > 0 && (
                        <>
                          <span className="text-cult-medium-gray">&middot;</span>
                          <span className="text-cult-white font-semibold">{formatCurrency(item.total_price)}</span>
                        </>
                      )}
                      {item.batch_number ? (
                        <>
                          <span className="text-cult-medium-gray">&middot;</span>
                          <span className="text-cult-lighter-gray font-mono text-xs">{item.batch_number}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-cult-medium-gray">&middot;</span>
                          <span className="text-cult-medium-gray italic text-xs">No batch</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <QualityGradeBadge gradeId={item.quality_grade_id} size="sm" />
                    <ItemStatusBadge status={item.status} />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1 border-t border-cult-charcoal/30">
                <span className="text-xs text-cult-lighter-gray">
                  {readyCount}/{totalCount} items ready
                </span>
                {onSelectOrder && (
                  <button
                    onClick={() => onSelectOrder(orderId)}
                    className="flex items-center gap-1 text-xs text-cult-light-gray hover:text-cult-white transition-colors"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    <span className="uppercase tracking-wider font-medium">View Order</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <span className="text-xs text-cult-medium-gray py-1 block">No items found</span>
          )}
        </div>
      )}
    </div>
  );
}
