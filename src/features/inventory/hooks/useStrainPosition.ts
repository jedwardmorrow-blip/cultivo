import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type StrainState = 'over_committed' | 'allocated' | 'ready' | 'blocked' | 'empty';

export interface StrainPosition {
  strain: string;
  graded_g: number;
  ungraded_g: number;
  units_available: number;
  cult_g: number;
  b_g: number;
  c_g: number;
  d_g: number;
  package_count: number;
  open_demand_g: number;
  open_orders: number;
  locked_qty: number;
  earliest_delivery: string | null;
  last_updated: string | null;
  quotable_net_g: number;
  total_net_g: number;
  exposed_g: number;
  state: StrainState;
}

export function useStrainPosition() {
  const [positions, setPositions] = useState<StrainPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('v_strain_position').select('*');
      if (error) throw error;

      const mapped: StrainPosition[] = (data ?? []).map((r: any) => ({
        strain: r.strain,
        graded_g: Number(r.graded_g) || 0,
        ungraded_g: Number(r.ungraded_g) || 0,
        units_available: Number(r.units_available) || 0,
        cult_g: Number(r.cult_g) || 0,
        b_g: Number(r.b_g) || 0,
        c_g: Number(r.c_g) || 0,
        d_g: Number(r.d_g) || 0,
        package_count: Number(r.package_count) || 0,
        open_demand_g: Number(r.open_demand_g) || 0,
        open_orders: Number(r.open_orders) || 0,
        locked_qty: Number(r.locked_qty) || 0,
        earliest_delivery: r.earliest_delivery,
        last_updated: r.last_updated,
        quotable_net_g: Number(r.quotable_net_g) || 0,
        total_net_g: Number(r.total_net_g) || 0,
        exposed_g: Number(r.exposed_g) || 0,
        state: r.state as StrainState,
      }));

      setPositions(mapped);
    } catch (err) {
      console.error('[useStrainPosition] Failed:', err);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { positions, loading, refetch: fetch };
}

// Per-strain detail: packages and open order line items
export interface StrainPackage {
  id: string;
  package_id: string | null;
  batch: string | null;
  category: string | null;
  product_name: string | null;
  unit: string;
  available_qty: number;
  reserved_qty: number;
  grade_code: string | null;
  stage: string | null;
  package_date: string | null;
  last_updated: string | null;
}

export interface StrainOrder {
  order_id: string;
  order_number: string | null;
  customer_name: string | null;
  product_name: string;
  quantity: number;
  unit: string | null;
  grams_needed: number;
  delivery_date: string | null;
  status: string;
}

export function useStrainDetail(strain: string | null) {
  const [packages, setPackages] = useState<StrainPackage[]>([]);
  const [orders, setOrders] = useState<StrainOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!strain) {
      setPackages([]);
      setOrders([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [pkgRes, ordRes] = await Promise.all([
          supabase
            .from('inventory_items')
            .select(
              'id, package_id, batch, category, product_name, unit, available_qty, reserved_qty, package_date, last_updated, quality_grades(code), product_stages(name)'
            )
            .eq('strain', strain)
            .eq('status', 'available')
            .gt('available_qty', 0)
            .order('available_qty', { ascending: false }),
          supabase
            .from('order_material_requirements')
            .select('order_id, order_number, strain, product_type, quantity, grams_needed_with_overage, requested_delivery_date, order_status')
            .eq('strain', strain)
            .in('order_status', ['submitted', 'accepted', 'processing', 'ready_for_delivery']),
        ]);

        if (cancelled) return;

        const pkgs: StrainPackage[] = (pkgRes.data ?? []).map((r: any) => ({
          id: r.id,
          package_id: r.package_id,
          batch: r.batch,
          category: r.category,
          product_name: r.product_name,
          unit: r.unit,
          available_qty: Number(r.available_qty) || 0,
          reserved_qty: Number(r.reserved_qty) || 0,
          grade_code: r.quality_grades?.code ?? null,
          stage: r.product_stages?.name ?? null,
          package_date: r.package_date,
          last_updated: r.last_updated,
        }));

        const ords: StrainOrder[] = (ordRes.data ?? []).map((r: any) => ({
          order_id: r.order_id,
          order_number: r.order_number,
          customer_name: null,
          product_name: r.product_type ?? '',
          quantity: Number(r.quantity) || 0,
          unit: null,
          grams_needed: Number(r.grams_needed_with_overage) || 0,
          delivery_date: r.requested_delivery_date,
          status: r.order_status,
        }));

        setPackages(pkgs);
        setOrders(ords);
      } catch (err) {
        console.error('[useStrainDetail] Failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [strain]);

  return { packages, orders, loading };
}
