/**
 * VarianceConfirmation Component
 *
 * UI for acknowledging and documenting inventory variance.
 * Requires reason selection and manager acknowledgment.
 */

import { AlertTriangle } from 'lucide-react';
import { VarianceReason, VarianceReasonLabels, getVarianceSeverity, getVarianceColorClass } from '@/types';

interface VarianceConfirmationProps {
  varianceAmount: number;
  variancePercentage: number;
  isBulk: boolean;
  varianceReason: VarianceReason | null;
  varianceNote: string;
  varianceAcknowledged: boolean;
  onReasonChange: (reason: VarianceReason) => void;
  onNoteChange: (note: string) => void;
  onAcknowledge: (acknowledged: boolean) => void;
}

export function VarianceConfirmation({
  varianceAmount,
  variancePercentage,
  isBulk,
  varianceReason,
  varianceNote,
  varianceAcknowledged,
  onReasonChange,
  onNoteChange,
  onAcknowledge,
}: VarianceConfirmationProps) {
  const severity = getVarianceSeverity(variancePercentage);
  const colorClass = getVarianceColorClass(severity);
  const isShortage = varianceAmount < 0;

  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-amber-100 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-amber-900 mb-1">
            Variance Detected
          </h3>
          <p className="text-sm text-amber-800">
            {isShortage ? 'Shortage' : 'Overage'} of{' '}
            <span className="font-semibold">
              {Math.abs(varianceAmount).toFixed(2)}
              {isBulk ? 'g' : ' units'}
            </span>{' '}
            ({Math.abs(variancePercentage).toFixed(2)}%)
          </p>
        </div>

        {/* Severity badge */}
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
          {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </div>
      </div>

      {/* Reason selection */}
      <div>
        <label htmlFor="variance-reason" className="block text-sm font-medium text-cult-text-primary mb-2">
          Variance Reason <span className="text-red-500">*</span>
        </label>
        <select
          id="variance-reason"
          value={varianceReason || ''}
          onChange={(e) => onReasonChange(e.target.value as VarianceReason)}
          className="w-full px-3 py-2 border border-cult-border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          <option value="">Select a reason...</option>
          {(Object.keys(VarianceReasonLabels) as VarianceReason[]).map((reason) => (
            <option key={reason} value={reason}>
              {VarianceReasonLabels[reason]}
            </option>
          ))}
        </select>
      </div>

      {/* Additional notes */}
      <div>
        <label htmlFor="variance-note" className="block text-sm font-medium text-cult-text-primary mb-2">
          Additional Notes {varianceReason === 'other' && <span className="text-red-500">*</span>}
        </label>
        <textarea
          id="variance-note"
          value={varianceNote}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={3}
          placeholder="Provide additional context about this variance..."
          className="w-full px-3 py-2 border border-cult-border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Acknowledgment checkbox */}
      <div className="bg-white border border-amber-200 rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={varianceAcknowledged}
            onChange={(e) => onAcknowledge(e.target.checked)}
            className="mt-1 rounded border-cult-border text-amber-600 focus:ring-amber-500"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-cult-text-primary mb-1">
              I acknowledge this variance
            </div>
            <div className="text-xs text-cult-text-faint">
              By checking this box, I confirm that I have reviewed the variance details
              and provided an accurate reason for the discrepancy. This action will be
              logged for compliance purposes.
            </div>
          </div>
        </label>
      </div>

      {/* Guidance based on severity */}
      {severity === 'critical' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-800">
            <span className="font-semibold">High variance detected:</span> Variances
            exceeding 5% require additional review. Please ensure the reason and notes
            are detailed and accurate.
          </p>
        </div>
      )}
    </div>
  );
}
