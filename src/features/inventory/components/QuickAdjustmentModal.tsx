import { X, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import type { QuickAdjustmentModalState, VarianceReason } from '../types';

interface QuickAdjustmentModalProps {
 state: QuickAdjustmentModalState;
 onClose: () => void;
 onNewQtyChange: (value: string) => void;
 onVarianceReasonChange: (reason: VarianceReason | '') => void;
 onNotesChange: (notes: string) => void;
 onSubmit: () => Promise<void>;
}

const VARIANCE_REASONS: { value: VarianceReason; label: string }[] = [
 { value: 'shrinkage', label: 'Shrinkage' },
 { value: 'waste', label: 'Waste' },
 { value: 'damage', label: 'Damage' },
 { value: 'measurement_error', label: 'Measurement Error' },
 { value: 'found_inventory', label: 'Found Inventory' },
 { value: 'packaging_loss', label: 'Packaging Loss' },
 { value: 'other', label: 'Other' },
];

export function QuickAdjustmentModal({
 state,
 onClose,
 onNewQtyChange,
 onVarianceReasonChange,
 onNotesChange,
 onSubmit
}: QuickAdjustmentModalProps) {
 if (!state.isOpen) return null;

 const hasVariance = Math.abs(state.varianceQty) > 0.01;
 const isIncrease = state.varianceQty > 0;

 const handleSubmit = async () => {
 if (!state.validation.isValid) return;
 await onSubmit();
 };

 return (
 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
 <div className="bg-cult-surface border border-cult-border rounded-cult max-w-2xl w-full max-h-[90vh] flex flex-col">
 <div className="flex items-center justify-between px-6 py-4 border-b border-cult-border">
 <h2 className="text-lg font-semibold text-cult-text-primary">Quick Adjustment</h2>
 <button
 onClick={onClose}
 disabled={state.isSaving}
 className="text-cult-text-muted hover:text-cult-text-primary disabled:opacity-50"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-6 space-y-5">
 <div className="p-4 rounded-lg bg-cult-surface border border-cult-border">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <div className="text-xs text-cult-text-muted">Package ID</div>
 <div className="font-mono font-semibold text-cult-text-primary">{state.packageId}</div>
 </div>
 <div>
 <div className="text-xs text-cult-text-muted">Stage</div>
 <div className="font-semibold text-cult-text-primary capitalize">{state.stage}</div>
 </div>
 <div>
 <div className="text-xs text-cult-text-muted">Product</div>
 <div className="font-semibold text-cult-text-primary">{state.productName}</div>
 </div>
 {state.strain && (
 <div>
 <div className="text-xs text-cult-text-muted">Strain</div>
 <div className="font-semibold text-cult-text-primary">{state.strain}</div>
 </div>
 )}
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-cult-text-secondary mb-2">Current Quantity</label>
 <input
 type="text"
 value={`${state.currentQty.toFixed(2)} ${state.unit}`}
 disabled
 className="w-full px-4 py-2 bg-cult-surface border border-cult-border rounded-lg text-cult-text-secondary font-semibold"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-cult-text-secondary mb-2">
 New Quantity <span className="text-cult-danger">*</span>
 </label>
 <div className="flex items-center gap-2">
 <input
 type="number"
 step="0.01"
 min="0"
 value={state.newQty}
 onChange={(e) => onNewQtyChange(e.target.value)}
 disabled={state.isSaving}
 className="flex-1 px-4 py-2 bg-cult-surface border border-cult-border rounded-lg text-cult-text-primary focus:outline-none focus:border-cult-text-secondary disabled:opacity-50"
 placeholder="Enter new quantity"
 autoFocus
 />
 <span className="text-sm text-cult-text-muted">{state.unit}</span>
 </div>
 {state.validation.errors.new_qty && (
 <p className="mt-1 text-xs text-cult-danger">{state.validation.errors.new_qty}</p>
 )}
 </div>

 {hasVariance && (
 <div className={`p-4 rounded-lg border ${
 isIncrease
 ? 'bg-cult-success-muted border-cult-success/40'
 : 'bg-cult-danger-muted border-cult-danger/40'
 }`}>
 <div className="flex items-center justify-between">
 <div className="flex items-center">
 {isIncrease ? (
 <TrendingUp className="h-5 w-5 text-cult-success mr-2" />
 ) : (
 <TrendingDown className="h-5 w-5 text-cult-danger mr-2" />
 )}
 <div>
 <div className="text-xs font-medium text-cult-text-secondary">
 {isIncrease ? 'Increase' : 'Decrease'}
 </div>
 <div className={`text-xl font-bold ${
 isIncrease ? 'text-cult-success' : 'text-cult-danger'
 }`}>
 {isIncrease ? '+' : ''}{state.varianceQty.toFixed(2)} {state.unit}
 </div>
 </div>
 </div>
 <div className={`text-2xl font-bold ${
 isIncrease ? 'text-cult-success' : 'text-cult-danger'
 }`}>
 {isIncrease ? '+' : ''}{state.variancePercentage.toFixed(1)}%
 </div>
 </div>
 </div>
 )}

 {hasVariance && (
 <div>
 <label className="block text-sm font-medium text-cult-text-secondary mb-2">
 Variance Reason <span className="text-cult-danger">*</span>
 </label>
 <select
 value={state.varianceReason}
 onChange={(e) => onVarianceReasonChange(e.target.value as VarianceReason)}
 disabled={state.isSaving}
 className="w-full px-4 py-2 bg-cult-surface border border-cult-border rounded-lg text-cult-text-primary focus:outline-none focus:border-cult-text-secondary disabled:opacity-50"
 >
 <option value="">Select a reason...</option>
 {VARIANCE_REASONS.map(reason => (
 <option key={reason.value} value={reason.value}>
 {reason.label}
 </option>
 ))}
 </select>
 {state.validation.errors.variance_reason && (
 <p className="mt-1 text-xs text-cult-danger">{state.validation.errors.variance_reason}</p>
 )}
 </div>
 )}

 <div>
 <label className="block text-sm font-medium text-cult-text-secondary mb-2">
 Notes {hasVariance && <span className="text-cult-danger">*</span>}
 </label>
 <textarea
 value={state.notes}
 onChange={(e) => onNotesChange(e.target.value)}
 disabled={state.isSaving}
 rows={3}
 placeholder={hasVariance ?"Explain the reason for this adjustment..." :"Optional notes about this adjustment"}
 className="w-full px-4 py-2 bg-cult-surface border border-cult-border rounded-lg text-cult-text-primary placeholder-cult-text-muted focus:outline-none focus:border-cult-text-secondary disabled:opacity-50 resize-none"
 />
 {state.validation.errors.notes && (
 <p className="mt-1 text-xs text-cult-danger">{state.validation.errors.notes}</p>
 )}
 </div>

 {hasVariance && Math.abs(state.variancePercentage) >= 5 && (
 <div className="p-3 rounded-lg bg-cult-warning-muted border border-cult-warning/40">
 <div className="flex items-start gap-2.5">
 <AlertCircle className="h-4 w-4 text-cult-warning mt-0.5 flex-shrink-0" />
 <div className="text-xs text-cult-warning">
 <p className="font-medium mb-0.5">High Variance Warning</p>
 <p>This adjustment represents a variance of {Math.abs(state.variancePercentage).toFixed(1)}%, which exceeds the critical threshold.</p>
 </div>
 </div>
 </div>
 )}

 {state.error && (
 <div className="p-3 rounded-lg bg-red-900/15 border border-red-800/40">
 <div className="flex items-start gap-2.5">
 <AlertCircle className="h-4 w-4 text-cult-danger mt-0.5 flex-shrink-0" />
 <p className="text-sm text-cult-danger">{state.error}</p>
 </div>
 </div>
 )}
 </div>

 <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-cult-border">
 <button
 onClick={onClose}
 disabled={state.isSaving}
 className="px-5 py-2 text-sm text-cult-text-secondary border border-cult-border rounded-lg hover:bg-cult-surface hover:text-cult-text-primary disabled:opacity-50 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={handleSubmit}
 disabled={state.isSaving || !state.validation.isValid}
 className="px-5 py-2 text-sm font-medium text-white bg-cult-info rounded-lg hover:bg-cult-info/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 {state.isSaving ? 'Applying...' : 'Apply Adjustment'}
 </button>
 </div>
 </div>
 </div>
 );
}
