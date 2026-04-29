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
      <button className="home-cell-pending" onClick={() => setOpen(true)} type="button">
        <span className="home-cell-label">{label}</span>
        <span className="home-cell-primary dim">—</span>
        <span className="home-cell-secondary">{meta.shortReason}</span>
      </button>
      {open && <PendingModal meta={meta} onClose={() => setOpen(false)} />}
    </>
  );
}
