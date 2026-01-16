import { useTestPortal } from '@/contexts/TestPortalContext';
import { FlaskConical } from 'lucide-react';

/**
 * Portal Switcher Component
 *
 * Allows users to switch between Production and Test Portal.
 * Placed prominently in the main navigation bar.
 *
 * Visual Design:
 * - Toggle-style switch with labels
 * - Production side: standard styling
 * - Test side: amber/orange accent with flask icon
 * - Clear visual feedback for current portal
 *
 * @see docs/TEST-MODE.md for portal architecture documentation
 */
export function PortalSwitcher() {
  const { currentPortal, switchToProduction, switchToTest } = useTestPortal();

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-cult-graphite border border-cult-charcoal rounded-lg">
      {/* Production Button */}
      <button
        onClick={switchToProduction}
        className={`
          px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
          ${
            currentPortal === 'production'
              ? 'bg-cult-charcoal text-cult-off-white shadow-md'
              : 'text-cult-silver hover:text-cult-off-white hover:bg-cult-charcoal/50'
          }
        `}
      >
        Production
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-cult-charcoal"></div>

      {/* Test Portal Button */}
      <button
        onClick={switchToTest}
        className={`
          px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
          flex items-center gap-2
          ${
            currentPortal === 'test'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-cult-silver hover:text-cult-off-white hover:bg-cult-charcoal/50'
          }
        `}
      >
        <FlaskConical className="w-4 h-4" />
        Test Sandbox
      </button>
    </div>
  );
}
