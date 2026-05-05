/**
 * BulkBagCreationModal Component
 *
 * Allows managers to create multiple bulk bags from aggregated conversion sessions.
 * Supports partial finalization - can create some bags and leave rest for later.
 * Validates total weight and generates sequential package IDs.
 *
 * IMPORTANT: The session.output_weight value is already the REMAINING weight after
 * subtracting packaged amounts. The pending_conversion_sessions VIEW calculates this
 * at the database level: SUM(session_output) - COALESCE(SUM(packaged), 0).
 * No additional service calls needed.
 *
 * @module BulkBagCreationModal
 */

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertTriangle, CheckCircle, Package, AlertCircle, TrendingDown } from 'lucide-react';
import { PendingConversionSession } from '@/types';
import { VarianceReason, VarianceReasonLabels } from '../types/conversions.types';
import { useBulkBagPackageId } from '../hooks/useBulkBagPackageId';

const VARIANCE_THRESHOLD_GRAMS = 1;
const VARIANCE_HIGH_THRESHOLD_PCT = 50;

interface BulkBag {
 id: string;
 weight: number;
}

export interface BulkBagVarianceData {
 expected_weight: number;
 actual_weight: number;
 variance_reason: VarianceReason;
 variance_note: string;
}

interface BulkBagCreationModalProps {
 session: PendingConversionSession;
 isOpen: boolean;
 onClose: () => void;
 onConfirm: (bags: { package_id: string; weight: number }[], variance?: BulkBagVarianceData) => Promise<void>;
 adjustedAvailableWeight?: number;
 writeOffGrams?: number;
}

