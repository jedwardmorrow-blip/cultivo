import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ScoutingLog, CreateScoutingLogInput } from '../types';

interface ScoutingLogFilter {
  roomId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useScoutingLog(filter?: ScoutingLogFilter) {
  const [logs, setLogs] = useState<ScoutingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('scouting_log')
        .select('*')
        .order('scouted_at', { ascending: false });

      if (filter?.roomId) query = query.eq('room_id', filter.roomId);
      if (filter?.dateFrom) query = query.gte('scouted_at', filter.dateFrom);
      if (filter?.dateTo) query = query.lte('scouted_at', filter.dateTo);

      const { data, error: err } = await query;
      if (err) throw err;
      setLogs((data ?? []) as ScoutingLog[]);
    } catch {
      setError('Failed to load scouting logs');
    } finally {
      setLoading(false);
    }
  }, [filter?.roomId, filter?.dateFrom, filter?.dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  async function insertScoutingLog(input: CreateScoutingLogInput): Promise<ScoutingLog> {
    const { data, error: err } = await supabase
      .from('scouting_log')
      .insert(input)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as ScoutingLog;
  }

  return { logs, loading, error, refetch: load, insertScoutingLog };
}
