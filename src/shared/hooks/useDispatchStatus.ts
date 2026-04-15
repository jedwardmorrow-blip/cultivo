import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * Tracks which inventory items currently have an ACTIVE dispatch
 * (status = 'pending' | 'in_progress') in production_dispatch_items.
 *
 * Auto-refreshes via Supabase realtime so the "In Queue" badge stays accurate
 * when items are cancelled or completed on another screen (e.g. a user dispatches
 * from InventoryDrawer, then cancels from ProductionHub — the drawer's badge
 * updates without requiring a close/reopen).
 *
 * Requires: `supabase_realtime` publication must include `production_dispatch_items`.
 *
 * Usage:
 *   const { dispatchedIds, refetch, markDispatched } = useDispatchStatus(ids);
 *   const isQueued = dispatchedIds.has(pkg.id);
 */
export function useDispatchStatus(inventoryItemIds: string[]) {
  const [dispatchedIds, setDispatchedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Stable string key so array-reference changes don't churn effects
  const idsKey = inventoryItemIds.slice().sort().join(',');

  // Latest ids in a ref so refetch() always sees the freshest list without
  // being invalidated as a dep
  const idsRef = useRef<string[]>(inventoryItemIds);
  idsRef.current = inventoryItemIds;

  const refetch = useCallback(async () => {
    const ids = idsRef.current;
    if (ids.length === 0) {
      setDispatchedIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('production_dispatch_items')
        .select('inventory_item_id')
        .in('inventory_item_id', ids)
        .in('status', ['pending', 'in_progress']);

      if (error) {
        console.error('[useDispatchStatus] refetch failed:', error);
        return;
      }

      setDispatchedIds(
        new Set(
          (data ?? [])
            .map((d) => d.inventory_item_id as string | null)
            .filter((id): id is string => !!id)
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + refetch when the watched set changes
  useEffect(() => {
    refetch();
  }, [idsKey, refetch]);

  // Realtime: refetch on any change to production_dispatch_items.
  // We subscribe unfiltered (dispatch volume is low) and re-fetch scoped to
  // our watched ids. This avoids brittle filter-length issues and missed
  // events when filter conditions change.
  useEffect(() => {
    if (inventoryItemIds.length === 0) return;

    const channel = supabase
      .channel(`pdi-status-${idsKey.slice(0, 40) || 'empty'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'production_dispatch_items',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [idsKey, refetch, inventoryItemIds.length]);

  /** Optimistically mark an item as queued (e.g. right after a successful insert) */
  const markDispatched = useCallback((id: string) => {
    setDispatchedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  /** Optimistically mark an item as no longer queued (e.g. right after cancel) */
  const markCleared = useCallback((id: string) => {
    setDispatchedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return {
    dispatchedIds,
    loading,
    refetch,
    markDispatched,
    markCleared,
  };
}
