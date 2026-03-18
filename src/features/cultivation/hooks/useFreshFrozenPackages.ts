import { useEffect, useState, useCallback } from 'react';
import { cultivationService } from '../services';
import type { FreshFrozenPackage } from '../types';

export function useFreshFrozenPackages(batchId: string | null) {
  const [packages, setPackages] = useState<FreshFrozenPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!batchId) {
      setPackages([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await cultivationService.listFreshFrozenPackages(batchId);
      setPackages(data);
    } catch {
      setError('Failed to load fresh frozen packages');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    load();
  }, [load]);

  async function updatePackage(
    id: string,
    updates: Partial<Pick<FreshFrozenPackage, 'weight_grams' | 'freezer_location' | 'vacuum_sealed_at' | 'frozen_at' | 'notes' | 'status'>>
  ): Promise<FreshFrozenPackage> {
    const pkg = await cultivationService.updateFreshFrozenPackage(id, updates);
    await load();
    return pkg;
  }

  return {
    packages,
    loading,
    error,
    reload: load,
    updatePackage,
  };
}
