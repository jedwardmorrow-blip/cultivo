/**
 * ConversionsView Component
 *
 * Main view for the Conversions tab in Inventory Management.
 * Displays pending sessions awaiting manual finalization.
 * Managers define package weights/quantities and finalize to create immediately available inventory.
 */

import { useState, useEffect } from 'react';
import {
  Package,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { ConversionModal } from './ConversionModal';
import { PendingConversionSession } from '@/types';
import { useFinalizationWorkflow } from '../hooks';

export function ConversionsView() {
  const [selectedSession, setSelectedSession] = useState<PendingConversionSession | null>(null);
  const [showModal, setShowModal] = useState(false);

  const {
    pendingSessions,
    isLoading,
    error,
    fetchPendingSessions,
  } = useFinalizationWorkflow();

  useEffect(() => {
    fetchPendingSessions();
  }, [fetchPendingSessions]);

  const handleSelectSession = (session: PendingConversionSession) => {
    setSelectedSession(session);
    setShowModal(true);
  };

  const handleComplete = async () => {
    setShowModal(false);
    setSelectedSession(null);
    await fetchPendingSessions();
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedSession(null);
  };

  if (isLoading) {
    return (
      <div className="bg-cult-near-black rounded-lg shadow border border-cult-medium-gray p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-cult-dark-gray rounded w-48 mb-4"></div>
          <div className="h-32 bg-cult-dark-gray rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-24 bg-cult-dark-gray rounded"></div>
            <div className="h-24 bg-cult-dark-gray rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-cult-near-black rounded-lg shadow border border-cult-medium-gray p-6">
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">Error loading conversions: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cult-near-black rounded-lg shadow border border-cult-medium-gray p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Conversions</h2>
          </div>
          <p className="text-gray-400 text-sm">
            Create packages from completed sessions and finalize to immediately available inventory
          </p>
        </div>
      </div>

      {/* Alert Banner - Pending Sessions */}
      {pendingSessions.length > 0 && (
        <div className="bg-amber-900 bg-opacity-30 border border-amber-700 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-300 mb-1">
                Sessions Awaiting Finalization
              </h3>
              <p className="text-sm text-amber-200 mb-3">
                {pendingSessions.length} session{pendingSessions.length !== 1 ? 's have' : ' has'} completed
                but not yet finalized to inventory. Define package weights/quantities and finalize to create
                immediately available inventory.
              </p>
              <div className="flex items-center gap-2 text-xs text-amber-200">
                <CheckCircle2 className="w-4 h-4" />
                <span>Click any session below to create packages and finalize</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-300 mb-1">
              Conversion to Inventory Workflow
            </h3>
            <p className="text-sm text-blue-200">
              When production sessions (bucking, trim, packaging) complete, they appear here grouped by batch and product.
              Define package weights or case quantities with auto-generated IDs, track variance, and
              finalize to create immediately available inventory.
            </p>
          </div>
        </div>
      </div>

      {/* Pending Sessions List */}
      {pendingSessions.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">
              Pending Finalization ({pendingSessions.length})
            </h3>
          </div>
          <div className="space-y-3">
            {pendingSessions.map((session) => (
              <PendingSessionCard
                key={session.aggregation_id}
                session={session}
                onClick={() => handleSelectSession(session)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-300 mb-1">All sessions finalized</h3>
          <p className="text-sm text-gray-500">
            No sessions awaiting finalization. Complete production sessions to create pending conversions.
          </p>
        </div>
      )}

      {/* Conversion Modal */}
      {selectedSession && (
        <ConversionModal
          session={selectedSession}
          isOpen={showModal}
          onClose={handleClose}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}

interface PendingSessionCardProps {
  session: PendingConversionSession;
  onClick: () => void;
}

function PendingSessionCard({ session, onClick }: PendingSessionCardProps) {
  const isBulk = session.output_weight !== null && session.output_weight > 0;
  const sessionTypeLabel = session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1);
  const isAggregated = session.session_count > 1;

  const daysSinceCompleted = Math.floor(
    (Date.now() - new Date(session.last_completed_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isUrgent = daysSinceCompleted > 3;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left border-2 rounded-lg p-4 transition-all hover:bg-opacity-30 ${
        isUrgent
          ? 'border-amber-500 bg-amber-900 bg-opacity-20 hover:bg-amber-900 hover:border-amber-400'
          : 'border-cult-medium-gray bg-cult-dark-gray hover:bg-cult-medium-gray hover:border-cult-light-gray'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-white truncate">
              {session.strain_name}
            </h3>
            <span className="text-xs font-medium text-gray-400">
              {session.batch_name}
            </span>
            {isAggregated && (
              <span className="text-xs px-2 py-0.5 bg-purple-900 bg-opacity-40 border border-purple-700 rounded text-purple-300">
                {session.session_count} sessions
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-300">{session.product_name}</span>
            <span className="text-xs px-2 py-0.5 bg-blue-900 bg-opacity-40 border border-blue-700 rounded text-blue-300">
              {sessionTypeLabel}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Last completed {daysSinceCompleted}d ago</span>
            </div>
            {isUrgent && (
              <div className="flex items-center gap-1 text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Needs attention</span>
              </div>
            )}
          </div>
        </div>

        {/* Quantities */}
        <div className="text-right">
          {isBulk ? (
            <>
              <div className="text-2xl font-bold text-white">
                {session.output_weight?.toFixed(0) || 0}
                <span className="text-sm font-normal text-gray-400 ml-1">g</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {session.has_partial_packages
                  ? 'remaining'
                  : isAggregated ? 'total from sessions' : 'bulk weight'}
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-white">
                {session.output_units || 0}
                <span className="text-sm font-normal text-gray-400 ml-1">units</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {session.has_partial_packages
                  ? 'remaining'
                  : isAggregated ? 'total from sessions' : 'packaged'}
              </div>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
