import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CleaningLog, CreateCleaningLogInput } from '../types';

interface CleaningLogFilter {
  roomId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useCleaningLog(filter?: CleaningLogFilter) {
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('cleaning_log')
        .select('*')
        .order('cleaned_at', { ascending: false });

      if (filter?.roomId) query = query.eq('room_id', filter.roomId);
      if (filter?.dateFrom) query = query.gte('cleaned_at', filter.dateFrom);
      if (filter?.dateTo) query = query.lte('cleaned_at', filter.dateTo);

      const { data, error: err } = await query;
      if (err) throw err;
      setLogs((data ?? []) as CleaningLog[]);
    } catch {
      setError('Failed to load cleaning logs');
    } finally {
      setLoading(false);
    }
  }, [filter?.roomId, filter?.dateFrom, filter?.dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  async function insertCleaningLog(input: CreateCleaningLogInput): Promise<CleaningLog> {
    const { data, error: err } = await supabase
      .from('cleaning_log')
      .insert(input)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as CleaningLog;
  }

  return { logs, loading, error, refetch: load, insertCleaningLog };
}
