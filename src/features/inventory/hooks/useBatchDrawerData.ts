import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { BatchDetailRow } from './useBatchDetail';

export interface PackageRow {
  id: string;
  product_type: string;
  unit_size: string;
  units_count: number;
  units_allocated: number;
  units_available: number;
  packaging_session_id: string | null;
  package_date: string | null;
  created_at: string;
}

export interface BatchAllocation {
  id: string;
  order_item_id: string;
  order_number: string;
  allocation_stage: string;
  allocated_weight_grams: number;
  status: string;
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
 * - Batch detail from v_batch_lifecycle (by UUID)
 * - Packages from internal_packaged_inventory (by batch_code TEXT — not UUID)
 * - Allocations from batch_allocations → order_items → orders (by UUID)
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
      // Phase 1: Fetch batch detail (we need batch_code for the packages query)
      const batchRes = await supabase
        .from('v_batch_lifecycle')
        .select('*')
        .eq('batch_id', batchId)
        .maybeSingle();

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

      if (!batch) {
        setData({ batch: null, packages: [], allocations: [], loading: false });
        return;
      }

      // Phase 2: Fetch packages (by batch_code TEXT) and allocations (by batch_id UUID) in parallel
      const [pkgRes, allocRes] = await Promise.all([
        supabase
          .from('internal_packaged_inventory')
          .select('id, batch_id, product_type, unit_size, units_count, units_allocated, units_available, packaging_session_id, package_date, created_at')
          .eq('batch_id', batch.batch_code)
          .order('created_at', { ascending: false }),
        supabase
          .from('batch_allocations')
          .select('id, order_item_id, allocation_stage, allocated_weight_grams, status, fulfilled_at, order_items(order_id, orders(order_number))')
          .eq('batch_id', batchId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (pkgRes.error) {
        console.error('[useBatchDrawerData] packages query failed:', pkgRes.error);
      }
      if (allocRes.error) {
        console.error('[useBatchDrawerData] allocations query failed:', allocRes.error);
      }

      // Map packages
      const packages: PackageRow[] = (pkgRes.data ?? []).map((p: any) => ({
        id: p.id,
        product_type: p.product_type ?? 'unknown',
        unit_size: p.unit_size ?? '—',
        units_count: Number(p.units_count) || 0,
        units_allocated: Number(p.units_allocated) || 0,
        units_available: Number(p.units_available) || 0,
        packaging_session_id: p.packaging_session_id ?? null,
        package_date: p.package_date ?? null,
        created_at: p.created_at,
      }));

      // Map allocations
      const allocations: BatchAllocation[] = (allocRes.data ?? []).map((a: any) => ({
        id: a.id,
        order_item_id: a.order_item_id,
        order_number: a.order_items?.orders?.order_number ?? '—',
        allocation_stage: a.allocation_stage ?? '—',
        allocated_weight_grams: Number(a.allocated_weight_grams) || 0,
        status: a.status ?? 'pending',
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
