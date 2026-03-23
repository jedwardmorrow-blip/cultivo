/**
 * ConversionModal Component
 *
 * Modal for reviewing and finalizing completed production sessions.
 * Manager reviews session outputs, creates packages with variance tracking,
 * and finalizes packages to move them to live inventory.
 */

import { useState } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Package, Boxes, Droplets, Trash2, Check } from 'lucide-react';
import { notificationService } from '@/services/notification.service';
import { PendingConversionSession, CreatePackageInput } from '@/types';
import { VarianceReason, VarianceReasonLabels } from '../types/conversions.types';
import { logVariance } from '../services/conversions.service';
import { useFinalizationWorkflow } from '../hooks';
import { BulkBagCreationModal, BulkBagVarianceData } from './BulkBagCreationModal';

interface ConversionModalProps {
  session: PendingConversionSession;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type ModalStep = 'review' | 'confirm' | 'success';

export function ConversionModal({ session, isOpen, onClose, onComplete }: ConversionModalProps) {
  const [step, setStep] = useState<ModalStep>('review');
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [showBulkBagModal, setShowBulkBagModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const [showWriteOff, setShowWriteOff] = useState(false);
  const [writeOffGrams, setWriteOffGrams] = useState<number>(0);
  const [writeOffReason, setWriteOffReason] = useState<VarianceReason | ''>('moisture_loss');
  const [writeOffNote, setWriteOffNote] = useState('Moisture loss prior to bagging');
  const [isWritingOff, setIsWritingOff] = useState(false);
  const [writeOffApplied, setWriteOffApplied] = useState(false);

  const isBulk = session.output_weight !== null && session.output_weight > 0;
  const adjustedWeight = isBulk ? (session.output_weight || 0) - writeOffGrams : null;

  const {
    isLoading,
    error,
    handleFinalize,
    handleVoid,
  } = useFinalizationWorkflow();

  const handleOpenBulkBags = () => {
    setShowBulkBagModal(true);
  };

  const handleBulkBagsConfirm = async (bags: { package_id: string; weight: number }[], variance?: BulkBagVarianceData) => {
    const packages: CreatePackageInput[] = bags.map(bag => ({
      package_id: bag.package_id,
      weight: bag.weight,
    }));

    const effectiveOutputWeight = writeOffGrams > 0 && adjustedWeight !== null
      ? adjustedWeight
      : session.output_weight;

    const result = await handleFinalize({
      batch_id: session.batch_id,
      product_id: session.product_id,
      product_name: session.product_name,
      session_type: session.session_type,
      session_ids: session.session_ids,
      aggregation_id: session.aggregation_id,
      packages,
      output_weight: effectiveOutputWeight,
      output_units: session.output_units,
    });

    if (result && result.length > 0) {
      if (writeOffGrams > 0 && writeOffReason) {
        try {
          await logVariance({
            batch_id: session.batch_id,
            batch_name: session.batch_name,
            strain_name: session.strain_name,
            product_name: session.product_name,
            expected_weight: session.output_weight || 0,
            actual_weight: (session.output_weight || 0) - writeOffGrams,
            variance_reason: writeOffReason,
            variance_note: writeOffNote.trim() || 'Water loss write-off',
          });
        } catch (err) {
          console.error('Failed to log write-off variance:', err);
        }
      }

      if (variance) {
        try {
          await logVariance({
            batch_id: session.batch_id,
            batch_name: session.batch_name,
            strain_name: session.strain_name,
            product_name: session.product_name,
            expected_weight: variance.expected_weight,
            actual_weight: variance.actual_weight,
            variance_reason: variance.variance_reason,
            variance_note: variance.variance_note,
          });
        } catch (err) {
          console.error('Failed to log variance:', err);
          notificationService.warning('Packages created but variance log failed to save');
        }
      }

      setShowBulkBagModal(false);
      setStep('success');
      setTimeout(() => {
        onComplete();
      }, 2000);
    }
  };

  const handleWriteOffEntireAmount = async () => {
    if (!writeOffReason) {
      notificationService.warning('Please select a reason for the write-off');
      return;
    }
    if (writeOffNote.trim().length < 10) {
      notificationService.warning('Please provide notes (minimum 10 characters)');
      return;
    }

    setIsWritingOff(true);
    try {
      await logVariance({
        batch_id: session.batch_id,
        batch_name: session.batch_name,
        strain_name: session.strain_name,
        product_name: session.product_name,
        expected_weight: session.output_weight || 0,
        actual_weight: 0,
        variance_reason: writeOffReason,
        variance_note: writeOffNote.trim(),
      });

      const result = await handleFinalize({
        batch_id: session.batch_id,
        product_id: session.product_id,
        product_name: session.product_name,
        session_type: session.session_type,
        session_ids: session.session_ids,
        aggregation_id: session.aggregation_id,
        packages: [],
        output_weight: 0,
        output_units: session.output_units,
      });

      if (result && result.length >= 0) {
        setStep('success');
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to write off:', err);
      notificationService.error('Failed to write off amount');
    } finally {
      setIsWritingOff(false);
    }
  };

  const handleConfirmFinalize = async () => {
    setStep('confirm');
  };

  const handleProceedFinalize = async () => {
    // This appears to be legacy code - the proper flow goes through handleBulkBagsConfirm
    // which already has the correct parameters structure
    const result = await handleFinalize({
      batch_id: session.batch_id,
      product_id: session.product_id,
      product_name: session.product_name,
      session_type: session.session_type,
      session_ids: session.session_ids,
      aggregation_id: session.aggregation_id,
      packages: [],  // Empty packages array - likely legacy path
    });

    if (result && result.length >= 0) {
      setStep('success');
      setTimeout(() => {
        onComplete();
      }, 2000);
    }
  };

  const handleVoidSession = async () => {
    if (!voidReason.trim()) {
      notificationService.warning('Please provide a reason for voiding');
      return;
    }

    try {
      await handleVoid({
        batch_id: session.batch_id,
        product_name: session.product_name,
        session_type: session.session_type,
        void_reason: voidReason,
      });
      onComplete();
    } catch (error) {
      console.error('Failed to void session:', error);
      // Error already shown by hook
    }
  };

  const handleCloseModal = () => {
    setStep('review');
    setShowVoidConfirm(false);
    setVoidReason('');
    setShowWriteOff(false);
    setWriteOffGrams(0);
    setWriteOffReason('moisture_loss');
    setWriteOffNote('Moisture loss prior to bagging');
    setWriteOffApplied(false);
    onClose();
  };

  if (!isOpen) return null;

  const sessionTypeLabel = session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1);
  const writeOffValid = writeOffReason !== '' && writeOffNote.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-cult-border-subtle">
            <div>
              <h2 className="text-xl font-semibold text-cult-text-primary">
                {step === 'success' ? 'Finalization Complete' : 'Review Session Output'}
              </h2>
              <p className="text-sm text-cult-text-faint mt-1">
                {session.strain_name} · {session.batch_name} · {sessionTypeLabel}
              </p>
            </div>
            {step !== 'success' && (
              <button
                onClick={handleCloseModal}
                className="text-cult-text-muted hover:text-cult-text-faint transition-colors"
                disabled={isLoading}
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* Error Display */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-900 mb-1">Error</h4>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success State */}
            {step === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Session Finalized Successfully!
                </h3>
                <p className="text-sm text-green-700">
                  Packages have been created and moved to live inventory
                </p>
              </div>
            )}

            {/* Review State */}
            {step === 'review' && !showVoidConfirm && (
              <div className="space-y-6">
                {/* Session Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-3">Session Output</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-blue-700 mb-1">Product</div>
                      <div className="text-sm font-medium text-blue-900">{session.product_name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-700 mb-1">Session Type</div>
                      <div className="text-sm font-medium text-blue-900">{sessionTypeLabel}</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-700 mb-1">Output Quantity</div>
                      <div className="text-2xl font-bold text-blue-900">
                        {isBulk
                          ? `${session.output_weight != null ? session.output_weight.toFixed(0) : 0}g`
                          : `${session.output_units ?? 0} units`}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-700 mb-1">Completed</div>
                      <div className="text-sm font-medium text-blue-900">
                        {new Date(session.completed_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Finalization Info */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-900 mb-1">
                        Ready to Finalize
                      </h4>
                      <p className="text-sm text-amber-800 mb-2">
                        Finalizing this session will:
                      </p>
                      <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                        <li>Create inventory packages with auto-generated IDs</li>
                        <li>Move inventory to the next production stage</li>
                        <li>Track any variance from expected quantities</li>
                        <li>Make packages available for fulfillment</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {isBulk && (
                  <div className="border border-cult-border-subtle rounded-lg overflow-hidden">
                    <button
                      onClick={() => setShowWriteOff(!showWriteOff)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-cult-surface-sunken hover:bg-cult-surface transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-cult-text-primary">
                          Adjust for Loss / Variance
                        </span>
                        {writeOffApplied && writeOffGrams > 0 && (
                          <span className="flex items-center gap-1 text-xs font-medium text-cult-success bg-cult-success/10 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                            -{writeOffGrams}g applied
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-cult-text-muted">
                        {showWriteOff ? 'Collapse' : 'Expand'}
                      </span>
                    </button>

                    {showWriteOff && (
                      <div className="px-4 py-4 space-y-4 border-t border-cult-border-subtle">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-cult-text-muted mb-1">
                              Write-Off Amount (grams)
                            </label>
                            <input
                              type="number"
                              value={writeOffGrams || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const max = session.output_weight || 0;
                                setWriteOffGrams(Math.min(Math.max(val, 0), max));
                              }}
                              className="w-full px-3 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0"
                              min="0"
                              max={session.output_weight || 0}
                              step="0.1"
                            />
                          </div>
                          <button
                            onClick={() => setWriteOffGrams(session.output_weight || 0)}
                            className="mt-5 text-xs px-3 py-2 bg-cult-surface text-cult-text-muted rounded-lg border border-cult-border hover:bg-cult-surface-raised transition-colors"
                          >
                            Use Entire Amount
                          </button>
                        </div>

                        {writeOffGrams > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-baseline justify-between">
                              <div className="text-xs text-blue-700">Adjusted Available Weight</div>
                              <div className="text-lg font-bold text-blue-900">
                                {adjustedWeight !== null ? adjustedWeight.toFixed(1) : 0}g
                              </div>
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                              {session.output_weight}g original - {writeOffGrams}g write-off
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-cult-text-muted mb-1">
                            Reason <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={writeOffReason}
                            onChange={(e) => setWriteOffReason(e.target.value as VarianceReason)}
                            className="w-full px-3 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          >
                            <option value="">Select a reason...</option>
                            {(Object.entries(VarianceReasonLabels) as [VarianceReason, string][]).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-cult-text-muted mb-1">
                            Notes <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={writeOffNote}
                            onChange={(e) => setWriteOffNote(e.target.value)}
                            rows={2}
                            placeholder="Explain the reason for this write-off..."
                            className="w-full px-3 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                          />
                        </div>

                        {writeOffGrams > 0 && writeOffGrams < (session.output_weight || 0) && (
                          <button
                            onClick={() => {
                              if (!writeOffReason) {
                                notificationService.warning('Please select a reason');
                                return;
                              }
                              if (writeOffNote.trim().length < 10) {
                                notificationService.warning('Please provide notes (minimum 10 characters)');
                                return;
                              }
                              setWriteOffApplied(true);
                              setShowWriteOff(false);
                              notificationService.success(`Loss of ${writeOffGrams}g applied. Available weight adjusted to ${adjustedWeight !== null ? adjustedWeight.toFixed(1) : 0}g.`);
                            }}
                            disabled={!writeOffValid}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            <Check className="w-4 h-4" />
                            Apply Loss / Variance (-{writeOffGrams}g)
                          </button>
                        )}

                        {writeOffGrams > 0 && writeOffGrams >= (session.output_weight || 0) && (
                          <button
                            onClick={handleWriteOffEntireAmount}
                            disabled={isWritingOff || isLoading || !writeOffValid}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            {isWritingOff ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Writing off...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                Write Off Entire Amount ({session.output_weight}g)
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Void Option */}
                <div className="border-t border-cult-border-subtle pt-4">
                  <button
                    onClick={() => setShowVoidConfirm(true)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Cancel this session instead
                  </button>
                </div>
              </div>
            )}

            {/* Void Confirmation */}
            {showVoidConfirm && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-900 mb-1">
                        Void Session
                      </h4>
                      <p className="text-sm text-red-800">
                        This action cannot be undone. The session will be marked as voided
                        and no packages will be created.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cult-text-muted mb-2">
                    Reason for voiding (required)
                  </label>
                  <textarea
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Enter reason for voiding this session..."
                    rows={4}
                    className="w-full px-3 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowVoidConfirm(false);
                      setVoidReason('');
                    }}
                    className="flex-1 px-4 py-2 border border-cult-border text-cult-text-muted rounded-lg hover:bg-cult-surface-sunken transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVoidSession}
                    disabled={isLoading || !voidReason.trim()}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Voiding...' : 'Void Session'}
                  </button>
                </div>
              </div>
            )}

            {/* Confirmation State */}
            {step === 'confirm' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <Package className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-2">
                        Confirm Finalization
                      </h4>
                      <p className="text-sm text-blue-800 mb-3">
                        You are about to finalize:
                      </p>
                      <div className="bg-white rounded p-3 mb-3">
                        <div className="text-2xl font-bold text-blue-900 mb-1">
                          {isBulk
                            ? `${session.output_weight != null ? session.output_weight.toFixed(0) : 0}g`
                            : `${session.output_units ?? 0} units`}
                        </div>
                        <div className="text-sm text-blue-700">
                          {session.product_name} from {sessionTypeLabel} session
                        </div>
                      </div>
                      <p className="text-xs text-blue-700">
                        Packages will be created with auto-generated IDs and moved to live inventory.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-cult-border-subtle bg-cult-surface-sunken">
            {step === 'review' && !showVoidConfirm && (
              <>
                <button
                  onClick={handleCloseModal}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-cult-text-muted hover:text-cult-text-primary transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                {isBulk ? (
                  <button
                    onClick={handleOpenBulkBags}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Boxes className="w-5 h-5" />
                    <span>Create Bulk Bags</span>
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmFinalize}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Finalize Session</span>
                  </button>
                )}
              </>
            )}

            {step === 'confirm' && (
              <>
                <button
                  onClick={() => setStep('review')}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-cult-text-muted hover:text-cult-text-primary transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleProceedFinalize}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Finalizing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Confirm & Finalize</span>
                    </>
                  )}
                </button>
              </>
            )}

            {step === 'success' && (
              <button
                onClick={handleCloseModal}
                className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {isBulk && (
        <BulkBagCreationModal
          session={session}
          isOpen={showBulkBagModal}
          onClose={() => setShowBulkBagModal(false)}
          onConfirm={handleBulkBagsConfirm}
          adjustedAvailableWeight={writeOffGrams > 0 && adjustedWeight !== null ? adjustedWeight : undefined}
          writeOffGrams={writeOffGrams > 0 ? writeOffGrams : undefined}
        />
      )}
    </div>
  );
}
