/**
 * BatchInfoPanel — informational batch card grid for the Production Queue.
 *
 * Replaces the transactional BatchAssignPanel with a read-only view
 * mirroring the Sales Pipeline's batch card UX: a 3-column grid of
 * BatchCards showing weight by pipeline stage.
 */

import { Loader2 } from 'lucide-react';
import { BatchCard } from '@/shared/components/inventory';
import { useBatchStages } from '../hooks/useBatchStages';

interface BatchInfoPanelProps {
  strainId: string;
  strainName: string;
}

export function BatchInfoPanel({ strainId, strainName }: BatchInfoPanelProps) {
  const { batches, loading, error } = useBatchStages(strainName);

  return (
    <div className="p-4 bg-cult-black/60 border-t border-cult-medium-gray/20">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs uppercase tracking-wider text-gray-500">
          Batch Inventory — {strainName}
        </span>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
      </div>

      {error && (
        <div className="text-xs text-red-400 mb-2">Error loading batches: {error}</div>
      )}

      {!loading && batches.length === 0 && (
        <div className="text-xs text-gray-500">No batch inventory found for this strain.</div>
      )}

      {batches.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {batches.map((b) => (
            <BatchCard key={b.batchNumber} batch={b} />
          ))}
        </div>
      )}
    </div>
  );
}
