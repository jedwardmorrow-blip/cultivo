/**
 * FulfillmentLineItem — v2 two-column hairline row.
 *
 * Strain (sans) + meta (mono: batch · units of measure) on the left,
 * "x / y" qty (mono tnum) on the right. No progress bar, no stage dot
 * (the parent OrderReadinessCard owns aggregate progress now). Tap an
 * unfulfilled row to open the InventoryDrawer.
 */

import type { OrderLineItem, DispatchItemStatus } from '@/features/delivery/hooks/useOrderFulfillment';

interface FulfillmentLineItemProps {
  item: OrderLineItem;
  dispatchItems: DispatchItemStatus[];
  onTap: () => void;
  isLast?: boolean;
}

export function FulfillmentLineItem({ item, dispatchItems, onTap, isLast }: FulfillmentLineItemProps) {
  const isFullyAssigned = item.units_remaining === 0;
  const activeDispatches = dispatchItems.filter((d) => d.order_item_id === item.order_item_id);
  const inProgress = activeDispatches.filter((d) => d.status === 'in_progress').length;
  const queued = activeDispatches.filter((d) => d.status === 'pending').length;

  const inflightLabel =
    inProgress > 0
      ? ` · ${inProgress} processing`
      : queued > 0
      ? ` · ${queued} queued`
      : '';

  return (
    <button
      type="button"
      onClick={!isFullyAssigned ? onTap : undefined}
      disabled={isFullyAssigned}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '7px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--op-line)',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 10,
        alignItems: 'baseline',
        background: 'transparent',
        border: '0',
        borderBottomWidth: isLast ? '0' : '1px',
        borderBottomStyle: 'solid',
        borderBottomColor: 'var(--op-line)',
        cursor: isFullyAssigned ? 'default' : 'pointer',
      }}
    >
      <div className="min-w-0" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          className="font-sans truncate"
          style={{ fontSize: 12, color: 'var(--op-ink)' }}
        >
          {item.strain_name}
          {item.format_label ? ` · ${item.format_label}` : ''}
        </span>
        <span
          className="font-mono tabular-nums truncate"
          style={{ fontSize: 10, color: 'var(--op-ink-3)' }}
        >
          {item.batch_number || '—'}
          {inflightLabel}
        </span>
      </div>
      <span
        className="font-mono tabular-nums"
        style={{
          fontSize: 11,
          color: isFullyAssigned ? 'var(--status-ok)' : 'var(--op-ink-2)',
        }}
      >
        {item.units_assigned} / {item.quantity}
      </span>
    </button>
  );
}
