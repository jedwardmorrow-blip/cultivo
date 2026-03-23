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

    // Allow upward variance (actual > recorded) with reason/notes,
    // but hard-block if over by more than 50% (likely data entry error)
    const overagePercent = availableWeight > 0 ? ((totalWeight - availableWeight) / availableWeight) * 100 : 0;
    if (totalWeight > availableWeight && overagePercent > 50) {
      setError(`Total weight (${totalWeight}g) exceeds available weight (${availableWeight}g) by more than 50%. Please verify your entries.`);
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

    if (hasVariance && varianceReason === 'other' && varianceNote.trim().length < 20) {
      setError('For "Other" reason, please provide detailed notes (minimum 20 characters)');
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
    onClose();
  };

  if (!isOpen) return null;

  const totalAllocated = bags.reduce((sum, bag) => sum + bag.weight, 0);
  const isOverAllocated = totalAllocated > availableWeight;
  const isUnderAllocated = totalAllocated < availableWeight && bags.length > 0;
  const hasVarianceAtThreshold = bags.length > 0 && Math.abs(availableWeight - totalAllocated) > VARIANCE_THRESHOLD_GRAMS;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Available Weight</h3>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-blue-900">{availableWeight}g</div>
                <div className="text-sm text-blue-700">
                  from {session.session_count} session{session.session_count !== 1 ? 's' : ''}
                </div>
              </div>
              {writeOffGrams != null && writeOffGrams > 0 && (
                <div className="mt-2 text-xs text-blue-700 bg-blue-100 rounded px-2 py-1 inline-block">
                  After {writeOffGrams}g water loss write-off (original: {session.output_weight}g)
                </div>
              )}
            </div>

            {/* Remaining Weight Indicator */}
            <div
              className={`p-4 rounded-lg mb-6 ${
                isOverAllocated
                  ? 'bg-red-50 border border-red-200'
                  : isUnderAllocated
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-green-50 border border-green-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {isOverAllocated ? (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                ) : isUnderAllocated ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    <span
                      className={
                        isOverAllocated
                          ? 'text-red-900'
                          : isUnderAllocated
                          ? 'text-yellow-900'
                          : 'text-green-900'
                      }
                    >
                      Remaining: {remainingWeight}g
                    </span>
                  </div>
                  <div
                    className={`text-xs ${
                      isOverAllocated
                        ? 'text-red-700'
                        : isUnderAllocated
                        ? 'text-yellow-700'
                        : 'text-green-700'
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
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-900 mb-1">Error</h4>
                    <p className="text-sm text-red-800">{error}</p>
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
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-900">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-cult-text-faint mb-1">Weight (grams)</label>
                        <input
                          type="number"
                          value={bag.weight || ''}
                          onChange={e => handleWeightChange(bag.id, e.target.value)}
                          className="w-full px-3 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                          min="0"
                          step="0.1"
                          disabled={isSubmitting}
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveBag(bag.id)}
                        className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        disabled={isSubmitting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={handleAddBag}
                    className="w-full py-2 border-2 border-dashed border-cult-border rounded-lg text-cult-text-faint hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
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
                          ? 'text-red-600'
                          : isUnderAllocated
                          ? 'text-yellow-600'
                          : 'text-green-600'
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
                <div className="p-4 rounded-lg border bg-red-50 border-red-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
                      <div>
                        <div className="text-xs font-medium text-red-900">
                          Weight Variance
                        </div>
                        <div className="text-xl font-bold text-red-600">
                          {remainingWeight > 0 ? '-' : '+'}{Math.abs(remainingWeight).toFixed(1)}g
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {availableWeight > 0 ? (Math.abs(remainingWeight) / availableWeight * 100).toFixed(1) : '0.0'}%
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cult-text-primary mb-2">
                    Variance Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={varianceReason}
                    onChange={(e) => setVarianceReason(e.target.value as VarianceReason)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a reason...</option>
                    {(Object.entries(VarianceReasonLabels) as [VarianceReason, string][]).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cult-text-primary mb-2">
                    Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={varianceNote}
                    onChange={(e) => setVarianceNote(e.target.value)}
                    disabled={isSubmitting}
                    rows={3}
                    placeholder="Explain the reason for this variance..."
                    className="w-full px-3 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {availableWeight > 0 && (Math.abs(remainingWeight) / availableWeight * 100) >= 5 && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-amber-800">
                        <p className="font-medium mb-0.5">High Variance Warning</p>
                        <p>This adjustment represents a variance of {(Math.abs(remainingWeight) / availableWeight * 100).toFixed(1)}%, which exceeds the critical threshold.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-cult-border-subtle bg-cult-surface-sunken">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-cult-text-muted bg-white border border-cult-border rounded-lg hover:bg-cult-surface-sunken transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                hasVarianceAtThreshold
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={
                isSubmitting ||
                bags.length === 0 ||
                isLoadingIds ||
                (Math.abs(remainingWeight) > VARIANCE_THRESHOLD_GRAMS && bags.length > 0 && (!varianceReason || varianceNote.trim().length < 10))
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
