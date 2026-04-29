import { useState, useRef, useMemo } from 'react';
import {
  Sprout, Sun, Flower2,
  Wind, Scissors, Hand, Box, Package, CheckCircle2,
  Snowflake, FlaskConical,
  RefreshCw, AlertTriangle, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Target
} from 'lucide-react';
import { BatchCOAStatusBadge } from '@/features/batches/components/BatchCOAStatusBadge';
import type { LucideIcon } from 'lucide-react';
import { useBatchPipeline, getDaysInStage, type PipelineColumn, type PipelineBatch } from '../hooks/useBatchPipeline';
import { useStrainMetrics } from '../hooks/useStrainMetrics';
import { useBatchPredictions, type BatchPrediction } from '../hooks/useBatchPredictions';
import { BatchKanbanCard } from './BatchKanbanCard';
import type { BatchLifecycleState } from '@/types/batch.types';

const COLUMN_ICONS: Record<BatchLifecycleState, LucideIcon> = {
  clone: Sprout,
  veg: Sun,
  flower: Flower2,
  drying: Wind,
  bucked: Scissors,
  in_trim: Hand,
  bulk_available: Box,
  in_packaging: Package,
  packaged: CheckCircle2,
  fresh_frozen: Snowflake,
  lab: FlaskConical,
  depleted: Box,
  archived: Box,
};

const COLUMN_ACCENT: Record<string, string> = {
  cultivation: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  flower: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  ff_lab: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
};

const PATH_LABELS: Record<string, { label: string; color: string }> = {
  cultivation: { label: 'CULTIVATION', color: 'text-violet-400' },
  flower: { label: 'FLOWER PATH', color: 'text-emerald-400' },
  ff_lab: { label: 'FF / LAB', color: 'text-sky-400' },
};

// Stuck-batch thresholds in days, per lifecycle stage. Conservative defaults
// pending strain-specific avg fields. Drives the alert tray above the kanban.
// Stages omitted (bulk_available, packaged, depleted, archived) are terminal
// or shelf-life and not "stuck".
const STUCK_DAY_THRESHOLDS: Partial<Record<BatchLifecycleState, number>> = {
  clone: 21,
  veg: 42,
  flower: 84,
  drying: 18,
  bucked: 7,
  in_trim: 10,
  in_packaging: 7,
  fresh_frozen: 30,
  lab: 60,
};

function StuckTray({
  batches,
  onSelectBatch,
}: {
  batches: PipelineBatch[];
  onSelectBatch: (b: PipelineBatch) => void;
}) {
  const stuck = useMemo(() => {
    const out: Array<{ batch: PipelineBatch; days: number; threshold: number; over: number }> = [];
    for (const b of batches) {
      const threshold = STUCK_DAY_THRESHOLDS[b.lifecycle_state];
      if (!threshold) continue;
      const days = getDaysInStage(b);
      if (days > threshold) {
        out.push({ batch: b, days, threshold, over: days - threshold });
      }
    }
    out.sort((a, b) => b.over - a.over);
    return out;
  }, [batches]);

  if (stuck.length === 0) {
    return (
      <div className="border border-cult-border bg-cult-surface px-3 py-2 flex items-center gap-3">
        <span className="w-1.5 h-1.5 rounded-full bg-cult-success" />
        <span className="text-[11px] uppercase tracking-widest font-mono text-cult-text-muted">
          No stuck batches
        </span>
      </div>
    );
  }

  // Bucket by stage for the count chips
  const byStage = new Map<BatchLifecycleState, number>();
  for (const s of stuck) {
    byStage.set(s.batch.lifecycle_state, (byStage.get(s.batch.lifecycle_state) ?? 0) + 1);
  }

  return (
    <div className="border border-cult-border bg-cult-surface">
      <div className="px-3 py-2 flex items-center gap-3 border-b border-cult-border">
        <span className="w-1.5 h-1.5 rounded-full bg-cult-warning" />
        <span className="text-[11px] uppercase tracking-widest font-mono text-cult-text-primary font-bold">
          Stuck batches
        </span>
        <span className="text-[11px] uppercase tracking-widest font-mono text-cult-text-muted">
          {stuck.length}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          {[...byStage.entries()].map(([stage, count]) => (
            <span
              key={stage}
              className="text-[10px] uppercase tracking-widest font-mono text-cult-text-muted border border-cult-border px-1.5 py-0.5"
            >
              {stage.replace('_', ' ')} {count}
            </span>
          ))}
        </div>
      </div>
      <div className="px-3 py-2 flex flex-wrap gap-x-4 gap-y-1">
        {stuck.slice(0, 12).map(({ batch, days, threshold }) => (
          <button
            key={batch.id}
            onClick={() => onSelectBatch(batch)}
            className="text-[11px] font-mono text-cult-text-secondary hover:text-cult-text-primary"
            title={`${batch.strain} · ${days}d in ${batch.lifecycle_state} (threshold ${threshold}d)`}
          >
            {batch.batch_number} <span className="text-cult-warning">{days}d</span>
          </button>
        ))}
        {stuck.length > 12 && (
          <span className="text-[11px] font-mono text-cult-text-muted">
            +{stuck.length - 12} more
          </span>
        )}
      </div>
    </div>
  );
}

