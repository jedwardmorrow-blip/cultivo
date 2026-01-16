import { useTestPortal } from '@/contexts/TestPortalContext';
import { FlaskConical, X } from 'lucide-react';
import { useState } from 'react';

/**
 * Portal Banner Component
 *
 * Displays a prominent banner when in Test Portal.
 * Provides clear visual feedback and quick access to stats.
 *
 * Features:
 * - Only visible in Test Portal
 * - Amber/orange theme for high visibility
 * - Shows real-time statistics
 * - Can be temporarily hidden (reappears on refresh)
 * - Sticky positioning (always visible)
 *
 * @see docs/TEST-MODE.md for visual design specs
 */
export function PortalBanner() {
  const { isTestPortal, stats, isLoadingStats } = useTestPortal();
  const [isTemporarilyHidden, setIsTemporarilyHidden] = useState(false);

  // Don't render if in production portal
  if (!isTestPortal) {
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
            <FlaskConical className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-lg">
                TEST SANDBOX - SAFE TO EXPERIMENT
              </div>
              <div className="text-sm opacity-90">
                {isLoadingStats ? (
                  'Loading statistics...'
                ) : stats ? (
                  <>
                    {stats.test_orders} test orders • {stats.test_inventory_items} test items •{' '}
                    {stats.test_sessions} test sessions • {stats.audit_entries_last_24h} bypasses in last 24h
                  </>
                ) : (
                  'Test data isolated from production • All validations relaxed • Reset anytime'
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsTemporarilyHidden(true)}
            className="p-2 hover:bg-amber-600 rounded-lg transition-colors flex-shrink-0"
            title="Hide temporarily (reappears on refresh)"
            aria-label="Hide banner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
