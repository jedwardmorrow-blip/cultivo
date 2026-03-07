/**
 * CombinePackagesModal Component
 *
 * 4-step wizard for combining multiple inventory packages:
 * 1. Review selected packages
 * 2. Generate/enter new package ID
 * 3. Confirm variance (if any)
 * 4. Complete & success
 *
 * @module CombinePackagesModal
 */

import { X, Package, ChevronRight, AlertTriangle, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { CombinePackagesModalProps, VarianceReason } from '../types/combine.types';
import { useCombineWorkflow } from '../hooks/useCombineWorkflow';
import { VarianceReasonLabels } from '@/types';

export function CombinePackagesModal({
  isOpen,
  onClose,
  onComplete,
  preselected_packages = [],
}: CombinePackagesModalProps) {
  const workflow = useCombineWorkflow({
    preselectedPackages: preselected_packages,
    onComplete,
    onClose,
  });

  if (!isOpen) return null;

  const { validation, selectedPackages } = workflow;
  const summary = validation?.summary;

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
              <h2 className="text-xl font-semibold text-cult-text-primary">Combine Packages</h2>
              <p className="text-sm text-cult-text-faint mt-1">
                {workflow.step === 'select_packages' && 'Review selected packages'}
                {workflow.step === 'generate_id' && 'Generate new package ID'}
                {workflow.step === 'confirm_variance' && 'Confirm details'}
                {workflow.step === 'completing' && 'Processing...'}
                {workflow.step === 'complete' && 'Complete!'}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={workflow.step === 'completing'}
              className="text-cult-text-muted hover:text-cult-text-faint transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress indicator */}
          <div className="px-6 py-3 bg-cult-surface-sunken border-b border-cult-border-subtle">
            <div className="flex items-center gap-2 text-sm">
              <div
                className={`flex items-center gap-1 ${
                  workflow.step === 'select_packages' ? 'text-blue-600 font-medium' : 'text-cult-text-muted'
                }`}
              >
                <span>1. Review</span>
                {workflow.step !== 'select_packages' && <CheckCircle className="w-4 h-4 text-green-600" />}
              </div>
              <ChevronRight className="w-4 h-4 text-cult-text-muted" />
              <div
                className={`flex items-center gap-1 ${
                  workflow.step === 'generate_id' ? 'text-blue-600 font-medium' : 'text-cult-text-muted'
                }`}
              >
                <span>2. ID</span>
                {['confirm_variance', 'completing', 'complete'].includes(workflow.step) && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-cult-text-muted" />
              <div
                className={`flex items-center gap-1 ${
                  workflow.step === 'confirm_variance' ? 'text-blue-600 font-medium' : 'text-cult-text-muted'
                }`}
              >
                <span>3. Confirm</span>
                {['completing', 'complete'].includes(workflow.step) && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-cult-text-muted" />
              <div
                className={`flex items-center gap-1 ${
                  workflow.step === 'complete' ? 'text-green-600 font-medium' : 'text-cult-text-muted'
                }`}
              >
                <span>4. Done</span>
                {workflow.step === 'complete' && <CheckCircle className="w-4 h-4 text-green-600" />}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Error display */}
            {workflow.error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-900 mb-1">Error</h4>
                  <p className="text-sm text-red-800">{workflow.error}</p>
                </div>
                <button
                  onClick={workflow.clearError}
                  className="text-red-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 1: Review packages */}
            {workflow.step === 'select_packages' && (
              <div className="space-y-4">
                {workflow.isValidating ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <span className="ml-3 text-sm text-cult-text-faint">Validating packages...</span>
                  </div>
                ) : (
                  <>
                    {/* Validation errors */}
                    {validation && !validation.is_valid && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-red-900 mb-2">Cannot Combine</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {validation.errors.map((error, i) => (
                            <li key={i} className="text-sm text-red-800">
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Summary */}
                    {summary && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-blue-900 mb-3">Combination Summary</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-blue-700 font-medium">Total Packages</div>
                            <div className="text-blue-900 text-lg font-semibold">
                              {summary.total_packages}
                            </div>
                          </div>
                          <div>
                            <div className="text-blue-700 font-medium">Total Quantity</div>
                            <div className="text-blue-900 text-lg font-semibold">
                              {summary.total_qty.toFixed(1)}
                              {summary.unit}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-blue-700 font-medium mb-1">Details</div>
                            <div className="text-blue-900">
                              {summary.strain} · {summary.product_name} · {summary.stage_name}
                            </div>
                            <div className="text-blue-800 text-xs mt-1">
                              Batch: {summary.batch_number}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Package list */}
                    <div>
                      <h4 className="text-sm font-medium text-cult-text-primary mb-2">
                        Selected Packages ({selectedPackages.length})
                      </h4>
                      <div className="border border-cult-border-subtle rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-cult-surface-sunken border-b border-cult-border-subtle">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-cult-text-muted uppercase">
                                Package ID
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-cult-text-muted uppercase">
                                Quantity
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-cult-border-subtle">
                            {selectedPackages.map((pkg) => (
                              <tr key={pkg.id} className="hover:bg-cult-surface-sunken">
                                <td className="px-3 py-2 font-mono text-cult-text-primary">
                                  {pkg.package_id}
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-cult-text-primary">
                                  {pkg.on_hand_qty.toFixed(1)}
                                  {pkg.unit}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Generate ID */}
            {workflow.step === 'generate_id' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <Package className="w-6 h-6 text-blue-600 mb-2" />
                  <h3 className="text-sm font-medium text-blue-900 mb-1">New Package ID</h3>
                  <p className="text-sm text-blue-700">
                    Enter or generate a unique package ID for the combined package
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cult-text-muted mb-2">
                    Package ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={workflow.newPackageId}
                      onChange={(e) => workflow.setNewPackageId(e.target.value)}
                      placeholder="YYMMDD-STRAIN-###"
                      className="flex-1 px-3 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={workflow.generatePackageId}
                      className="px-3 py-2 bg-cult-surface border border-cult-border rounded-lg hover:bg-cult-surface-raised transition-colors"
                      title="Regenerate ID"
                    >
                      <RefreshCw className="w-4 h-4 text-cult-text-faint" />
                    </button>
                  </div>
                  <p className="text-xs text-cult-text-muted mt-1">
                    Format: YYMMDD-STRAIN-### (must be unique)
                  </p>
                </div>

                {summary && (
                  <div className="border border-cult-border-subtle rounded-lg p-4 bg-cult-surface-sunken">
                    <h4 className="text-sm font-medium text-cult-text-primary mb-2">Will Combine</h4>
                    <div className="text-sm text-cult-text-muted space-y-1">
                      <div>
                        <span className="font-medium">{summary.total_packages}</span> packages →{' '}
                        <span className="font-medium">1</span> combined package
                      </div>
                      <div>
                        Total: <span className="font-medium">{summary.total_qty.toFixed(1)}{summary.unit}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Confirm variance */}
            {workflow.step === 'confirm_variance' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                  <h3 className="text-sm font-medium text-green-900 mb-1">Ready to Combine</h3>
                  <p className="text-sm text-green-700">
                    Review the details and click "Combine Packages" to proceed
                  </p>
                </div>

                {/* Summary */}
                {summary && (
                  <div className="border border-cult-border-subtle rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-cult-text-faint">New Package ID:</span>
                        <span className="text-sm font-mono font-semibold text-cult-text-primary">
                          {workflow.newPackageId}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-cult-text-faint">Source Packages:</span>
                        <span className="text-sm font-semibold text-cult-text-primary">
                          {summary.total_packages}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-cult-text-faint">Total Quantity:</span>
                        <span className="text-sm font-semibold text-cult-text-primary">
                          {summary.total_qty.toFixed(1)}
                          {summary.unit}
                        </span>
                      </div>
                      <div className="pt-3 border-t border-cult-border-subtle">
                        <div className="text-xs text-cult-text-faint mb-1">Batch & Product</div>
                        <div className="text-sm text-cult-text-primary">
                          {summary.batch_number} · {summary.strain} · {summary.product_name}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional variance reason */}
                <div className="border border-cult-border-subtle rounded-lg p-4 bg-cult-surface-sunken">
                  <h4 className="text-sm font-medium text-cult-text-primary mb-3">
                    Variance Tracking (Optional)
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-cult-text-muted mb-1">Variance Reason</label>
                      <select
                        value={workflow.varianceReason || ''}
                        onChange={(e) =>
                          workflow.setVarianceReason((e.target.value as VarianceReason) || null)
                        }
                        className="w-full px-3 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="">None</option>
                        {(Object.keys(VarianceReasonLabels) as VarianceReason[]).map((reason) => (
                          <option key={reason} value={reason}>
                            {VarianceReasonLabels[reason]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-cult-text-muted mb-1">Notes</label>
                      <textarea
                        value={workflow.varianceNote}
                        onChange={(e) => workflow.setVarianceNote(e.target.value)}
                        rows={2}
                        placeholder="Optional notes about this combination..."
                        className="w-full px-3 py-2 border border-cult-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Completing/Complete */}
            {(workflow.step === 'completing' || workflow.step === 'complete') && (
              <div className="py-12">
                {workflow.step === 'completing' ? (
                  <div className="text-center">
                    <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-cult-text-primary mb-2">
                      Combining Packages...
                    </h3>
                    <p className="text-sm text-cult-text-faint">This may take a moment</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      Packages Combined Successfully!
                    </h3>
                    {workflow.result && (
                      <div className="text-sm text-cult-text-muted space-y-1">
                        <p>
                          New Package: <span className="font-mono font-semibold">{workflow.result.new_package_id}</span>
                        </p>
                        <p>
                          Combined Quantity: <span className="font-semibold">{workflow.result.combined_qty.toFixed(1)}{workflow.result.unit}</span>
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-cult-text-muted mt-4">Closing automatically...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {workflow.step !== 'completing' && workflow.step !== 'complete' && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-cult-border-subtle bg-cult-surface-sunken">
              <button
                onClick={workflow.step === 'select_packages' ? onClose : workflow.previousStep}
                className="px-4 py-2 text-sm font-medium text-cult-text-muted hover:text-cult-text-primary transition-colors"
              >
                {workflow.step === 'select_packages' ? 'Cancel' : 'Back'}
              </button>

              <button
                onClick={
                  workflow.step === 'confirm_variance' ? workflow.executeCombine : workflow.nextStep
                }
                disabled={!workflow.canProceed || workflow.isExecuting}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {workflow.step === 'confirm_variance' ? (
                  <>
                    <Package className="w-4 h-4" />
                    <span>Combine Packages</span>
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
