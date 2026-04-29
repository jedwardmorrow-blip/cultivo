import { useState } from 'react';
import { Layers, RefreshCw, ChevronDown, ChevronRight, Package, AlertTriangle, Clock } from 'lucide-react';
import { usePipelineBoard, type PipelineStage, type PipelineColumnData } from '../hooks/usePipelineBoard';
import type { BatchPlanData, Urgency } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatWeight(g: number): string {
  if (g >= 453.592) return `${(g / 453.592).toFixed(1)} lb`;
  return `${g.toFixed(0)}g`;
}

const STAGE_COLORS: Record<PipelineStage, { bg: string; border: string; header: string }> = {
  binned:   { bg: 'bg-indigo-900/10',  border: 'border-indigo-500/20', header: 'text-indigo-400' },
  bucked:   { bg: 'bg-cult-info/10',    border: 'border-cult-info/20',   header: 'text-cult-info' },
  bulk:     { bg: 'bg-cyan-900/10',    border: 'border-cyan-500/20',   header: 'text-cyan-400' },
  trimming: { bg: 'bg-teal-900/10',    border: 'border-teal-500/20',   header: 'text-teal-400' },
  packaged: { bg: 'bg-cult-success/10', border: 'border-cult-success/20', header: 'text-cult-success' },
};

const URGENCY_DOT: Record<Urgency, string> = {
  overdue: 'bg-cult-danger',
  urgent: 'bg-cult-warning',
  soon: 'bg-cult-warning',
  normal: 'bg-cult-success',
  no_date: 'bg-gray-400',
};

// ─── Pipeline Item Card ─────────────────────────────────────────────────────

