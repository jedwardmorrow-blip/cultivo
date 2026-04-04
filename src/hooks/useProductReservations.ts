import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { OrderableProduct } from '../types';

export interface ProductReservation {
  reserved_qty: number;
  net_available: number;
}

/**
 * Fetches inventory_items.reserved_qty aggregated per product (joined by product_name),
 * returning a map of product_id → { reserved_qty, net_available }.
 *
 * Subscribes to real-time inventory_items changes so the map stays current
 * without a full page reload.
 *
 * net_available = products.available_quantity - total reserved across all packages
 */
export function useProductReservations(products: OrderableProduct[]) {
  const [reservations, setReservations] = useState<Map<string, ProductReservation>>(new Map());
  const [loading, setLoading] = useState(false);

  const buildMap = useCallback(
    (rows: { product_name: string | null; reserved_qty: number }[]) => {
      // Aggregate reserved_qty by product_name
      const reservedByName = new Map<string, number>();
      for (const row of rows) {
        if (!row.product_name) continue;
        const cur = reservedByName.get(row.product_name) ?? 0;
        reservedByName.set(row.product_name, cur + Number(row.reserved_qty));
      }

      const map = new Map<string, ProductReservation>();
      for (const product of products) {
        const totalReserved = reservedByName.get(product.name) ?? 0;
        const available = product.available_quantity ?? 0;
        map.set(product.id, {
          reserved_qty: totalReserved,
          net_available: Math.max(0, available - totalReserved),
        });
      }
      return map;
    },
    [products]
  );

  const fetchReservations = useCallback(async () => {
    if (products.length === 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('product_name, reserved_qty')
        .gt('reserved_qty', 0);

      if (error) {
        console.error('[useProductReservations] fetch error:', error);
        return;
      }

      setReservations(buildMap(data ?? []));
    } finally {
      setLoading(false);
    }
  }, [products, buildMap]);

  // Initial fetch
  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Real-time subscription — refetch on any inventory_items change
  useEffect(() => {
    if (products.length === 0) return;

    const channel = supabase
      .channel('inventory_reservations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items' },
        () => {
          fetchReservations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [products.length, fetchReservations]);

  return { reservations, loading };
}
