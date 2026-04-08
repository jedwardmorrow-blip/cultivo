/**
 * HarvestReviewFinalize — Step 3 of harvest wizard (Glass Design System)
 *
 * Batch selection with checkboxes, dry room picker, finalize action.
 */

import { useState, useMemo } from 'react';
import { CheckCircle, AlertTriangle, Wind, Snowflake, Circle, Clock, Square, CheckSquare } from 'lucide-react';
import { formatWeight } from '../../utils';
import type { DryRoom, HarvestSession, PlantGroup } from '../../types';
import type { BatchGroup } from './HarvestWorkflow';

const GLASS = 'rounded-2xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]';
const GLASS_NESTED = 'rounded-xl bg-white/[0.04] border border-white/[0.06]';

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

  const finalizableBatches = useMemo(
    () => batchSummaries.filter((b) => b.hasEntries),
    [batchSummaries]
  );
  const notStartedBatches = useMemo(
    () => batchSummaries.filter((b) => !b.hasEntries),
    [batchSummaries]
  );

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
    <div className="space-y-5">
      {/* Step header */}
      <div className="pl-4" style={{ borderLeftWidth: 2, borderLeftColor: 'rgba(245,158,11,0.4)' }}>
        <h2 className="text-[10px] text-amber-400/60 uppercase tracking-widest font-bold mb-1">
          Step 3 — Review & Finalize
        </h2>
        <p className="text-sm text-white/50">
          Select which batches from{' '}
          <span className="text-white/80 font-mono font-bold">{roomCode}</span>
          <span className="text-white/40"> ({roomName})</span>
          {' '}to finalize. Unselected batches stay active for later.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {hasPartialBatches && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          Some selected batches are partially weighed. Finalizing will record the current weights — you can harvest more from these batches in a future session.
        </div>
      )}

      {/* Batch selection */}
      <div className={`${GLASS} overflow-hidden`}>
        {/* Table header */}
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={toggleAll} className="text-white/30 hover:text-white/60 transition-colors">
                {selectedBatchIds.size === finalizableBatches.length ? (
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
              <div>
                <span className="text-white/80 font-mono text-sm font-semibold">{roomCode}</span>
                <span className="text-white/15 mx-2">·</span>
                <span className="text-white/40 text-sm">{roomName}</span>
              </div>
            </div>
            <div className="text-right">
              {selectedBatchIds.size > 0 ? (
                <>
                  <span className="text-white text-lg font-bold font-mono">{formatWeight(combinedWeight)}</span>
                  <span className="text-white/25 text-xs ml-2">{combinedPlants} plants</span>
                </>
              ) : (
                <span className="text-white/20 text-sm">No batches selected</span>
              )}
            </div>
          </div>
          {selectedBatchIds.size > 0 && hasFlowerSessions && hasFrozenSessions && (
            <div className="flex items-center gap-4 mt-1.5 ml-7 text-xs text-white/30">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500/60 inline-block" />
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
        <div className="divide-y divide-white/[0.04]">
          {finalizableBatches.map((summary) => {
            const { batch, totalWeight, totalPlants, wasteGrams, flowerWeight, frozenWeight, priorHarvestedPlants } = summary;
            const status = getBatchStatus(summary);
            const isSelected = selectedBatchIds.has(batch.batchRegistryId);
            const cumulativePlants = totalPlants + priorHarvestedPlants;

            return (
              <button
                key={batch.batchRegistryId}
                onClick={() => toggleBatch(batch.batchRegistryId)}
                className={`w-full text-left px-5 py-3 flex items-center justify-between gap-4 transition-colors ${
                  isSelected
                    ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.06]'
                    : 'hover:bg-white/[0.02] opacity-40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-white/20 flex-shrink-0" />
                  )}
                  {status === 'complete' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white/80 font-mono text-xs font-bold">{batch.batchNumber}</span>
                      <span className="text-white/40 text-xs truncate">{batch.strainName}</span>
                      {flowerWeight > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-lg uppercase font-bold border border-emerald-500/20 text-emerald-300 bg-emerald-500/10">FLW</span>
                      )}
                      {frozenWeight > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-lg uppercase font-bold border border-cyan-500/20 text-cyan-400 bg-cyan-500/10">FF</span>
                      )}
                      {status === 'partial' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-lg uppercase font-bold border border-amber-500/20 text-amber-300 bg-amber-500/10">Partial</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-white/25 text-[10px]">
                        {cumulativePlants}/{batch.totalPlants} plants
                        {priorHarvestedPlants > 0 && ` (${priorHarvestedPlants} prior)`}
                      </span>
                      {wasteGrams > 0 && (
                        <span className="text-white/15 text-[10px]">· waste: {formatWeight(wasteGrams)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-white/80 text-sm font-mono font-semibold flex-shrink-0">
                  {formatWeight(totalWeight)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Not-started batches */}
        {notStartedBatches.length > 0 && (
          <>
            <div className="px-5 py-2 border-t border-white/[0.04]">
              <span className="text-white/15 text-[10px] uppercase tracking-wider">
                Not Weighed ({notStartedBatches.length})
              </span>
            </div>
            <div className="divide-y divide-white/[0.02]">
              {notStartedBatches.map(({ batch }) => (
                <div key={batch.batchRegistryId} className="px-5 py-2.5 flex items-center gap-3 opacity-30">
                  <div className="w-4 h-4 flex-shrink-0" />
                  <Circle className="w-4 h-4 text-white/20 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 font-mono text-xs">{batch.batchNumber}</span>
                      <span className="text-white/20 text-xs truncate">{batch.strainName}</span>
                    </div>
                    <span className="text-white/15 text-[10px]">{batch.totalPlants} plants — not started</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Waste footer */}
        {combinedWaste > 0 && (
          <div className="px-5 py-2 border-t border-white/[0.04]">
            <span className="text-white/20 text-[10px]">Total waste: {formatWeight(combinedWaste)}</span>
          </div>
        )}
      </div>

      {/* Dry room selection */}
      {hasFlowerSessions && selectedBatchIds.size > 0 && (
        <div className={`${GLASS_NESTED} p-5`}>
          <label className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-wider mb-3 font-medium">
            <Wind className="w-4 h-4" />
            Dry Room Destination
            {hasFrozenSessions && (
              <span className="text-white/15 font-normal normal-case tracking-normal">(for flower sessions only)</span>
            )}
          </label>
          {activeDryRooms.length === 0 ? (
            <p className="text-amber-300 text-sm">
              No active dry rooms. Create one in Settings or Cultivation &gt; Dry Rooms first.
            </p>
          ) : (
            <select
              value={selectedDryRoomId}
              onChange={(e) => setSelectedDryRoomId(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white"
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

      {/* Fresh frozen info */}
      {hasFrozenSessions && selectedBatchIds.size > 0 && (
        <div className={`${GLASS_NESTED} p-5`} style={{ borderColor: 'rgba(6,182,212,0.15)' }}>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400/70 uppercase tracking-wider mb-1">
            <Snowflake className="w-4 h-4" />
            Fresh Frozen
          </div>
          <p className="text-white/40 text-sm">
            {formatWeight(frozenWeight)} will be vacuum sealed and frozen.
            Packages will be auto-created upon finalization.
          </p>
        </div>
      )}

      {/* Partial finalize note */}
      {selectedBatchIds.size > 0 && selectedBatchIds.size < finalizableBatches.length && (
        <div className={`${GLASS_NESTED} p-4 text-sm text-white/40`}>
          Finalizing <span className="text-white/70 font-bold">{selectedBatchIds.size}</span> of{' '}
          <span className="text-white/70 font-bold">{finalizableBatches.length}</span> weighed batch{finalizableBatches.length !== 1 ? 'es' : ''}.
          The remaining will stay active.
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleFinalize}
          disabled={!canFinalize}
          className="flex items-center gap-2 rounded-xl bg-emerald-500/80 text-black px-6 py-3 text-xs font-semibold uppercase tracking-wider active:scale-95 transition-all disabled:opacity-20 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
        >
          <CheckCircle className="w-4 h-4" />
          {saving
            ? 'Finalizing...'
            : `Finalize ${selectedBatchIds.size} Batch${selectedBatchIds.size !== 1 ? 'es' : ''}`
          }
        </button>
        <button
          onClick={onBack}
          disabled={saving}
          className="rounded-xl bg-white/[0.05] border border-white/[0.1] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white/40 hover:bg-white/[0.08] hover:text-white/60 active:scale-95 transition-all"
        >
          Back to Weights
        </button>
      </div>
    </div>
  );
}
