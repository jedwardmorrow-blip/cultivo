import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { StrainSummary, StrainFormatRow, OrderLineItem } from '../types';

export function useProductionQueue() {
  const [strainSummary, setStrainSummary] = useState<StrainSummary[]>([]);
  const [byStrain, setByStrain] = useState<StrainFormatRow[]>([]);
  const [byOrder, setByOrder] = useState<OrderLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [summaryResult, strainResult, orderResult] = await Promise.all([
      supabase.from('v_production_queue_strain_summary').select('*'),
      supabase.from('v_production_queue_by_strain').select('*'),
      supabase.from('v_production_queue_by_order').select('*'),
    ]);

    if (summaryResult.error) {
      console.error('Error fetching strain summary:', summaryResult.error);
      setError(summaryResult.error.message);
    } else {
      setStrainSummary((summaryResult.data || []) as StrainSummary[]);
    }

    if (strainResult.error) {
      console.error('Error fetching by-strain:', strainResult.error);
    } else {
      setByStrain((strainResult.data || []) as StrainFormatRow[]);
    }

    if (orderResult.error) {
      console.error('Error fetching by-order:', orderResult.error);
    } else {
      setByOrder((orderResult.data || []) as OrderLineItem[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();

    // Subscribe to order_items and orders changes to auto-refresh
    const orderItemsSub = supabase
      .channel('production_queue_order_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchAll();
      })
      .subscribe();

    const ordersSub = supabase
      .channel('production_queue_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchAll();
      })
      .subscribe();

    return () => {
      orderItemsSub.unsubscribe();
      ordersSub.unsubscribe();
    };
  }, [fetchAll]);

  // Derived stats
  const stats = {
    totalStrains: strainSummary.length,
    totalOrders: new Set(byOrder.map(r => r.order_id)).size,
    overdueOrders: new Set(byOrder.filter(r => r.urgency === 'overdue').map(r => r.order_id)).size,
    stockAlerts: strainSummary.filter(s => s.stock_status !== 'can_fill' && s.stock_status !== 'ready').length,
  };

  return {
    strainSummary,
    byStrain,
    byOrder,
    loading,
    error,
    stats,
    refresh: fetchAll,
  };
}
