import { useState } from 'react';
import {
  Zap, RefreshCw, AlertTriangle, ArrowUpDown, Play,
  CheckCircle2, Clock, Package, Filter,
} from 'lucide-react';
import { HubShell } from '@/features/hub/components/HubShell';
import { useProductionDispatch } from '../hooks/useProductionDispatch';
import type { DispatchItem, ProcessingStage, TreatmentType } from '../hooks/useProductionDispatch';
import { PROCESSING_STAGE_LABELS, TREATMENT_TYPE_LABELS } from '../hooks/useProductionDispatch';
import { supabase } from '@/lib/supabase';

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    in_progress: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    complete: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  const labels: Record<string, string> = {
    queued: 'Queued',
    in_progress: 'In Progress',
    complete: 'Complete',
    cancelled: 'Cancelled',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[status] ?? styles.queued}`}>
      {labels[status] ?? status}
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

// ─── Dispatch Item Card ──────────────────────────────────────────────────────

function DispatchCard({
  item,
  onStart,
  onComplete,
  starting,
}: {
  item: DispatchItem;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  starting: boolean;
}) {
  const isQueued = item.status === 'queued';
  const isInProgress = item.status === 'in_progress';

  return (
    <div className={`rounded-lg border p-4 transition-all ${
      isInProgress
        ? 'border-amber-500/40 bg-amber-500/5'
        : 'border-cult-dark-gray bg-cult-mid-gray/10'
    }`}>
      <div className="flex items-start justify-between gap-3">
        {/* Priority badge */}
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
            item.priority <= 20
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : item.priority <= 50
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-cult-mid-gray/40 text-cult-text-muted border border-cult-dark-gray'
          }`}>
            {item.priority}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-cult-text-primary">{item.strain}</span>
              <StatusBadge status={item.status} />
            </div>
            <div className="text-xs text-cult-text-muted mt-0.5">
              {item.batch_number}
              {item.order_number && (
                <> · <span className="text-cult-text-secondary">{item.order_number}</span></>
              )}
              {item.customer_name && (
                <> · {item.customer_name}</>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-cult-dark-gray bg-cult-mid-gray/20 text-xs text-cult-text-secondary">
                {PROCESSING_STAGE_LABELS[item.processing_stage as ProcessingStage]}
              </span>
              <span className="text-xs text-cult-text-muted">
                {TREATMENT_TYPE_LABELS[item.treatment_type as TreatmentType]}
              </span>
              {item.quantity_g != null && (
                <span className="text-xs text-cult-text-muted">{formatG(item.quantity_g)}</span>
              )}
              {item.quantity_units_target != null && (
                <span className="text-xs text-cult-text-muted">{item.quantity_units_target} units target</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {item.ready_by && (
            <div className="flex items-center gap-1 text-xs text-cult-text-muted">
              <Clock className="w-3 h-3" />
              {formatDate(item.ready_by)}
            </div>
          )}
          {isQueued && (
            <button
              type="button"
              disabled={starting}
              onClick={() => onStart(item.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cult-accent text-cult-black text-xs font-semibold hover:bg-cult-accent/90 transition-colors disabled:opacity-60"
            >
              <Play className="w-3 h-3" />
              Start Session
            </button>
          )}
          {isInProgress && (
            <button
              type="button"
              onClick={() => onComplete(item.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-semibold hover:bg-green-500/30 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" />
              Mark Complete
            </button>
          )}
        </div>
      </div>

      {/* Progress bar for in_progress */}
      {isInProgress && item.quantity_units_target != null && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-cult-text-muted mb-1">
            <span>Progress</span>
            <span>{item.quantity_units_completed ?? 0} / {item.quantity_units_target} units</span>
          </div>
          <div className="h-1.5 rounded-full bg-cult-dark-gray overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
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

// ─── Main View ───────────────────────────────────────────────────────────────

type SortField = 'priority' | 'ready_by' | 'strain';
type StageFilter = 'all' | ProcessingStage;

export function DispatchExecutionQueue() {
  const { dispatched, loading, error, stats, reload } = useProductionDispatch();
  const [sortField, setSortField] = useState<SortField>('priority');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [starting, setStarting] = useState(false);

  async function handleStart(id: string) {
    setStarting(true);
    try {
      await supabase
        .from('production_dispatch_items')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', id);
      await reload();
    } finally {
      setStarting(false);
    }
  }

  async function handleComplete(id: string) {
    await supabase
      .from('production_dispatch_items')
      .update({ status: 'complete', updated_at: new Date().toISOString() })
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

  // In-progress always floated to top
  const inProgress = sorted.filter((d) => d.status === 'in_progress');
  const queued = sorted.filter((d) => d.status === 'queued');
  const ordered = [...inProgress, ...queued];

  const kpis = [
    { label: 'In Progress', value: String(stats.inProgress), sub: 'active sessions' },
    { label: 'Queued', value: String(stats.queued), sub: 'awaiting start' },
    { label: 'Batches Ready', value: String(stats.supplyBatches), sub: 'in supply' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-cult-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cult-white" />
      </div>
    );
  }

  return (
    <HubShell section="Execution Queue" icon={Zap} kpis={kpis}>
      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={reload} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1 border border-cult-dark-gray rounded-lg p-1">
          {(['all', 'buck', 'trim_to_stock', 'package_to_order'] as StageFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStageFilter(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
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
          <span className="text-xs text-cult-text-muted flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort:
          </span>
          {(['priority', 'ready_by', 'strain'] as SortField[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSortField(s)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                sortField === s
                  ? 'bg-cult-mid-gray/60 text-cult-text-primary'
                  : 'text-cult-text-muted hover:text-cult-text-primary'
              }`}
            >
              {s === 'priority' ? 'Priority' : s === 'ready_by' ? 'Ready By' : 'Strain'}
            </button>
          ))}
          <button
            onClick={reload}
            className="ml-2 p-1 rounded hover:bg-cult-mid-gray/30 text-cult-text-muted hover:text-cult-text-primary transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Queue */}
      {ordered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-cult-text-muted">
          <Package className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-base font-medium mb-1">Queue is clear</p>
          <p className="text-sm">No dispatched items waiting to be processed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inProgress.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-xs font-medium text-amber-400 uppercase tracking-wider">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                In Progress
              </div>
              {inProgress.map((item) => (
                <DispatchCard
                  key={item.id}
                  item={item}
                  onStart={handleStart}
                  onComplete={handleComplete}
                  starting={starting}
                />
              ))}
              {queued.length > 0 && (
                <div className="flex items-center gap-2 text-xs font-medium text-cult-text-muted uppercase tracking-wider pt-2">
                  <Filter className="w-3 h-3" />
                  Queued
                </div>
              )}
            </>
          )}
          {queued.map((item) => (
            <DispatchCard
              key={item.id}
              item={item}
              onStart={handleStart}
              onComplete={handleComplete}
              starting={starting}
            />
          ))}
        </div>
      )}
    </HubShell>
  );
}