function ColumnHeader({ column }: { column: PipelineColumn }) {
  const Icon = COLUMN_ICONS[column.stage];
  const accent = COLUMN_ACCENT[column.path];
  const count = column.batches.length;

  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 border-b border-cult-surface-raised/60 ${
      count > 0 ? '' : 'opacity-50'
    }`}>
      <div className={`w-6 h-6 rounded flex items-center justify-center border ${accent}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="text-[11px] font-bold text-cult-text-primary uppercase tracking-widest font-mono">
        {column.label}
      </span>
      {count > 0 && (
        <span className={`ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded border ${accent}`}>
          {count}
        </span>
      )}
    </div>
  );
}

function PipelineStats({ stats, loading }: {
  stats: ReturnType<typeof useBatchPipeline>['stats'];
  loading: boolean;
}) {
  if (loading) return null;

  return (
    <div className="flex items-center gap-6 text-[11px] uppercase tracking-widest font-mono">
      <div className="flex items-center gap-2">
        <span className="text-cult-text-muted">Active</span>
        <span className="text-cult-text-primary font-bold">{stats.total}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-violet-500" />
        <span className="text-violet-400">{stats.cultivation}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-emerald-400">{stats.flowerPath}</span>
      </div>
      {stats.ffLab > 0 && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          <span className="text-sky-400">{stats.ffLab}</span>
        </div>
      )}
      {stats.quarantined > 0 && (
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-cult-danger" />
          <span className="text-cult-danger">{stats.quarantined}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-cult-text-muted">Strains</span>
        <span className="text-cult-text-primary font-bold">{stats.strains}</span>
      </div>
    </div>
  );
}

function PathDivider({ path }: { path: string }) {
  const info = PATH_LABELS[path];
  if (!info) return null;

  return (
    <div className="flex-shrink-0 flex items-center self-stretch px-1">
      <div className="flex flex-col items-center justify-center gap-1">
        <div className={`writing-mode-vertical text-[9px] font-bold uppercase tracking-[0.2em] ${info.color} opacity-60`}
          style={{ writingMode: 'vertical-lr', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
        >
          {info.label}
        </div>
      </div>
    </div>
  );
}

function formatGrams(g: number | null): string {
  if (g == null) return '—';
  if (g >= 1000) return `${(g / 1000).toFixed(1)} kg`;
  return `${Math.round(g)} g`;
}

function VarianceBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-cult-surface-raised">—</span>;
  const pct = (value * 100).toFixed(1);
  const isPositive = value >= 0;
  return (
    <span className={`flex items-center gap-0.5 ${isPositive ? 'text-cult-success' : 'text-cult-warning'}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPositive ? '+' : ''}{pct}%
    </span>
  );
}

function YieldStageRow({ label, predicted, actual, varianceVal }: {
  label: string;
  predicted: number | null;
  actual: number | null;
  varianceVal: number | null;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 items-center text-[11px]">
      <span className="text-cult-text-muted uppercase tracking-wider font-mono">{label}</span>
      <span className="text-cult-text-secondary text-right">{formatGrams(predicted)}</span>
      <span className={`text-right font-medium ${actual != null ? 'text-cult-text-primary' : 'text-cult-surface-raised'}`}>
        {formatGrams(actual)}
      </span>
      <span className="text-right">
        <VarianceBadge value={varianceVal} />
      </span>
    </div>
  );
}

function PredictionDetail({ prediction, strainMetrics }: {
  prediction: BatchPrediction | undefined;
  strainMetrics: ReturnType<typeof useStrainMetrics>;
}) {
  if (!prediction) {
    return (
      <div className="p-3 bg-cult-black/50 rounded-cult border border-cult-surface-raised/30 text-[11px] text-cult-text-muted">
        No prediction data available — no plant groups or room assignment found.
      </div>
    );
  }

  const sm = strainMetrics.getMetricsForStrain(prediction.strain);
  const confidenceColors = {
    high: 'text-cult-success bg-cult-success-muted border-cult-success/30',
    medium: 'text-cult-warning bg-cult-warning-muted border-cult-warning/30',
    low: 'text-cult-warning bg-cult-warning-muted border-cult-warning/30',
    fallback: 'text-cult-text-muted bg-cult-surface-raised/30 border-cult-surface-raised/50',
  };

  return (
    <div className="space-y-3">
      {/* Confidence + room info */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${confidenceColors[prediction.confidence]}`}>
          {prediction.confidence} confidence
        </span>
        {prediction.room_code && (
          <span className="text-[10px] text-cult-text-muted">
            {prediction.room_code} · {prediction.plant_count} plants
            {prediction.occupancy_fraction != null && (
              <> · {(prediction.occupancy_fraction * 100).toFixed(0)}% room</>
            )}
          </span>
        )}
      </div>

      {/* Yield pipeline table */}
      <div className="bg-cult-black/50 rounded-cult border border-cult-surface-raised/30 p-3 space-y-2">
        <div className="grid grid-cols-4 gap-2 text-[9px] text-cult-surface-raised uppercase tracking-wider font-mono mb-1">
          <span>Stage</span>
          <span className="text-right">Predicted</span>
          <span className="text-right">Actual</span>
          <span className="text-right">Variance</span>
        </div>
        <YieldStageRow
          label="Wet"
          predicted={prediction.predicted_wet}
          actual={prediction.actual_wet}
          varianceVal={prediction.variance_wet}
        />
        <YieldStageRow
          label="Dry"
          predicted={prediction.predicted_dry}
          actual={prediction.actual_dry}
          varianceVal={prediction.variance_dry}
        />
        <YieldStageRow
          label="Bucked"
          predicted={prediction.predicted_bucked}
          actual={prediction.actual_bucked}
          varianceVal={prediction.variance_bucked}
        />
        <YieldStageRow
          label="Trimmed"
          predicted={prediction.predicted_trimmed}
          actual={prediction.actual_trimmed}
          varianceVal={prediction.variance_trimmed}
        />
      </div>

      {/* Strain benchmarks */}
      <div className="bg-cult-black/30 rounded-cult border border-cult-surface-raised/20 p-3 space-y-1.5">
        <div className="text-[9px] text-cult-surface-raised uppercase tracking-wider font-mono mb-1">
          Strain Benchmarks ({sm.harvest_batch_count} harvest{sm.harvest_batch_count !== 1 ? 's' : ''})
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="text-cult-text-muted">Wet/Plant</span>
            <span className="text-cult-text-secondary">{sm.avg_wet_per_plant ? `${Number(sm.avg_wet_per_plant).toFixed(0)}g` : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cult-text-muted">Dry Ratio</span>
            <span className="text-cult-text-secondary">{sm.avg_dry_wet_ratio ? `${(Number(sm.avg_dry_wet_ratio) * 100).toFixed(1)}%` : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cult-text-muted">Buck Yield</span>
            <span className="text-cult-text-secondary">{sm.avg_buck_yield_ratio ? `${(Number(sm.avg_buck_yield_ratio) * 100).toFixed(1)}%` : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cult-text-muted">Trim Yield</span>
            <span className="text-cult-text-secondary">{sm.avg_trim_yield_ratio ? `${(Number(sm.avg_trim_yield_ratio) * 100).toFixed(1)}%` : '—'}</span>
          </div>
        </div>
        {sm.usingFallbacks && (
          <p className="text-[9px] text-cult-surface-raised italic mt-1">
            Using facility-wide averages — no strain-specific harvest data yet
          </p>
        )}
      </div>
    </div>
  );
}

export function BatchPipeline() {
  const { columns, stats, loading, error, reload, batches } = useBatchPipeline();
  const strainMetrics = useStrainMetrics();
  const { predictions, loading: predLoading } = useBatchPredictions(
    strainMetrics.metricsMap,
    strainMetrics.getMetricsForStrain,
    strainMetrics.loading
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedBatch, setSelectedBatch] = useState<PipelineBatch | null>(null);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({
      left: dir === 'left' ? -320 : 320,
      behavior: 'smooth',
    });
  };

  // Group columns by path
  const cultivationCols = columns.filter(c => c.path === 'cultivation');
  const flowerCols = columns.filter(c => c.path === 'flower');
  const ffLabCols = columns.filter(c => c.path === 'ff_lab');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-cult-text-secondary">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm uppercase tracking-widest font-mono">Loading pipeline...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-8 h-8 text-cult-warning" />
        <p className="text-cult-text-secondary text-sm">{error}</p>
        <button
          onClick={reload}
          className="px-4 py-2 text-xs uppercase tracking-widest font-mono border border-cult-surface-raised text-cult-text-secondary hover:text-cult-text-primary hover:border-cult-text-secondary transition-all rounded-cult"
        >
          Retry
        </button>
      </div>
    );
  }

  const selectedPrediction = selectedBatch ? predictions.get(selectedBatch.id) : undefined;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-cult-text-primary uppercase tracking-wider font-mono">
            Batch Pipeline
          </h1>
          <p className="text-[11px] text-cult-text-muted uppercase tracking-widest mt-1 font-mono">
            Clone → Harvest → Production → Distribution
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PipelineStats stats={stats} loading={loading} />
          <a
            href="/batches/list"
            className="text-[11px] text-cult-text-muted hover:text-cult-text-primary uppercase tracking-widest font-mono px-2 py-1 border border-cult-border hover:border-cult-border-strong transition-colors"
            title="Switch to flat list / search view"
          >
            List ↗
          </a>
          <button
            onClick={() => { reload(); strainMetrics.reload(); }}
            className="p-2 text-cult-text-secondary hover:text-cult-text-primary hover:bg-cult-surface-raised/50 rounded-cult transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stuck-batch alert tray */}
      <StuckTray batches={batches} onSelectBatch={setSelectedBatch} />

      {/* Scroll controls */}
      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-16 bg-gradient-to-r from-cult-black via-cult-black/80 to-transparent flex items-center justify-start pl-1 text-cult-text-secondary hover:text-cult-text-primary transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-16 bg-gradient-to-l from-cult-black via-cult-black/80 to-transparent flex items-center justify-end pr-1 text-cult-text-secondary hover:text-cult-text-primary transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Kanban board */}
        <div
          ref={scrollRef}
          className="flex gap-0 overflow-x-auto scrollbar-hide pb-4"
          style={{ scrollSnapType: 'x proximity' }}
        >
          <PathDivider path="cultivation" />
          {cultivationCols.map(col => (
            <KanbanColumn key={col.stage} column={col} predictions={predictions} onSelectBatch={setSelectedBatch} />
          ))}

          <PathDivider path="flower" />
          {flowerCols.map(col => (
            <KanbanColumn key={col.stage} column={col} predictions={predictions} onSelectBatch={setSelectedBatch} />
          ))}

          <PathDivider path="ff_lab" />
          {ffLabCols.map(col => (
            <KanbanColumn key={col.stage} column={col} predictions={predictions} onSelectBatch={setSelectedBatch} />
          ))}
        </div>
      </div>

      {/* Batch detail drawer */}
      {selectedBatch && (
        <div className="fixed inset-y-0 right-0 w-[420px] bg-cult-surface border-l border-cult-border z-50 overflow-y-auto animate-slide-in">
          <div className="sticky top-0 bg-cult-surface border-b border-cult-surface-raised z-10 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-cult-text-primary uppercase tracking-wider font-mono">
                {selectedBatch.batch_number}
              </h2>
              <button
                onClick={() => setSelectedBatch(null)}
                className="text-cult-text-secondary hover:text-cult-text-primary transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-[11px] text-cult-text-secondary mt-0.5">{selectedBatch.strain}</p>
          </div>

          <div className="px-6 py-4 space-y-5">
            {/* Batch info */}
            <div className="space-y-3 text-sm">
              <DetailRow label="Stage" value={selectedBatch.lifecycle_state.replace(/_/g, ' ')} />
              <DetailRow label="Path" value={selectedBatch.production_path || 'Cultivation'} />
              <DetailRow label="Room" value={selectedBatch.room || '—'} />
              <DetailRow label="Harvest Date" value={selectedBatch.harvest_date || '—'} />
              <DetailRow label="Clone Date" value={selectedBatch.clone_date || '—'} />
              <DetailRow label="Initial Weight" value={
                selectedBatch.initial_weight_grams
                  ? formatGrams(selectedBatch.initial_weight_grams)
                  : '—'
              } />
              <div className="flex items-start justify-between gap-4">
                <span className="text-[10px] text-cult-text-muted uppercase tracking-widest font-mono flex-shrink-0">
                  COA Status
                </span>
                <BatchCOAStatusBadge status={selectedBatch.coa_status} size="xs" />
              </div>
              <DetailRow label="Plant Groups" value={String(selectedBatch.plant_group_count)} />
            </div>

            {selectedBatch.is_quarantined && (
              <div className="p-3 bg-cult-danger-muted border border-cult-danger/50 rounded-cult">
                <div className="flex items-center gap-2 text-cult-danger text-xs uppercase tracking-wider font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  Quarantined
                </div>
              </div>
            )}

            {/* Yield Predictions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-cult-text-secondary" />
                <span className="text-[11px] text-cult-text-muted uppercase tracking-widest font-mono font-bold">
                  Yield Predictions
                </span>
              </div>
              <PredictionDetail prediction={selectedPrediction} strainMetrics={strainMetrics} />
            </div>

            {selectedBatch.notes && (
              <div className="text-cult-text-muted text-xs p-3 bg-cult-black/50 rounded-cult border border-cult-surface-raised/30">
                {selectedBatch.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[10px] text-cult-text-muted uppercase tracking-widest font-mono flex-shrink-0">
        {label}
      </span>
      <span className="text-cult-text-primary text-right capitalize">{value}</span>
    </div>
  );
}

function KanbanColumn({ column, predictions, onSelectBatch }: {
  column: PipelineColumn;
  predictions: Map<string, BatchPrediction>;
  onSelectBatch: (b: PipelineBatch) => void;
}) {
  const isEmpty = column.batches.length === 0;

  return (
    <div
      className="flex-shrink-0 w-[200px] flex flex-col bg-cult-surface/50 border border-cult-surface-raised/30 rounded-cult mx-1"
      style={{ scrollSnapAlign: 'start', minHeight: '400px' }}
    >
      <ColumnHeader column={column} />

      <div className={`flex-1 p-2 space-y-2 overflow-y-auto ${
        isEmpty ? 'flex items-center justify-center' : ''
      }`}
        style={{ maxHeight: 'calc(100vh - 260px)' }}
      >
        {isEmpty ? (
          <span className="text-[10px] text-cult-surface-raised uppercase tracking-widest font-mono">
            Empty
          </span>
        ) : (
          column.batches.map(batch => (
            <BatchKanbanCard
              key={batch.id}
              batch={batch}
              prediction={predictions.get(batch.id)}
              onClick={onSelectBatch}
            />
          ))
        )}
      </div>
    </div>
  );
}
