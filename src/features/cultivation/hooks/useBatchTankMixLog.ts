import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// useBatchTankMixLog — CRUD for batch_tank_mix_log entries
// ═══════════════════════════════════════════════════════════════

export interface BatchTankMixLog {
  id: string;
  room_id: string;
  task_instance_id: string | null;
  feed_program_id: string | null;
  program_week_id: string | null;
  batch_id: string | null;
  status: string;
  stage: string | null;
  week_number: number | null;
  // Prescribed (recipe from feed chart, potentially adjusted by manager)
  prescribed_products: RecipeSnapshot[] | null;
  prescribed_gallons: number | null;
  prescribed_ec: number | null;
  prescribed_ppm: number | null;
  prescribed_ph_min: number | null;
  prescribed_ph_max: number | null;
  prescribed_by: string | null;
  prescribed_at: string | null;
  prescription_notes: string | null;
  // Actual (recorded by worker)
  actual_gallons: number | null;
  actual_products: RecipeSnapshot[] | null;
  actual_ec: number | null;
  actual_ppm: number | null;
  ppm_scale: '500' | '700' | null;
  actual_ph: number | null;
  completed_by: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface RecipeSnapshot {
  product_id: string;
  product_name: string;
  ml_per_gal: number;
  ml_per_gal_max?: number | null;
  mixing_order: number;
}

export interface CreateBatchTankMixInput {
  room_id: string;
  task_instance_id?: string | null;
  feed_program_id?: string | null;
  program_week_id?: string | null;
  batch_id?: string | null;
  status?: string;
  stage?: string | null;
  week_number?: number | null;
  prescribed_products?: RecipeSnapshot[] | null;
  prescribed_gallons?: number | null;
  prescribed_ec?: number | null;
  prescribed_ppm?: number | null;
  prescribed_ph_min?: number | null;
  prescribed_ph_max?: number | null;
  prescribed_by?: string | null;
  prescribed_at?: string | null;
  prescription_notes?: string | null;
  actual_gallons?: number | null;
  actual_products?: RecipeSnapshot[] | null;
  actual_ec?: number | null;
  actual_ppm?: number | null;
  ppm_scale?: '500' | '700' | null;
  actual_ph?: number | null;
  completed_by?: string | null;
  completed_at?: string | null;
  completion_notes?: string | null;
}

interface BatchTankMixFilter {
  roomId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useBatchTankMixLog(filter?: BatchTankMixFilter) {
  const [logs, setLogs] = useState<BatchTankMixLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('batch_tank_mix_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter?.roomId) query = query.eq('room_id', filter.roomId);
      if (filter?.dateFrom) query = query.gte('created_at', filter.dateFrom);
      if (filter?.dateTo) query = query.lte('created_at', filter.dateTo);

      const { data, error: err } = await query;
      if (err) throw err;
      setLogs((data ?? []) as BatchTankMixLog[]);
    } catch {
      setError('Failed to load batch tank mix logs');
    } finally {
      setLoading(false);
    }
  }, [filter?.roomId, filter?.dateFrom, filter?.dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  async function insertBatchTankMixLog(input: CreateBatchTankMixInput): Promise<BatchTankMixLog> {
    const { data, error: err } = await supabase
      .from('batch_tank_mix_log')
      .insert(input)
      .select()
      .single();
    if (err) throw err;
    await load();
    return data as BatchTankMixLog;
  }

  return { logs, loading, error, refetch: load, insertBatchTankMixLog };
}
