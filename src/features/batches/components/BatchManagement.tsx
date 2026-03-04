import { useState, useEffect } from 'react';
import { Package, Plus, AlertTriangle, CheckCircle, XCircle, Upload } from 'lucide-react';
import { batchService } from '../services/batch.service';
import type {
  BatchAllocationSummary,
  BatchWithCOAStatus,
  BatchAllocationWarning,
  CreateBatchInput
} from '@/types/batch.types';
import { notificationService, errorService, qualityGradeService } from '@/services';
import { QualityGradeBadge } from '@/shared/components';
import { supabase } from '@/lib/supabase';
import { COAUploadModal } from './COAUploadModal';

export function BatchManagement() {
  const [batches, setBatches] = useState<BatchWithCOAStatus[]>([]);
  const [allocationSummaries, setAllocationSummaries] = useState<BatchAllocationSummary[]>([]);
  const [warnings, setWarnings] = useState<BatchAllocationWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewBatchForm, setShowNewBatchForm] = useState(false);
  const [filterCOAStatus, setFilterCOAStatus] = useState<'all' | 'active' | 'missing'>('all');
  const [coaUploadState, setCOAUploadState] = useState<{
    isOpen: boolean;
    batchId: string | null;
    batchNumber: string | null;
    strain: string | null;
  }>({
    isOpen: false,
    batchId: null,
    batchNumber: null,
    strain: null
  });

  const [newBatch, setNewBatch] = useState<CreateBatchInput>({
    batch_number: '',
    strain: '',
    harvest_date: '',
    room: '',
    initial_weight_grams: undefined,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [batchesData, summariesData, warningsData] = await Promise.all([
        batchService.fetchBatchWithCOAStatus(),
        batchService.fetchBatchAllocationSummary(),
        batchService.fetchOverAllocatedBatches()
      ]);

      setBatches(batchesData);
      setAllocationSummaries(summariesData);
      setWarnings(warningsData);
    } catch (error) {
      errorService.handle(error, 'Load Batches');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBatch() {
    if (!newBatch.batch_number || !newBatch.strain) {
      notificationService.warning('Please fill in all required fields');
      return;
    }

    try {
      await batchService.createBatch(newBatch);
      notificationService.success(`Batch ${newBatch.batch_number} created successfully`);
      setShowNewBatchForm(false);
      setNewBatch({
        batch_number: '',
        strain: '',
        harvest_date: '',
        room: '',
        initial_weight_grams: undefined,
        notes: ''
      });
      await loadData();
    } catch (error) {
      errorService.handle(error, 'Create Batch');
    }
  }

  function handleUploadCOA(batchId: string, batchNumber: string, strain: string) {
    setCOAUploadState({
      isOpen: true,
      batchId,
      batchNumber,
      strain
    });
  }

  function getCOAStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-900/20 text-green-400 border border-green-700 text-xs uppercase tracking-wider">
            <CheckCircle className="w-3 h-3" />
            COA Active
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-900/20 text-amber-400 border border-amber-700 text-xs uppercase tracking-wider">
            <AlertTriangle className="w-3 h-3" />
            COA Inactive
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-900/20 text-red-400 border border-red-700 text-xs uppercase tracking-wider">
            <XCircle className="w-3 h-3" />
            No COA
          </span>
        );
    }
  }

  const filteredBatches = batches.filter(batch => {
    if (filterCOAStatus === 'all') return true;
    return batch.coa_status === filterCOAStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-cult-white text-xl">Loading batches...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-cult-near-black border border-cult-medium-gray p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-cult-white" />
            <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wide">
              Batch Management
            </h2>
          </div>
          <button
            onClick={() => setShowNewBatchForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cult-white text-cult-black hover:bg-cult-off-white transition-all font-medium uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            New Batch
          </button>
        </div>

        {warnings.length > 0 && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-amber-400 font-bold uppercase tracking-wider mb-2">
                  Over-Allocation Warnings ({warnings.length})
                </h3>
                <div className="space-y-2">
                  {warnings.slice(0, 5).map((warning, idx) => (
                    <div key={idx} className="text-sm text-amber-200">
                      <span className="font-medium">{warning.batch_number}</span> - {warning.message}
                    </div>
                  ))}
                  {warnings.length > 5 && (
                    <div className="text-xs text-amber-300 mt-2">
                      And {warnings.length - 5} more warnings...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showNewBatchForm && (
          <div className="mb-6 p-6 bg-cult-black border border-cult-medium-gray">
            <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider mb-4">
              Create New Batch
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
                  Batch Number *
                </label>
                <input
                  type="text"
                  value={newBatch.batch_number}
                  onChange={(e) => setNewBatch({ ...newBatch, batch_number: e.target.value })}
                  className="w-full px-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  placeholder="25064H"
                />
              </div>

              <div>
                <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
                  Strain *
                </label>
                <input
                  type="text"
                  value={newBatch.strain}
                  onChange={(e) => setNewBatch({ ...newBatch, strain: e.target.value })}
                  className="w-full px-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  placeholder="Strain name"
                />
              </div>

              <div>
                <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
                  Initial Weight (grams) (Optional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newBatch.initial_weight_grams || ''}
                  onChange={(e) => setNewBatch({ ...newBatch, initial_weight_grams: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  placeholder="Leave empty if not known"
                />
              </div>

              <div>
                <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
                  Harvest Date
                </label>
                <input
                  type="date"
                  value={newBatch.harvest_date || ''}
                  onChange={(e) => setNewBatch({ ...newBatch, harvest_date: e.target.value })}
                  className="w-full px-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
                  Room
                </label>
                <input
                  type="text"
                  value={newBatch.room || ''}
                  onChange={(e) => setNewBatch({ ...newBatch, room: e.target.value })}
                  className="w-full px-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                  placeholder="Room number"
                />
              </div>

              <div>
                <label className="block text-sm text-cult-light-gray mb-2 uppercase tracking-wider">
                  Notes
                </label>
                <input
                  type="text"
                  value={newBatch.notes || ''}
                  onChange={(e) => setNewBatch({ ...newBatch, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-cult-near-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleCreateBatch}
                className="px-6 py-3 bg-cult-white text-cult-black hover:bg-cult-off-white transition-all font-medium uppercase tracking-wider"
              >
                Create Batch
              </button>
              <button
                onClick={() => setShowNewBatchForm(false)}
                className="px-6 py-3 border border-cult-medium-gray text-cult-white hover:border-cult-white transition-all font-medium uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center gap-4">
          <label className="text-sm text-cult-light-gray uppercase tracking-wider">Filter by COA Status:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterCOAStatus('all')}
              className={`px-3 py-1 text-sm uppercase tracking-wider transition-all ${
                filterCOAStatus === 'all'
                  ? 'bg-cult-white text-cult-black'
                  : 'border border-cult-medium-gray text-cult-light-gray hover:border-cult-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterCOAStatus('active')}
              className={`px-3 py-1 text-sm uppercase tracking-wider transition-all ${
                filterCOAStatus === 'active'
                  ? 'bg-cult-white text-cult-black'
                  : 'border border-cult-medium-gray text-cult-light-gray hover:border-cult-white'
              }`}
            >
              With COA
            </button>
            <button
              onClick={() => setFilterCOAStatus('missing')}
              className={`px-3 py-1 text-sm uppercase tracking-wider transition-all ${
                filterCOAStatus === 'missing'
                  ? 'bg-cult-white text-cult-black'
                  : 'border border-cult-medium-gray text-cult-light-gray hover:border-cult-white'
              }`}
            >
              Missing COA
            </button>
          </div>
        </div>
      </div>

      <div className="bg-cult-near-black border border-cult-medium-gray overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cult-medium-gray">
                <th className="text-left py-4 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">
                  Batch Number
                </th>
                <th className="text-left py-4 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">
                  Strain
                </th>
                <th className="text-left py-4 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">
                  Harvest Date
                </th>
                <th className="text-left py-4 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">
                  Initial Weight
                </th>
                <th className="text-left py-4 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">
                  COA Status
                </th>
                <th className="text-left py-4 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">
                  THC %
                </th>
                <th className="text-center py-4 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">
                  Grade
                </th>
                <th className="text-left py-4 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">
                  Allocation
                </th>
                <th className="text-left py-4 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-4 px-4 text-xs font-medium text-cult-light-gray uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.map((batch) => {
                const summary = allocationSummaries.find(s => s.batch_id === batch.batch_id);
                const hasWarning = warnings.some(w => w.batch_id === batch.batch_id);

                return (
                  <tr
                    key={batch.batch_id}
                    className="border-b border-cult-medium-gray/30 hover:bg-cult-black transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-cult-white font-medium">{batch.batch_number}</span>
                        {hasWarning && (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-cult-lighter-gray">{batch.strain}</td>
                    <td className="py-3 px-4 text-cult-lighter-gray text-sm">
                      {batch.harvest_date ? new Date(batch.harvest_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-cult-white">
                      {batch.initial_weight_grams ? `${batch.initial_weight_grams.toFixed(1)}g` : '0g'}
                    </td>
                    <td className="py-3 px-4">{getCOAStatusBadge(batch.coa_status)}</td>
                    <td className="py-3 px-4 text-cult-white font-medium">
                      {batch.thc_percentage ? `${batch.thc_percentage.toFixed(2)}%` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <QualityGradeBadge
                        gradeId={(batch as any).quality_grade_id}
                        editable
                        size="md"
                        onGradeChange={async (newGradeId) => {
                          try {
                            const { data: { user } } = await supabase.auth.getUser();
                            const { cascadedCount } = await qualityGradeService.assignBatchGrade(
                              batch.batch_id,
                              newGradeId,
                              user?.id || null
                            );
                            if (cascadedCount > 0) {
                              notificationService.success(`Grade updated and cascaded to ${cascadedCount} inventory item${cascadedCount !== 1 ? 's' : ''}`);
                            }
                            await loadData();
                          } catch (err) {
                            console.error('Failed to update batch grade:', err);
                            notificationService.error('Failed to update grade');
                          }
                        }}
                      />
                    </td>
                    <td className="py-3 px-4">
                      {summary && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-cult-medium-gray rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                summary.allocation_percentage >= (summary.over_allocation_critical_threshold || 120)
                                  ? 'bg-red-500'
                                  : summary.allocation_percentage >= (summary.over_allocation_warning_threshold || 100)
                                  ? 'bg-amber-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(summary.allocation_percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-cult-light-gray whitespace-nowrap">
                            {summary.allocation_percentage.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs uppercase tracking-wider border ${
                        batch.batch_status === 'active'
                          ? 'text-green-400 bg-green-900/20 border-green-700'
                          : 'text-cult-light-gray bg-cult-medium-gray/20 border-cult-medium-gray'
                      }`}>
                        {batch.batch_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleUploadCOA(batch.batch_id, batch.batch_number, batch.strain)}
                        className="flex items-center gap-2 px-3 py-2 border border-cult-medium-gray text-cult-white hover:border-cult-white transition-all text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={batch.coa_status === 'active'}
                      >
                        <Upload className="w-4 h-4" />
                        {batch.coa_status === 'active' ? 'COA Active' : 'Upload COA'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredBatches.length === 0 && (
          <div className="py-12 text-center">
            <Package className="w-12 h-12 text-cult-medium-gray mx-auto mb-4" />
            <p className="text-cult-light-gray">
              {filterCOAStatus === 'missing'
                ? 'No batches missing COA'
                : filterCOAStatus === 'active'
                ? 'No batches with active COA'
                : 'No batches found'}
            </p>
          </div>
        )}
      </div>

      {coaUploadState.isOpen && (
        <COAUploadModal
          batchId={coaUploadState.batchId}
          batchNumber={coaUploadState.batchNumber}
          strain={coaUploadState.strain}
          onClose={() => setCOAUploadState({ isOpen: false, batchId: null, batchNumber: null, strain: null })}
          onSuccess={async () => {
            await loadData();
            setCOAUploadState({ isOpen: false, batchId: null, batchNumber: null, strain: null });
          }}
        />
      )}
    </div>
  );
}
