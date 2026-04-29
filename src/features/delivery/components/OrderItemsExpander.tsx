import { useState, useCallback } from 'react';
import { ChevronDown, Scissors, Package, Tag, FileWarning, CheckCircle2, Loader2, ExternalLink, FlaskConical } from 'lucide-react';
import { QualityGradeBadge } from '@/shared/components';
import { formatCurrency } from '@/shared/utils/format';
import { getOrderItemsForCalendar, type CalendarOrderItem } from '../services/delivery.service';

const ITEM_STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; Icon: typeof Scissors }> = {
  trimming: { bg: 'bg-cyan-900/30', text: 'text-cyan-400', border: 'border-cyan-600', label: 'Trim', Icon: Scissors },
  packaging: { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-600', label: 'Pkg', Icon: Package },
  labeling: { bg: 'bg-cult-warning/15', text: 'text-cult-warning', border: 'border-cult-warning', label: 'Label', Icon: Tag },
  pending_coa: { bg: 'bg-cult-warning/15', text: 'text-cult-warning', border: 'border-cult-warning', label: 'COA', Icon: FileWarning },
  ready_for_delivery: { bg: 'bg-cult-success/15', text: 'text-cult-success', border: 'border-cult-success', label: 'Ready', Icon: CheckCircle2 },
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
        className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-cult-text-muted hover:text-cult-text-primary transition-colors rounded hover:bg-cult-surface-raised/50"
      >
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        <span className="uppercase tracking-wider font-medium">Items</span>
      </button>

      {expanded && (
        <div className="mt-1.5 ml-1 border-l border-cult-surface-raised/50 pl-2.5 space-y-1" onClick={(e) => e.stopPropagation()}>
          {loading ? (
            <div className="flex items-center gap-1.5 py-2">
              <Loader2 className="w-3 h-3 text-cult-text-muted animate-spin" />
              <span className="text-xs text-cult-text-muted">Loading items...</span>
            </div>
          ) : items && items.length > 0 ? (
            <>
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-2 py-1 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-cult-text-primary font-medium truncate">{item.product_name}</span>
                      {item.is_sample && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-xs font-semibold uppercase tracking-wider bg-pink-900/30 text-pink-400 border border-pink-600 rounded-sm">
                          <FlaskConical className="w-2 h-2" />
                          Sample
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.strain_name && (
                        <span className="text-cult-text-muted">{item.strain_name}</span>
                      )}
                      <span className="text-cult-border">&middot;</span>
                      <span className="text-cult-text-muted">
                        {item.quantity} {item.pricing_unit || 'units'}
                      </span>
                      {item.unit_price > 0 && (
                        <>
                          <span className="text-cult-border">&middot;</span>
                          <span className="text-cult-text-muted">{formatCurrency(item.unit_price)}/{item.pricing_unit || 'unit'}</span>
                        </>
                      )}
                      {item.total_price > 0 && (
                        <>
                          <span className="text-cult-border">&middot;</span>
                          <span className="text-cult-text-primary font-semibold">{formatCurrency(item.total_price)}</span>
                        </>
                      )}
                      {item.batch_number ? (
                        <>
                          <span className="text-cult-border">&middot;</span>
                          <span className="text-cult-text-muted font-mono text-xs">{item.batch_number}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-cult-border">&middot;</span>
                          <span className="text-cult-border italic text-xs">No batch</span>
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
              <div className="flex items-center justify-between pt-1 border-t border-cult-surface-raised/30">
                <span className="text-xs text-cult-text-muted">
                  {readyCount}/{totalCount} items ready
                </span>
                {onSelectOrder && (
                  <button
                    onClick={() => onSelectOrder(orderId)}
                    className="flex items-center gap-1 text-xs text-cult-text-muted hover:text-cult-text-primary transition-colors"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    <span className="uppercase tracking-wider font-medium">View Order</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <span className="text-xs text-cult-border py-1 block">No items found</span>
          )}
        </div>
      )}
    </div>
  );
}
