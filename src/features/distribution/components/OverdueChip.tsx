/**
 * OverdueChip — header atom showing the number of orders with overdue
 * documents. Two states:
 *   - zero: faded, no pulse, no border highlight
 *   - engaged: status-bad border, pulsing dot, mono count
 *
 * Click filters DayDetailStrip to overdue-only orders. Click again
 * (when engaged) clears the filter.
 */

interface OverdueChipProps {
  count: number;
  active?: boolean;
  onClick?: () => void;
}

export function OverdueChip({ count, active, onClick }: OverdueChipProps) {
  const state = count > 0 ? 'engaged' : 'zero';

  return (
    <button
      type="button"
      onClick={onClick}
      title={
        count > 0
          ? `${count} overdue document${count !== 1 ? 's' : ''} · click to filter strip`
          : 'No overdue documents'
      }
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-[5px] font-sans text-[12px] transition-colors"
      style={{
        background: 'var(--op-surface)',
        border: `1px solid ${state === 'engaged' ? 'var(--status-bad)' : 'var(--op-line)'}`,
        color: state === 'engaged' ? 'var(--op-ink)' : 'var(--op-ink-2)',
        opacity: state === 'zero' ? 0.5 : 1,
        boxShadow: active ? 'inset 2px 0 0 var(--accent)' : undefined,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${state === 'engaged' ? 'animate-pulse' : ''}`}
        style={{
          background:
            state === 'engaged' ? 'var(--status-bad)' : 'var(--op-ink-4)',
        }}
      />
      <span>Overdue</span>
      <span
        className="font-mono tabular-nums font-medium"
        style={{ color: state === 'engaged' ? 'var(--status-bad)' : 'var(--op-ink-3)' }}
      >
        {count}
      </span>
    </button>
  );
}
