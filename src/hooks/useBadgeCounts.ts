import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { BadgeCounts } from '../shared/components/navigation/types';

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

      setLoading(true);
      try {
        const [
          ordersResult,
          trimResult,
          packagingResult,
          batchesResult,
          inventoryResult,
          conversionsResult,
          auditResult,
        ] = await Promise.all([
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .in('status', ['submitted', 'processing']),
          supabase
            .from('trim_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('session_status', 'in_progress'),
          supabase
            .from('packaging_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('session_status', 'in_progress'),
          supabase
            .from('batch_registry')
            .select('id', { count: 'exact', head: true })
            .neq('lifecycle_state', 'archived'),
          supabase
            .from('inventory_items')
            .select('stage'),
          supabase
            .from('conversion_summary_view')
            .select('session_id', { count: 'exact', head: true }),
          supabase
            .from('inventory_audits')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'in_progress'),
        ]);

        const inventoryItems = inventoryResult.data || [];
        const binnedCount = inventoryItems.filter((item) => item.stage === 'binned').length;
        const buckedCount = inventoryItems.filter((item) => item.stage === 'bucked').length;
        const bulkCount = inventoryItems.filter((item) => item.stage === 'bulk').length;
        const packagedCount = inventoryItems.filter((item) => item.stage === 'packaged').length;

        setCounts({
          orders: ordersResult.count || 0,
          trimSessions: trimResult.count || 0,
          packagingSessions: packagingResult.count || 0,
          batches: batchesResult.count || 0,
          inventoryTotal: inventoryItems.length,
          inventoryBinned: binnedCount,
          inventoryBucked: buckedCount,
          inventoryBulk: bulkCount,
          inventoryPackaged: packagedCount,
          pendingConversions: conversionsResult.count || 0,
          activeAudit: (auditResult.count || 0) > 0,
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
