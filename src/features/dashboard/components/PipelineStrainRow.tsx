import { useState } from 'react';
import { ChevronRight, ChevronDown, ExternalLink } from 'lucide-react';
import type { StrainPipelineData, StageName, BatchStageData, PipelineTotals } from '../hooks/useInventoryPipeline';
import { STAGES } from '../hooks/useInventoryPipeline';
import { formatWeight } from '@/shared/utils/format';

interface PipelineStrainRowProps {
  strain: StrainPipelineData;
  grandTotals: PipelineTotals;
  onNavigateToInventory?: () => void;
}

const STAGE_COLORS: Record<StageName, string> = {
  Binned: 'bg-cult-stage-clone/[OPACITY]',
  Bucked: 'bg-cult-stage-harvest/[OPACITY]',
  Trimmed: 'bg-cult-stage-veg/[OPACITY]',
  Packaged: 'bg-cult-success/[OPACITY]',
};

function formatValue(stage: StageName, weight: number, units: number): string {
  if (stage === 'Packaged') {
    return units > 0 ? `${units.toLocaleString()}u` : '';
  }
  if (weight <= 0) return '';
  return formatWeight(weight);
}

function getCellOpacity(stage: StageName, weight: number, units: number, maxByStage: Record<StageName, number>): number {
  const value = stage === 'Packaged' ? units : weight;
  const max = maxByStage[stage];
  if (max <= 0 || value <= 0) return 0;
  return Math.max(0.08, (value / max) * 0.35);
}

function CellBackground({ stage, opacity }: { stage: StageName; opacity: number }) {
  if (opacity <= 0) return null;
  const colorClass = STAGE_COLORS[stage].replace('[OPACITY]', opacity.toFixed(2));
  return <div className={`absolute inset-0 ${colorClass}`} />;
}

function StageCell({ stage, weight, units, maxByStage }: {
  stage: StageName;
  weight: number;
  units: number;
  maxByStage: Record<StageName, number>;
}) {
  const display = formatValue(stage, weight, units);
  const opacity = getCellOpacity(stage, weight, units, maxByStage);

  return (
    <td className="px-3 py-2.5 text-right relative">
      <CellBackground stage={stage} opacity={opacity} />
      <span className={`relative z-10 text-sm tabular-nums ${display ? 'text-cult-text-primary font-medium' : 'text-cult-border'}`}>
        {display || '\u2014'}
      </span>
    </td>
  );
}

function BatchRow({ batch, grandTotals, onNavigateToInventory }: {
  batch: BatchStageData;
  grandTotals: PipelineTotals;
  onNavigateToInventory?: () => void;
}) {
  return (
    <tr className="bg-cult-black/60 border-b border-cult-border/30">
      <td className="px-3 py-2 pl-10">
        <div className="flex items-center gap-2">
          <span className="text-xs text-cult-text-muted font-mono">{batch.batchNumber}</span>
          {onNavigateToInventory && (
            <button
              onClick={(e) => { e.stopPropagation(); onNavigateToInventory(); }}
              className="text-cult-border hover:text-cult-green transition-colors"
              title="View in Inventory"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </td>
      {STAGES.map(stage => (
        <StageCell
          key={stage}
          stage={stage}
          weight={batch.stages[stage].weight}
          units={batch.stages[stage].units}
          maxByStage={grandTotals.maxByStage}
        />
      ))}
    </tr>
  );
}

export function PipelineStrainRow({ strain, grandTotals, onNavigateToInventory }: PipelineStrainRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasBatches = strain.batches.length > 1;

  return (
    <>
      <tr
        className={`border-b border-cult-border/50 transition-colors ${hasBatches ? 'cursor-pointer hover:bg-cult-surface/80' : ''}`}
        onClick={() => hasBatches && setExpanded(!expanded)}
      >
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            {hasBatches ? (
              expanded
                ? <ChevronDown className="w-4 h-4 text-cult-text-muted flex-shrink-0" />
                : <ChevronRight className="w-4 h-4 text-cult-text-muted flex-shrink-0" />
            ) : (
              <span className="w-4" />
            )}
            <span className="text-sm font-semibold text-cult-text-primary tracking-wide">{strain.strain}</span>
            {hasBatches && (
              <span className="text-xs text-cult-border">{strain.batches.length} batches</span>
            )}
          </div>
        </td>
        {STAGES.map(stage => (
          <StageCell
            key={stage}
            stage={stage}
            weight={strain.totals[stage].weight}
            units={strain.totals[stage].units}
            maxByStage={grandTotals.maxByStage}
          />
        ))}
      </tr>
      {expanded && strain.batches.map(batch => (
        <BatchRow
          key={batch.batchId}
          batch={batch}
          grandTotals={grandTotals}
          onNavigateToInventory={onNavigateToInventory}
        />
      ))}
    </>
  );
}