export function BulkBagCreationModal({
 session,
 isOpen,
 onClose,
 onConfirm,
 adjustedAvailableWeight,
 writeOffGrams,
}: BulkBagCreationModalProps) {
 const [bags, setBags] = useState<BulkBag[]>([]);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [varianceReason, setVarianceReason] = useState<VarianceReason | ''>('');
 const [varianceNote, setVarianceNote] = useState('');
 const [highVarianceConfirmed, setHighVarianceConfirmed] = useState(false);

 const availableWeight = adjustedAvailableWeight ?? (session.output_weight || 0);
 const [remainingWeight, setRemainingWeight] = useState<number>(availableWeight);

 const { generateBatchIds, isLoading: isLoadingIds } = useBulkBagPackageId(
 session.batch_id,
 session.strain_id
 );

 // Update remaining weight when bags change or available weight changes
 useEffect(() => {
 const totalAllocated = bags.reduce((sum, bag) => sum + (bag.weight || 0), 0);
 setRemainingWeight(availableWeight - totalAllocated);
 }, [bags, availableWeight]);

 useEffect(() => {
 if (isOpen) {
 setBags([]);
 setError(null);
 setVarianceReason('');
 setVarianceNote('');
 setHighVarianceConfirmed(false);
 }
 }, [isOpen, session.aggregation_id]);

 const handleAddBag = () => {
 const newBag: BulkBag = {
 id: `bag-${Date.now()}`,
 weight: 0,
 };
 setBags([...bags, newBag]);
 };

 const handleRemoveBag = (id: string) => {
 setBags(bags.filter(bag => bag.id !== id));
 };

 const handleWeightChange = (id: string, value: string) => {
 const weight = parseFloat(value) || 0;
 setBags(bags.map(bag => (bag.id === id ? { ...bag, weight } : bag)));
 };

 const handleSplitEvenly = () => {
 if (bags.length === 0) return;

 const weightPerBag = availableWeight / bags.length;
 setBags(bags.map(bag => ({ ...bag, weight: Math.round(weightPerBag * 10) / 10 })));
 };

 const handleUseAllRemaining = () => {
 if (bags.length === 0) return;

 const lastBag = bags[bags.length - 1];
 setBags(bags.map(bag => (bag.id === lastBag.id ? { ...bag, weight: remainingWeight } : bag)));
 };

 const handleConfirm = async () => {
 setError(null);

 if (bags.length === 0) {
 setError('Please add at least one bag');
 return;
 }

 const totalWeight = bags.reduce((sum, bag) => sum + bag.weight, 0);
 if (totalWeight === 0) {
 setError('Total weight must be greater than 0');
 return;
 }

 const invalidBags = bags.filter(bag => bag.weight <= 0);
 if (invalidBags.length > 0) {
 setError('All bags must have a weight greater than 0');
 return;
 }

 const hasVariance = bags.length > 0 && Math.abs(remainingWeight) > VARIANCE_THRESHOLD_GRAMS;

 if (hasVariance && !varianceReason) {
 setError('Variance reason is required when bag weights do not match available weight');
 return;
 }

 if (hasVariance && (!varianceNote || varianceNote.trim().length < 10)) {
 setError('Variance notes are required (minimum 10 characters)');
 return;
 }

 if (hasVariance && varianceReason === 'other' && varianceNote.trim().length <20) {
 setError('For"Other" reason, please provide detailed notes (minimum20 characters)');
 return;
 }

 try {
 setIsSubmitting(true);

 const packageIds = await generateBatchIds(bags.length);

 const bagsWithIds = bags.map((bag, index) => ({
 package_id: packageIds[index],
 weight: bag.weight,
 }));

 const varianceData: BulkBagVarianceData | undefined = hasVariance && varianceReason
 ? {
 expected_weight: availableWeight,
 actual_weight: totalWeight,
 variance_reason: varianceReason,
 variance_note: varianceNote.trim(),
 }
 : undefined;

 await onConfirm(bagsWithIds, varianceData);

 onClose();
 } catch (err) {
 console.error('Error creating bulk bags:', err);
 setError(err instanceof Error ? err.message : 'Failed to create bulk bags');
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleClose = () => {
 setBags([]);
 setError(null);
 setVarianceReason('');
 setVarianceNote('');
 setHighVarianceConfirmed(false);
 onClose();
 };

 if (!isOpen) return null;

 const totalAllocated = bags.reduce((sum, bag) => sum + bag.weight, 0);
 const isOverAllocated = totalAllocated > availableWeight;
 const isUnderAllocated = totalAllocated < availableWeight && bags.length > 0;
 const hasVarianceAtThreshold = bags.length > 0 && Math.abs(availableWeight - totalAllocated) > VARIANCE_THRESHOLD_GRAMS;
 const variancePct = availableWeight > 0 ? (Math.abs(remainingWeight) / availableWeight) * 100 : 0;
 const isHighVariance = bags.length > 0 && variancePct > VARIANCE_HIGH_THRESHOLD_PCT;
 return (
 <div className="fixed inset-0 z-50 overflow-y-auto">
 {/* Backdrop */}
 <div
 className="fixed inset-0 bg-black/60 transition-opacity"
 />

 {/* Modal */}
 <div className="flex min-h-full items-center justify-center p-4">
 <div className="relative bg-cult-surface-raised rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-cult-border-subtle">
 <div>
 <h2 className="text-xl font-semibold text-cult-text-primary">Create Bulk Bags</h2>
 <p className="text-sm text-cult-text-faint mt-1">
 {session.strain_name} · {session.batch_name} · {session.product_name}
 </p>
 </div>
 <button
 onClick={handleClose}
 className="text-cult-text-muted hover:text-cult-text-faint transition-colors"
 disabled={isSubmitting}
 >
 <X className="w-6 h-6" />
 </button>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto px-6 py-6">
 <div className="bg-cult-info-muted border border-cult-info/30 rounded-lg p-4 mb-6">
 <h3 className="text-sm font-medium text-cult-text-primary mb-2">Available Weight</h3>
 <div className="flex items-baseline gap-2">
 <div className="text-3xl font-bold text-cult-text-primary">{availableWeight}g</div>
 <div className="text-sm text-cult-text-secondary">
 from {session.session_count} session{session.session_count !== 1 ? 's' : ''}
 </div>
 </div>
 {writeOffGrams != null && writeOffGrams > 0 && (
 <div className="mt-2 text-xs text-cult-text-secondary bg-cult-info-muted rounded px-2 py-1 inline-block">
 After {writeOffGrams}g water loss write-off (original: {session.output_weight}g)
 </div>
 )}
 </div>

 {/* Remaining Weight Indicator */}
 <div
 className={`p-4 rounded-lg mb-6 ${
 isOverAllocated
 ? 'bg-cult-danger-muted border border-cult-danger/30'
 : isUnderAllocated
 ? 'bg-cult-warning-muted border border-cult-warning/30'
 : 'bg-cult-success-muted border border-cult-success/30'
 }`}
 >
 <div className="flex items-center gap-2">
 {isOverAllocated ? (
 <AlertTriangle className="w-5 h-5 text-cult-danger" />
 ) : isUnderAllocated ? (
 <AlertTriangle className="w-5 h-5 text-cult-warning" />
 ) : (
 <CheckCircle className="w-5 h-5 text-cult-success" />
 )}
 <div className="flex-1">
 <div className="text-sm font-medium">
 <span
 className={
 isOverAllocated
 ? 'text-cult-text-primary'
 : isUnderAllocated
 ? 'text-cult-text-primary'
 : 'text-cult-text-primary'
 }
 >
 Remaining: {remainingWeight}g
 </span>
 </div>
 <div
 className={`text-xs ${
 isOverAllocated
 ? 'text-cult-text-secondary'
 : isUnderAllocated
 ? 'text-cult-text-secondary'
 : 'text-cult-text-secondary'
 }`}
 >
 {isOverAllocated
 ? 'Over-allocated — provide a variance reason below to continue'
 : isUnderAllocated
 ? 'Some weight remaining - you can create more bags later'
 : 'All weight allocated'}
 </div>
 </div>
 </div>
 </div>

 {/* Error Display */}
 {error && (
 <div className="bg-cult-danger-muted border border-cult-danger/30 rounded-lg p-4 mb-6">
 <div className="flex items-start gap-3">
 <AlertTriangle className="w-5 h-5 text-cult-danger flex-shrink-0 mt-0.5" />
 <div>
 <h4 className="text-sm font-medium text-cult-text-primary mb-1">Error</h4>
 <p className="text-sm text-cult-text-secondary">{error}</p>
 </div>
 </div>
 </div>
 )}

 {/* Bags List */}
 <div className="mb-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-sm font-medium text-cult-text-primary">Bulk Bags</h3>
 <div className="flex gap-2">
 {bags.length > 0 && (
 <>
 <button
 onClick={handleSplitEvenly}
 className="text-xs px-3 py-1 bg-cult-surface text-cult-text-muted rounded hover:bg-cult-surface-raised transition-colors"
 disabled={isSubmitting}
 >
 Split Evenly
 </button>
 <button
 onClick={handleUseAllRemaining}
 className="text-xs px-3 py-1 bg-cult-surface text-cult-text-muted rounded hover:bg-cult-surface-raised transition-colors"
 disabled={isSubmitting || remainingWeight <= 0}
 >
 Use Remaining
 </button>
 </>
 )}
 </div>
 </div>

 {bags.length === 0 ? (
 <div className="bg-cult-surface-sunken border border-cult-border-subtle rounded-lg p-8 text-center">
 <Package className="w-12 h-12 text-cult-text-muted mx-auto mb-3" />
 <p className="text-sm text-cult-text-faint mb-4">No bags added yet</p>
 <button
 onClick={handleAddBag}
 className="inline-flex items-center gap-2 px-4 py-2 bg-cult-info text-white rounded-lg hover:bg-cult-info/80 transition-colors"
 disabled={isSubmitting}
 >
 <Plus className="w-4 h-4" />
 Add First Bag
 </button>
 </div>
 ) : (
 <div className="space-y-3">
 {bags.map((bag, index) => (
 <div
 key={bag.id}
 className="flex items-center gap-3 p-3 bg-cult-surface-sunken border border-cult-border-subtle rounded-lg"
 >
 <div className="flex-shrink-0 w-8 h-8 bg-cult-info-muted rounded-full flex items-center justify-center">
 <span className="text-sm font-medium text-cult-text-primary">{index + 1}</span>
 </div>
 <div className="flex-1">
 <label className="block text-xs text-cult-text-faint mb-1">Weight (grams)</label>
 <input
 type="number"
 value={bag.weight || ''}
 onChange={e => handleWeightChange(bag.id, e.target.value)}
 className="w-full px-3 py-2 bg-cult-surface-raised text-cult-text-primary border border-cult-border rounded-lg focus:ring-2 focus:ring-cult-info focus:border-transparent"
 placeholder="0"
 min="0"
 step="0.1"
 disabled={isSubmitting}
 />
 </div>
 <button
 onClick={() => handleRemoveBag(bag.id)}
 className="flex-shrink-0 p-2 text-cult-danger hover:bg-cult-danger-muted rounded-lg transition-colors"
 disabled={isSubmitting}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 ))}

 <button
 onClick={handleAddBag}
 className="w-full py-2 border-2 border-dashed border-cult-border rounded-lg text-cult-text-faint hover:border-cult-info hover:text-cult-info transition-colors flex items-center justify-center gap-2"
 disabled={isSubmitting}
 >
 <Plus className="w-4 h-4" />
 Add Another Bag
 </button>
 </div>
 )}
 </div>

 {bags.length > 0 && (
 <div className="bg-cult-surface-sunken border border-cult-border-subtle rounded-lg p-4 mb-6">
 <h4 className="text-sm font-medium text-cult-text-primary mb-3">Summary</h4>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
 <div>
 <div className="text-cult-text-faint">Total Bags</div>
 <div className="font-semibold text-cult-text-primary">{bags.length}</div>
 </div>
 <div>
 <div className="text-cult-text-faint">Total Weight</div>
 <div className="font-semibold text-cult-text-primary">{totalAllocated}g</div>
 </div>
 <div>
 <div className="text-cult-text-faint">Available</div>
 <div className="font-semibold text-cult-text-primary">{availableWeight}g</div>
 </div>
 <div>
 <div className="text-cult-text-faint">Remaining</div>
 <div
 className={`font-semibold ${
 isOverAllocated
 ? 'text-cult-danger'
 : isUnderAllocated
 ? 'text-cult-warning'
 : 'text-cult-success'
 }`}
 >
 {remainingWeight}g
 </div>
 </div>
 </div>
 </div>
 )}

 {bags.length > 0 && Math.abs(remainingWeight) > VARIANCE_THRESHOLD_GRAMS && (
 <div className="space-y-4">
 <div className="p-4 rounded-lg border bg-cult-danger-muted border-cult-danger/30">
 <div className="flex items-center justify-between">
 <div className="flex items-center">
 <TrendingDown className="h-5 w-5 text-cult-danger mr-2" />
 <div>
 <div className="text-xs font-medium text-cult-text-primary">
 Weight Variance
 </div>
 <div className="text-xl font-bold text-cult-danger">
 {remainingWeight > 0 ? '-' : '+'}{Math.abs(remainingWeight).toFixed(1)}g
 </div>
 </div>
 </div>
 <div className="text-2xl font-bold text-cult-danger">
 {availableWeight > 0 ? (Math.abs(remainingWeight) / availableWeight * 100).toFixed(1) : '0.0'}%
 </div>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-cult-text-primary mb-2">
 Variance Reason <span className="text-cult-danger">*</span>
 </label>
 <select
 value={varianceReason}
 onChange={(e) => setVarianceReason(e.target.value as VarianceReason)}
 disabled={isSubmitting}
 className="w-full px-3 py-2 bg-cult-surface-raised text-cult-text-primary border border-cult-border rounded-lg focus:ring-2 focus:ring-cult-info focus:border-transparent"
 >
 <option value="">Select a reason...</option>
 {(Object.entries(VarianceReasonLabels) as [VarianceReason, string][]).map(([value, label]) => (
 <option key={value} value={value}>{label}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-cult-text-primary mb-2">
 Notes <span className="text-cult-danger">*</span>
 </label>
 <textarea
 value={varianceNote}
 onChange={(e) => setVarianceNote(e.target.value)}
 disabled={isSubmitting}
 rows={3}
 placeholder="Explain the reason for this variance..."
 className="w-full px-3 py-2 bg-cult-surface-raised text-cult-text-primary border border-cult-border rounded-lg focus:ring-2 focus:ring-cult-info focus:border-transparent resize-none"
 />
 </div>

 {availableWeight > 0 && variancePct >= 5 && !isHighVariance && (
 <div className="p-3 rounded-lg bg-cult-warning-muted border border-cult-warning/30">
 <div className="flex items-start gap-2.5">
 <AlertCircle className="h-4 w-4 text-cult-warning mt-0.5 flex-shrink-0" />
 <div className="text-xs text-cult-text-secondary">
 <p className="font-medium mb-0.5">High Variance Warning</p>
 <p>This adjustment represents a variance of {variancePct.toFixed(1)}%, which exceeds the 5% threshold.</p>
 </div>
 </div>
 </div>
 )}

 {isHighVariance && (
 <div className="p-4 rounded-lg bg-cult-danger-muted border-2 border-cult-danger">
 <div className="flex items-start gap-3 mb-3">
 <AlertTriangle className="h-5 w-5 text-cult-danger mt-0.5 flex-shrink-0" />
 <div className="text-sm text-cult-text-primary">
 <p className="font-semibold mb-1">Unusually High Variance — {variancePct.toFixed(1)}%</p>
 <p className="text-xs">This variance exceeds 50% of the available weight. All high-variance finalizations are logged for compliance and AI analysis. You must acknowledge before proceeding.</p>
 </div>
 </div>
 <label className="flex items-center gap-2.5 cursor-pointer">
 <input
 type="checkbox"
 checked={highVarianceConfirmed}
 onChange={(e) => setHighVarianceConfirmed(e.target.checked)}
 disabled={isSubmitting}
 className="w-4 h-4 text-cult-danger border-cult-danger rounded focus:ring-cult-danger"
 />
 <span className="text-xs font-medium text-cult-text-primary">
 I confirm this variance is correct and understand it will be logged to the variance record.
 </span>
 </label>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Footer */}
 <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-cult-border-subtle bg-cult-surface-sunken">
 <button
 onClick={handleClose}
 className="px-4 py-2 text-cult-text-muted bg-cult-surface border border-cult-border rounded-lg hover:bg-cult-surface-sunken transition-colors"
 disabled={isSubmitting}
 >
 Cancel
 </button>
 <button
 onClick={handleConfirm}
 className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
 hasVarianceAtThreshold
 ? 'bg-cult-warning hover:bg-cult-warning/80'
 : 'bg-cult-info hover:bg-cult-info/80'
 }`}
 disabled={
 isSubmitting ||
 bags.length === 0 ||
 isLoadingIds ||
 (Math.abs(remainingWeight) > VARIANCE_THRESHOLD_GRAMS && bags.length > 0 && (!varianceReason || varianceNote.trim().length < 10)) ||
 (isHighVariance && !highVarianceConfirmed)
 }
 >
 {isSubmitting ? (
 <>
 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
 Creating...
 </>
 ) : hasVarianceAtThreshold ? (
 <>
 <AlertTriangle className="w-4 h-4" />
 Finalize with Variance
 </>
 ) : (
 <>
 <CheckCircle className="w-4 h-4" />
 Create {bags.length} Bag{bags.length !== 1 ? 's' : ''}
 </>
 )}
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
