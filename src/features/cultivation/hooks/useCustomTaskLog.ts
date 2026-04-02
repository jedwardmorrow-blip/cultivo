import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CustomTaskLog, CreateCustomTaskLogInput } from '../types';

interface CustomTaskLogFilter {
  roomId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useCustomTaskLog(filter?: CustomTaskLogFilter) {
  const [logs, setLogs] = useState<CustomTaskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('custom_task_log')
        .select('*')
        .order('performed_at', { ascending: false });

      if (filter?.roomId) query = query.eq('room_id', filter.roomId);
      if (filter?.dateFrom) query = query.gte('performed_at', filter.dateFrom);
      if (filter?.dateTo) query = query.lte('performed_at', filter.dateTo);

      const { data, error: err } = await query.limit(100);
      if (err) throw err;
      setLogs((data ?? []) as CustomTaskLog[]);
    } catch {
      setError('Failed to load custom task logs');
    } finally {
      setLoading(false);
    }
  }, [filter?.roomId, filter?.dateFrom, filter?.dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  async function insertCustomTaskLog(input: CreateCustomTaskLogInput): Promise<CustomTaskLog> {
    const { data, error: err } = await supabase
      .from('custom_task_log')
      .insert(input)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as CustomTaskLog;
  }

  return { logs, loading, error, refetch: load, insertCustomTaskLog };
}
