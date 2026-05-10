import type { ReactNode } from 'react';

/**
 * Shared PendingCell — "NOT CONFIGURED · SET UP →" tile.
 *
 * Use anywhere a metric tile or summary slot has no data source yet. Tells
 * the truth instead of rendering $0 / —. Optional onSetup wires the CTA.
 *
 * Lighter than features/dashboard/components/home/PendingCell.tsx (which
 * launches a modal with full configuration details). For hub surfaces a
 * direct setup route is usually enough; pass onSetup or setupHref.
 */
export interface PendingCellProps {
  label: string;
  reason?: string;
  setupHref?: string;
  onSetup?: () => void;
  cta?: string;
  className?: string;
  badge?: ReactNode;
}

export function PendingCell({
  label,
  reason,
  setupHref,
  onSetup,
  cta = 'Set up',
  className = '',
  badge = 'Not configured',
}: PendingCellProps) {
  const handleClick = () => {
    if (onSetup) onSetup();
    else if (setupHref) window.location.href = setupHref;
  };
  const interactive = Boolean(onSetup || setupHref);
  const Tag: 'button' | 'div' = interactive ? 'button' : 'div';
  return (
    <Tag
      className={`cult-pending-cell ${className}`}
      onClick={interactive ? handleClick : undefined}
      type={interactive ? 'button' : undefined}
      aria-label={`${label} — not configured${reason ? `. ${reason}` : ''}${interactive ? '. Click to set up.' : ''}`}
    >
      <span className="cult-pending-cell-row">
        <span className="cult-pending-cell-label">{label}</span>
        <span className="cult-pending-cell-badge">{badge}</span>
      </span>
      <span className="cult-pending-cell-primary" aria-hidden="true">—</span>
      {reason && <span className="cult-pending-cell-reason">{reason}</span>}
      {interactive && (
        <span className="cult-pending-cell-cta">
          {cta} <span aria-hidden="true">→</span>
        </span>
      )}
    </Tag>
  );
}
