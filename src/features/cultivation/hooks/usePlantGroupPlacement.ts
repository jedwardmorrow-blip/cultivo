import { useState } from 'react';
import { cultivationService } from '../services';
import type { UpdatePlantGroupPlacementInput } from '../types';

export function usePlantGroupPlacement(groupId: string) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updatePlacement(input: UpdatePlantGroupPlacementInput): Promise<boolean> {
    try {
      setSaving(true);
      setError(null);
      await cultivationService.updatePlantGroupPlacement(groupId, input);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update placement');
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, updatePlacement };
}
