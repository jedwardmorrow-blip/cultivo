import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuditLineItem, AuditLineItemInsert, AuditLineItemUpdate } from '@/types';

interface UseAuditLineItemsResult {
  lineItems: AuditLineItem[];
  loading: boolean;
  error: string | null;
  addLineItem: (item: AuditLineItemInsert) => Promise<void>;
  addLineItems: (items: AuditLineItemInsert[]) => Promise<void>;
  updateLineItem: (id: string, changes: AuditLineItemUpdate) => Promise<void>;
  refresh: () => void;
}

/**
 * CRUD hook for inventory_audit_line_items (per-batch reconciliation).
 * DB dependency: CUL-384 (inventory_audit_line_items table + variance trigger).
 */
export function useAuditLineItems(auditId: string | null): UseAuditLineItemsResult {
  const [lineItems, setLineItems] = useState<AuditLineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!auditId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('inventory_audit_line_items')
        .select('*')
        .eq('audit_id', auditId)
        .order('product_name');

      if (fetchError) throw fetchError;
      setLineItems((data ?? []) as AuditLineItem[]);
    } catch (err: any) {
      console.warn('useAuditLineItems: fetch failed (CUL-384 table may not be deployed)', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addLineItem = useCallback(async (item: AuditLineItemInsert) => {
    const { error: insertError } = await supabase
      .from('inventory_audit_line_items')
      .insert(item);
    if (insertError) throw new Error(insertError.message);
    await fetch();
  }, [fetch]);

  const addLineItems = useCallback(async (items: AuditLineItemInsert[]) => {
    if (items.length === 0) return;
    const { error: insertError } = await supabase
      .from('inventory_audit_line_items')
      .insert(items);
    if (insertError) throw new Error(insertError.message);
    await fetch();
  }, [fetch]);

  const updateLineItem = useCallback(async (id: string, changes: AuditLineItemUpdate) => {
    const { error: updateError } = await supabase
      .from('inventory_audit_line_items')
      .update(changes)
      .eq('id', id);
    if (updateError) throw new Error(updateError.message);
    await fetch();
  }, [fetch]);

  return { lineItems, loading, error, addLineItem, addLineItems, updateLineItem, refresh: fetch };
}