function PipelineItemCard({ batch, stageKey }: { batch: BatchPlanData; stageKey: keyof BatchPlanData }) {
  const [expanded, setExpanded] = useState(false);
  const stageWeight = batch[stageKey] as number;
  const urgency = batch.strain_urgency as Urgency;
  const hasOrders = batch.allocated_order_items > 0;

  return (
    <div
      className={`bg-cult-surface border rounded p-2.5 cursor-pointer transition-colors ${
        hasOrders ? 'border-cult-warning/30 hover:border-cult-warning/50' : 'border-cult-surface hover:border-cult-border'
      }`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {expanded ? <ChevronDown className="w-3 h-3 text-cult-text-muted flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-cult-text-muted flex-shrink-0" />}
            <span className="text-[12px] font-semibold text-cult-text-primary truncate">{batch.strain_name}</span>
          </div>
          <div className="text-[10px] text-cult-text-muted mt-0.5 ml-[18px] font-mono">{batch.batch_number}</div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {urgency && <span className={`w-1.5 h-1.5 rounded-full ${URGENCY_DOT[urgency] ?? URGENCY_DOT.no_date}`} />}
          <span className="text-[11px] font-medium text-cult-text-primary tabular-nums">{formatWeight(stageWeight)}</span>
        </div>
      </div>

      {hasOrders && (
        <div className="flex items-center gap-1 mt-1.5 ml-[18px]">
          <Package className="w-3 h-3 text-cult-warning" />
          <span className="text-[10px] text-cult-warning">{batch.allocated_order_items} order{batch.allocated_order_items !== 1 ? 's' : ''} waiting</span>
        </div>
      )}

      {expanded && (
        <div className="mt-2 ml-[18px] pt-2 border-t border-cult-surface-raised/40 space-y-1 text-[10px]">
          <div className="flex justify-between text-cult-text-muted">
            <span>Total inventory</span>
            <span className="text-cult-text-muted tabular-nums">{formatWeight(batch.total_available_g)}</span>
          </div>
          {batch.binned_g > 0 && <div className="flex justify-between text-cult-text-muted"><span>Binned</span><span className="tabular-nums">{formatWeight(batch.binned_g)}</span></div>}
          {batch.bucked_g > 0 && <div className="flex justify-between text-cult-text-muted"><span>Bucked</span><span className="tabular-nums">{formatWeight(batch.bucked_g)}</span></div>}
          {batch.bulk_g > 0 && <div className="flex justify-between text-cult-text-muted"><span>Bulk</span><span className="tabular-nums">{formatWeight(batch.bulk_g)}</span></div>}
          {batch.trim_g > 0 && <div className="flex justify-between text-cult-text-muted"><span>Trim</span><span className="tabular-nums">{formatWeight(batch.trim_g)}</span></div>}
          {batch.packaged_g > 0 && <div className="flex justify-between text-cult-text-muted"><span>Packaged</span><span className="tabular-nums">{formatWeight(batch.packaged_g)}</span></div>}
          {batch.total_allocated_g > 0 && (
            <div className="flex justify-between text-cult-warning pt-1 border-t border-cult-surface-raised/30">
              <span>Allocated to orders</span>
              <span className="tabular-nums">{formatWeight(batch.total_allocated_g)}</span>
            </div>
          )}
          {batch.allocated_order_numbers && batch.allocated_order_numbers.length > 0 && (
            <div className="text-cult-text-faint pt-0.5">
              Orders: {batch.allocated_order_numbers.join(', ')}
            </div>
          )}
          {batch.coa_status && (
            <div className={`flex items-center gap-1 pt-1 ${batch.coa_status === 'active' ? 'text-cult-success' : 'text-cult-danger'}`}>
              {batch.coa_status === 'active' ? '✓' : '✗'} COA {batch.coa_status}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stage Column ───────────────────────────────────────────────────────────

const STAGE_KEY_MAP: Record<PipelineStage, keyof BatchPlanData> = {
  binned: 'binned_g',
  bucked: 'bucked_g',
  bulk: 'bulk_g',
  trimming: 'trim_g',
  packaged: 'packaged_g',
};

function PipelineStageColumn({ column }: { column: PipelineColumnData }) {
  const colors = STAGE_COLORS[column.stage];
  const stageKey = STAGE_KEY_MAP[column.stage];

  return (
    <div className={`flex flex-col min-w-[220px] max-w-[280px] flex-1 rounded border ${colors.border} ${colors.bg}`}>
      {/* Column header */}
      <div className="px-3 py-2.5 border-b border-cult-surface-raised/30">
        <div className="flex items-center justify-between">
          <span className={`text-[12px] font-semibold uppercase tracking-wider ${colors.header}`}>
            {column.label}
          </span>
          <span className="text-[10px] text-cult-text-muted">{column.batchCount}</span>
        </div>
        <div className="text-[11px] text-cult-text-muted mt-0.5 tabular-nums">
          {formatWeight(column.totalWeightG)}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-280px)]">
        {column.batches.length === 0 ? (
          <div className="text-center py-6 text-[11px] text-cult-text-faint">Empty</div>
        ) : (
          column.batches.map(batch => (
            <PipelineItemCard key={batch.batch_id} batch={batch} stageKey={stageKey} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ProductionPipelineBoard() {
  const { columns, totalBatches, loading, error, refresh } = usePipelineBoard();

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-cult-accent" />
          <div>
            <h1 className="text-[18px] font-semibold text-cult-text-primary font-sans">Production Pipeline</h1>
            <p className="text-[12px] text-cult-text-muted">{totalBatches} active batches across {columns.filter(c => c.batchCount > 0).length} stages</p>
          </div>
        </div>
        <button
          onClick={() => refresh()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] border border-cult-border text-cult-text-muted rounded hover:bg-cult-surface-raised disabled:opacity-40 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-3 bg-cult-danger-muted border border-cult-danger/30 rounded">
          <AlertTriangle className="w-4 h-4 text-cult-danger" />
          <span className="text-[12px] text-cult-danger">{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex gap-3 overflow-x-auto">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="min-w-[220px] flex-1 animate-pulse">
              <div className="h-16 bg-cult-surface-raised rounded mb-2" />
              <div className="space-y-2">
                {[1, 2, 3].map(j => <div key={j} className="h-16 bg-cult-surface-raised/60 rounded" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline Kanban */}
      {!loading && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columns.map(col => (
            <PipelineStageColumn key={col.stage} column={col} />
          ))}
        </div>
      )}
    </div>
  );
}
