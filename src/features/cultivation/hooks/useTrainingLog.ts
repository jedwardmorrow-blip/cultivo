import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { TrainingLog, CreateTrainingLogInput } from '../types';

interface TrainingLogFilter {
  roomId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useTrainingLog(filter?: TrainingLogFilter) {
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('training_log')
        .select('*')
        .order('trained_at', { ascending: false });

      if (filter?.roomId) query = query.eq('room_id', filter.roomId);
      if (filter?.dateFrom) query = query.gte('trained_at', filter.dateFrom);
      if (filter?.dateTo) query = query.lte('trained_at', filter.dateTo);

      const { data, error: err } = await query;
      if (err) throw err;
      setLogs((data ?? []) as TrainingLog[]);
    } catch {
      setError('Failed to load training logs');
    } finally {
      setLoading(false);
    }
  }, [filter?.roomId, filter?.dateFrom, filter?.dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  async function insertTrainingLog(input: CreateTrainingLogInput): Promise<TrainingLog> {
    const { data, error: err } = await supabase
      .from('training_log')
      .insert(input)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as TrainingLog;
  }

  return { logs, loading, error, refetch: load, insertTrainingLog };
}
