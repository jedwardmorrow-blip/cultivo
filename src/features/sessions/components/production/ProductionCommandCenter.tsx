/**
 * ProductionCommandCenter — Route-level orchestrator
 *
 * The Kitchen Ticket Rail. Replaces SessionsHub, SessionsUnified,
 * ProductionHub, and ProductionDashboard.
 *
 * Two views toggled by state (not route):
 *   - Floor: Live production state (ticket rail + bento cards)
 *   - Performance: Analytics, leaderboard, history
 *
 * Design system: Liquid Glass + Bento Grid
 * Reference: Cultivation CommandCenter
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Hooks — reused as-is
import { useTrimSessions } from '../../hooks/useTrimSessions';
import { useBuckingSessions } from '../../hooks/useBuckingSessions';
import { usePackagingSessions } from '../../hooks/usePackagingSessions';
import { useActiveStaff } from '../../hooks/useActiveStaff';
import { useProductionDispatch } from '@/features/delivery/hooks/useProductionDispatch';
import { useFinalizationWorkflow } from '@/features/inventory/hooks';
import type { DispatchItem } from '@/features/delivery/hooks/useProductionDispatch';

// Existing modals — imported, not rebuilt
import { DispatchSessionModal } from '@/features/delivery/components/DispatchSessionModal';
import { TrimSessionCompleteModal } from '../TrimSessionCompleteModal';
import { BuckingSessionCompleteModal } from '../BuckingSessionCompleteModal';
import { PackagingSessionCompleteModal } from '../PackagingSessionCompleteModal';
import { TrimSessionCancelModal } from '../TrimSessionCancelModal';
import { BuckingSessionCancelModal } from '../BuckingSessionCancelModal';
import { PackagingSessionCancelModal } from '../PackagingSessionCancelModal';
import { TrimSessionStartForm } from '../TrimSessionStartForm';
import { BuckingSessionStartForm } from '../BuckingSessionStartForm';
import { PackagingSessionStartForm } from '../PackagingSessionStartForm';

// New components
import { ProductionKpiStrip } from './ProductionKpiStrip';
import { FloorView } from './FloorView';
import { PerformanceView } from './PerformanceView';
import { normalizeSessions, type NormalizedSession } from './constants';

import type { InventoryItem } from '../../types';

type ViewMode = 'floor' | 'performance';

export function ProductionCommandCenter() {
  const [viewMode, setViewMode] = useState<ViewMode>('floor');

  // ─── Data hooks ───────────────────────────────────────────────────────
  const {
    activeSessions: trimActive,
    sessions: trimCompleted,
    stats: trimStats,
    fetchSessions: fetchTrimSessions,
  } = useTrimSessions();

  const {
    activeSessions: buckingActive,
    sessions: buckingCompleted,
    stats: buckingStats,
    fetchSessions: fetchBuckingSessions,
  } = useBuckingSessions();

  const {
    activeSessions: packagingActive,
    sessions: packagingCompleted,
    stats: packagingStats,
    fetchSessions: fetchPackagingSessions,
  } = usePackagingSessions();

  const { staff, getDisplayName } = useActiveStaff();

  const {
    dispatched,
    loading: dispatchLoading,
    reload: reloadDispatch,
  } = useProductionDispatch();

  const {
    pendingSessions,
    fetchPendingSessions,
  } = useFinalizationWorkflow();

  // Fetch pending conversions on mount
  useEffect(() => {
    fetchPendingSessions();
  }, [fetchPendingSessions]);

  // ─── Normalized sessions ──────────────────────────────────────────────
  const activeSessions = normalizeSessions(buckingActive, trimActive, packagingActive);
  const queuedItems = dispatched.filter(d => d.status === 'pending');

  // ─── Modal state ──────────────────────────────────────────────────────
  const [completingSession, setCompletingSession] = useState<NormalizedSession | null>(null);
  const [cancellingSession, setCancellingSession] = useState<NormalizedSession | null>(null);
  const [startingDispatch, setStartingDispatch] = useState<DispatchItem | null>(null);
  const [manualStartType, setManualStartType] = useState<'bucking' | 'trim' | 'packaging' | null>(null);
  const [buckedPackages, setBuckedPackages] = useState<InventoryItem[]>([]);

  // Fetch bucked packages when completing a trim session (needed for smalls selection)
  useEffect(() => {
    if (completingSession?.type === 'trim') {
      supabase.from('inventory_items').select('*').eq('category', 'flower_bucked').gt('available_qty', 0)
        .then(({ data }) => setBuckedPackages(data || []));
    }
  }, [completingSession]);

  // Stale conversions check
  const hasStalePending = pendingSessions.some(s => {
    const days = Math.floor((Date.now() - new Date(s.last_completed_at).getTime()) / (1000 * 60 * 60 * 24));
    return days > 3;
  });

  // ─── Refresh ──────────────────────────────────────────────────────────
  const refreshAll = useCallback(() => {
    fetchTrimSessions();
    fetchBuckingSessions();
    fetchPackagingSessions();
    reloadDispatch();
    fetchPendingSessions();
  }, [fetchTrimSessions, fetchBuckingSessions, fetchPackagingSessions, reloadDispatch, fetchPendingSessions]);

  const handleSessionCompleted = () => {
    setCompletingSession(null);
    refreshAll();
  };

  const handleSessionCancelled = () => {
    setCancellingSession(null);
    refreshAll();
  };

  const handleSessionStarted = () => {
    setStartingDispatch(null);
    setManualStartType(null);
    refreshAll();
  };

  // ─── Loading ──────────────────────────────────────────────────────────
  const isLoading = dispatchLoading && activeSessions.length === 0;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-white/20" />
        <p className="text-sm text-white/25">Loading production...</p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header + view toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Production</h1>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          {(['floor', 'performance'] as const).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === mode
                  ? 'bg-white/[0.08] text-white/70 shadow-sm'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              {mode === 'floor' ? 'Floor' : 'Performance'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <ProductionKpiStrip
        trimStats={trimStats}
        buckingStats={buckingStats}
        packagingStats={packagingStats}
        pendingConversionsCount={pendingSessions.length}
        hasStalePending={hasStalePending}
      />

      {/* Main content */}
      {viewMode === 'floor' ? (
        <FloorView
          activeSessions={activeSessions}
          queuedItems={queuedItems}
          pendingSessions={pendingSessions}
          onConversionsRefresh={fetchPendingSessions}
          staff={staff}
          getDisplayName={getDisplayName}
          trimCompleted={trimCompleted.filter(s => (s as any).session_date === new Date().toISOString().split('T')[0])}
          buckingCompleted={buckingCompleted.filter(s => (s as any).session_date === new Date().toISOString().split('T')[0])}
          packagingCompleted={packagingCompleted.filter(s => (s as any).session_date === new Date().toISOString().split('T')[0])}
          trimStats={trimStats}
          buckingStats={buckingStats}
          packagingStats={packagingStats}
          onComplete={setCompletingSession}
          onCancel={setCancellingSession}
          onStartFromDispatch={setStartingDispatch}
          onStartManual={setManualStartType}
          onRefreshSessions={refreshAll}
        />
      ) : (
        <PerformanceView
          trimCompleted={trimCompleted.filter(s => (s as any).session_date === new Date().toISOString().split('T')[0])}
          buckingCompleted={buckingCompleted.filter(s => (s as any).session_date === new Date().toISOString().split('T')[0])}
          packagingCompleted={packagingCompleted.filter(s => (s as any).session_date === new Date().toISOString().split('T')[0])}
          allTrimCompleted={trimCompleted}
          allBuckingCompleted={buckingCompleted}
          allPackagingCompleted={packagingCompleted}
        />
      )}

      {/* ─── Modals ────────────────────────────────────────────────────── */}

      {/* Dispatch start */}
      <DispatchSessionModal
        isOpen={startingDispatch !== null}
        onClose={() => setStartingDispatch(null)}
        dispatchItem={startingDispatch}
        onSessionCreated={handleSessionStarted}
      />

      {/* Manual start forms */}
      {manualStartType === 'trim' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setManualStartType(null)}>
          <div className="bg-cult-surface-raised rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <TrimSessionStartForm onSessionStarted={handleSessionStarted} onCancel={() => setManualStartType(null)} />
          </div>
        </div>
      )}
      {manualStartType === 'bucking' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setManualStartType(null)}>
          <div className="bg-cult-surface-raised rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <BuckingSessionStartForm onSessionStarted={handleSessionStarted} onCancel={() => setManualStartType(null)} />
          </div>
        </div>
      )}
      {manualStartType === 'packaging' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setManualStartType(null)}>
          <div className="bg-cult-surface-raised rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <PackagingSessionStartForm onSessionStarted={handleSessionStarted} onCancel={() => setManualStartType(null)} />
          </div>
        </div>
      )}

      {/* Complete modals */}
      {completingSession?.type === 'bucking' && completingSession.rawBucking && (
        <BuckingSessionCompleteModal
          session={completingSession.rawBucking}
          onSuccess={handleSessionCompleted}
          onCancel={() => setCompletingSession(null)}
        />
      )}
      {completingSession?.type === 'trim' && completingSession.rawTrim && (
        <TrimSessionCompleteModal
          session={completingSession.rawTrim}
          buckedPackages={buckedPackages}
          onSuccess={handleSessionCompleted}
          onCancel={() => setCompletingSession(null)}
        />
      )}
      {completingSession?.type === 'packaging' && completingSession.rawPackaging && (
        <PackagingSessionCompleteModal
          session={completingSession.rawPackaging}
          onSuccess={handleSessionCompleted}
          onCancel={() => setCompletingSession(null)}
        />
      )}

      {/* Cancel modals */}
      {cancellingSession?.type === 'bucking' && cancellingSession.rawBucking && (
        <BuckingSessionCancelModal
          session={cancellingSession.rawBucking}
          onSuccess={handleSessionCancelled}
          onCancel={() => setCancellingSession(null)}
        />
      )}
      {cancellingSession?.type === 'trim' && cancellingSession.rawTrim && (
        <TrimSessionCancelModal
          session={cancellingSession.rawTrim}
          onSuccess={handleSessionCancelled}
          onCancel={() => setCancellingSession(null)}
        />
      )}
      {cancellingSession?.type === 'packaging' && cancellingSession.rawPackaging && (
        <PackagingSessionCancelModal
          session={cancellingSession.rawPackaging}
          onSuccess={handleSessionCancelled}
          onCancel={() => setCancellingSession(null)}
        />
      )}
    </div>
  );
}
