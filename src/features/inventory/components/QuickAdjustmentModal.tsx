/**
 * Quick Adjustment Modal
 *
 * Modal for making quick inventory adjustments.
 * Displays current quantity, calculates variance, and requires reason.
 */

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

export function QuickAdjustmentModal({
  state,
  onClose,
  onNewQtyChange,
  onVarianceReasonChange,
  onNotesChange,
  onSubmit
}: QuickAdjustmentModalProps) {
  if (!state.isOpen) return null;

  const varianceReasons: { value: VarianceReason; label: string }[] = [
    { value: 'moisture_loss', label: 'Moisture Loss' },
    { value: 'spillage', label: 'Spillage' },
    { value: 'measurement_error', label: 'Measurement Error' },
    { value: 'waste', label: 'Waste' },
    { value: 'theft_loss', label: 'Theft/Loss' },
    { value: 'package_not_found', label: 'Package Not Found' },
    { value: 'package_consumed', label: 'Package Consumed' },
    { value: 'package_found', label: 'Package Found' },
    { value: 'other', label: 'Other' }
  ];

  const hasVariance = Math.abs(state.varianceQty) > 0.01;
  const isIncrease = state.varianceQty > 0;

  const handleSubmit = async () => {
    if (!state.validation.isValid) return;
    await onSubmit();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Quick Adjustment</h2>
          <button
            onClick={onClose}
            disabled={state.isSaving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {/* Package Info */}
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Package ID</div>
                <div className="font-mono font-semibold text-gray-900">{state.packageId}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Stage</div>
                <div className="font-semibold text-gray-900">{state.stage}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Product</div>
                <div className="font-semibold text-gray-900">{state.productName}</div>
              </div>
              {state.strain && (
                <div>
                  <div className="text-sm text-gray-600">Strain</div>
                  <div className="font-semibold text-gray-900">{state.strain}</div>
                </div>
              )}
            </div>
          </div>

          {/* Current Quantity */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Current Quantity
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={`${state.currentQty.toFixed(2)} ${state.unit}`}
                disabled
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 font-semibold"
              />
            </div>
          </div>

          {/* New Quantity */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              New Quantity <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={state.newQty}
                onChange={(e) => onNewQtyChange(e.target.value)}
                disabled={state.isSaving}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Enter new quantity"
                autoFocus
              />
              <span className="text-gray-600 font-medium">{state.unit}</span>
            </div>
            {state.validation.errors.newQty && (
              <p className="mt-1 text-sm text-red-600">{state.validation.errors.newQty}</p>
            )}
          </div>

          {/* Variance Display */}
          {hasVariance && (
            <div className={`mb-6 p-4 rounded-lg border-2 ${
              isIncrease
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {isIncrease ? (
                    <TrendingUp className="h-6 w-6 text-green-600 mr-2" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600 mr-2" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {isIncrease ? 'Increase' : 'Decrease'}
                    </div>
                    <div className={`text-2xl font-bold ${
                      isIncrease ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {isIncrease ? '+' : ''}{state.varianceQty.toFixed(2)} {state.unit}
                    </div>
                  </div>
                </div>
                <div className={`text-3xl font-bold ${
                  isIncrease ? 'text-green-700' : 'text-red-700'
                }`}>
                  {isIncrease ? '+' : ''}{state.variancePercentage.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* Variance Reason */}
          {hasVariance && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Variance Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={state.varianceReason}
                onChange={(e) => onVarianceReasonChange(e.target.value as VarianceReason)}
                disabled={state.isSaving}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Select a reason...</option>
                {varianceReasons.map(reason => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
              {state.validation.errors.varianceReason && (
                <p className="mt-1 text-sm text-red-600">{state.validation.errors.varianceReason}</p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Notes {hasVariance && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={state.notes}
              onChange={(e) => onNotesChange(e.target.value)}
              disabled={state.isSaving}
              rows={3}
              placeholder={hasVariance ? "Explain the reason for this adjustment..." : "Optional notes about this adjustment"}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
            {state.validation.errors.notes && (
              <p className="mt-1 text-sm text-red-600">{state.validation.errors.notes}</p>
            )}
          </div>

          {/* Warning */}
          {hasVariance && Math.abs(state.variancePercentage) >= 5 && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-orange-800">
                  <p className="font-semibold mb-1">High Variance Warning</p>
                  <p>This adjustment represents a variance of {Math.abs(state.variancePercentage).toFixed(1)}%, which exceeds the critical threshold. Please ensure the quantity and reason are correct.</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {state.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-red-800">{state.error}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={state.isSaving}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={state.isSaving || !state.validation.isValid}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {state.isSaving ? 'Applying...' : 'Apply Adjustment'}
          </button>
        </div>
      </div>
    </div>
  );
}
