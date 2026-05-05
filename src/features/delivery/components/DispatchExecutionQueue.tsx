import { useState } from 'react';
import {
  Zap, RefreshCw, AlertTriangle, ArrowUpDown, Play,
  CheckCircle2, Clock, Package, Filter, Scissors, Box,
  Loader2,
} from 'lucide-react';
import { HubShell } from '@/features/hub/components/HubShell';
import { useProductionDispatch } from '../hooks/useProductionDispatch';
import type { DispatchItem, ProcessingStage, TreatmentType } from '../hooks/useProductionDispatch';
import { PROCESSING_STAGE_LABELS, TREATMENT_TYPE_LABELS } from '../hooks/useProductionDispatch';
import { supabase } from '@/lib/supabase';
import { DispatchSessionModal } from './DispatchSessionModal';

// ─── Stage visuals ──────────────────────────────────────────────────────────

const STAGE_STYLE: Record<string, { icon: typeof Scissors; color: string; bg: string; border: string; gradient: string }> = {
  buck:             { icon: Scissors, color: 'text-amber-400',   bg: 'bg-amber-500/[0.06]',   border: 'border-amber-500/20',   gradient: 'from-amber-500/10 to-transparent' },
  trim_to_stock:    { icon: Box,      color: 'text-emerald-400', bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-500/20', gradient: 'from-emerald-500/10 to-transparent' },
  package_to_order: { icon: Package,  color: 'text-sky-400',     bg: 'bg-sky-500/[0.06]',     border: 'border-sky-500/20',     gradient: 'from-sky-500/10 to-transparent' },
  pack_to_stock:    { icon: Package,  color: 'text-violet-400',  bg: 'bg-violet-500/[0.06]',  border: 'border-violet-500/20',  gradient: 'from-violet-500/10 to-transparent' },
};

function getStageStyle(stage: string) {
  return STAGE_STYLE[stage] || STAGE_STYLE.buck;
}

// ─── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { style: string; label: string }> = {
    pending:     { style: 'bg-cult-info-muted text-cult-info border-cult-info/30', label: 'Queued' },
    in_progress: { style: 'bg-cult-warning-muted text-cult-warning border-cult-warning/30', label: 'In Progress' },
    completed:   { style: 'bg-cult-success-muted text-cult-success border-cult-success/30', label: 'Complete' },
    cancelled:   { style: 'bg-gray-500/15 text-gray-400 border-gray-500/30', label: 'Cancelled' },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${c.style}`}>
      {c.label}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatG(g: number): string {
  if (g >= 453.592) return `${(g / 453.592).toFixed(1)} lbs`;
  return `${g.toFixed(0)}g`;
}

// ─── Priority badge ─────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: number }) {
  const config = priority <= 20
    ? { style: 'bg-cult-danger-muted text-cult-danger border-cult-danger/30', label: 'Urgent' }
    : priority <= 40
    ? { style: 'bg-cult-warning-muted text-cult-warning border-cult-warning/30', label: 'High' }
    : priority <= 60
    ? { style: 'bg-cult-mid-gray/20 text-cult-text-muted border-cult-surface', label: 'Normal' }
    : { style: 'bg-cult-mid-gray/10 text-cult-text-faint border-cult-surface/50', label: 'Low' };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${config.style}`}>
      {config.label}
    </span>
  );
}

// ─── Dispatch Item Card ─────────────────────────────────────────────────────

