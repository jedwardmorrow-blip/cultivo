/**
 * ProductionHub — Unified production view driven by dispatch items.
 *
 * Replaces the old Overview + Sessions tabs pattern. Shows:
 * - KPI summary (active, queued, completed today)
 * - In-progress sessions (with Complete + Pause actions)
 * - Queued dispatch items (with Start Session action)
 * - Completed today (collapsed, for reference)
 *
 * All session creation flows through DispatchSessionModal.
 * All session completion flows through existing *CompleteModal components.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, RefreshCw, AlertTriangle, Play, CheckCircle2, Clock, Package,
  Filter, Scissors, Box, Loader2, ArrowUpDown, ChevronDown, ChevronRight,
  Pause, Timer,
} from 'lucide-react';
import { HubShell } from '@/features/hub/components/HubShell';
import { supabase } from '@/lib/supabase';
import { DispatchSessionModal } from '@/features/delivery/components/DispatchSessionModal';
import { QuickDispatchModal } from '@/features/delivery/components/QuickDispatchModal';
import { BuckingSessionCompleteModal } from './BuckingSessionCompleteModal';
import { TrimSessionCompleteModal } from './TrimSessionCompleteModal';
import { PackagingSessionCompleteModal } from './PackagingSessionCompleteModal';
import { formatElapsedTime } from '../utils';
import type { BuckingSession, TrimSession, PackagingSession, InventoryItem } from '../types';
import {
  getActiveBuckingSessions,
  getActiveTrimSessions,
  getActivePackagingSessions,
} from '../services/sessions.service';
import type { DispatchItem, ProcessingStage, TreatmentType } from '@/features/delivery/hooks/useProductionDispatch';
import { useProductionDispatch, PROCESSING_STAGE_LABELS, TREATMENT_TYPE_LABELS } from '@/features/delivery/hooks/useProductionDispatch';

// ─── Stage visuals ──────────────────────────────────────────────────────────

const STAGE_STYLE: Record<string, { icon: typeof Scissors; color: string; bg: string; border: string; label: string }> = {
  buck:             { icon: Scissors, color: 'text-amber-400',   bg: 'bg-amber-500/[0.06]',   border: 'border-amber-500/20',   label: 'Bucking' },
  trim_to_stock:    { icon: Box,      color: 'text-emerald-400', bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-500/20', label: 'Trim' },
  package_to_order: { icon: Package,  color: 'text-sky-400',     bg: 'bg-sky-500/[0.06]',     border: 'border-sky-500/20',     label: 'Packaging' },
};

function getStageStyle(stage: string) {
  return STAGE_STYLE[stage] || STAGE_STYLE.buck;
}

function formatG(g: number): string {
  if (g >= 453.592) return `${(g / 453.592).toFixed(1)} lbs`;
  return `${g.toFixed(0)}g`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ─── Active Session Types (normalized) ──────────────────────────────────────

interface ActiveSession {
  id: string;
  type: 'bucking' | 'trim' | 'packaging';
  stage: ProcessingStage;
  worker: string;
  strain: string;
  packageId: string;
  batchNumber: string;
  inputWeight: number;
  startedAt: string;
  dispatchItemId: string | null;
  // Raw session for completion modal
  rawBucking?: BuckingSession;
  rawTrim?: TrimSession;
  rawPackaging?: PackagingSession;
}

// ─── Priority badge ─────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: number }) {
  const config = priority <= 20
    ? { style: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'Urgent' }
    : priority <= 40
    ? { style: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'High' }
    : priority <= 60
    ? { style: 'bg-cult-mid-gray/20 text-cult-text-muted border-cult-dark-gray/50', label: 'Normal' }
    : { style: 'bg-cult-mid-gray/10 text-cult-text-faint border-cult-dark-gray/30', label: 'Low' };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${config.style}`}>
      {config.label}
    </span>
  );
}

// ─── Queued Dispatch Card ───────────────────────────────────────────────────

function QueuedCard({
  item,
  onStartSession,
}: {
  item: DispatchItem;
  onStartSession: (item: DispatchItem) => void;
}) {
  const stageStyle = getStageStyle(item.processing_stage);
  const StageIcon = stageStyle.icon;

  return (
    <div className="rounded-xl border border-cult-dark-gray/60 bg-gradient-to-r from-cult-mid-gray/[0.03] to-transparent hover:border-cult-dark-gray transition-all duration-200">
      <div className="px-4 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-lg ${stageStyle.bg} border ${stageStyle.border} flex items-center justify-center shrink-0`}>
            <StageIcon className={`w-4 h-4 ${stageStyle.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-cult-text-primary tracking-tight">{item.strain}</span>
              <span className={`text-[11px] font-semibold ${stageStyle.color}`}>{stageStyle.label}</span>
              <PriorityBadge priority={item.priority} />
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-cult-text-muted">
              <span className="font-mono text-cult-text-faint">{item.batch_number}</span>
              <span className="w-px h-3 bg-cult-dark-gray/40" />
              <span>{TREATMENT_TYPE_LABELS[item.treatment_type as TreatmentType]}</span>
              {item.quantity_g != null && (
                <>
                  <span className="w-px h-3 bg-cult-dark-gray/40" />
                  <span className="font-semibold text-cult-text-secondary">{formatG(item.quantity_g)}</span>
                </>
              )}
            </div>
            {item.customer_name && (
              <div className="text-[11px] text-cult-text-faint mt-0.5">
                For: {item.customer_name} {item.order_number && <span className="font-mono">({item.order_number})</span>}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onStartSession(item)}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cult-accent text-cult-black text-xs font-bold hover:bg-cult-accent/90 transition-all hover:shadow-[0_0_12px_rgba(255,255,255,0.1)]"
        >
          <Play className="w-3.5 h-3.5" />
          Start Session
        </button>
      </div>
    </div>
  );
}

// ─── Active Session Card ────────────────────────────────────────────────────

function ActiveCard({
  session,
  onComplete,
}: {
  session: ActiveSession;
  onComplete: (session: ActiveSession) => void;
}) {
  const stageStyle = getStageStyle(session.stage);
  const StageIcon = stageStyle.icon;

  return (
    <div className={`rounded-xl border overflow-hidden ${stageStyle.border} ${stageStyle.bg} shadow-[0_0_12px_rgba(255,255,255,0.03)]`}>
      <div className="px-4 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stageStyle.bg} border ${stageStyle.border} flex items-center justify-center shrink-0 relative`}>
            <StageIcon className={`w-4 h-4 ${stageStyle.color}`} />
            <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse border border-cult-black`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-cult-text-primary tracking-tight">{session.strain}</span>
              <span className={`text-[11px] font-semibold ${stageStyle.color}`}>{stageStyle.label}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-cult-text-muted">
              <span className="font-mono text-cult-text-faint">{session.batchNumber}</span>
              <span className="w-px h-3 bg-cult-dark-gray/40" />
              <span>{session.worker}</span>
              <span className="w-px h-3 bg-cult-dark-gray/40" />
              <span className="flex items-center gap-1 text-amber-400">
                <Timer className="w-3 h-3" />
                {formatElapsedTime(session.startedAt)}
              </span>
              {session.inputWeight > 0 && (
                <>
                  <span className="w-px h-3 bg-cult-dark-gray/40" />
                  <span className="font-semibold text-cult-text-secondary">{formatG(session.inputWeight)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onComplete(session)}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/25 transition-all"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Complete
        </button>
      </div>
    </div>
  );
}

// ─── Completed Today Card ───────────────────────────────────────────────────

function CompletedCard({ session }: { session: ActiveSession }) {
  const stageStyle = getStageStyle(session.stage);

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-cult-dark-gray/30 bg-cult-mid-gray/[0.02]">
      <CheckCircle2 className="w-4 h-4 text-emerald-500/60 shrink-0" />
      <span className="text-sm text-cult-text-secondary font-medium">{session.strain}</span>
      <span className={`text-[11px] ${stageStyle.color}`}>{stageStyle.label}</span>
      <span className="text-xs text-cult-text-faint">{session.worker}</span>
      <span className="ml-auto text-xs text-cult-text-faint">{formatTime(session.startedAt)}</span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ProductionHub() {
  const { dispatched, loading: dispatchLoading, error: dispatchError, stats, reload: reloadDispatch } = useProductionDispatch();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [completedToday, setCompletedToday] = useState<ActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  // Modal state
  const [startingItem, setStartingItem] = useState<DispatchItem | null>(null);
  const [completingSession, setCompletingSession] = useState<ActiveSession | null>(null);
  const [showQuickDispatch, setShowQuickDispatch] = useState(false);
  const [buckedPackages, setBuckedPackages] = useState<InventoryItem[]>([]);

  const fetchActiveSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const [buckingRes, trimRes, packagingRes] = await Promise.all([
        getActiveBuckingSessions(),
        getActiveTrimSessions(),
        getActivePackagingSessions(),
      ]);

      const sessions: ActiveSession[] = [];

      (buckingRes.data || []).forEach((s: BuckingSession) => {
        sessions.push({
          id: s.id,
          type: 'bucking',
          stage: 'buck',
          worker: s.bucker_name || '',
          strain: s.strain || '',
          packageId: s.binned_package_id || '',
          batchNumber: s.batch_id || '',
          inputWeight: s.binned_weight_grams || 0,
          startedAt: s.started_at,
          dispatchItemId: s.dispatch_item_id || null,
          rawBucking: s,
        });
      });

      (trimRes.data || []).forEach((s: TrimSession) => {
        sessions.push({
          id: s.id,
          type: 'trim',
          stage: 'trim_to_stock',
          worker: s.trimmer_name || '',
          strain: s.strain || '',
          packageId: s.package_id || '',
          batchNumber: s.batch_id || '',
          inputWeight: s.pull_weight || s.pulled_weight || 0,
          startedAt: s.started_at,
          dispatchItemId: s.dispatch_item_id || null,
          rawTrim: s,
        });
      });

      (packagingRes.data || []).forEach((s: PackagingSession) => {
        sessions.push({
          id: s.id,
          type: 'packaging',
          stage: 'package_to_order',
          worker: s.packager_name || '',
          strain: s.strain || '',
          packageId: s.package_id || '',
          batchNumber: s.batch_id || '',
          inputWeight: s.pull_weight || s.source_weight_grams || 0,
          startedAt: s.started_at,
          dispatchItemId: s.dispatch_item_id || null,
          rawPackaging: s,
        });
      });

      setActiveSessions(sessions);
    } catch (err) {
      console.error('Failed to fetch active sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  // Fetch completed today for the summary
  const fetchCompletedToday = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    try {
      const [buckRes, trimRes, packRes] = await Promise.all([
        supabase.from('bucking_sessions').select('id, bucker_name, strain, batch_id, binned_package_id, started_at, completed_at, dispatch_item_id').eq('session_status', 'completed').gte('completed_at', todayISO),
        supabase.from('trim_sessions').select('id, trimmer_name, strain, batch_id, package_id, started_at, completed_at, dispatch_item_id').eq('session_status', 'completed').gte('completed_at', todayISO),
        supabase.from('packaging_sessions').select('id, packager_name, strain, batch_id, package_id, started_at, completed_at, dispatch_item_id').eq('session_status', 'completed').gte('completed_at', todayISO),
      ]);

      const completed: ActiveSession[] = [];
      (buckRes.data || []).forEach((s: any) => completed.push({ id: s.id, type: 'bucking', stage: 'buck', worker: s.bucker_name || '', strain: s.strain || '', packageId: s.binned_package_id || '', batchNumber: s.batch_id || '', inputWeight: 0, startedAt: s.completed_at, dispatchItemId: s.dispatch_item_id }));
      (trimRes.data || []).forEach((s: any) => completed.push({ id: s.id, type: 'trim', stage: 'trim_to_stock', worker: s.trimmer_name || '', strain: s.strain || '', packageId: s.package_id || '', batchNumber: s.batch_id || '', inputWeight: 0, startedAt: s.completed_at, dispatchItemId: s.dispatch_item_id }));
      (packRes.data || []).forEach((s: any) => completed.push({ id: s.id, type: 'packaging', stage: 'package_to_order', worker: s.packager_name || '', strain: s.strain || '', packageId: s.package_id || '', batchNumber: s.batch_id || '', inputWeight: 0, startedAt: s.completed_at, dispatchItemId: s.dispatch_item_id }));

      completed.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      setCompletedToday(completed);
    } catch (err) {
      console.error('Failed to fetch completed sessions:', err);
    }
  }, []);

  useEffect(() => {
    fetchActiveSessions();
    fetchCompletedToday();
  }, [fetchActiveSessions, fetchCompletedToday]);

  function handleReload() {
    reloadDispatch();
    fetchActiveSessions();
    fetchCompletedToday();
  }

  async function handleSessionCreated() {
    setStartingItem(null);
    handleReload();
  }

  async function handleSessionCompleted() {
    setCompletingSession(null);
    handleReload();
  }

  // Fetch bucked packages for trim completion modal (needs them for smalls inventory selection)
  useEffect(() => {
    if (completingSession?.type === 'trim') {
      supabase.from('inventory_items').select('*').eq('category', 'flower_bucked').gt('available_qty', 0)
        .then(({ data }) => setBuckedPackages(data || []));
    }
  }, [completingSession]);

  const queued = dispatched.filter(d => d.status === 'pending');
  const loading = dispatchLoading || loadingSessions;

  const kpis = [
    { label: 'Active', value: String(activeSessions.length), sub: 'sessions running' },
    { label: 'Queued', value: String(queued.length), sub: 'from dispatch' },
    { label: 'Today', value: String(completedToday.length), sub: 'completed' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-cult-black flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-cult-accent" />
        <p className="text-sm text-cult-text-muted">Loading production...</p>
      </div>
    );
  }

  return (
    <HubShell section="Production" icon={Zap} kpis={kpis}>
      {dispatchError && (
        <div className="mb-4 p-3.5 rounded-xl border border-red-500/30 bg-red-500/[0.06] flex items-center gap-3 text-sm text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{dispatchError}</span>
          <button onClick={handleReload} className="shrink-0 px-3 py-1.5 rounded-lg border border-red-500/30 text-xs font-semibold hover:bg-red-500/10 transition-colors">Retry</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-cult-text-muted">
          Items dispatched by Laura appear here. Click Start Session to begin processing.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuickDispatch(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cult-accent/10 text-cult-accent border border-cult-accent/25 text-xs font-bold hover:bg-cult-accent/20 hover:border-cult-accent/40 transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            Quick Dispatch
          </button>
          <button
            onClick={handleReload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cult-dark-gray/60 text-xs font-medium text-cult-text-muted hover:text-cult-accent hover:border-cult-accent/30 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── IN PROGRESS ──────────────────────────────────────────── */}
      {activeSessions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            In Progress ({activeSessions.length})
          </div>
          <div className="space-y-2">
            {activeSessions.map(session => (
              <ActiveCard
                key={session.id}
                session={session}
                onComplete={setCompletingSession}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── QUEUED ───────────────────────────────────────────────── */}
      {queued.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-3">
            <Clock className="w-3.5 h-3.5" />
            Queued ({queued.length})
          </div>
          <div className="space-y-2">
            {queued.map(item => (
              <QueuedCard
                key={item.id}
                item={item}
                onStartSession={setStartingItem}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ──────────────────────────────────────────── */}
      {activeSessions.length === 0 && queued.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-cult-text-muted">
          <div className="w-16 h-16 rounded-2xl bg-cult-mid-gray/10 border border-cult-dark-gray/30 flex items-center justify-center mb-5">
            <Package className="w-8 h-8 opacity-30" />
          </div>
          <p className="text-base font-bold text-cult-text-secondary">No work in queue</p>
          <p className="text-sm mt-1 text-cult-text-faint">Laura dispatches items from Order Fulfillment.</p>
        </div>
      )}

      {/* ── COMPLETED TODAY ──────────────────────────────────────── */}
      {completedToday.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-[11px] font-bold text-emerald-400/70 uppercase tracking-widest mb-2 hover:text-emerald-400 transition-colors"
          >
            {showCompleted ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Completed Today ({completedToday.length})
          </button>
          {showCompleted && (
            <div className="space-y-1">
              {completedToday.map(session => (
                <CompletedCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ────────────────────────────────────────────────── */}

      {/* Quick Dispatch Modal */}
      <QuickDispatchModal
        isOpen={showQuickDispatch}
        onClose={() => setShowQuickDispatch(false)}
        onDispatched={handleReload}
      />

      {/* Start Session Modal */}
      <DispatchSessionModal
        isOpen={startingItem !== null}
        onClose={() => setStartingItem(null)}
        dispatchItem={startingItem}
        onSessionCreated={handleSessionCreated}
      />

      {/* Completion Modals */}
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
    </HubShell>
  );
}
