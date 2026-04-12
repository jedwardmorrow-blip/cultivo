import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { BatchDetailRow } from './useBatchDetail';

export interface PackageRow {
  id: string;
  package_id: string;
  product_id: string;
  product_name: string;
  sku: string | null;
  unit_weight_grams: number;
  on_hand_qty: number;
  reserved_qty: number;
  created_at: string;
}

export interface BatchAllocation {
  id: string;
  order_id: string;
  order_number: string;
  allocated_weight_grams: number;
  fulfilled_at: string | null;
}

export interface BatchDrawerData {
  batch: BatchDetailRow | null;
  packages: PackageRow[];
  allocations: BatchAllocation[];
  loading: boolean;
}

/**
 * Fetches all data needed for the Batch Drawer:
 * - Batch detail from v_batch_lifecycle
 * - Packages from internal_packaged_inventory
 * - Allocations from batch_allocations + orders
 */
export function useBatchDrawerData(batchId: string | null) {
  const [data, setData] = useState<BatchDrawerData>({
    batch: null,
    packages: [],
    allocations: [],
    loading: false,
  });

  const fetch = useCallback(async () => {
    if (!batchId) {
      setData({ batch: null, packages: [], allocations: [], loading: false });
      return;
    }

    setData((prev) => ({ ...prev, loading: true }));

    try {
      // Parallel fetch: batch detail, packages, allocations
      const [batchRes, pkgRes, allocRes] = await Promise.all([
        supabase
          .from('v_batch_lifecycle')
          .select('*')
          .eq('batch_id', batchId)
          .maybeSingle(),
        supabase
          .from('internal_packaged_inventory')
          .select('id, package_id, product_id, on_hand_qty, reserved_qty, created_at, products(name, sku, unit_weight_grams)')
          .eq('batch_id', batchId)
          .gt('on_hand_qty', 0)
          .order('created_at', { ascending: false }),
        supabase
          .from('batch_allocations')
          .select('id, order_id, allocated_weight_grams, fulfilled_at, orders(order_number)')
          .eq('batch_id', batchId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      // Map batch
      const r = batchRes.data;
      const batch: BatchDetailRow | null = r
        ? {
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
          }
        : null;

      // Map packages
      const packages: PackageRow[] = (pkgRes.data ?? []).map((p: any) => ({
        id: p.id,
        package_id: p.package_id,
        product_id: p.product_id,
        product_name: p.products?.name ?? 'Unknown',
        sku: p.products?.sku ?? null,
        unit_weight_grams: Number(p.products?.unit_weight_grams) || 0,
        on_hand_qty: Number(p.on_hand_qty) || 0,
        reserved_qty: Number(p.reserved_qty) || 0,
        created_at: p.created_at,
      }));

      // Map allocations
      const allocations: BatchAllocation[] = (allocRes.data ?? []).map((a: any) => ({
        id: a.id,
        order_id: a.order_id,
        order_number: a.orders?.order_number ?? '—',
        allocated_weight_grams: Number(a.allocated_weight_grams) || 0,
        fulfilled_at: a.fulfilled_at,
      }));

      setData({ batch, packages, allocations, loading: false });
    } catch (err) {
      console.error('[useBatchDrawerData] Failed:', err);
      setData({ batch: null, packages: [], allocations: [], loading: false });
    }
  }, [batchId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...data, refetch: fetch };
}
