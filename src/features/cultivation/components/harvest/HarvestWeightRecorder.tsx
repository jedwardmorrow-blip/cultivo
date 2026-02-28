import { useState } from 'react';
import { Plus, Trash2, Scale, AlertTriangle, CheckCircle } from 'lucide-react';
import { useHarvestWeightEntries } from '../../hooks/useHarvestWeightEntries';
import { formatWeight } from '../../utils';
import type { PlantGroup, HarvestSession } from '../../types';

interface WeightEntryFormProps {
  harvestSessionId: string;
  maxPlants: number;
  plantsAlreadyWeighed: number;
  onEntryAdded: () => void;
}

function WeightEntryForm({ harvestSessionId, maxPlants, plantsAlreadyWeighed, onEntryAdded }: WeightEntryFormProps) {
  const { addEntry } = useHarvestWeightEntries(harvestSessionId);
  const [weight, setWeight] = useState('');
  const [plantCount, setPlantCount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = maxPlants - plantsAlreadyWeighed;
  const parsedWeight = parseFloat(weight);
  const parsedPlants = parseInt(plantCount);
  const canSave = parsedWeight > 0 && parsedPlants >= 1 && parsedPlants <= remaining && !saving;

  async function handleAdd() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await addEntry({ weight_grams: parsedWeight, plant_count: parsedPlants });
      setWeight('');
      setPlantCount('');
      onEntryAdded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add entry');
    } finally {
      setSaving(false);
    }
  }

  if (remaining <= 0) return null;

  return (
    <div className="mt-3">
      {error && (
        <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-xs p-2 mb-2">
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-[10px] text-cult-medium-gray uppercase tracking-wider mb-0.5">
            Weight (g)
          </label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 1200"
            className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-cult-lighter-gray"
          />
        </div>
        <div className="w-24">
          <label className="block text-[10px] text-cult-medium-gray uppercase tracking-wider mb-0.5">
            Plants
          </label>
          <input
            type="number"
            min="1"
            max={remaining}
            step="1"
            value={plantCount}
            onChange={(e) => setPlantCount(e.target.value)}
            placeholder={String(Math.min(5, remaining))}
            className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-cult-lighter-gray"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!canSave}
          className="flex items-center gap-1.5 bg-white text-cult-black px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-cult-surface transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          {saving ? '...' : 'Add'}
        </button>
      </div>
    </div>
  );
}

interface PlantGroupWeightCardProps {
  group: PlantGroup;
  harvestSession: HarvestSession | null;
  onSessionCreated: () => void;
  onCreateSession: (groupId: string) => Promise<HarvestSession>;
  wasteGrams: number;
  onWasteChange: (groupId: string, grams: number) => void;
}

export function PlantGroupWeightCard({
  group,
  harvestSession,
  onSessionCreated,
  onCreateSession,
  wasteGrams,
  onWasteChange,
}: PlantGroupWeightCardProps) {
  const sessionId = harvestSession?.id ?? null;
  const { entries, totalWeight, totalPlants, removeEntry, reload } = useHarvestWeightEntries(sessionId);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = group.plant_count > 0 ? Math.min(100, Math.round((totalPlants / group.plant_count) * 100)) : 0;
  const isComplete = totalPlants >= group.plant_count;
  const strainName = group.strains?.name ?? 'Unknown Strain';
  const batchNumber = group.batch_registry?.batch_number;

  async function handleStartWeighing() {
    setCreating(true);
    setError(null);
    try {
      await onCreateSession(group.id);
      onSessionCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start harvest');
    } finally {
      setCreating(false);
    }
  }

  async function handleRemoveEntry(entryId: string) {
    try {
      await removeEntry(entryId);
    } catch {
      // silent
    }
  }

  return (
    <div className={`border ${isComplete ? 'border-green-800 bg-green-950/20' : 'border-cult-medium-gray bg-cult-near-black'} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {batchNumber && (
              <span className="text-cult-white font-mono text-sm font-semibold">{batchNumber}</span>
            )}
            <span className="text-cult-white text-sm truncate">{strainName}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-cult-medium-gray text-xs">{group.plant_count} plants total</span>
            {totalWeight > 0 && (
              <>
                <span className="text-cult-medium-gray text-xs">|</span>
                <span className="text-cult-light-gray text-xs font-mono">
                  {formatWeight(totalWeight)} recorded
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isComplete && (
            <span className="flex items-center gap-1 text-green-400 text-xs font-semibold uppercase tracking-wider">
              <CheckCircle className="w-3.5 h-3.5" />
              Done
            </span>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-cult-medium-gray uppercase tracking-wider">
            {totalPlants} / {group.plant_count} plants weighed
          </span>
          <span className="text-[10px] text-cult-medium-gray">{progress}%</span>
        </div>
        <div className="w-full bg-cult-black h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${isComplete ? 'bg-green-600' : 'bg-cult-white'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {!harvestSession && (
        <div className="mt-3">
          {error && (
            <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-xs p-2 mb-2">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          <button
            onClick={handleStartWeighing}
            disabled={creating}
            className="flex items-center gap-1.5 text-xs border border-cult-medium-gray text-cult-light-gray px-3 py-1.5 hover:border-cult-lighter-gray hover:text-cult-white transition-all uppercase tracking-wider font-semibold"
          >
            <Scale className="w-3.5 h-3.5" />
            {creating ? 'Starting...' : 'Start Weighing'}
          </button>
        </div>
      )}

      {harvestSession && entries.length > 0 && (
        <div className="mt-3 space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between bg-cult-black border border-cult-dark-gray px-3 py-1.5 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="text-cult-white font-mono">{formatWeight(Number(entry.weight_grams))}</span>
                <span className="text-cult-medium-gray">|</span>
                <span className="text-cult-light-gray">{entry.plant_count} plant{entry.plant_count !== 1 ? 's' : ''}</span>
              </div>
              <button
                onClick={() => handleRemoveEntry(entry.id)}
                className="text-cult-medium-gray hover:text-red-400 transition-colors p-0.5"
                title="Remove entry"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {harvestSession && !isComplete && (
        <WeightEntryForm
          harvestSessionId={harvestSession.id}
          maxPlants={group.plant_count}
          plantsAlreadyWeighed={totalPlants}
          onEntryAdded={reload}
        />
      )}

      {harvestSession && (
        <div className="mt-3">
          <label className="block text-[10px] text-cult-medium-gray uppercase tracking-wider mb-0.5">
            Waste (g) - optional
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={wasteGrams || ''}
            onChange={(e) => onWasteChange(group.id, parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="w-32 bg-cult-black border border-cult-medium-gray text-cult-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-cult-lighter-gray"
          />
        </div>
      )}
    </div>
  );
}
