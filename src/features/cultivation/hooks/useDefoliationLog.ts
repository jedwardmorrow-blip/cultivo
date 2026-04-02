import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DefoliationLog, CreateDefoliationLogInput } from '../types';

interface DefoliationLogFilter {
  roomId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useDefoliationLog(filter?: DefoliationLogFilter) {
  const [logs, setLogs] = useState<DefoliationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('defoliation_log')
        .select('*')
        .order('performed_at', { ascending: false });

      if (filter?.roomId) query = query.eq('room_id', filter.roomId);
      if (filter?.dateFrom) query = query.gte('performed_at', filter.dateFrom);
      if (filter?.dateTo) query = query.lte('performed_at', filter.dateTo);

      const { data, error: err } = await query.limit(100);
      if (err) throw err;
      setLogs((data ?? []) as DefoliationLog[]);
    } catch {
      setError('Failed to load defoliation logs');
    } finally {
      setLoading(false);
    }
  }, [filter?.roomId, filter?.dateFrom, filter?.dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  async function insertDefoliationLog(input: CreateDefoliationLogInput): Promise<DefoliationLog> {
    const { data, error: err } = await supabase
      .from('defoliation_log')
      .insert(input)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as DefoliationLog;
  }

  return { logs, loading, error, refetch: load, insertDefoliationLog };
}
