import { X, Package, Loader2 } from 'lucide-react';
import type { BatchPlanProps } from '../types';
import { useBatchesForStrain } from '../hooks/useBatchPlanning';
import { BatchPlanCard } from './BatchPlanCard';

function formatWeight(grams: number): string {
  if (grams >= 453.592) {
    return `${(grams / 453.592).toFixed(1)} lbs`;
  }
  return `${grams.toLocaleString()}g`;
}

export function BatchPlanExpansion({ strainId, strainName, orderItems, onClose }: BatchPlanProps) {
  const { batches, loading, error, refetch } = useBatchesForStrain(strainId);

  // Aggregate demand from order items
  const totalDemandG = orderItems.reduce((sum, o) => sum + o.line_demand_g, 0);
  const totalUnitsNeeded = orderItems.reduce((sum, o) => sum + o.quantity, 0);

  // Aggregate supply across batches
  const totalAvailableG = batches.reduce((sum, b) => sum + b.total_available_g, 0);
  const totalAllocatedG = batches.reduce((sum, b) => sum + b.total_allocated_g, 0);

  // Coverage ratio
  const coveragePct = totalDemandG > 0 ? Math.min(100, (totalAvailableG / totalDemandG) * 100) : 0;

  return (
    <div className="bg-gray-950/60 border border-gray-700/30 rounded-lg mx-2 my-1">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800/50">
        <Package className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-medium text-gray-200">
          Batch Planning — {strainName}
        </h3>

        {/* Summary chips */}
        <div className="flex items-center gap-3 ml-4 text-xs">
          <span className="text-gray-400">
            {totalUnitsNeeded} units needed ({formatWeight(totalDemandG)})
          </span>
          <span className="text-gray-600">|</span>
          <span className={totalAvailableG >= totalDemandG ? 'text-green-400' : 'text-amber-400'}>
            {formatWeight(totalAvailableG)} available
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">
            {coveragePct.toFixed(0)}% coverage
          </span>
          {totalAllocatedG > 0 && (
            <>
              <span className="text-gray-600">|</span>
              <span className="text-blue-400/80">
                {formatWeight(totalAllocatedG)} allocated
              </span>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="ml-auto p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
          title="Close batch planning"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-500 py-4 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading batches…
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 py-2 px-3 bg-red-500/5 border border-red-500/10 rounded">
            Failed to load batches: {error.message}
          </div>
        )}

        {!loading && !error && batches.length === 0 && (
          <div className="text-xs text-gray-500 py-4 text-center">
            No batches found for {strainName}. Batches appear here once harvested flower is tracked in the system.
          </div>
        )}

        {!loading && batches.map(batch => (
          <BatchPlanCard
            key={batch.batch_id}
            batch={batch}
            orderItems={orderItems}
            onMutate={refetch}
          />
        ))}
      </div>
    </div>
  );
}
