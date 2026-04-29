import { useState, useMemo } from 'react';
import { X, CheckCircle } from 'lucide-react';
import {
  getCommonForwardTransitions,
  getCommonBackwardTransitions,
  getStatusLabel,
} from '../utils/orderTransitions';
import { ConfirmDialog } from './ConfirmDialog';
import type { Order } from '../types';

interface BulkActionBarProps {
  selectedCount: number;
  selectedOrders: Order[];
  onBulkStatusChange: (newStatus: string) => Promise<void>;
  onClearSelection: () => void;
}

export function BulkActionBar({ selectedCount, selectedOrders, onBulkStatusChange, onClearSelection }: BulkActionBarProps) {
  const [status, setStatus] = useState('');
  const [applying, setApplying] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const statuses = selectedOrders.map(o => o.status || 'submitted');
  const forwardOptions = useMemo(() => getCommonForwardTransitions(statuses), [statuses.join(',')]);
  const backwardOptions = useMemo(() => getCommonBackwardTransitions(statuses), [statuses.join(',')]);
  const allCancellable = statuses.every(s => s !== 'cancelled');

  const handleApply = async () => {
    if (!status) return;
    if (status === 'cancelled') {
      setConfirmCancel(true);
      return;
    }
    setApplying(true);
    try {
      await onBulkStatusChange(status);
      setStatus('');
    } finally {
      setApplying(false);
    }
  };

  const hasOptions = forwardOptions.length > 0 || backwardOptions.length > 0 || allCancellable;

  return (
    <>
      <div className="fixed bottom-safe left-1/2 -translate-x-1/2 z-30 animate-slide-in">
        <div className="flex items-center gap-3 bg-cult-surface border border-cult-surface-raised rounded-cult px-5 py-3 shadow-black/60">
          <span className="text-sm font-bold text-cult-text-primary">
            {selectedCount} selected
          </span>
          <div className="w-px h-5 bg-cult-surface-raised" />
          {hasOptions ? (
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-1.5 bg-cult-black border border-cult-surface-raised rounded-cult text-xs text-cult-text-primary focus:outline-none focus:border-cult-green transition-all"
            >
              <option value="">Change status to...</option>
              {forwardOptions.length > 0 && (
                <optgroup label="Advance">
                  {forwardOptions.map(s => (
                    <option key={s} value={s}>{getStatusLabel(s)}</option>
                  ))}
                </optgroup>
              )}
              {backwardOptions.length > 0 && (
                <optgroup label="Revert">
                  {backwardOptions.map(s => (
                    <option key={s} value={s}>{getStatusLabel(s)}</option>
                  ))}
                </optgroup>
              )}
              {allCancellable && (
                <optgroup label="Other">
                  <option value="cancelled">Cancel</option>
                </optgroup>
              )}
            </select>
          ) : (
            <span className="text-xs text-cult-text-muted">No common transitions</span>
          )}
          <button
            onClick={handleApply}
            disabled={!status || applying}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-cult-green text-cult-black text-xs font-bold rounded transition-all hover:bg-cult-green-bright disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {applying ? 'Applying...' : 'Apply'}
          </button>
          <button
            onClick={onClearSelection}
            className="p-1.5 text-cult-text-secondary hover:text-cult-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {confirmCancel && (
        <ConfirmDialog
          title="Cancel Selected Orders"
          message={`Cancel ${selectedCount} selected order${selectedCount > 1 ? 's' : ''}? This action will mark them all as cancelled.`}
          confirmLabel={`Cancel ${selectedCount} Order${selectedCount > 1 ? 's' : ''}`}
          variant="danger"
          onConfirm={async () => {
            setConfirmCancel(false);
            setApplying(true);
            try {
              await onBulkStatusChange('cancelled');
              setStatus('');
            } finally {
              setApplying(false);
            }
          }}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </>
  );
}
