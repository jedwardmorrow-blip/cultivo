import { useTestMode } from '@/contexts/TestModeContext';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

/**
 * Test Mode Banner
 *
 * Displays a prominent banner at the top of the application when test mode is active.
 * Cannot be permanently dismissed - provides constant visual reminder.
 *
 * Features:
 * - High contrast amber/yellow warning colors
 * - Sticky positioning (always visible)
 * - Shows audit statistics
 * - Temporary hide capability (reappears on refresh)
 *
 * @see docs/TEST-MODE.md for visual design specs
 */
export function TestModeBanner() {
  const { isTestMode, status, isLoading } = useTestMode();
  const [isTemporarilyHidden, setIsTemporarilyHidden] = useState(false);

  // Don't render if not in test mode or still loading
  if (!isTestMode || isLoading) {
    return null;
  }

  // Don't render if temporarily hidden
  if (isTemporarilyHidden) {
    return null;
  }

  return (
    <div className="bg-amber-500 border-b-4 border-amber-600 text-black sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-lg">
                TEST MODE ACTIVE
              </div>
              <div className="text-sm opacity-90">
                Inventory validations bypassed • All actions logged for review •{' '}
                {status && (
                  <span className="font-medium">
                    {status.audit_entries_last_24h} actions in last 24h
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsTemporarilyHidden(true)}
            className="p-2 hover:bg-amber-600 rounded-lg transition-colors flex-shrink-0"
            title="Hide temporarily (reappears on refresh)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
