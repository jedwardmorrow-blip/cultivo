import { useState } from 'react';
import { useTestMode } from '@/contexts/TestModeContext';
import { AlertTriangle, Check, Loader } from 'lucide-react';

/**
 * Test Mode Toggle
 *
 * Admin-only control for enabling/disabling test mode.
 * Displays current status, audit statistics, and confirmation dialog.
 *
 * Features:
 * - Requires admin permissions (enforced by RLS)
 * - Shows confirmation before toggling
 * - Displays audit trail statistics
 * - Loading states during operations
 *
 * @see docs/TEST-MODE.md
 */
export function TestModeToggle() {
  const { isTestMode, isLoading, error, status, enableTestMode, disableTestMode, refreshStatus } = useTestMode();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState<'enable' | 'disable' | null>(null);

  const handleToggle = () => {
    setPendingAction(isTestMode ? 'disable' : 'enable');
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (pendingAction === 'enable') {
      await enableTestMode();
    } else if (pendingAction === 'disable') {
      await disableTestMode();
    }

    setShowConfirmation(false);
    setPendingAction(null);
    await refreshStatus();
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setPendingAction(null);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Test Mode
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Enable testing mode for facility validation and workflow testing
          </p>
        </div>

        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${isTestMode ? 'bg-amber-500' : 'bg-gray-300'}
            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${isTestMode ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* Status Display */}
      <div className="border-t border-gray-200 pt-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Status:</span>
          <span className={`font-medium ${isTestMode ? 'text-amber-600' : 'text-gray-900'}`}>
            {isTestMode ? 'ACTIVE' : 'Disabled'}
          </span>
        </div>

        {status && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Audit Entries:</span>
              <span className="font-medium text-gray-900">
                {status.total_audit_entries.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Last 24 Hours:</span>
              <span className="font-medium text-gray-900">
                {status.audit_entries_last_24h.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Unique Validations Bypassed:</span>
              <span className="font-medium text-gray-900">
                {status.unique_validations_bypassed}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Retention Period:</span>
              <span className="font-medium text-gray-900">
                {status.retention_days} days
              </span>
            </div>
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Information Box */}
      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 className="font-medium text-amber-900 text-sm mb-2">What does Test Mode do?</h4>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• Bypasses inventory availability checks</li>
          <li>• Allows orders without sufficient stock</li>
          <li>• Permits fulfillment without batch allocations</li>
          <li>• Logs all bypassed validations for review</li>
          <li>• Does NOT bypass compliance or safety rules</li>
        </ul>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {pendingAction === 'enable' ? 'Enable Test Mode?' : 'Disable Test Mode?'}
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              {pendingAction === 'enable' ? (
                <>
                  This will bypass inventory validations and allow testing of workflows.
                  All actions will be logged in the audit trail.
                </>
              ) : (
                <>
                  This will re-enable all inventory validations. The system will return to
                  production mode. Audit logs will be retained per the retention policy.
                </>
              )}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className={`
                  px-4 py-2 text-sm font-medium text-white rounded-lg
                  ${pendingAction === 'enable' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-700 hover:bg-gray-800'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2
                `}
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
