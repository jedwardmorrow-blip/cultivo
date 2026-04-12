import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ShipReadySku {
  product_id: string;
  product_name: string;
  sku: string | null;
  product_type: string | null;
  unit_weight_grams: number;
  strain: string;
  strain_code: string | null;
  price_per_unit: number;
  units_available: number;
  total_grams_available: number;
}

/**
 * Fetches orderable packaged inventory — SKUs with available units ready to ship.
 */
export function useReadyToShip() {
  const [skus, setSkus] = useState<ShipReadySku[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orderable_packaged_inventory')
        .select('*')
        .eq('is_active', true)
        .gt('units_available', 0)
        .order('strain', { ascending: true });

      if (error) {
        console.error('[useReadyToShip] query failed:', error);
        throw error;
      }

      const mapped: ShipReadySku[] = (data ?? []).map((r: any) => ({
        product_id: r.product_id,
        product_name: r.product_name,
        sku: r.sku,
        product_type: r.product_type,
        unit_weight_grams: Number(r.unit_weight_grams) || 0,
        strain: r.strain,
        strain_code: r.strain_code,
        price_per_unit: Number(r.price_per_unit) || 0,
        units_available: Number(r.units_available) || 0,
        total_grams_available: Number(r.total_grams_available) || 0,
      }));

      setSkus(mapped);
    } catch (err) {
      console.error('[useReadyToShip] Failed:', err);
      setSkus([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { skus, loading, refetch: fetch };
}
