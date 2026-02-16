import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { packageAssignmentService } from '../services/packageAssignment.service';

export interface OrderItemLabel {
  id: string;
  label_number: string;
  package_id: string;
  product_name: string;
  strain: string | null;
  batch_id: string | null;
  batch_number: string | null;
  net_weight_grams: number;
  thc_percentage: number | null;
  cbd_percentage: number | null;
  qr_code_data: string;
  printed_at: string | null;
  voided_at: string | null;
  created_at: string;
  last_printed_at: string | null;
  print_count: number | null;
  dominance_type: string | null;
}

export interface OrderItemLabelStats {
  total: number;
  printed: number;
  pending: number;
  voided: number;
}

/**
 * Hook to fetch all labels associated with a specific order item
 */
export function useOrderItemLabels(orderItemId: string) {
  const [labels, setLabels] = useState<OrderItemLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const loadLabels = useCallback(async () => {
    if (!orderItemId || !isMountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const { data: labelsData, error: labelsError } = await packageAssignmentService.getLabelsByOrderItem(orderItemId);

      if (labelsError) throw labelsError;

      if (isMountedRef.current) {
        setLabels((labelsData as OrderItemLabel[]) || []);
      }
    } catch (err) {
      console.error('[useOrderItemLabels] Error:', err);
      if (isMountedRef.current) {
        setError(err as Error);
        setLabels([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [orderItemId]);

  useEffect(() => {
    isMountedRef.current = true;
    loadLabels();

    // Subscribe to label changes
    const labelsChannel = supabase
      .channel(`order-item-labels-${orderItemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'labels',
        },
        () => {
          if (isMountedRef.current) {
            loadLabels();
          }
        }
      )
      .subscribe();

    // Also subscribe to package_assignments changes (new labels assigned)
    const assignmentsChannel = supabase
      .channel(`order-item-assignments-labels-${orderItemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'package_assignments',
          filter: `order_item_id=eq.${orderItemId}`,
        },
        () => {
          if (isMountedRef.current) {
            loadLabels();
          }
        }
      )
      .subscribe();

    return () => {
      isMountedRef.current = false;
      labelsChannel.unsubscribe();
      assignmentsChannel.unsubscribe();
    };
  }, [orderItemId, loadLabels]);

  // Calculate stats
  const stats: OrderItemLabelStats = {
    total: labels.length,
    printed: labels.filter(l => l.printed_at && !l.voided_at).length,
    pending: labels.filter(l => !l.printed_at && !l.voided_at).length,
    voided: labels.filter(l => l.voided_at).length,
  };

  return { labels, stats, loading, error, refetch: loadLabels };
}
