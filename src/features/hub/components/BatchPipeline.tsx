import { useState, useRef } from 'react';
import {
  Sprout, Sun, Flower2,
  Wind, Scissors, Hand, Box, Package, CheckCircle2,
  Snowflake, FlaskConical,
  RefreshCw, AlertTriangle, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Target
} from 'lucide-react';
import { BatchCOAStatusBadge } from '@/features/batches/components/BatchCOAStatusBadge';
import type { LucideIcon } from 'lucide-react';
import { useBatchPipeline, type PipelineColumn, type PipelineBatch } from '../hooks/useBatchPipeline';
import { useStrainMetrics } from '../hooks/useStrainMetrics';
import { useBatchPredictions, type BatchPrediction } from '../hooks/useBatchPredictions';
import { BatchKanbanCard } from './BatchKanbanCard';
import type { BatchLifecycleState } from '@/types/batch.types';

const COLUMN_ICONS: Record<BatchLifecycleState, LucideIcon> = {
  clone: Sprout,
  veg: Sun,
  flower: Flower2,
  drying: Wind,
  bucking: Scissors,
  trimming: Hand,
  bulk: Box,
  packaging: Package,
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

function ColumnHeader({ column }: { column: PipelineColumn }) {
  const Icon = COLUMN_ICONS[column.stage];
  const accent = COLUMN_ACCENT[column.path];
  const count = column.batches.length;

  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 border-b border-cult-charcoal/60 ${
      count > 0 ? '' : 'opacity-50'
    }`}>
      <div className={`w-6 h-6 rounded flex items-center justify-center border ${accent}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="text-[11px] font-bold text-cult-off-white uppercase tracking-widest font-montserrat">
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
    <div className="flex items-center gap-6 text-[11px] uppercase tracking-widest font-montserrat">
      <div className="flex items-center gap-2">
        <span className="text-cult-lighter-gray">Active</span>
        <span className="text-cult-off-white font-bold">{stats.total}</span>
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
          <AlertTriangle className="w-3 h-3 text-red-400" />
          <span className="text-red-400">{stats.quarantined}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-cult-lighter-gray">Strains</span>
        <span className="text-cult-off-white font-bold">{stats.strains}</span>
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
  if (value == null) return <span className="text-cult-charcoal">—</span>;
  const pct = (value * 100).toFixed(1);
  const isPositive = value >= 0;
  return (
    <span className={`flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-amber-400'}`}>
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
      <span className="text-cult-lighter-gray uppercase tracking-wider font-montserrat">{label}</span>
      <span className="text-cult-silver text-right">{formatGrams(predicted)}</span>
      <span className={`text-right font-medium ${actual != null ? 'text-cult-off-white' : 'text-cult-charcoal'}`}>
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
      <div className="p-3 bg-cult-black/50 rounded-cult border border-cult-charcoal/30 text-[11px] text-cult-lighter-gray">
        No prediction data available — no plant groups or room assignment found.
      </div>
    );
  }

  const sm = strainMetrics.getMetricsForStrain(prediction.strain);
  const confidenceColors = {
    high: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    low: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    fallback: 'text-cult-lighter-gray bg-cult-charcoal/30 border-cult-charcoal/50',
  };

  return (
    <div className="space-y-3">
      {/* Confidence + room info */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${confidenceColors[prediction.confidence]}`}>
          {prediction.confidence} confidence
        </span>
        {prediction.room_code && (
          <span className="text-[10px] text-cult-lighter-gray">
            {prediction.room_code} · {prediction.plant_count} plants
            {prediction.occupancy_fraction != null && (
              <> · {(prediction.occupancy_fraction * 100).toFixed(0)}% room</>
            )}
          </span>
        )}
      </div>

      {/* Yield pipeline table */}
      <div className="bg-cult-black/50 rounded-cult border border-cult-charcoal/30 p-3 space-y-2">
        <div className="grid grid-cols-4 gap-2 text-[9px] text-cult-charcoal uppercase tracking-wider font-montserrat mb-1">
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
      <div className="bg-cult-black/30 rounded-cult border border-cult-charcoal/20 p-3 space-y-1.5">
        <div className="text-[9px] text-cult-charcoal uppercase tracking-wider font-montserrat mb-1">
          Strain Benchmarks ({sm.harvest_batch_count} harvest{sm.harvest_batch_count !== 1 ? 's' : ''})
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="text-cult-lighter-gray">Wet/Plant</span>
            <span className="text-cult-silver">{sm.avg_wet_per_plant ? `${Number(sm.avg_wet_per_plant).toFixed(0)}g` : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cult-lighter-gray">Dry Ratio</span>
            <span className="text-cult-silver">{sm.avg_dry_wet_ratio ? `${(Number(sm.avg_dry_wet_ratio) * 100).toFixed(1)}%` : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cult-lighter-gray">Buck Yield</span>
            <span className="text-cult-silver">{sm.avg_buck_yield_ratio ? `${(Number(sm.avg_buck_yield_ratio) * 100).toFixed(1)}%` : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cult-lighter-gray">Trim Yield</span>
            <span className="text-cult-silver">{sm.avg_trim_yield_ratio ? `${(Number(sm.avg_trim_yield_ratio) * 100).toFixed(1)}%` : '—'}</span>
          </div>
        </div>
        {sm.usingFallbacks && (
          <p className="text-[9px] text-cult-charcoal italic mt-1">
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
        <div className="flex items-center gap-3 text-cult-silver">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm uppercase tracking-widest font-montserrat">Loading pipeline...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-8 h-8 text-amber-400" />
        <p className="text-cult-silver text-sm">{error}</p>
        <button
          onClick={reload}
          className="px-4 py-2 text-xs uppercase tracking-widest font-montserrat border border-cult-charcoal text-cult-silver hover:text-cult-white hover:border-cult-silver transition-all rounded-cult"
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
          <h1 className="text-xl font-bold text-cult-off-white uppercase tracking-wider font-montserrat">
            Batch Pipeline
          </h1>
          <p className="text-[11px] text-cult-lighter-gray uppercase tracking-widest mt-1 font-montserrat">
            Clone → Harvest → Production → Distribution
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PipelineStats stats={stats} loading={loading} />
          <button
            onClick={() => { reload(); strainMetrics.reload(); }}
            className="p-2 text-cult-silver hover:text-cult-white hover:bg-cult-charcoal/50 rounded-cult transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scroll controls */}
      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-16 bg-gradient-to-r from-cult-black via-cult-black/80 to-transparent flex items-center justify-start pl-1 text-cult-silver hover:text-cult-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-16 bg-gradient-to-l from-cult-black via-cult-black/80 to-transparent flex items-center justify-end pr-1 text-cult-silver hover:text-cult-white transition-colors"
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
        <div className="fixed inset-y-0 right-0 w-[420px] bg-cult-near-black border-l border-cult-charcoal shadow-glow-strong z-50 overflow-y-auto animate-slide-in">
          <div className="sticky top-0 bg-cult-near-black border-b border-cult-charcoal z-10 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-cult-off-white uppercase tracking-wider font-montserrat">
                {selectedBatch.batch_number}
              </h2>
              <button
                onClick={() => setSelectedBatch(null)}
                className="text-cult-silver hover:text-cult-white transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-[11px] text-cult-silver mt-0.5">{selectedBatch.strain}</p>
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
                <span className="text-[10px] text-cult-lighter-gray uppercase tracking-widest font-montserrat flex-shrink-0">
                  COA Status
                </span>
                <BatchCOAStatusBadge status={selectedBatch.coa_status} size="xs" />
              </div>
              <DetailRow label="Plant Groups" value={String(selectedBatch.plant_group_count)} />
            </div>

            {selectedBatch.is_quarantined && (
              <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-cult">
                <div className="flex items-center gap-2 text-red-400 text-xs uppercase tracking-wider font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  Quarantined
                </div>
              </div>
            )}

            {/* Yield Predictions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-cult-silver" />
                <span className="text-[11px] text-cult-lighter-gray uppercase tracking-widest font-montserrat font-bold">
                  Yield Predictions
                </span>
              </div>
              <PredictionDetail prediction={selectedPrediction} strainMetrics={strainMetrics} />
            </div>

            {selectedBatch.notes && (
              <div className="text-cult-lighter-gray text-xs p-3 bg-cult-black/50 rounded-cult border border-cult-charcoal/30">
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
      <span className="text-[10px] text-cult-lighter-gray uppercase tracking-widest font-montserrat flex-shrink-0">
        {label}
      </span>
      <span className="text-cult-off-white text-right capitalize">{value}</span>
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
      className="flex-shrink-0 w-[200px] flex flex-col bg-cult-near-black/50 border border-cult-charcoal/30 rounded-cult mx-1"
      style={{ scrollSnapAlign: 'start', minHeight: '400px' }}
    >
      <ColumnHeader column={column} />

      <div className={`flex-1 p-2 space-y-2 overflow-y-auto ${
        isEmpty ? 'flex items-center justify-center' : ''
      }`}
        style={{ maxHeight: 'calc(100vh - 260px)' }}
      >
        {isEmpty ? (
          <span className="text-[10px] text-cult-charcoal uppercase tracking-widest font-montserrat">
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
