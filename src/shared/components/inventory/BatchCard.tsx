/**
 * BatchCard — compact card showing a single batch's total weight + stage bar.
 * Shared between Sales Pipeline and Production Queue views.
 */

import type { BatchSummary } from './types';
import { fmtGrams } from './stageColors';
import { StageBar } from './StageBar';

export function BatchCard({ batch }: { batch: BatchSummary }) {
  return (
    <div className="rounded-lg p-3 border border-cult-medium-gray/20 bg-cult-black hover:border-cult-medium-gray/40 transition-colors">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-neutral-300 font-mono tracking-wide">
          {batch.batchNumber}
        </span>
        <span className="text-xs font-bold text-neutral-400 tabular-nums">
          {fmtGrams(batch.totalGrams)}
        </span>
      </div>
      <StageBar stages={batch.stages} />
    </div>
  );
}
