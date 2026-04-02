import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { FeedingLog, CreateFeedingLogInput } from '../types';

interface FeedingLogFilter {
  roomId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useFeedingLog(filter?: FeedingLogFilter) {
  const [logs, setLogs] = useState<FeedingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('feeding_log')
        .select('*')
        .order('fed_at', { ascending: false });

      if (filter?.roomId) query = query.eq('room_id', filter.roomId);
      if (filter?.dateFrom) query = query.gte('fed_at', filter.dateFrom);
      if (filter?.dateTo) query = query.lte('fed_at', filter.dateTo);

      const { data, error: err } = await query.limit(100);
      if (err) throw err;
      setLogs((data ?? []) as FeedingLog[]);
    } catch {
      setError('Failed to load feeding logs');
    } finally {
      setLoading(false);
    }
  }, [filter?.roomId, filter?.dateFrom, filter?.dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  async function insertFeedingLog(input: CreateFeedingLogInput): Promise<FeedingLog> {
    const { data, error: err } = await supabase
      .from('feeding_log')
      .insert(input)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as FeedingLog;
  }

  return { logs, loading, error, refetch: load, insertFeedingLog };
}
