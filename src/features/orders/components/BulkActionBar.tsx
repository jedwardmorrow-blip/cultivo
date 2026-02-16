import { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onBulkStatusChange: (newStatus: string) => Promise<void>;
  onClearSelection: () => void;
}

const STATUSES = [
  { value: 'accepted', label: 'Accepted' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready_for_delivery', label: 'Ready for Delivery' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function BulkActionBar({ selectedCount, onBulkStatusChange, onClearSelection }: BulkActionBarProps) {
  const [status, setStatus] = useState('');
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    if (!status) return;
    setApplying(true);
    try {
      await onBulkStatusChange(status);
      setStatus('');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 animate-slide-in">
      <div className="flex items-center gap-3 bg-cult-near-black border border-cult-charcoal rounded-cult px-5 py-3 shadow-2xl shadow-black/60">
        <span className="text-sm font-bold text-cult-off-white">
          {selectedCount} selected
        </span>
        <div className="w-px h-5 bg-cult-charcoal" />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-1.5 bg-cult-black border border-cult-charcoal rounded-cult text-xs text-cult-off-white focus:outline-none focus:border-cult-green transition-all"
        >
          <option value="">Change status to...</option>
          {STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
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
          className="p-1.5 text-cult-silver hover:text-cult-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
