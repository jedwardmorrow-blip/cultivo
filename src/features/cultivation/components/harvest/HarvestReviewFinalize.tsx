import { useState } from 'react';
import { CheckCircle, AlertTriangle, Wind } from 'lucide-react';
import { formatWeight } from '../../utils';
import type { DryRoom, HarvestSession, PlantGroup } from '../../types';

interface GroupSummary {
  group: PlantGroup;
  session: HarvestSession;
  totalWeight: number;
  totalPlants: number;
  wasteGrams: number;
}

interface HarvestReviewFinalizeProps {
  roomCode: string;
  roomName: string;
  groupSummaries: GroupSummary[];
  dryRooms: DryRoom[];
  onFinalize: (dryRoomId: string) => Promise<void>;
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

  const allComplete = groupSummaries.every((g) => g.totalPlants >= g.group.plant_count);
  const canFinalize = selectedDryRoomId && groupSummaries.length > 0 && !saving;

  async function handleFinalize() {
    if (!canFinalize) return;
    setSaving(true);
    setError(null);
    try {
      await onFinalize(selectedDryRoomId);
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
            </div>
          </div>
        </div>

        <div className="divide-y divide-cult-dark-gray">
          {groupSummaries.map(({ group, totalWeight, totalPlants, wasteGrams }) => {
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

      <div className="bg-cult-near-black border border-cult-medium-gray p-4">
        <label className="flex items-center gap-2 text-xs text-cult-light-gray uppercase tracking-wider mb-2">
          <Wind className="w-4 h-4" />
          Dry Room Destination
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

      <div className="flex gap-3">
        <button
          onClick={handleFinalize}
          disabled={!canFinalize}
          className="flex items-center gap-2 bg-white text-cult-black px-6 py-3 font-bold uppercase tracking-wider hover:bg-cult-surface transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          <CheckCircle className="w-4 h-4" />
          {saving ? 'Finalizing...' : 'Finalize Harvest'}
        </button>
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
