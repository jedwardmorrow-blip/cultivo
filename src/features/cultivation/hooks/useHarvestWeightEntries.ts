import { useEffect, useState, useCallback } from 'react';
import { cultivationService } from '../services';
import type { HarvestWeightEntry, CreateHarvestWeightEntryInput } from '../types';

export function useHarvestWeightEntries(harvestSessionId: string | null) {
  const [entries, setEntries] = useState<HarvestWeightEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!harvestSessionId) {
      setEntries([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await cultivationService.listHarvestWeightEntries(harvestSessionId);
      setEntries(data);
    } catch {
      setError('Failed to load weight entries');
    } finally {
      setLoading(false);
    }
  }, [harvestSessionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addEntry(input: Omit<CreateHarvestWeightEntryInput, 'harvest_session_id'>): Promise<HarvestWeightEntry> {
    if (!harvestSessionId) throw new Error('No harvest session selected');
    const entry = await cultivationService.createHarvestWeightEntry({
      ...input,
      harvest_session_id: harvestSessionId,
    });
    await load();
    return entry;
  }

  async function updateEntry(id: string, updates: Partial<Pick<HarvestWeightEntry, 'weight_grams' | 'plant_count' | 'destination' | 'notes'>>): Promise<HarvestWeightEntry> {
    const entry = await cultivationService.updateHarvestWeightEntry(id, updates);
    await load();
    return entry;
  }

  async function removeEntry(id: string): Promise<void> {
    await cultivationService.deleteHarvestWeightEntry(id);
    await load();
  }

  const totalWeight = entries.reduce((sum, e) => sum + Number(e.weight_grams), 0);
  const totalPlants = entries.reduce((sum, e) => sum + e.plant_count, 0);

  return {
    entries,
    loading,
    error,
    reload: load,
    setEntries,
    addEntry,
    updateEntry,
    removeEntry,
    totalWeight,
    totalPlants,
  };
}
