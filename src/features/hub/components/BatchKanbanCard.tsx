import { memo } from 'react';
import { AlertTriangle, Leaf, Clock, FlaskConical, TrendingUp, TrendingDown } from 'lucide-react';
import type { PipelineBatch } from '../hooks/useBatchPipeline';
import { getDaysInStage } from '../hooks/useBatchPipeline';
import type { BatchPrediction } from '../hooks/useBatchPredictions';
import { BatchCOAStatusBadge } from '@/features/batches/components/BatchCOAStatusBadge';

interface BatchKanbanCardProps {
  batch: PipelineBatch;
  prediction?: BatchPrediction;
  onClick?: (batch: PipelineBatch) => void;
}

const GRADE_COLORS: Record<string, string> = {
  cult: 'border-l-emerald-500',
  b: 'border-l-sky-500',
  c: 'border-l-amber-500',
  d: 'border-l-rose-500',
};

function formatWeight(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(1)}kg`;
  return `${Math.round(g)}g`;
}

function getNextPredictedWeight(p: BatchPrediction | undefined, state: string): number | null {
  if (!p) return null;
  // Show the prediction for the NEXT meaningful weight based on current stage
  switch (state) {
    case 'clone': case 'veg': case 'flower':
      return p.predicted_wet;
    case 'drying':
      return p.actual_wet ?? p.predicted_wet;
    case 'bucked':
      return p.actual_dry ?? p.predicted_dry;
    case 'in_trim':
      return p.actual_bucked ?? p.predicted_bucked;
    case 'bulk_available': case 'in_packaging': case 'packaged':
      return p.actual_trimmed ?? p.predicted_trimmed;
    default:
      return null;
  }
}

function getPrimaryVariance(p: BatchPrediction | undefined, state: string): number | null {
  if (!p) return null;
  // Show the most recent actual-vs-predicted variance
  if (p.variance_trimmed != null) return p.variance_trimmed;
  if (p.variance_bucked != null) return p.variance_bucked;
  if (p.variance_dry != null) return p.variance_dry;
  if (p.variance_wet != null) return p.variance_wet;
  return null;
}

const CONFIDENCE_DOT: Record<string, string> = {
  high: 'bg-emerald-500',
  medium: 'bg-amber-500',
  low: 'bg-orange-500',
  fallback: 'bg-cult-charcoal',
};

export const BatchKanbanCard = memo(function BatchKanbanCard({ batch, prediction, onClick }: BatchKanbanCardProps) {
  const daysInStage = getDaysInStage(batch);
  const weight = batch.initial_weight_grams;
  const isFF = batch.production_path === 'fresh_frozen';

  // Grade color for left border accent
  const gradeKey = batch.quality_grade_id ? 'cult' : '';
  const borderColor = GRADE_COLORS[gradeKey] || 'border-l-cult-charcoal';

  // Prediction display
  const predWeight = getNextPredictedWeight(prediction, batch.lifecycle_state);
  const primaryVariance = getPrimaryVariance(prediction, batch.lifecycle_state);

  return (
    <button
      onClick={() => onClick?.(batch)}
      className={`
        w-full text-left p-3 rounded-cult
        bg-cult-graphite/80 hover:bg-cult-graphite
        border border-cult-charcoal/60 hover:border-cult-silver/40
        border-l-[3px] ${borderColor}
        transition-all duration-150 group
        ${batch.is_quarantined ? 'ring-1 ring-red-500/40' : ''}
      `}
    >
      {/* Top row: batch number + indicators */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[13px] font-semibold text-cult-off-white tracking-wide truncate font-montserrat">
          {batch.batch_number}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {batch.is_quarantined && (
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          )}
          {batch.coa_status && batch.coa_status !== 'curing' && (
            <BatchCOAStatusBadge status={batch.coa_status} size="xs" />
          )}
          {isFF && (
            <FlaskConical className="w-3 h-3 text-sky-400" />
          )}
          {prediction && (
            <span className={`w-1.5 h-1.5 rounded-full ${CONFIDENCE_DOT[prediction.confidence]}`}
              title={`Prediction confidence: ${prediction.confidence}`}
            />
          )}
        </div>
      </div>

      {/* Strain */}
      <div className="text-[11px] text-cult-silver truncate mb-1.5">
        {batch.strain}
      </div>

      {/* Yield prediction bar — only if we have a prediction */}
      {predWeight != null && predWeight > 0 && (
        <div className="flex items-center gap-1.5 mb-1.5 text-[10px]">
          <span className="text-cult-lighter-gray">est</span>
          <span className="text-cult-silver font-medium">{formatWeight(predWeight)}</span>
          {primaryVariance != null && (
            <span className={`flex items-center gap-0.5 ml-auto ${
              primaryVariance >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {primaryVariance >= 0
                ? <TrendingUp className="w-2.5 h-2.5" />
                : <TrendingDown className="w-2.5 h-2.5" />
              }
              {primaryVariance >= 0 ? '+' : ''}{(primaryVariance * 100).toFixed(0)}%
            </span>
          )}
        </div>
      )}

      {/* Bottom row: metrics */}
      <div className="flex items-center gap-3 text-[10px] text-cult-lighter-gray">
        <span className={`flex items-center gap-1 ${
          daysInStage > 14 ? 'text-amber-400' : ''
        }`}>
          <Clock className="w-3 h-3" />
          {daysInStage}d
        </span>

        {weight != null && weight > 0 && (
          <span className="flex items-center gap-1">
            {formatWeight(weight)}
          </span>
        )}

        {batch.plant_group_count > 0 && (
          <span className="flex items-center gap-1">
            <Leaf className="w-3 h-3" />
            {batch.plant_group_count}
          </span>
        )}

        {prediction?.room_code && (
          <span className="truncate opacity-70">
            {prediction.room_code}
          </span>
        )}
      </div>
    </button>
  );
});
