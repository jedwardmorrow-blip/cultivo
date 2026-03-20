import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { BadgeCounts } from '../shared/components/navigation/types';
import { ensureValidSession } from '../lib/sessionGuard';

const CACHE_DURATION = 30000;

export function useBadgeCounts(enabled: boolean = true) {
  const [counts, setCounts] = useState<BadgeCounts>({
    orders: 0,
    trimSessions: 0,
    packagingSessions: 0,
    batches: 0,
    inventoryTotal: 0,
    inventoryBinned: 0,
    inventoryBucked: 0,
    inventoryBulk: 0,
    inventoryPackaged: 0,
    pendingConversions: 0,
    activeAudit: false,
  });
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const fetchCounts = async () => {
      const now = Date.now();
      if (now - lastFetchRef.current < CACHE_DURATION) return;

      const sessionValid = await ensureValidSession();
      if (!sessionValid) return;

      setLoading(true);
      try {
        // Single query via server-side view — replaces 7 parallel queries
        // (one of which downloaded ALL inventory_items client-side)
        const { data, error } = await supabase
          .from('v_badge_counts')
          .select('*')
          .single();

        if (error) throw error;
        if (!data) return;

        setCounts({
          orders: data.orders ?? 0,
          trimSessions: data.trim_sessions ?? 0,
          packagingSessions: data.packaging_sessions ?? 0,
          batches: data.batches ?? 0,
          inventoryTotal: data.inventory_total ?? 0,
          inventoryBinned: data.inventory_binned ?? 0,
          inventoryBucked: data.inventory_bucked ?? 0,
          inventoryBulk: data.inventory_bulk ?? 0,
          inventoryPackaged: data.inventory_packaged ?? 0,
          pendingConversions: data.pending_conversions ?? 0,
          activeAudit: data.active_audit ?? false,
        });
        lastFetchRef.current = now;
      } catch (error) {
        console.error('Failed to fetch badge counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();

    const interval = setInterval(fetchCounts, CACHE_DURATION);
    return () => clearInterval(interval);
  }, [enabled]);

  const badgeMap = useMemo(() => {
    const map: Record<string, { badge?: number | string; badgeColor?: string }> = {};

    if (counts.orders > 0) map['orders'] = { badge: counts.orders, badgeColor: 'info' };
    if (counts.trimSessions > 0) map['trim-sessions'] = { badge: counts.trimSessions, badgeColor: 'success' };
    if (counts.packagingSessions > 0) map['packaging-sessions'] = { badge: counts.packagingSessions, badgeColor: 'success' };
    if (counts.batches > 0) map['batches'] = { badge: counts.batches, badgeColor: 'default' };
    if (counts.inventoryTotal > 0) map['inventory-all'] = { badge: counts.inventoryTotal, badgeColor: 'info' };
    if (counts.inventoryBinned > 0) map['inventory-binned'] = { badge: counts.inventoryBinned, badgeColor: 'default' };
    if (counts.inventoryBucked > 0) map['inventory-bucked'] = { badge: counts.inventoryBucked, badgeColor: 'default' };
    if (counts.inventoryBulk > 0) map['inventory-bulk'] = { badge: counts.inventoryBulk, badgeColor: 'default' };
    if (counts.inventoryPackaged > 0) map['inventory-packaged'] = { badge: counts.inventoryPackaged, badgeColor: 'success' };
    if (counts.pendingConversions > 0) map['inventory-conversions'] = { badge: counts.pendingConversions, badgeColor: 'warning' };
    if (counts.activeAudit) map['inventory-audits'] = { badge: 'Active', badgeColor: 'error' };

    return map;
  }, [counts]);

  return { counts, badgeMap, loading };
}
