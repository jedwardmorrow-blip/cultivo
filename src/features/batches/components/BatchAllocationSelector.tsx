import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, TrendingUp, FileText, XCircle, Package } from 'lucide-react';
import { batchService } from '../services/batch.service';
import type {
  BatchWithCOAStatus,
  BatchStageAllocationStatus,
  BatchStage,
  AllocationWarningLevel
} from '@/types/batch.types';

interface BatchAllocationSelectorProps {
  strain: string;
  stage: BatchStage;
  requiredWeight: number;
  onSelectBatch: (batchNumber: string, weight: number, projectedFinalWeight: number) => void;
  selectedBatchNumbers?: string[];
}

export function BatchAllocationSelector({
  strain,
  stage,
  requiredWeight,
  onSelectBatch,
  selectedBatchNumbers = []
}: BatchAllocationSelectorProps) {
  const [batches, setBatches] = useState<BatchWithCOAStatus[]>([]);
  const [allocationStatus, setAllocationStatus] = useState<Map<string, BatchStageAllocationStatus[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [allocationWeight, setAllocationWeight] = useState<number>(requiredWeight);

  useEffect(() => {
    loadBatches();
  }, [strain, stage]);

  async function loadBatches() {
    try {
      setLoading(true);
      // Only show batches that have progressed past harvest and are allocatable
      const ALLOCATABLE_STAGES = ['bucking', 'trimming', 'bulk', 'packaging', 'packaged', 'fresh_frozen', 'lab'];
      const allBatches = await batchService.fetchBatchWithCOAStatus();
      const strainBatches = allBatches.filter(
        b => b.strain === strain
          && b.batch_status === 'active'
          && ALLOCATABLE_STAGES.includes(b.lifecycle_state)
      );

      const statusMap = new Map<string, BatchStageAllocationStatus[]>();
      for (const batch of strainBatches) {
        const status = await batchService.fetchBatchStageAllocationStatusByBatch(batch.batch_id);
        statusMap.set(batch.batch_id, status);
      }

      setBatches(strainBatches);
      setAllocationStatus(statusMap);
    } catch (error) {
      console.error('Error loading batches:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStageStatus(batchId: string): BatchStageAllocationStatus | null {
    const statuses = allocationStatus.get(batchId);
    return statuses?.find(s => s.stage === stage) || null;
  }

  function getCOABadge(batch: BatchWithCOAStatus) {
    if (batch.coa_status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-900/20 text-green-400 border border-green-700 text-xs">
          <CheckCircle className="w-3 h-3" />
          COA
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-900/20 text-red-400 border border-red-700 text-xs">
        <XCircle className="w-3 h-3" />
        No COA
      </span>
    );
  }

  function getWarningLevelBadge(level: AllocationWarningLevel) {
    switch (level) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-900/20 text-red-400 border border-red-700 text-xs">
            <AlertTriangle className="w-3 h-3" />
            Critical
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-900/20 text-amber-400 border border-amber-700 text-xs">
            <AlertTriangle className="w-3 h-3" />
            Warning
          </span>
        );
      default:
        return null;
    }
  }

  async function handleAllocate() {
    if (!selectedBatch || allocationWeight <= 0) return;

    const batch = batches.find(b => b.batch_id === selectedBatch);
    if (!batch) return;

    let projectedFinalWeight = allocationWeight;
    if (stage === 'bucked') {
      const result = await batchService.calculateBatchProjection({
        batch_id: batch.batch_id,
        target_stage: 'packaged',
        expected_yield_percentage: 85
      });
      projectedFinalWeight = result.projected_weight;
    }

    onSelectBatch(batch.batch_number, allocationWeight, projectedFinalWeight);
    setSelectedBatch(null);
    setAllocationWeight(requiredWeight);
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-cult-light-gray">
        Loading batch information...
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="p-6 text-center">
        <Package className="w-12 h-12 text-cult-medium-gray mx-auto mb-3" />
        <p className="text-cult-light-gray">No batches available for strain: {strain}</p>
        <p className="text-cult-lighter-gray text-sm mt-2">
          Create a batch in Batch Management to allocate inventory
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-bold text-cult-white uppercase tracking-wider">
          Select Batch for {strain}
        </h4>
        <span className="text-sm text-cult-light-gray">
          Stage: <span className="font-medium text-cult-white">{stage}</span>
        </span>
      </div>

      <div className="bg-cult-black border border-cult-medium-gray p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-cult-light-gray" />
          <span className="text-sm font-medium text-cult-white uppercase tracking-wider">
            Allocation Helper
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-cult-lighter-gray">Required Weight:</span>
            <span className="ml-2 text-cult-white font-medium">{requiredWeight.toFixed(1)}g</span>
          </div>
          <div>
            <span className="text-cult-lighter-gray">Selected Weight:</span>
            <span className="ml-2 text-cult-white font-medium">{allocationWeight.toFixed(1)}g</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {batches.map((batch) => {
          const stageStatus = getStageStatus(batch.batch_id);
          const isSelected = selectedBatch === batch.batch_id;
          const isAlreadySelected = selectedBatchNumbers.includes(batch.batch_number);

          return (
            <div
              key={batch.batch_id}
              className={`border transition-all ${
                isSelected
                  ? 'border-cult-white bg-cult-near-black'
                  : isAlreadySelected
                  ? 'border-green-700 bg-green-900/10'
                  : 'border-cult-medium-gray bg-cult-black hover:border-cult-light-gray'
              } p-4 cursor-pointer`}
              onClick={() => !isAlreadySelected && setSelectedBatch(batch.batch_id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h5 className="text-cult-white font-bold">{batch.batch_number}</h5>
                    {getCOABadge(batch)}
                    {stageStatus && getWarningLevelBadge(stageStatus.allocation_warning_level)}
                    {isAlreadySelected && (
                      <span className="px-2 py-1 bg-green-900/20 text-green-400 border border-green-700 text-xs">
                        Selected
                      </span>
                    )}
                  </div>

                  {batch.harvest_date && (
                    <div className="text-xs text-cult-lighter-gray">
                      Harvest: {new Date(batch.harvest_date).toLocaleDateString()}
                    </div>
                  )}

                  {batch.coa_status === 'active' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-cult-lighter-gray">THC: </span>
                        <span className="text-cult-white font-medium">
                          {batch.thc_percentage?.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-cult-lighter-gray">CBD: </span>
                        <span className="text-cult-white font-medium">
                          {batch.cbd_percentage?.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {batch.pdf_file_path && (
                  <a
                    href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/coa-pdfs/${batch.pdf_file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-cult-medium-gray transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileText className="w-4 h-4 text-cult-white" />
                  </a>
                )}
              </div>

              {stageStatus && (
                <div className="border-t border-cult-medium-gray pt-3 mt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="text-cult-lighter-gray mb-1">Available</div>
                      <div className="text-cult-white font-medium">
                        {stageStatus.available_weight_grams.toFixed(1)}g
                      </div>
                    </div>
                    <div>
                      <div className="text-cult-lighter-gray mb-1">Allocated</div>
                      <div className="text-cult-white font-medium">
                        {stageStatus.allocated_weight_grams.toFixed(1)}g
                      </div>
                    </div>
                    <div>
                      <div className="text-cult-lighter-gray mb-1">Utilization</div>
                      <div className={`font-medium ${
                        stageStatus.stage_allocation_percentage >= (stageStatus.over_allocation_critical_threshold || 120)
                          ? 'text-red-400'
                          : stageStatus.stage_allocation_percentage >= (stageStatus.over_allocation_warning_threshold || 100)
                          ? 'text-amber-400'
                          : 'text-green-400'
                      }`}>
                        {stageStatus.stage_allocation_percentage.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {stageStatus.is_over_allocated && (
                    <div className="mt-3 p-2 bg-amber-900/20 border border-amber-700">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-200">
                          Over-allocated by {stageStatus.over_allocation_grams.toFixed(1)}g
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedBatch && !selectedBatchNumbers.includes(batches.find(b => b.batch_id === selectedBatch)?.batch_number || '') && (
        <div className="bg-cult-near-black border border-cult-medium-gray p-4">
          <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
            Allocation Weight (grams)
          </label>
          <input
            type="number"
            step="0.1"
            value={allocationWeight}
            onChange={(e) => setAllocationWeight(parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all mb-4"
          />

          <button
            onClick={handleAllocate}
            disabled={allocationWeight <= 0}
            className="w-full px-6 py-3 bg-cult-white text-cult-black hover:bg-cult-off-white transition-all font-medium uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Allocate {allocationWeight.toFixed(1)}g from Selected Batch
          </button>
        </div>
      )}
    </div>
  );
}
