import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { BatchDetailRow } from './useBatchDetail';

export interface StrainDrawerData {
  strain: StrainInfo | null;
  batches: BatchDetailRow[];
  loading: boolean;
}

export interface StrainInfo {
  id: string;
  name: string;
  abbreviation: string | null;
  category: string | null;
  thc_range: string | null;
  cbd_range: string | null;
  flowering_time_days: number | null;
  forecast_price_per_gram: number | null;
  is_active: boolean;
}

/**
 * Fetches strain metadata + all active batches for that strain via v_batch_lifecycle.
 */
export function useStrainDrawerData(strainId: string | null) {
  const [data, setData] = useState<StrainDrawerData>({
    strain: null,
    batches: [],
    loading: false,
  });

  const fetch = useCallback(async () => {
    if (!strainId) {
      setData({ strain: null, batches: [], loading: false });
      return;
    }

    setData((prev) => ({ ...prev, loading: true }));

    try {
      const [strainRes, batchRes] = await Promise.all([
        supabase
          .from('strains')
          .select('id, name, abbreviation, category, thc_range, cbd_range, flowering_time_days, forecast_price_per_gram, is_active')
          .eq('id', strainId)
          .maybeSingle(),
        supabase
          .from('v_batch_lifecycle')
          .select('*')
          .eq('strain_id', strainId)
          .order('total_potential_g', { ascending: false }),
      ]);

      const s = strainRes.data;
      const strain: StrainInfo | null = s
        ? {
            id: s.id,
            name: s.name,
            abbreviation: s.abbreviation,
            category: s.category,
            thc_range: s.thc_range,
            cbd_range: s.cbd_range,
            flowering_time_days: s.flowering_time_days != null ? Number(s.flowering_time_days) : null,
            forecast_price_per_gram: s.forecast_price_per_gram != null ? Number(s.forecast_price_per_gram) : null,
            is_active: s.is_active ?? true,
          }
        : null;

      const batches: BatchDetailRow[] = (batchRes.data ?? [])
        .filter((r: any) => {
          const total = Number(r.total_potential_g) || 0;
          return total > 0;
        })
        .map((r: any) => ({
          batch_id: r.batch_id,
          batch_code: r.batch_code,
          strain_name: r.strain_name,
          strain_id: r.strain_id,
          lifecycle_state: r.lifecycle_state,
          stage: r.stage,
          harvest_date: r.harvest_date,
          age_days: Number(r.age_days) || 0,
          days_in_stage: Number(r.days_in_stage) || 0,
          binned_g: Number(r.binned_g) || 0,
          bucked_g: Number(r.bucked_g) || 0,
          bulk_flower_g: Number(r.bulk_flower_g) || 0,
          bulk_smalls_g: Number(r.bulk_smalls_g) || 0,
          trim_g: Number(r.trim_g) || 0,
          packaged_g: Number(r.packaged_g) || 0,
          shipped_g: Number(r.shipped_g) || 0,
          sellable_now_g: Number(r.sellable_now_g) || 0,
          pipeline_raw_g: Number(r.pipeline_raw_g) || 0,
          total_potential_g: Number(r.total_potential_g) || 0,
          waste_grams: Number(r.waste_grams) || 0,
          allocated_orders: Number(r.allocated_orders) || 0,
          allocated_units: Number(r.allocated_units) || 0,
          allocated_revenue: Number(r.allocated_revenue) || 0,
          sold_value: Number(r.sold_value) || 0,
          quality_grade: r.quality_grade ?? null,
          confidence: r.confidence ?? 'low',
          packaging_started_at: r.packaging_started_at ?? null,
          completed_at: r.completed_at ?? null,
        }));

      setData({ strain, batches, loading: false });
    } catch (err) {
      console.error('[useStrainDrawerData] Failed:', err);
      setData({ strain: null, batches: [], loading: false });
    }
  }, [strainId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...data, refetch: fetch };
}