function DispatchCard({
  item,
  onStartSession,
  onComplete,
}: {
  item: DispatchItem;
  onStartSession: (item: DispatchItem) => void;
  onComplete: (id: string) => void;
}) {
  const isQueued = item.status === 'pending';
  const isInProgress = item.status === 'in_progress';
  const stageStyle = getStageStyle(item.processing_stage);
  const StageIcon = stageStyle.icon;

  return (
    <div className={`rounded-cult border overflow-hidden transition-all duration-200 ${
      isInProgress
        ? `${stageStyle.border} ${stageStyle.bg} shadow-[0_0_12px_rgba(255,255,255,0.03)]`
        : 'border-cult-surface/60 bg-gradient-to-r from-cult-mid-gray/[0.03] to-transparent hover:border-cult-surface'
    }`}>
      <div className="px-4 py-3.5 flex items-center justify-between gap-4">
        {/* Left: stage icon + info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-lg ${stageStyle.bg} border ${stageStyle.border} flex items-center justify-center shrink-0`}>
            <StageIcon className={`w-4 h-4 ${stageStyle.color}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-cult-text-primary tracking-tight">{item.strain}</span>
              <StatusBadge status={item.status} />
              <PriorityBadge priority={item.priority} />
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-cult-text-muted">
              <span className="font-mono text-cult-text-faint">{item.batch_number}</span>
              <span className="w-px h-3 bg-cult-surface/40" />
              <span className={stageStyle.color}>
                {PROCESSING_STAGE_LABELS[item.processing_stage as ProcessingStage]}
              </span>
              <span className="w-px h-3 bg-cult-surface/40" />
              <span>{TREATMENT_TYPE_LABELS[item.treatment_type as TreatmentType]}</span>
              {item.quantity_g != null && (
                <>
                  <span className="w-px h-3 bg-cult-surface/40" />
                  <span className="font-semibold text-cult-text-secondary">{formatG(item.quantity_g)}</span>
                </>
              )}
            </div>
            {(item.customer_name || item.order_number) && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-cult-text-faint">
                <span>For: {item.customer_name}</span>
                {item.order_number && <span className="font-mono">({item.order_number})</span>}
              </div>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {item.ready_by && (
            <div className="flex items-center gap-1 text-[11px] text-cult-text-faint">
              <Clock className="w-3 h-3" />
              {formatDate(item.ready_by)}
            </div>
          )}
          {isQueued && (
            <button
              type="button"
              onClick={() => onStartSession(item)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-cult bg-cult-accent text-cult-black text-xs font-bold hover:bg-cult-accent/90 transition-all hover:shadow-[0_0_12px_rgba(255,255,255,0.1)]"
            >
              <Play className="w-3.5 h-3.5" />
              Start Session
            </button>
          )}
          {isInProgress && (
            <button
              type="button"
              onClick={() => onComplete(item.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-cult bg-cult-success-muted text-cult-success border border-cult-success/30 text-xs font-bold hover:bg-cult-success/25 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark Complete
            </button>
          )}
        </div>
      </div>

      {/* Progress bar for in_progress */}
      {isInProgress && item.quantity_units_target != null && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-[11px] text-cult-text-muted mb-1">
            <span>Progress</span>
            <span className="tabular-nums">{item.quantity_units_completed ?? 0} / {item.quantity_units_target} units</span>
          </div>
          <div className="h-1 rounded-full bg-cult-surface/40 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${stageStyle.color.replace('text-', 'bg-')}`}
              style={{
                width: `${Math.min(100, ((item.quantity_units_completed ?? 0) / item.quantity_units_target) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main View ──────────────────────────────────────────────────────────────

type SortField = 'priority' | 'ready_by' | 'strain';
type StageFilter = 'all' | ProcessingStage;

export function DispatchExecutionQueue() {
  const { dispatched, loading, error, stats, reload } = useProductionDispatch();
  const [sortField, setSortField] = useState<SortField>('priority');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [sessionItem, setSessionItem] = useState<DispatchItem | null>(null);

  async function handleComplete(id: string) {
    await supabase
      .from('production_dispatch_items')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', id);
    await reload();
  }

  const filtered = dispatched.filter((d) =>
    stageFilter === 'all' ? true : d.processing_stage === stageFilter
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'priority') return a.priority - b.priority;
    if (sortField === 'ready_by') {
      const aDate = a.ready_by ? new Date(a.ready_by).getTime() : Infinity;
      const bDate = b.ready_by ? new Date(b.ready_by).getTime() : Infinity;
      return aDate - bDate;
    }
    return a.strain.localeCompare(b.strain);
  });

  const inProgress = sorted.filter((d) => d.status === 'in_progress');
  const queued = sorted.filter((d) => d.status === 'pending');
  const ordered = [...inProgress, ...queued];

  const kpis = [
    { label: 'In Progress', value: String(stats.inProgress), sub: 'active sessions' },
    { label: 'Queued', value: String(stats.queued), sub: 'awaiting start' },
    { label: 'Batches Ready', value: String(stats.supplyBatches), sub: 'in supply' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-cult-black flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-cult-accent" />
        <p className="text-sm text-cult-text-muted">Loading queue...</p>
      </div>
    );
  }

  return (
    <HubShell section="Production Queue" icon={Zap} kpis={kpis}>
      {error && (
        <div className="mb-4 p-3.5 rounded-cult border border-cult-danger/30 bg-cult-danger/[0.06] flex items-center gap-3 text-sm text-cult-danger">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={reload} className="shrink-0 px-3 py-1.5 rounded-lg border border-cult-danger/30 text-xs font-semibold hover:bg-cult-danger/10 transition-colors">Retry</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1 border border-cult-surface/60 rounded-cult p-1">
          {(['all', 'buck', 'trim_to_stock', 'package_to_order', 'pack_to_stock'] as StageFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStageFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                stageFilter === f
                  ? 'bg-cult-accent text-cult-black'
                  : 'text-cult-text-muted hover:text-cult-text-primary'
              }`}
            >
              {f === 'all' ? 'All' : PROCESSING_STAGE_LABELS[f as ProcessingStage]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-cult-text-faint flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
          </span>
          {(['priority', 'ready_by', 'strain'] as SortField[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSortField(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                sortField === s
                  ? 'bg-cult-mid-gray/40 text-cult-text-primary'
                  : 'text-cult-text-muted hover:text-cult-text-primary'
              }`}
            >
              {s === 'priority' ? 'Priority' : s === 'ready_by' ? 'Ready By' : 'Strain'}
            </button>
          ))}
          <button
            onClick={reload}
            className="ml-2 p-1.5 rounded-lg hover:bg-cult-mid-gray/20 text-cult-text-muted hover:text-cult-accent transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Queue */}
      {ordered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-cult-text-muted">
          <div className="w-16 h-16 rounded-cult bg-cult-mid-gray/10 border border-cult-surface/30 flex items-center justify-center mb-5">
            <Package className="w-8 h-8 opacity-30" />
          </div>
          <p className="text-base font-bold text-cult-text-secondary">Queue is clear</p>
          <p className="text-sm mt-1 text-cult-text-faint">No dispatched items waiting to be processed.</p>
          <p className="text-xs mt-3 text-cult-text-faint">Laura dispatches items from Order Fulfillment → Dispatch.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {inProgress.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] font-bold text-cult-warning uppercase tracking-widest mb-1">
              <div className="w-2 h-2 rounded-full bg-cult-warning animate-pulse" />
              In Progress ({inProgress.length})
            </div>
          )}
          {inProgress.map((item) => (
            <DispatchCard
              key={item.id}
              item={item}
              onStartSession={setSessionItem}
              onComplete={handleComplete}
            />
          ))}
          {inProgress.length > 0 && queued.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] font-bold text-cult-text-muted uppercase tracking-widest pt-3 mb-1">
              <Filter className="w-3 h-3" />
              Queued ({queued.length})
            </div>
          )}
          {queued.map((item) => (
            <DispatchCard
              key={item.id}
              item={item}
              onStartSession={setSessionItem}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      {/* Session creation modal */}
      <DispatchSessionModal
        isOpen={sessionItem !== null}
        onClose={() => setSessionItem(null)}
        dispatchItem={sessionItem}
        onSessionCreated={reload}
      />
    </HubShell>
  );
}
