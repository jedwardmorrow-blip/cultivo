import { useState, useMemo } from 'react';
import { CheckCircle, AlertTriangle, Wind, Snowflake, Circle, Clock, Square, CheckSquare } from 'lucide-react';
import { Button } from '@/shared/components';
import { formatWeight } from '../../utils';
import type { DryRoom, HarvestSession, PlantGroup } from '../../types';
import type { BatchGroup } from './HarvestWorkflow';

export interface BatchSummary {
  batch: BatchGroup;
  session: HarvestSession | null;
  totalWeight: number;
  totalPlants: number;
  wasteGrams: number;
  flowerWeight: number;
  frozenWeight: number;
  priorHarvestedPlants: number;
  hasEntries: boolean;
}

type BatchStatus = 'not-started' | 'partial' | 'complete';

function getBatchStatus(summary: BatchSummary): BatchStatus {
  if (!summary.hasEntries) return 'not-started';
  const total = summary.totalPlants + summary.priorHarvestedPlants;
  if (total >= summary.batch.totalPlants) return 'complete';
  return 'partial';
}

interface HarvestReviewFinalizeProps {
  roomCode: string;
  roomName: string;
  batchSummaries: BatchSummary[];
  dryRooms: DryRoom[];
  onFinalize: (batchIds: string[], dryRoomId: string | null) => Promise<void>;
  onBack: () => void;
}

