/**
 * Audit Initiation Modal
 *
 * Modal for starting a new inventory audit.
 * Allows selection of stages to audit and optional notes.
 */

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { AuditInitiationRequest } from '../types';

interface AuditInitiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: AuditInitiationRequest) => Promise<void>;
  availableStages: string[];
  isLoading?: boolean;
  error?: string | null;
}

export function AuditInitiationModal({
  isOpen,
  onClose,
  onSubmit,
  availableStages,
  isLoading = false,
  error = null
}: AuditInitiationModalProps) {
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStageToggle = (stage: string) => {
    setSelectedStages(prev =>
      prev.includes(stage)
        ? prev.filter(s => s !== stage)
        : [...prev, stage]
    );
    setValidationError(null);
  };

  const handleSubmit = async () => {
    if (selectedStages.length === 0) {
      setValidationError('Please select at least one stage to audit');
      return;
    }

    const request: AuditInitiationRequest = {
      selected_stages: selectedStages,
      notes: notes.trim() || undefined
    };

    await onSubmit(request);
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedStages([]);
      setNotes('');
      setValidationError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-cult-border-subtle">
          <h2 className="text-2xl font-bold text-cult-text-primary">Initiate Inventory Audit</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-cult-text-muted hover:text-cult-text-faint disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Starting an audit will:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Create a snapshot of current inventory for selected stages</li>
                  <li>Lock the selected stages to prevent modifications</li>
                  <li>Generate an audit sheet for physical counting</li>
                  <li>Track all variances discovered during the audit</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Stage Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-cult-text-primary mb-3">
              Select Stages to Audit <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableStages.map(stage => (
                <label
                  key={stage}
                  className={`
                    flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors
                    ${selectedStages.includes(stage)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-cult-border-subtle bg-white hover:border-cult-border'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedStages.includes(stage)}
                    onChange={() => handleStageToggle(stage)}
                    disabled={isLoading}
                    className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-3 font-medium text-cult-text-primary">{stage}</span>
                </label>
              ))}
            </div>
            {validationError && (
              <p className="mt-2 text-sm text-red-600">{validationError}</p>
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-cult-text-primary mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              rows={4}
              placeholder="Add any notes about this audit (e.g., reason, special instructions)"
              className="w-full px-4 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-cult-surface disabled:cursor-not-allowed"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedStages.length > 0 && (
            <div className="p-4 bg-cult-surface-sunken border border-cult-border-subtle rounded-lg">
              <h3 className="font-semibold text-cult-text-primary mb-2">Audit Summary</h3>
              <div className="text-sm text-cult-text-muted">
                <p>Stages to audit: <span className="font-medium">{selectedStages.join(', ')}</span></p>
                <p className="mt-1">
                  Selected stages will be <span className="font-medium text-orange-600">locked</span> during the audit
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-cult-border-subtle bg-cult-surface-sunken">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-6 py-2 border border-cult-border text-cult-text-muted rounded-lg hover:bg-cult-surface-sunken disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || selectedStages.length === 0}
            className="px-6 py-2 border border-cult-accent text-cult-accent rounded hover:bg-cult-accent hover:text-cult-opaque-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono uppercase tracking-[0.16em] text-[11px]"
          >
            {isLoading ? 'Starting Audit...' : 'Start Audit'}
          </button>
        </div>
      </div>
    </div>
  );
}
