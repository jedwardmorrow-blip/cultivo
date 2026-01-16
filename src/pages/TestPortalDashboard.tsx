import { useState } from 'react';
import { useTestPortal } from '@/contexts/TestPortalContext';
import { FlaskConical, RefreshCw, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { TestModeAuditLog } from '@/components/TestModeAuditLog';

/**
 * Test Portal Dashboard
 *
 * Central management interface for the Test Portal sandbox environment.
 * Provides statistics, reset controls, and audit log viewer.
 *
 * Features:
 * - Real-time test data statistics
 * - Selective reset operations (orders, inventory, sessions)
 * - Full test data reset with confirmation
 * - Audit log viewer with filtering
 * - Quick access to test mode documentation
 *
 * @see docs/TEST-MODE.md for complete documentation
 */
export function TestPortalDashboard() {
  const {
    stats,
    isLoadingStats,
    refreshStats,
    resetTestOrders,
    resetTestInventory,
    resetTestSessions,
    resetAllTestData,
    isTestPortal
  } = useTestPortal();

  const [isResetting, setIsResetting] = useState(false);
  const [resetType, setResetType] = useState<'orders' | 'inventory' | 'sessions' | 'all' | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Redirect if not in test portal
  if (!isTestPortal) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-cult-graphite border border-cult-charcoal rounded-lg p-8 text-center">
          <FlaskConical className="w-16 h-16 mx-auto text-cult-silver mb-4" />
          <h2 className="text-2xl font-bold text-cult-off-white mb-2">
            Test Portal Dashboard
          </h2>
          <p className="text-cult-silver mb-6">
            This dashboard is only available in Test Portal mode.
          </p>
          <p className="text-sm text-cult-silver">
            Switch to Test Sandbox using the toggle in the navigation bar to access test data management.
          </p>
        </div>
      </div>
    );
  }

  const handleResetClick = (type: typeof resetType) => {
    setResetType(type);
    setShowConfirmation(true);
    setResetSuccess(false);
  };

  const handleConfirmReset = async () => {
    if (!resetType) return;

    setIsResetting(true);
    try {
      switch (resetType) {
        case 'orders':
          await resetTestOrders();
          break;
        case 'inventory':
          await resetTestInventory();
          break;
        case 'sessions':
          await resetTestSessions();
          break;
        case 'all':
          await resetAllTestData();
          break;
      }
      setResetSuccess(true);
      await refreshStats();
    } catch (error) {
      console.error('Reset failed:', error);
      alert('Reset operation failed. Please try again.');
    } finally {
      setIsResetting(false);
      setShowConfirmation(false);
      setTimeout(() => setResetSuccess(false), 3000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cult-off-white flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-amber-500" />
            Test Portal Dashboard
          </h1>
          <p className="text-cult-silver mt-2">
            Manage test data and monitor sandbox activity
          </p>
        </div>
        <button
          onClick={refreshStats}
          disabled={isLoadingStats}
          className="flex items-center gap-2 px-4 py-2 bg-cult-graphite border border-cult-charcoal rounded-lg text-cult-off-white hover:bg-cult-charcoal transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Success Message */}
      {resetSuccess && (
        <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-green-400">Reset completed successfully!</span>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Test Orders"
          value={stats?.test_orders || 0}
          icon="📦"
          loading={isLoadingStats}
        />
        <StatCard
          title="Test Inventory Items"
          value={stats?.test_inventory_items || 0}
          icon="📋"
          loading={isLoadingStats}
        />
        <StatCard
          title="Test Sessions"
          value={stats?.test_sessions || 0}
          icon="✂️"
          loading={isLoadingStats}
        />
        <StatCard
          title="Test Movements"
          value={stats?.test_movements || 0}
          icon="📊"
          loading={isLoadingStats}
        />
      </div>

      {/* Audit Statistics */}
      <div className="bg-cult-graphite border border-cult-charcoal rounded-lg p-6">
        <h2 className="text-xl font-semibold text-cult-off-white mb-4">
          Audit Trail Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-cult-silver mb-1">Total Bypassed Validations</p>
            <p className="text-2xl font-bold text-cult-off-white">
              {stats?.total_audit_entries || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-cult-silver mb-1">Last 24 Hours</p>
            <p className="text-2xl font-bold text-amber-500">
              {stats?.audit_entries_last_24h || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Reset Controls */}
      <div className="bg-cult-graphite border border-cult-charcoal rounded-lg p-6">
        <h2 className="text-xl font-semibold text-cult-off-white mb-4 flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Reset Test Data
        </h2>
        <p className="text-sm text-cult-silver mb-6">
          Selectively delete test data to start fresh. Production data is never affected.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => handleResetClick('orders')}
            disabled={isResetting || !stats?.test_orders}
            className="px-4 py-3 bg-cult-charcoal border border-cult-silver/20 rounded-lg text-cult-off-white hover:bg-cult-black hover:border-amber-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-sm font-medium mb-1">Reset Orders</div>
            <div className="text-xs text-cult-silver">{stats?.test_orders || 0} orders</div>
          </button>

          <button
            onClick={() => handleResetClick('inventory')}
            disabled={isResetting || !stats?.test_inventory_items}
            className="px-4 py-3 bg-cult-charcoal border border-cult-silver/20 rounded-lg text-cult-off-white hover:bg-cult-black hover:border-amber-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-sm font-medium mb-1">Reset Inventory</div>
            <div className="text-xs text-cult-silver">{stats?.test_inventory_items || 0} items</div>
          </button>

          <button
            onClick={() => handleResetClick('sessions')}
            disabled={isResetting || !stats?.test_sessions}
            className="px-4 py-3 bg-cult-charcoal border border-cult-silver/20 rounded-lg text-cult-off-white hover:bg-cult-black hover:border-amber-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-sm font-medium mb-1">Reset Sessions</div>
            <div className="text-xs text-cult-silver">{stats?.test_sessions || 0} sessions</div>
          </button>

          <button
            onClick={() => handleResetClick('all')}
            disabled={isResetting}
            className="px-4 py-3 bg-red-900/30 border border-red-600/50 rounded-lg text-red-400 hover:bg-red-900/50 hover:border-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-sm font-medium mb-1">Reset All</div>
            <div className="text-xs">Complete wipe</div>
          </button>
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-cult-graphite border border-cult-charcoal rounded-lg p-6">
        <h2 className="text-xl font-semibold text-cult-off-white mb-4">
          Recent Audit Log
        </h2>
        <TestModeAuditLog />
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && resetType && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-cult-graphite border border-cult-charcoal rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h3 className="text-xl font-semibold text-cult-off-white">
                Confirm Reset
              </h3>
            </div>

            <p className="text-cult-silver mb-6">
              {resetType === 'all' ? (
                <>
                  This will permanently delete <strong>all test data</strong> including:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>{stats?.test_orders || 0} test orders</li>
                    <li>{stats?.test_inventory_items || 0} test inventory items</li>
                    <li>{stats?.test_sessions || 0} test sessions</li>
                    <li>{stats?.total_audit_entries || 0} audit log entries</li>
                  </ul>
                </>
              ) : resetType === 'orders' ? (
                <>This will permanently delete <strong>{stats?.test_orders || 0} test orders</strong>.</>
              ) : resetType === 'inventory' ? (
                <>This will permanently delete <strong>{stats?.test_inventory_items || 0} test inventory items</strong>.</>
              ) : (
                <>This will permanently delete <strong>{stats?.test_sessions || 0} test sessions</strong>.</>
              )}
            </p>

            <p className="text-sm text-green-400 mb-6">
              Production data will NOT be affected.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={isResetting}
                className="flex-1 px-4 py-2 bg-cult-charcoal border border-cult-silver/20 rounded-lg text-cult-off-white hover:bg-cult-black transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="flex-1 px-4 py-2 bg-red-600 rounded-lg text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirm Reset
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

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  loading: boolean;
}

function StatCard({ title, value, icon, loading }: StatCardProps) {
  return (
    <div className="bg-cult-charcoal border border-cult-silver/20 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-cult-silver uppercase tracking-wider">{title}</span>
      </div>
      <div className="text-2xl font-bold text-cult-off-white">
        {loading ? '...' : value.toLocaleString()}
      </div>
    </div>
  );
}
