import { useState, useMemo, useCallback } from 'react';
import { X, ArrowRight, AlertTriangle, Search, CheckCircle2 } from 'lucide-react';
import { validateRebalance, executeRebalance } from '../services/rebalance.service';
import { notificationService } from '@/services/notification.service';
import type { InventoryItem } from '../types';
import type { VarianceReason } from '../types/variance.types';

interface RebalanceWeightModalProps {
  isOpen: boolean;
  sourceItem: InventoryItem | null;
  allItems: InventoryItem[];
  onClose: () => void;
  onComplete: () => void;
}

const REASONS: { value: VarianceReason; label: string }[] = [
  { value: 'measurement_error', label: 'Measurement Error' },
  { value: 'packaging_loss', label: 'Packaging Loss' },
  { value: 'shrinkage', label: 'Shrinkage' },
  { value: 'waste', label: 'Waste' },
  { value: 'found_inventory', label: 'Found Inventory' },
  { value: 'other', label: 'Other' },
];

export function RebalanceWeightModal({ isOpen, sourceItem, allItems, onClose, onComplete }: RebalanceWeightModalProps) {
  const [destItemId, setDestItemId] = useState<string | null>(null);
  const [transferQty, setTransferQty] = useState('');
  const [reason, setReason] = useState<VarianceReason | ''>('');
  const [notes, setNotes] = useState('');
  const [destSearch, setDestSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const sourceUnit = sourceItem?.unit || 'g';
  const sourceQty = sourceItem?.on_hand_qty || 0;

  const eligibleItems = useMemo(() => {
    if (!sourceItem) return [];
    return allItems.filter(
      (item) =>
        item.id !== sourceItem.id &&
        (item.unit || 'g') === sourceUnit &&
        (item.on_hand_qty || 0) >= 0
    );
  }, [allItems, sourceItem, sourceUnit]);

  const filteredDest = useMemo(() => {
    if (!destSearch.trim()) return eligibleItems;
    const q = destSearch.toLowerCase();
    return eligibleItems.filter(
      (item) =>
        item.package_id?.toLowerCase().includes(q) ||
        item.strain?.toLowerCase().includes(q) ||
        item.batch_number?.toLowerCase().includes(q) ||
        item.product_name?.toLowerCase().includes(q)
    );
  }, [eligibleItems, destSearch]);

  const destItem = useMemo(() => {
    if (!destItemId) return null;
    return allItems.find((i) => i.id === destItemId) || null;
  }, [allItems, destItemId]);

  const qty = parseFloat(transferQty);
  const isQtyValid = !isNaN(qty) && qty > 0 && qty <= sourceQty;
  const isOver50 = isQtyValid && qty > sourceQty * 0.5;
  const canSubmit = isQtyValid && destItem && reason !== '' && !saving;

  const sourceAfter = isQtyValid ? sourceQty - qty : sourceQty;
  const destAfter = isQtyValid && destItem ? (destItem.on_hand_qty || 0) + qty : destItem?.on_hand_qty || 0;

  const resetState = useCallback(() => {
    setDestItemId(null);
    setTransferQty('');
    setReason('');
    setNotes('');
    setDestSearch('');
    setError(null);
    setSuccess(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!sourceItem || !destItem || !isQtyValid || reason === '') return;

    const validation = await validateRebalance(sourceItem, destItem, qty);
    if (!validation.is_valid) {
      setError(validation.errors.join('; '));
      return;
    }

    setSaving(true);
    setError(null);

    const result = await executeRebalance({
      source_item_id: sourceItem.id,
      dest_item_id: destItem.id,
      transfer_qty: qty,
      reason_code: reason,
      notes: notes || undefined,
    });

    setSaving(false);

    if (!result.success) {
      setError(result.error || 'Rebalance failed');
      return;
    }

    setSuccess(true);
    notificationService.success('Weight rebalanced successfully');
    onComplete();
    setTimeout(handleClose, 1500);
  }, [sourceItem, destItem, isQtyValid, qty, reason, notes, onComplete, handleClose]);

  if (!isOpen || !sourceItem) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cult-medium-gray">
          <h2 className="text-lg font-semibold text-cult-white">Rebalance Weight</h2>
          <button onClick={handleClose} disabled={saving} className="text-cult-lighter-gray hover:text-cult-white disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {success && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-cult-success-muted border border-cult-success/40">
              <CheckCircle2 className="w-5 h-5 text-cult-success flex-shrink-0" />
              <p className="text-sm text-cult-success font-medium">Weight rebalanced successfully.</p>
            </div>
          )}

          <div className="p-4 rounded-lg bg-cult-dark-gray border border-cult-medium-gray">
            <div className="text-xs uppercase tracking-wider text-cult-lighter-gray mb-2">Source</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-cult-lighter-gray">Package ID</span>
                <div className="font-mono text-sm font-medium text-cult-white">{sourceItem.package_id}</div>
              </div>
              <div>
                <span className="text-xs text-cult-lighter-gray">Current Qty</span>
                <div className="text-sm font-semibold text-cult-white tabular-nums">
                  {sourceQty.toFixed(sourceUnit === 'g' ? 1 : 0)} {sourceUnit}
                </div>
              </div>
              <div>
                <span className="text-xs text-cult-lighter-gray">Product</span>
                <div className="text-sm text-cult-silver">{sourceItem.product_name || '-'}</div>
              </div>
              <div>
                <span className="text-xs text-cult-lighter-gray">Strain</span>
                <div className="text-sm text-cult-silver">{sourceItem.strain || '-'}</div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-cult-silver mb-2">Destination Package</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-lighter-gray" />
              <input
                type="text"
                value={destSearch}
                onChange={(e) => setDestSearch(e.target.value)}
                placeholder="Search by package ID, strain, batch..."
                className="w-full pl-9 pr-4 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-sm text-cult-white placeholder-cult-lighter-gray focus:outline-none focus:border-cult-silver"
              />
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-cult-medium-gray bg-cult-dark-gray">
              {filteredDest.length === 0 ? (
                <div className="p-4 text-center text-sm text-cult-lighter-gray">No eligible items found</div>
              ) : (
                filteredDest.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setDestItemId(item.id)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                      destItemId === item.id
                        ? 'bg-cult-info-muted text-cult-info'
                        : 'text-cult-silver hover:bg-cult-medium-gray/40 hover:text-cult-white'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="font-mono font-medium truncate">{item.package_id}</span>
                      <span className="text-cult-lighter-gray truncate">{item.strain || ''}</span>
                    </span>
                    <span className="tabular-nums flex-shrink-0 ml-2">
                      {(item.on_hand_qty || 0).toFixed(sourceUnit === 'g' ? 1 : 0)} {sourceUnit}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-cult-silver mb-2">
              Transfer Amount <span className="text-cult-danger">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step={sourceUnit === 'g' ? '0.1' : '1'}
                min="0"
                max={sourceQty}
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-sm text-cult-white focus:outline-none focus:border-cult-silver disabled:opacity-50"
                placeholder="0"
              />
              <span className="text-sm text-cult-lighter-gray">{sourceUnit}</span>
            </div>
            {transferQty && !isQtyValid && (
              <p className="mt-1 text-xs text-cult-danger">
                {qty > sourceQty ? 'Exceeds source quantity' : 'Enter a valid positive number'}
              </p>
            )}
          </div>

          {isOver50 && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-cult-warning-muted border border-cult-warning/40">
              <AlertTriangle className="w-4 h-4 text-cult-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-cult-warning">
                Transferring more than 50% of the source quantity ({((qty / sourceQty) * 100).toFixed(0)}%). Verify this is intentional.
              </p>
            </div>
          )}

          {isQtyValid && destItem && (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4 rounded-lg bg-cult-dark-gray border border-cult-medium-gray">
              <div className="text-center">
                <div className="text-xs text-cult-lighter-gray mb-1">Source After</div>
                <div className="text-lg font-bold text-cult-white tabular-nums">
                  {sourceAfter.toFixed(sourceUnit === 'g' ? 1 : 0)}
                </div>
                <div className="text-xs text-cult-danger tabular-nums">-{qty.toFixed(sourceUnit === 'g' ? 1 : 0)}</div>
              </div>
              <ArrowRight className="w-5 h-5 text-cult-lighter-gray" />
              <div className="text-center">
                <div className="text-xs text-cult-lighter-gray mb-1">Dest After</div>
                <div className="text-lg font-bold text-cult-white tabular-nums">
                  {destAfter.toFixed(sourceUnit === 'g' ? 1 : 0)}
                </div>
                <div className="text-xs text-cult-success tabular-nums">+{qty.toFixed(sourceUnit === 'g' ? 1 : 0)}</div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-cult-silver mb-2">
              Reason <span className="text-cult-danger">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as VarianceReason)}
              disabled={saving}
              className="w-full px-4 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-sm text-cult-white focus:outline-none focus:border-cult-silver disabled:opacity-50"
            >
              <option value="">Select a reason...</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-cult-silver mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
              rows={2}
              placeholder="Optional notes..."
              className="w-full px-4 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded-lg text-sm text-cult-white placeholder-cult-lighter-gray focus:outline-none focus:border-cult-silver disabled:opacity-50 resize-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-cult-danger-muted border border-cult-danger/40">
              <p className="text-sm text-cult-danger">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-cult-medium-gray">
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-5 py-2 text-sm text-cult-silver border border-cult-medium-gray rounded-lg hover:bg-cult-dark-gray hover:text-cult-white disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-5 py-2 text-sm font-medium text-white bg-cult-info rounded-lg hover:bg-cult-info/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Applying...' : 'Apply Rebalance'}
          </button>
        </div>
      </div>
    </div>
  );
}
