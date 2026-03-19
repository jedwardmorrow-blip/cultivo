import { useState } from 'react';
import { CheckCircle, AlertTriangle, Wind, Snowflake } from 'lucide-react';
import { Button } from '@/shared/components';
import { formatWeight } from '../../utils';
import type { DryRoom, HarvestSession, PlantGroup } from '../../types';

interface GroupSummary {
  group: PlantGroup;
  session: HarvestSession;
  totalWeight: number;
  totalPlants: number;
  wasteGrams: number;
  flowerWeight: number;
  frozenWeight: number;
}

interface HarvestReviewFinalizeProps {
  roomCode: string;
  roomName: string;
  groupSummaries: GroupSummary[];
  dryRooms: DryRoom[];
  onFinalize: (dryRoomId: string | null) => Promise<void>;
  onBack: () => void;
}

export function HarvestReviewFinalize({
  roomCode,
  roomName,
  groupSummaries,
  dryRooms,
  onFinalize,
  onBack,
}: HarvestReviewFinalizeProps) {
  const [selectedDryRoomId, setSelectedDryRoomId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDryRooms = dryRooms.filter((r) => r.is_active);
  const combinedWeight = groupSummaries.reduce((s, g) => s + g.totalWeight, 0);
  const combinedPlants = groupSummaries.reduce((s, g) => s + g.totalPlants, 0);
  const combinedWaste = groupSummaries.reduce((s, g) => s + g.wasteGrams, 0);

  const flowerWeight = groupSummaries.reduce((s, g) => s + g.flowerWeight, 0);
  const frozenWeight = groupSummaries.reduce((s, g) => s + g.frozenWeight, 0);
  const hasFlowerSessions = flowerWeight > 0;
  const hasFrozenSessions = frozenWeight > 0;

  const allComplete = groupSummaries.every((g) => g.totalPlants >= g.group.plant_count);
  // Dry room only required if there are flower sessions
  const canFinalize = (hasFlowerSessions ? !!selectedDryRoomId : true) && groupSummaries.length > 0 && !saving;

  async function handleFinalize() {
    if (!canFinalize) return;
    setSaving(true);
    setError(null);
    try {
      await onFinalize(selectedDryRoomId || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to finalize harvest');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xs text-cult-light-gray uppercase tracking-widest font-semibold mb-1">
          Step 3
        </h2>
        <p className="text-cult-light-gray text-sm">
          Review harvest from <span className="text-cult-white font-mono">{roomCode}</span> and select a dry room.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-sm p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {!allComplete && (
        <div className="flex items-start gap-2 bg-amber-950 border border-amber-700 text-amber-300 text-sm p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          Not all plant groups have been fully weighed. You can still finalize with partial weights.
        </div>
      )}

      <div className="bg-cult-near-black border border-cult-medium-gray">
        <div className="px-4 py-3 border-b border-cult-dark-gray">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-cult-white font-mono text-sm font-semibold">{roomCode}</span>
              <span className="text-cult-medium-gray mx-2">|</span>
              <span className="text-cult-light-gray text-sm">{roomName}</span>
            </div>
            <div className="text-right">
              <span className="text-cult-white text-lg font-bold">{formatWeight(combinedWeight)}</span>
              <span className="text-cult-medium-gray text-xs ml-2">{combinedPlants} plants</span>
              {hasFlowerSessions && hasFrozenSessions && (
                <div className="text-[10px] text-cult-medium-gray mt-0.5">
                  Flower: {formatWeight(flowerWeight)} · Frozen: {formatWeight(frozenWeight)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="divide-y divide-cult-dark-gray">
          {groupSummaries.map(({ group, totalWeight, totalPlants, wasteGrams, flowerWeight, frozenWeight }) => {
            const strainName = group.strains?.name ?? 'Unknown';
            const batchNumber = group.batch_registry?.batch_number;
            const complete = totalPlants >= group.plant_count;

            return (
              <div key={group.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {complete ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 border border-cult-medium-gray rounded-full flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                       {batchNumber && (
                        <span className="text-cult-white font-mono text-xs">{batchNumber}</span>
                      )}
                      <span className="text-cult-light-gray text-xs truncate">{strainName}</span>
                      {flowerWeight > 0 && (
                        <span className="text-[9px] px-1 py-0.5 uppercase font-bold border border-green-800 text-green-400">FLW</span>
                      )}
                      {frozenWeight > 0 && (
                        <span className="text-[9px] px-1 py-0.5 uppercase font-bold border border-cyan-800 text-cyan-400">FF</span>
                      )}
                    </div>
                    <span className="text-cult-medium-gray text-[10px]">
                      {totalPlants}/{group.plant_count} plants
                      {wasteGrams > 0 && ` | waste: ${formatWeight(wasteGrams)}`}
                    </span>
                  </div>
                </div>
                <span className="text-cult-white text-sm font-mono flex-shrink-0">
                  {formatWeight(totalWeight)}
                </span>
              </div>
            );
          })}
        </div>

        {combinedWaste > 0 && (
          <div className="px-4 py-2 border-t border-cult-dark-gray">
            <span className="text-cult-medium-gray text-xs">
              Total waste: {formatWeight(combinedWaste)}
            </span>
          </div>
        )}
      </div>

      {hasFlowerSessions && (
        <div className="bg-cult-near-black border border-cult-medium-gray p-4">
          <label className="flex items-center gap-2 text-xs text-cult-light-gray uppercase tracking-wider mb-2">
            <Wind className="w-4 h-4" />
            Dry Room Destination
            {hasFrozenSessions && (
              <span className="text-cult-medium-gray font-normal normal-case tracking-normal">(for flower sessions only)</span>
            )}
          </label>
          {activeDryRooms.length === 0 ? (
            <p className="text-amber-400 text-sm">
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

      {hasFrozenSessions && (
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

      <div className="flex gap-3">
        <Button
          onClick={handleFinalize}
          disabled={!canFinalize}
          icon={<CheckCircle className="w-4 h-4" />}
        >
          {saving ? 'Finalizing...' : 'Finalize Harvest'}
        </Button>
        <button
          onClick={onBack}
          disabled={saving}
          className="px-6 py-3 text-sm font-bold uppercase tracking-wider border border-cult-medium-gray text-cult-light-gray hover:border-cult-lighter-gray hover:text-cult-white transition-all"
        >
          Back
        </button>
      </div>
    </div>
  );
}
