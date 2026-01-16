/**
 * ConsolidatedPackageForm Component
 *
 * Form for creating a single consolidated package from multiple session outputs.
 * Used when manager wants to consolidate (e.g., 3x 180g → 1x 540g).
 *
 * @module ConsolidatedPackageForm
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, Package, RefreshCw } from 'lucide-react';
import {
  ConversionLotSummary,
  isBulkProduct,
  VarianceReason,
  VarianceReasonLabels
} from '@/types';

interface ConsolidatedPackageFormProps {
  lot: ConversionLotSummary;
  onSubmit: (data: {
    package_id: string;
    weight?: number;
    units?: number;
    variance_reason?: VarianceReason;
    variance_notes?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export function ConsolidatedPackageForm({
  lot,
  onSubmit,
  isSubmitting
}: ConsolidatedPackageFormProps) {
  const isBulk = isBulkProduct(lot);

  // Form state
  const [packageId, setPackageId] = useState('');
  const [actualQuantity, setActualQuantity] = useState<number>(
    isBulk ? (lot.total_weight || 0) : (lot.total_units || 0)
  );
  const [varianceReason, setVarianceReason] = useState<VarianceReason | ''>('');
  const [varianceNotes, setVarianceNotes] = useState('');

  // Calculated values
  const expectedQuantity = isBulk ? (lot.total_weight || 0) : (lot.total_units || 0);
  const variance = actualQuantity - expectedQuantity;
  const variancePercentage = expectedQuantity === 0 ? 0 : (variance / expectedQuantity) * 100;
  const hasVariance = Math.abs(variance) > 0.1; // More than 0.1g/unit difference
  const requiresVarianceReason = Math.abs(variancePercentage) > 5 || Math.abs(variance) > 50;

  // Validation
  const canSubmit =
    packageId.trim().length > 0 &&
    actualQuantity > 0 &&
    (!requiresVarianceReason || varianceReason !== '');

  // Auto-generate package ID suggestion
  const generatePackageId = () => {
    const today = new Date();
    const yy = today.getFullYear().toString().slice(-2);
    const mm = (today.getMonth() + 1).toString().padStart(2, '0');
    const dd = today.getDate().toString().padStart(2, '0');

    // Get strain code from lot
    const strainCode = lot.strain_code || 'XXX';
    const suggested = `${yy}${mm}${dd}-${strainCode}-001`;
    setPackageId(suggested);
  };

  useEffect(() => {
    // Generate initial package ID when component mounts
    if (!packageId) {
      generatePackageId();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    await onSubmit({
      package_id: packageId.trim(),
      weight: isBulk ? actualQuantity : undefined,
      units: isBulk ? undefined : actualQuantity,
      variance_reason: varianceReason !== '' ? varianceReason : undefined,
      variance_notes: varianceNotes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Package className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              Consolidating {lot.contributing_session_count} Sessions
            </h3>
            <p className="text-sm text-blue-700">
              Create a single package from all session outputs
            </p>
          </div>
        </div>
      </div>

      {/* Package ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Package ID
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            placeholder="YYMMDD-STRAIN-###"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={generatePackageId}
            disabled={isSubmitting}
            className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            title="Generate Package ID"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Format: YYMMDD-STRAIN-### (e.g., 251202-GSC-001)
        </p>
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isBulk ? 'Total Weight (grams)' : 'Total Units'}
        </label>
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="number"
                value={actualQuantity}
                onChange={(e) => setActualQuantity(parseFloat(e.target.value) || 0)}
                step={isBulk ? "0.1" : "1"}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              />
            </div>
            <div className="text-sm text-gray-500">
              Expected: {expectedQuantity.toFixed(isBulk ? 1 : 0)}{isBulk ? 'g' : ' units'}
            </div>
          </div>

          {/* Variance indicator */}
          {hasVariance && (
            <div className={`flex items-center gap-2 text-sm ${
              Math.abs(variancePercentage) > 5
                ? 'text-amber-700'
                : 'text-blue-700'
            }`}>
              <AlertTriangle className="w-4 h-4" />
              <span>
                Variance: {variance > 0 ? '+' : ''}{variance.toFixed(isBulk ? 1 : 0)}
                {isBulk ? 'g' : ' units'} ({variancePercentage > 0 ? '+' : ''}
                {variancePercentage.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Variance Reason (conditional) */}
      {requiresVarianceReason && (
        <div className="space-y-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-900 mb-1">
                Variance Reason Required
              </h4>
              <p className="text-sm text-amber-700">
                Variance exceeds threshold (5% or 50{isBulk ? 'g' : ' units'}).
                Please provide a reason.
              </p>
            </div>
          </div>

          {/* Reason dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Variance Reason *
            </label>
            <select
              value={varianceReason}
              onChange={(e) => setVarianceReason(e.target.value as VarianceReason)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
              required
            >
              <option value="">Select a reason...</option>
              {(Object.keys(VarianceReasonLabels) as VarianceReason[]).map((reason) => (
                <option key={reason} value={reason}>
                  {VarianceReasonLabels[reason]}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes {varianceReason === 'other' && '*'}
            </label>
            <textarea
              value={varianceNotes}
              onChange={(e) => setVarianceNotes(e.target.value)}
              rows={3}
              placeholder="Provide additional details about the variance..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={isSubmitting}
              required={varianceReason === 'other'}
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          This will create 1 package instead of {lot.contributing_session_count} packages
        </p>
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Creating Package...</span>
            </>
          ) : (
            <>
              <Package className="w-4 h-4" />
              <span>Create Consolidated Package</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
