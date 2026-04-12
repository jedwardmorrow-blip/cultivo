import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface StrainInventoryRow {
  strain: string;
  strain_id: string | null;
  abbreviation: string | null;
  strain_category: string | null;
  active_batch_count: number;
  total_available_grams: number;
  bulk_flower_grams: number;
  bulk_smalls_grams: number;
  bulk_trim_grams: number;
  bucked_grams: number;
  packaged_units_available: number;
  most_recent_harvest: string | null;
  forecast_price_per_gram: number | null;
  estimated_value_usd: number;
  oldest_active_harvest: string | null;
}

export interface StrainInventoryKpis {
  totalWeightGrams: number;
  totalValueUsd: number;
  activeStrainCount: number;
  activeBatchCount: number;
  unpricedStrainCount: number;
}

export function useStrainInventory() {
  const [data, setData] = useState<StrainInventoryRow[]>([]);
  const [kpis, setKpis] = useState<StrainInventoryKpis>({
    totalWeightGrams: 0,
    totalValueUsd: 0,
    activeStrainCount: 0,
    activeBatchCount: 0,
    unpricedStrainCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: err } = await supabase.rpc('get_strain_inventory_for_cc');

      if (err) {
        // Fallback: direct query if RPC doesn't exist yet
        const { data: fallbackRows, error: fallbackErr } = await supabase
          .from('strain_inventory_summary')
          .select('*')
          .eq('has_active_batches', true)
          .order('total_available_grams', { ascending: false });

        if (fallbackErr) throw fallbackErr;

        // Join strain metadata client-side
        const { data: strains } = await supabase
          .from('strains')
          .select('id, name, abbreviation, category, forecast_price_per_gram');

        const strainMap = new Map(
          (strains ?? []).map((s: any) => [s.name, s])
        );

        const mapped: StrainInventoryRow[] = (fallbackRows ?? []).map((r: any) => {
          const s = strainMap.get(r.strain);
          const totalG = Number(r.total_available_grams) || 0;
          const price = s?.forecast_price_per_gram ?? null;
          return {
            strain: r.strain,
            strain_id: s?.id ?? null,
            abbreviation: s?.abbreviation ?? null,
            strain_category: s?.category ?? null,
            active_batch_count: Number(r.active_batch_count) || 0,
            total_available_grams: totalG,
            bulk_flower_grams: Number(r.bulk_flower_grams) || 0,
            bulk_smalls_grams: Number(r.bulk_smalls_grams) || 0,
            bulk_trim_grams: Number(r.bulk_trim_grams) || 0,
            bucked_grams: Number(r.bucked_grams) || 0,
            packaged_units_available: Number(r.packaged_units_available) || 0,
            most_recent_harvest: r.most_recent_harvest,
            forecast_price_per_gram: price != null ? Number(price) : null,
            estimated_value_usd: totalG * (Number(price) || 0),
            oldest_active_harvest: null, // requires subquery, deferred
          };
        });

        setData(mapped);
        deriveKpis(mapped);
        return;
      }

      // RPC path — rows already fully joined
      const mapped: StrainInventoryRow[] = (rows ?? []).map((r: any) => ({
        strain: r.strain,
        strain_id: r.strain_id ?? null,
        abbreviation: r.abbreviation ?? null,
        strain_category: r.strain_category ?? null,
        active_batch_count: Number(r.active_batch_count) || 0,
        total_available_grams: Number(r.total_available_grams) || 0,
        bulk_flower_grams: Number(r.bulk_flower_grams) || 0,
        bulk_smalls_grams: Number(r.bulk_smalls_grams) || 0,
        bulk_trim_grams: Number(r.bulk_trim_grams) || 0,
        bucked_grams: Number(r.bucked_grams) || 0,
        packaged_units_available: Number(r.packaged_units_available) || 0,
        most_recent_harvest: r.most_recent_harvest,
        forecast_price_per_gram: r.forecast_price_per_gram != null ? Number(r.forecast_price_per_gram) : null,
        estimated_value_usd: Number(r.estimated_value_usd) || 0,
        oldest_active_harvest: r.oldest_active_harvest ?? null,
      }));

      setData(mapped);
      deriveKpis(mapped);
    } catch (e: any) {
      setError(e.message || 'Failed to load strain inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  function deriveKpis(rows: StrainInventoryRow[]) {
    setKpis({
      totalWeightGrams: rows.reduce((s, r) => s + r.total_available_grams, 0),
      totalValueUsd: rows.reduce((s, r) => s + r.estimated_value_usd, 0),
      activeStrainCount: rows.length,
      activeBatchCount: rows.reduce((s, r) => s + r.active_batch_count, 0),
      unpricedStrainCount: rows.filter((r) => r.forecast_price_per_gram == null).length,
    });
  }

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, kpis, loading, error, refetch: fetch };
}
