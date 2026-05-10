import { useState } from 'react';
import { PendingModal, type PendingMeta } from './PendingModal';

export interface PendingCellProps {
  label: string;
  meta: PendingMeta;
}

export function PendingCell({ label, meta }: PendingCellProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="home-cell-pending"
        onClick={() => setOpen(true)}
        type="button"
        aria-label={`${label} — not configured. ${meta.shortReason}. Click to set up.`}
      >
        <span className="home-cell-label">
          <span className="home-cell-label-text">{label}</span>
          <span className="home-cell-pending-badge">Not configured</span>
        </span>
        <span className="home-cell-primary home-cell-primary-empty" aria-hidden="true">—</span>
        <span className="home-cell-secondary">{meta.shortReason}</span>
        <span className="home-cell-pending-cta">Set up <span aria-hidden="true">→</span></span>
      </button>
      {open && <PendingModal meta={meta} onClose={() => setOpen(false)} />}
    </>
  );
}
