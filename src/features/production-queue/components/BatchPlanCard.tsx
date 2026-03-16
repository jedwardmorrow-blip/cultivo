import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import type { BatchPlanData, OrderLineItem, BatchAllocation } from '../types';
import { BatchStageBar } from './BatchStageBar';
import { BatchOrderList } from './BatchOrderList';
import { useAllocationsForBatch, useAllocateBatch, useDeallocateBatch } from '../hooks/useBatchPlanning';

interface BatchPlanCardProps {
  batch: BatchPlanData;
  orderItems: OrderLineItem[];
  /** Called after successful allocate/deallocate so parent can refetch */
  onMutate?: () => void;
}

function formatWeight(grams: number): string {
  if (grams >= 453.592) {
    return `${(grams / 453.592).toFixed(1)} lbs`;
  }
  return `${grams.toLocaleString()}g`;
}

export function BatchPlanCard({ batch, orderItems, onMutate }: BatchPlanCardProps) {
  const [expanded, setExpanded] = useState(true);

  const { allocations, loading: allocationsLoading, refetch: refetchAllocations } = useAllocationsForBatch(batch.batch_id);
  const { allocate, loading: allocating } = useAllocateBatch();
  const { deallocate, loading: deallocating } = useDeallocateBatch();

  const mutating = allocating || deallocating;

  // Determine if batch needs processing (has binned/bucked but no bulk/packaged)
  const needsProcessing = (batch.binned_g > 0 || batch.bucked_g > 0) && batch.bulk_g === 0 && batch.packaged_g === 0;
  const hasOnlyTrim = batch.trim_g > 0 && batch.bulk_g === 0 && batch.packaged_g === 0 && batch.binned_g === 0 && batch.bucked_g === 0;

  const handleAllocate = async (orderItem: OrderLineItem) => {
    // Determine best allocation stage based on what the batch has
    let stage = 'bulk';
    if (batch.packaged_g > 0) stage = 'packaged';
    else if (batch.bulk_g > 0) stage = 'bulk';
    else if (batch.bucked_g > 0) stage = 'bucked';
    else if (batch.binned_g > 0) stage = 'binned';

    // Allocate the weight needed for this order item
    const weightNeeded = orderItem.quantity * orderItem.weight_per_unit_g;

    try {
      await allocate(batch.batch_id, orderItem.order_item_id, stage, weightNeeded);
      refetchAllocations();
      onMutate?.();
    } catch (err) {
      console.error('Allocation failed:', err);
    }
  };

  const handleDeallocate = async (allocationId: string) => {
    try {
      await deallocate(allocationId);
      refetchAllocations();
      onMutate?.();
    } catch (err) {
      console.error('Deallocation failed:', err);
    }
  };

  // Remaining capacity after current allocations
  const remainingG = batch.total_available_g - batch.total_allocated_g;

  return (
    <div className="border border-gray-700/50 rounded-lg bg-gray-900/40">
      {/* Card header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.02] rounded-t-lg transition-colors"
      >
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        }
        <span className="text-sm font-mono font-medium text-gray-200">
          {batch.batch_number}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-gray-500 px-1.5 py-0.5 bg-gray-800 rounded">
          {batch.batch_status}
        </span>

        {/* Quick stats */}
        <div className="ml-auto flex items-center gap-4 text-xs text-gray-400">
          <span>{formatWeight(batch.total_weight_g)} total</span>
          <span className="text-gray-300">{formatWeight(batch.total_available_g)} available</span>
          {batch.allocated_order_items > 0 && (
            <span className="text-blue-400/80">
              {batch.allocated_order_items} allocated
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Stage bar */}
          <BatchStageBar batch={batch} />

          {/* Capacity estimates */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
            {batch.est_eighths_from_bulk > 0 && (
              <span>≈ {batch.est_eighths_from_bulk} eighths from bulk</span>
            )}
            {batch.est_lbs_from_bulk > 0 && (
              <span>≈ {batch.est_lbs_from_bulk.toFixed(1)} lbs from bulk</span>
            )}
            {remainingG > 0 && (
              <span className="text-green-400/70">
                {formatWeight(remainingG)} unallocated
              </span>
            )}
            {remainingG <= 0 && batch.total_available_g > 0 && (
              <span className="text-amber-400/70">Fully allocated</span>
            )}
          </div>

          {/* Processing warnings */}
          {needsProcessing && (
            <div className="flex items-center gap-2 text-[11px] text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded px-2 py-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              Needs processing — flower is binned/bucked but not yet bulk-ready
            </div>
          )}
          {hasOnlyTrim && (
            <div className="flex items-center gap-2 text-[11px] text-stone-400/80 bg-stone-500/5 border border-stone-500/10 rounded px-2 py-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              Only trim available in this batch
            </div>
          )}

          {/* Order allocations list */}
          {allocationsLoading ? (
            <div className="text-xs text-gray-500 py-1">Loading allocations…</div>
          ) : (
            <BatchOrderList
              batch={batch}
              orderItems={orderItems}
              allocations={allocations}
              onAllocate={handleAllocate}
              onDeallocate={handleDeallocate}
              allocating={mutating}
            />
          )}
        </div>
      )}
    </div>
  );
}