export function HarvestReviewFinalize({
  roomCode,
  roomName,
  batchSummaries,
  dryRooms,
  onFinalize,
  onBack,
}: HarvestReviewFinalizeProps) {
  const [selectedDryRoomId, setSelectedDryRoomId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selectable batches are those with weight entries
  const finalizableBatches = useMemo(
    () => batchSummaries.filter((b) => b.hasEntries),
    [batchSummaries]
  );
  const notStartedBatches = useMemo(
    () => batchSummaries.filter((b) => !b.hasEntries),
    [batchSummaries]
  );

  // Track which batches the user wants to finalize (default: all that have entries)
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(
    () => new Set(finalizableBatches.map((b) => b.batch.batchRegistryId))
  );

  function toggleBatch(batchId: string) {
    setSelectedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  }

  function toggleAll() {
    if (selectedBatchIds.size === finalizableBatches.length) {
      setSelectedBatchIds(new Set());
    } else {
      setSelectedBatchIds(new Set(finalizableBatches.map((b) => b.batch.batchRegistryId)));
    }
  }

  const activeDryRooms = dryRooms.filter((r) => r.is_active);

  // Compute totals from SELECTED batches only
  const selectedSummaries = finalizableBatches.filter((b) => selectedBatchIds.has(b.batch.batchRegistryId));
  const combinedWeight = selectedSummaries.reduce((s, b) => s + b.totalWeight, 0);
  const combinedPlants = selectedSummaries.reduce((s, b) => s + b.totalPlants, 0);
  const combinedWaste = selectedSummaries.reduce((s, b) => s + b.wasteGrams, 0);
  const flowerWeight = selectedSummaries.reduce((s, b) => s + b.flowerWeight, 0);
  const frozenWeight = selectedSummaries.reduce((s, b) => s + b.frozenWeight, 0);
  const hasFlowerSessions = flowerWeight > 0;
  const hasFrozenSessions = frozenWeight > 0;

  const hasPartialBatches = selectedSummaries.some((b) => {
    const total = b.totalPlants + b.priorHarvestedPlants;
    return total < b.batch.totalPlants;
  });

  const canFinalize = selectedBatchIds.size > 0 && (hasFlowerSessions ? !!selectedDryRoomId : true) && !saving;

  async function handleFinalize() {
    if (!canFinalize) return;
    setSaving(true);
    setError(null);
    try {
      await onFinalize(Array.from(selectedBatchIds), selectedDryRoomId || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to finalize harvest');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="border-l-2 border-cult-stage-harvest pl-4">
        <h2 className="text-xs text-cult-stage-harvest uppercase tracking-widest font-bold mb-1">
          Step 3 — Review & Finalize
        </h2>
        <p className="text-cult-silver text-sm">
          Select which batches from{' '}
          <span className="text-cult-white font-mono font-bold">{roomCode}</span>
          <span className="text-cult-light-gray"> ({roomName})</span>
          {' '}to finalize. Unselected batches stay active for later.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-cult-danger-muted border border-cult-danger text-cult-danger text-sm p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {hasPartialBatches && (
        <div className="flex items-start gap-2 bg-cult-warning-muted border border-cult-warning/60 text-cult-warning text-sm p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          Some selected batches are partially weighed. Finalizing will record the current weights — you can harvest more from these batches in a future session.
        </div>
      )}

      {/* Batch selection table */}
      <div className="bg-cult-near-black border border-cult-medium-gray overflow-hidden">
        {/* Table header */}
        <div className="px-4 py-3 border-b border-cult-dark-gray bg-cult-black/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={toggleAll} className="text-cult-lighter-gray hover:text-cult-white transition-colors">
                {selectedBatchIds.size === finalizableBatches.length ? (
                  <CheckSquare className="w-4 h-4 text-cult-stage-harvest" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
              <div>
                <span className="text-cult-white font-mono text-sm font-semibold">{roomCode}</span>
                <span className="text-cult-medium-gray mx-2">·</span>
                <span className="text-cult-light-gray text-sm">{roomName}</span>
              </div>
            </div>
            <div className="text-right">
              {selectedBatchIds.size > 0 ? (
                <>
                  <span className="text-cult-white text-lg font-bold font-mono">{formatWeight(combinedWeight)}</span>
                  <span className="text-cult-medium-gray text-xs ml-2">{combinedPlants} plants</span>
                </>
              ) : (
                <span className="text-cult-medium-gray text-sm">No batches selected</span>
              )}
            </div>
          </div>
          {selectedBatchIds.size > 0 && (hasFlowerSessions && hasFrozenSessions) && (
            <div className="flex items-center gap-4 mt-1.5 ml-7 text-xs text-cult-lighter-gray">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-cult-success inline-block" />
                Flower: {formatWeight(flowerWeight)}
              </span>
              <span className="flex items-center gap-1">
                <Snowflake className="w-3 h-3 text-cyan-400" />
                Frozen: {formatWeight(frozenWeight)}
              </span>
            </div>
          )}
        </div>

        {/* Finalizable batches */}
        <div className="divide-y divide-cult-dark-gray">
          {finalizableBatches.map((summary) => {
            const { batch, totalWeight, totalPlants, wasteGrams, flowerWeight, frozenWeight, priorHarvestedPlants } = summary;
            const status = getBatchStatus(summary);
            const isSelected = selectedBatchIds.has(batch.batchRegistryId);
            const cumulativePlants = totalPlants + priorHarvestedPlants;

            return (
              <button
                key={batch.batchRegistryId}
                onClick={() => toggleBatch(batch.batchRegistryId)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between gap-4 transition-colors ${
                  isSelected
                    ? 'bg-cult-stage-harvest/5 hover:bg-cult-stage-harvest/10'
                    : 'hover:bg-cult-dark-gray/30 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Checkbox */}
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-cult-stage-harvest flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-cult-medium-gray flex-shrink-0" />
                  )}
                  {/* Status icon */}
                  {status === 'complete' ? (
                    <CheckCircle className="w-4 h-4 text-cult-success flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-cult-warning flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-cult-white font-mono text-xs font-bold">{batch.batchNumber}</span>
                      <span className="text-cult-light-gray text-xs truncate">{batch.strainName}</span>
                      {flowerWeight > 0 && (
                        <span className="text-xs px-1 py-0.5 uppercase font-bold border border-cult-success text-cult-success bg-cult-success-muted">FLW</span>
                      )}
                      {frozenWeight > 0 && (
                        <span className="text-xs px-1 py-0.5 uppercase font-bold border border-cyan-800 text-cyan-400 bg-cyan-950/30">FF</span>
                      )}
                      {status === 'partial' && (
                        <span className="text-xs px-1 py-0.5 uppercase font-bold border border-cult-warning text-cult-warning bg-cult-warning-muted">Partial</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-cult-lighter-gray text-xs">
                        {cumulativePlants}/{batch.totalPlants} plants
                        {priorHarvestedPlants > 0 && ` (${priorHarvestedPlants} prior)`}
                      </span>
                      {wasteGrams > 0 && (
                        <span className="text-cult-medium-gray text-xs">
                          · waste: {formatWeight(wasteGrams)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-cult-white text-sm font-mono font-semibold flex-shrink-0">
                  {formatWeight(totalWeight)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Not-started batches — shown grayed out for awareness */}
        {notStartedBatches.length > 0 && (
          <>
            <div className="px-4 py-2 border-t border-cult-dark-gray bg-cult-black/20">
              <span className="text-cult-medium-gray text-xs uppercase tracking-wider">
                Not Weighed ({notStartedBatches.length})
              </span>
            </div>
            <div className="divide-y divide-cult-dark-gray/50">
              {notStartedBatches.map(({ batch }) => (
                <div
                  key={batch.batchRegistryId}
                  className="px-4 py-2.5 flex items-center gap-3 opacity-40"
                >
                  <div className="w-4 h-4 flex-shrink-0" />
                  <Circle className="w-4 h-4 text-cult-medium-gray flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-cult-lighter-gray font-mono text-xs">{batch.batchNumber}</span>
                      <span className="text-cult-medium-gray text-xs truncate">{batch.strainName}</span>
                    </div>
                    <span className="text-cult-medium-gray text-xs">{batch.totalPlants} plants — not started</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Totals footer */}
        {combinedWaste > 0 && (
          <div className="px-4 py-2 border-t border-cult-dark-gray">
            <span className="text-cult-medium-gray text-xs">
              Total waste: {formatWeight(combinedWaste)}
            </span>
          </div>
        )}
      </div>

      {/* Dry room selection — for flower sessions */}
      {hasFlowerSessions && selectedBatchIds.size > 0 && (
        <div className="bg-cult-near-black border border-cult-medium-gray p-4">
          <label className="flex items-center gap-2 text-xs text-cult-light-gray uppercase tracking-wider mb-2 font-medium">
            <Wind className="w-4 h-4" />
            Dry Room Destination
            {hasFrozenSessions && (
              <span className="text-cult-medium-gray font-normal normal-case tracking-normal">(for flower sessions only)</span>
            )}
          </label>
          {activeDryRooms.length === 0 ? (
            <p className="text-cult-warning text-sm">
              No active dry rooms. Create one in Settings or Cultivation &gt; Dry Rooms first.
            </p>
          ) : (
            <select
              value={selectedDryRoomId}
              onChange={(e) => setSelectedDryRoomId(e.target.value)}
              className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
            >
              <option value="">-- Select dry room --</option>
              {activeDryRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.room_code} - {room.name}
                  {room.capacity_lbs != null ? ` (${room.capacity_lbs} lbs capacity)` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Frozen info */}
      {hasFrozenSessions && selectedBatchIds.size > 0 && (
        <div className="bg-cult-near-black border border-cyan-800 p-4">
          <div className="flex items-center gap-2 text-xs text-cyan-400 uppercase tracking-wider mb-1">
            <Snowflake className="w-4 h-4" />
            Fresh Frozen
          </div>
          <p className="text-cult-light-gray text-sm">
            {formatWeight(frozenWeight)} will be vacuum sealed and frozen.
            Packages will be auto-created in the system upon finalization.
          </p>
        </div>
      )}

      {/* Summary callout for partial finalize */}
      {selectedBatchIds.size > 0 && selectedBatchIds.size < finalizableBatches.length && (
        <div className="bg-cult-near-black border border-cult-lighter-gray/30 p-4 text-sm text-cult-silver">
          Finalizing <span className="text-cult-white font-bold">{selectedBatchIds.size}</span> of{' '}
          <span className="text-cult-white font-bold">{finalizableBatches.length}</span> weighed batch{finalizableBatches.length !== 1 ? 'es' : ''}.
          The remaining batch{finalizableBatches.length - selectedBatchIds.size !== 1 ? 'es' : ''} will stay active and you can continue weighing or finalize later.
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleFinalize}
          disabled={!canFinalize}
          variant="success"
          icon={<CheckCircle className="w-4 h-4" />}
        >
          {saving
            ? 'Finalizing...'
            : `Finalize ${selectedBatchIds.size} Batch${selectedBatchIds.size !== 1 ? 'es' : ''}`
          }
        </Button>
        <button
          onClick={onBack}
          disabled={saving}
          className="px-6 py-3 text-sm font-bold uppercase tracking-wider border border-cult-medium-gray text-cult-light-gray hover:border-cult-lighter-gray hover:text-cult-white transition-all"
        >
          Back to Weights
        </button>
      </div>
    </div>
  );
}
