import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  BatchChemicalAdditive,
  BatchChemicalAdditiveInsert,
  BatchChemicalAdditiveUpdate,
} from '@/types';

interface UseBatchChemicalAdditivesResult {
  additives: BatchChemicalAdditive[];
  loading: boolean;
  error: string | null;
  add: (record: Omit<BatchChemicalAdditiveInsert, 'batch_id'>) => Promise<void>;
  update: (id: string, changes: BatchChemicalAdditiveUpdate) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/**
 * CRUD hook for batch_chemical_additives records.
 * DB dependency: CUL-359 (table must be deployed).
 */
export function useBatchChemicalAdditives(batchId: string): UseBatchChemicalAdditivesResult {
  const [additives, setAdditives] = useState<BatchChemicalAdditive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdditives = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('batch_chemical_additives')
        .select('*')
        .eq('batch_id', batchId)
        .order('application_date', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setAdditives([]);
        return;
      }

      setAdditives((data as BatchChemicalAdditive[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chemical additives');
      setAdditives([]);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchAdditives();
  }, [fetchAdditives]);

  const add = useCallback(async (record: Omit<BatchChemicalAdditiveInsert, 'batch_id'>) => {
    const { error: insertError } = await supabase
      .from('batch_chemical_additives')
      .insert({ ...record, batch_id: batchId });

    if (insertError) throw new Error(insertError.message);
    await fetchAdditives();
  }, [batchId, fetchAdditives]);

  const update = useCallback(async (id: string, changes: BatchChemicalAdditiveUpdate) => {
    const { error: updateError } = await supabase
      .from('batch_chemical_additives')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) throw new Error(updateError.message);
    await fetchAdditives();
  }, [fetchAdditives]);

  const remove = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('batch_chemical_additives')
      .delete()
      .eq('id', id);

    if (deleteError) throw new Error(deleteError.message);
    await fetchAdditives();
  }, [fetchAdditives]);

  return { additives, loading, error, add, update, remove };
}
