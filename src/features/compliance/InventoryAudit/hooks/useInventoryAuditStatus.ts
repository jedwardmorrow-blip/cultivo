import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { InventoryAuditStatusView } from '@/types';

interface UseInventoryAuditStatusResult {
  status: InventoryAuditStatusView | null;
  loading: boolean;
}

/**
 * Reads the inventory_audit_status view to get badge display data.
 * DB dependency: CUL-359 (view must be deployed).
 */
export function useInventoryAuditStatus(): UseInventoryAuditStatusResult {
  const [status, setStatus] = useState<InventoryAuditStatusView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('inventory_audit_status')
          .select('days_since_last_audit, last_audit_completed_at, audit_clock_status')
          .single();

        if (!mounted) return;
        if (error) {
          console.warn('[useInventoryAuditStatus] view not available yet:', error.message);
          setStatus(null);
          return;
        }

        setStatus(data as InventoryAuditStatusView);
      } catch (err) {
        if (!mounted) return;
        console.error('[useInventoryAuditStatus] error:', err);
        setStatus(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  return { status, loading };
}
