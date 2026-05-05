import { useState } from 'react';
import { Plus, Trash2, Scale, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/shared/components';
import { useHarvestWeightEntries } from '../../hooks/useHarvestWeightEntries';
import { formatWeight } from '../../utils';
import type { PlantGroup, HarvestSession, HarvestType } from '../../types';

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
  const [destination, setDestination] = useState<HarvestType>('flower');
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
      await addEntry({ weight_grams: parsedWeight, plant_count: parsedPlants, destination });
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
        <div className="flex items-start gap-2 bg-cult-danger-muted border border-cult-danger text-cult-danger text-xs p-2 mb-2">
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs text-cult-border uppercase tracking-wider mb-0.5">
            Weight (g)
          </label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 1200"
            className="w-full bg-cult-black border border-cult-border text-cult-text-primary px-2.5 py-1.5 text-sm focus:outline-none focus:border-cult-text-muted"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs text-cult-border uppercase tracking-wider mb-0.5">
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
            className="w-full bg-cult-black border border-cult-border text-cult-text-primary px-2.5 py-1.5 text-sm focus:outline-none focus:border-cult-text-muted"
          />
        </div>
        <div className="w-28">
          <label className="block text-xs text-cult-border uppercase tracking-wider mb-0.5">
            Dest
          </label>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value as HarvestType)}
            className="w-full bg-cult-black border border-cult-border text-cult-text-primary px-2 py-1.5 text-xs focus:outline-none focus:border-cult-text-muted uppercase"
          >
            <option value="flower">Flower</option>
            <option value="fresh_frozen">Frozen</option>
          </select>
        </div>
        <Button
          onClick={handleAdd}
          disabled={!canSave}
          size="xs"
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          {saving ? '...' : 'Add'}
        </Button>
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
    <div className={`border ${isComplete ? 'border-cult-success/30 bg-cult-success-muted' : 'border-cult-border bg-cult-surface'} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {batchNumber && (
              <span className="text-cult-text-primary font-mono text-sm font-semibold">{batchNumber}</span>
            )}
            <span className="text-cult-text-primary text-sm truncate">{strainName}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-cult-border text-xs">{group.plant_count} plants total</span>
            {totalWeight > 0 && (
              <>
                <span className="text-cult-border text-xs">|</span>
                <span className="text-cult-text-muted text-xs font-mono">
                  {formatWeight(totalWeight)} recorded
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isComplete && (
            <span className="flex items-center gap-1 text-cult-success text-xs font-semibold uppercase tracking-wider">
              <CheckCircle className="w-3.5 h-3.5" />
              Done
            </span>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-cult-border uppercase tracking-wider">
            {totalPlants} / {group.plant_count} plants weighed
          </span>
          <span className="text-xs text-cult-border">{progress}%</span>
        </div>
        <div className="w-full bg-cult-black h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${isComplete ? 'bg-cult-success' : 'bg-cult-accent'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {!harvestSession && (
        <div className="mt-3">
          {error && (
            <div className="flex items-start gap-2 bg-cult-danger-muted border border-cult-danger text-cult-danger text-xs p-2 mb-2">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          <button
            onClick={handleStartWeighing}
            disabled={creating}
            className="flex items-center gap-1.5 text-xs border border-cult-border text-cult-text-muted px-3 py-1.5 hover:border-cult-text-muted hover:text-cult-text-primary transition-all uppercase tracking-wider font-semibold"
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
              className="flex items-center justify-between bg-cult-black border border-cult-surface px-3 py-1.5 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="text-cult-text-primary font-mono">{formatWeight(Number(entry.weight_grams))}</span>
                <span className="text-cult-border">|</span>
                <span className="text-cult-text-muted">{entry.plant_count} plant{entry.plant_count !== 1 ? 's' : ''}</span>
                {entry.destination && (
                  <span className={`text-xs px-1 py-0.5 uppercase tracking-wider font-bold border ${entry.destination === 'fresh_frozen' ? 'border-cyan-800 text-cyan-400' : 'border-cult-success/30 text-cult-success'}`}>
                    {entry.destination === 'fresh_frozen' ? 'FF' : 'FLW'}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleRemoveEntry(entry.id)}
                className="text-cult-border hover:text-cult-danger transition-colors p-0.5"
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
          <label className="block text-xs text-cult-border uppercase tracking-wider mb-0.5">
            Waste (g) - optional
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={wasteGrams || ''}
            onChange={(e) => onWasteChange(group.id, parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="w-32 bg-cult-black border border-cult-border text-cult-text-primary px-2.5 py-1.5 text-sm focus:outline-none focus:border-cult-text-muted"
          />
        </div>
      )}
    </div>
  );
}
