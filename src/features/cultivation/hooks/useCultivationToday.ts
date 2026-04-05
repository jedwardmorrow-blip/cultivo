import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export interface AttentionItem {
  type: 'harvest_imminent' | 'stage_move_pending' | 'overdue_task' | 'unassigned_task';
  plant_group_id?: string;
  plant_group_name?: string;
  strain_name?: string;
  room_name?: string;
  plant_count?: number;
  estimated_harvest_date?: string;
  growth_stage?: string;
  days_in_stage?: number;
}

export interface CultivationTodaySummary {
  attention_items: AttentionItem[];
  todays_tasks: unknown[];
  this_week_tasks: unknown[];
}

/**
 * Calls get_cultivation_today_summary RPC (CUL-341).
 * Returns attention items (harvest-imminent, stage-move-pending).
 */
export function useCultivationToday() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<CultivationTodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_cultivation_today_summary', { p_user_id: profile?.id ?? null });
      if (rpcError) throw rpcError;
      setSummary(data as CultivationTodaySummary);
    } catch (err: any) {
      console.warn('useCultivationToday: RPC may not be deployed (CUL-341)', err.message);
      setError(err.message);
      setSummary({ attention_items: [], todays_tasks: [], this_week_tasks: [] });
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { summary, loading, error, refresh: fetch };
}
