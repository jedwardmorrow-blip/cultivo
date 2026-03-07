import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { IpmSprayLog, CreateSprayLogInput } from '../types';

interface SprayLogFilter {
  roomId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useSprayLog(filter?: SprayLogFilter) {
  const [logs, setLogs] = useState<IpmSprayLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('ipm_spray_log')
        .select('*')
        .order('applied_at', { ascending: false });

      if (filter?.roomId) query = query.eq('room_id', filter.roomId);
      if (filter?.dateFrom) query = query.gte('applied_at', filter.dateFrom);
      if (filter?.dateTo) query = query.lte('applied_at', filter.dateTo);

      const { data, error: err } = await query;
      if (err) throw err;
      setLogs((data ?? []) as IpmSprayLog[]);
    } catch {
      setError('Failed to load spray logs');
    } finally {
      setLoading(false);
    }
  }, [filter?.roomId, filter?.dateFrom, filter?.dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  async function insertSprayLog(input: CreateSprayLogInput): Promise<IpmSprayLog> {
    const { data, error: err } = await supabase
      .from('ipm_spray_log')
      .insert(input)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as IpmSprayLog;
  }

  return { logs, loading, error, refetch: load, insertSprayLog };
}
