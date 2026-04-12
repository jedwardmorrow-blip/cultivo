import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface SkuPackage {
  id: string;
  package_id: string;
  batch_id: string;
  batch_code: string;
  on_hand_qty: number;
  reserved_qty: number;
  created_at: string;
}

export interface SkuInfo {
  product_id: string;
  product_name: string;
  sku: string | null;
  product_type: string | null;
  unit_weight_grams: number;
  strain: string;
  price_per_unit: number;
}

export interface SkuDrawerData {
  sku: SkuInfo | null;
  packages: SkuPackage[];
  loading: boolean;
}

/**
 * Fetches product metadata + all packages for a given product_id.
 */
export function useSkuDrawerData(productId: string | null) {
  const [data, setData] = useState<SkuDrawerData>({
    sku: null,
    packages: [],
    loading: false,
  });

  const fetch = useCallback(async () => {
    if (!productId) {
      setData({ sku: null, packages: [], loading: false });
      return;
    }

    setData((prev) => ({ ...prev, loading: true }));

    try {
      const [productRes, packageRes] = await Promise.all([
        supabase
          .from('orderable_packaged_inventory')
          .select('product_id, product_name, sku, product_type, unit_weight_grams, strain, price_per_unit')
          .eq('product_id', productId)
          .maybeSingle(),
        supabase
          .from('internal_packaged_inventory')
          .select('id, package_id, batch_id, batches!inner(batch_code), on_hand_qty, reserved_qty, created_at')
          .eq('product_id', productId)
          .gt('on_hand_qty', 0)
          .order('created_at', { ascending: false }),
      ]);

      const p = productRes.data;
      const sku: SkuInfo | null = p
        ? {
            product_id: p.product_id,
            product_name: p.product_name,
            sku: p.sku,
            product_type: p.product_type,
            unit_weight_grams: Number(p.unit_weight_grams) || 0,
            strain: p.strain,
            price_per_unit: Number(p.price_per_unit) || 0,
          }
        : null;

      const packages: SkuPackage[] = (packageRes.data ?? []).map((r: any) => ({
        id: r.id,
        package_id: r.package_id,
        batch_id: r.batch_id,
        batch_code: r.batches?.batch_code ?? '—',
        on_hand_qty: Number(r.on_hand_qty) || 0,
        reserved_qty: Number(r.reserved_qty) || 0,
        created_at: r.created_at,
      }));

      setData({ sku, packages, loading: false });
    } catch (err) {
      console.error('[useSkuDrawerData] Failed:', err);
      setData({ sku: null, packages: [], loading: false });
    }
  }, [productId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...data, refetch: fetch };
}
