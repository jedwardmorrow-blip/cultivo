import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PlantMortalityLog, CreateMortalityLogInput } from '../types';

interface MortalityLogFilter {
  roomId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useMortalityLog(filter?: MortalityLogFilter) {
  const [logs, setLogs] = useState<PlantMortalityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('plant_mortality_log')
        .select('*')
        .order('mortality_date', { ascending: false });

      if (filter?.roomId) query = query.eq('room_id', filter.roomId);
      if (filter?.dateFrom) query = query.gte('mortality_date', filter.dateFrom);
      if (filter?.dateTo) query = query.lte('mortality_date', filter.dateTo);

      const { data, error: err } = await query;
      if (err) throw err;
      setLogs((data ?? []) as PlantMortalityLog[]);
    } catch {
      setError('Failed to load mortality logs');
    } finally {
      setLoading(false);
    }
  }, [filter?.roomId, filter?.dateFrom, filter?.dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  async function insertMortalityLog(input: CreateMortalityLogInput): Promise<PlantMortalityLog> {
    const { data, error: err } = await supabase
      .from('plant_mortality_log')
      .insert(input)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as PlantMortalityLog;
  }

  return { logs, loading, error, refetch: load, insertMortalityLog };
}
