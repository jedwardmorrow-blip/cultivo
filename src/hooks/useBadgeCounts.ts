import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { BadgeCounts } from '../shared/components/navigation/types';

const CACHE_DURATION = 30000;

export function useBadgeCounts(isOpen: boolean) {
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
  const [lastFetch, setLastFetch] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const now = Date.now();
    if (now - lastFetch < CACHE_DURATION) return;

    const fetchCounts = async () => {
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
        setLastFetch(now);
      } catch (error) {
        console.error('Failed to fetch badge counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, [isOpen, lastFetch]);

  return { counts, loading };
}
