/**
 * PendingConversionsWidget Component
 *
 * Dashboard widget showing sessions awaiting manual finalization.
 * Managers can review and finalize session outputs into inventory packages.
 *
 * NOTE: output_weight and output_units from pending_conversion_sessions VIEW
 * show REMAINING quantities after subtracting already-packaged amounts.
 * Totals automatically reflect remaining weight/units, not original session outputs.
 */

import { useEffect } from 'react';
import { Package, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFinalizationWorkflow } from '@/features/inventory/hooks';

interface PendingConversionsWidgetProps {
  onNavigateToConversions?: () => void;
}

export function PendingConversionsWidget({ onNavigateToConversions }: PendingConversionsWidgetProps) {
  const {
    pendingSessions,
    isLoading,
    error,
    fetchPendingSessions
  } = useFinalizationWorkflow();

  useEffect(() => {
    fetchPendingSessions();
  }, [fetchPendingSessions]);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-cult-dark-gray rounded w-48 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-cult-dark-gray rounded"></div>
          <div className="h-24 bg-cult-dark-gray rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-cult-surface-raised border border-cult-danger rounded-cult p-4">
        <div className="flex items-center gap-2 text-cult-danger">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">Error loading pending conversions: {error}</span>
        </div>
      </div>
    );
  }

  const totalSessions = pendingSessions.length;

  if (totalSessions === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-cult-white" />
            <h2 className="text-lg font-semibold text-cult-white uppercase tracking-wide">
              Pending Conversions
            </h2>
          </div>
        </div>
        <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-cult-light-gray text-sm">All sessions finalized</p>
          <p className="text-cult-light-gray text-xs mt-1">
            No sessions awaiting conversion to inventory
          </p>
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const totalWeight = pendingSessions.reduce((sum, session) =>
    sum + (session.output_weight || 0), 0
  );
  const totalUnits = pendingSessions.reduce((sum, session) =>
    sum + (session.output_units || 0), 0
  );

  // Group by session type
  const trimCount = pendingSessions.filter(s => s.session_type === 'trim').length;
  const packagingCount = pendingSessions.filter(s => s.session_type === 'packaging').length;
  const buckingCount = pendingSessions.filter(s => s.session_type === 'bucking').length;

  const oldestTimestamp = pendingSessions.reduce<string | null>((oldest, session) => {
    const ts = session.first_completed_at || session.last_completed_at;
    if (!ts) return oldest;
    if (!oldest || new Date(ts) < new Date(oldest)) return ts;
    return oldest;
  }, null);

  const daysSinceOldest = oldestTimestamp
    ? Math.floor((Date.now() - new Date(oldestTimestamp).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isUrgent = daysSinceOldest !== null && daysSinceOldest > 3;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-cult-white" />
          <h2 className="text-lg font-semibold text-cult-white uppercase tracking-wide">
            Pending Conversions
          </h2>
        </div>
        {onNavigateToConversions && (
          <button
            onClick={onNavigateToConversions}
            className="flex items-center gap-2 text-sm font-medium text-cult-white hover:text-cult-green transition-colors"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sessions */}
        <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-4">
          <div className="text-xs font-medium text-cult-light-gray uppercase tracking-wide mb-2">
            Pending Sessions
          </div>
          <div className="text-3xl font-bold text-cult-white mb-1">
            {totalSessions}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-cult-light-gray">
            {trimCount > 0 && <span>{trimCount} trim</span>}
            {packagingCount > 0 && <span>{packagingCount} pkg</span>}
            {buckingCount > 0 && <span>{buckingCount} buck</span>}
          </div>
        </div>

        {/* Pending Weight */}
        {totalWeight > 0 && (
          <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-4">
            <div className="text-xs font-medium text-cult-light-gray uppercase tracking-wide mb-2">
              Total Weight
            </div>
            <div className="text-3xl font-bold text-cult-white">
              {totalWeight.toFixed(0)}
              <span className="text-base font-normal text-cult-light-gray ml-1">g</span>
            </div>
          </div>
        )}

        {/* Pending Units */}
        {totalUnits > 0 && (
          <div className="bg-cult-surface-raised border border-cult-border rounded-cult p-4">
            <div className="text-xs font-medium text-cult-light-gray uppercase tracking-wide mb-2">
              Total Units
            </div>
            <div className="text-3xl font-bold text-cult-white">
              {totalUnits}
            </div>
          </div>
        )}

        {/* Oldest Pending */}
        <div className={`border rounded-lg p-4 ${
          isUrgent
            ? 'bg-cult-warning-muted border-cult-warning'
            : 'bg-cult-surface-raised border-cult-border'
        }`}>
          <div className={`text-xs font-medium uppercase tracking-wide mb-2 ${
            isUrgent ? 'text-amber-400' : 'text-cult-light-gray'
          }`}>
            Oldest Pending
          </div>
          <div className={`text-3xl font-bold ${
            isUrgent ? 'text-amber-400' : 'text-cult-white'
          }`}>
            {daysSinceOldest !== null ? (
              <>
                {daysSinceOldest}
                <span className="text-base font-normal ml-1">
                  day{daysSinceOldest !== 1 ? 's' : ''}
                </span>
              </>
            ) : (
              <span className="text-cult-light-gray">&mdash;</span>
            )}
          </div>
          {isUrgent && (
            <div className="flex items-center gap-1 text-xs text-amber-400 mt-1">
              <AlertCircle className="w-3 h-3" />
              Action needed
            </div>
          )}
        </div>
      </div>

      {/* Call to action */}
      {onNavigateToConversions && totalSessions > 0 && (
        <div className="mt-4">
          <button
            onClick={onNavigateToConversions}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cult-white text-cult-black hover:bg-cult-green transition-all duration-200 font-bold uppercase tracking-wider text-sm"
          >
            <Package className="w-5 h-5" />
            Finalize Pending Sessions
          </button>
        </div>
      )}
    </div>
  );
}
