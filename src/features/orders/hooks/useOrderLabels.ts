import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/services/notification.service';
import { packageAssignmentService } from '../services/packageAssignment.service';

export interface OrderLabel {
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
}

/**
 * Hook to fetch all labels associated with an order's package assignments
 */
export function useOrderLabels(orderId: string) {
  const [labels, setLabels] = useState<OrderLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const loadLabels = useCallback(async () => {
    if (!orderId || !isMountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const { data: labelsData, error: labelsError } = await packageAssignmentService.getLabelsForOrder(orderId);

      if (labelsError) throw labelsError;

      if (isMountedRef.current) {
        setLabels((labelsData as OrderLabel[]) || []);
      }
    } catch (err) {
      console.error('[useOrderLabels] Error:', err);
      if (isMountedRef.current) {
        setError(err as Error);
        setLabels([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [orderId]);

  useEffect(() => {
    isMountedRef.current = true;
    loadLabels();

    // Subscribe to label changes
    const labelsChannel = supabase
      .channel(`order-labels-${orderId}`)
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
      .channel(`order-assignments-labels-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'package_assignments',
          filter: `order_id=eq.${orderId}`,
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
  }, [orderId, loadLabels]);

  return { labels, loading, error, refetch: loadLabels };
}

/**
 * Hook to mark a label as printed
 */
export function useMarkLabelPrinted() {
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const markAsPrinted = useCallback(async (labelId: string) => {
    setMarking(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('labels')
        .update({ printed_at: new Date().toISOString() })
        .eq('id', labelId);

      if (updateError) throw updateError;

      notificationService.success('Label marked as printed');
    } catch (err) {
      console.error('[useMarkLabelPrinted] Error:', err);
      setError(err as Error);

      const errorMessage = (err as Error).message || 'Failed to mark label as printed';
      notificationService.error(errorMessage);

      throw err;
    } finally {
      setMarking(false);
    }
  }, []);

  return { markAsPrinted, marking, error };
}

/**
 * Hook to void a label
 */
export function useVoidLabel() {
  const [voiding, setVoiding] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const voidLabel = useCallback(async (labelId: string) => {
    setVoiding(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('labels')
        .update({ voided_at: new Date().toISOString() })
        .eq('id', labelId);

      if (updateError) throw updateError;

      notificationService.success('Label voided successfully');
    } catch (err) {
      console.error('[useVoidLabel] Error:', err);
      setError(err as Error);

      const errorMessage = (err as Error).message || 'Failed to void label';
      notificationService.error(errorMessage);

      throw err;
    } finally {
      setVoiding(false);
    }
  }, []);

  return { voidLabel, voiding, error };
}

/**
 * Hook to get label status statistics for an order
 */
export function useOrderLabelStats(orderId: string) {
  const { labels, loading } = useOrderLabels(orderId);

  const stats = {
    total: labels.length,
    printed: labels.filter(l => l.printed_at && !l.voided_at).length,
    voided: labels.filter(l => l.voided_at).length,
    pending: labels.filter(l => !l.printed_at && !l.voided_at).length,
  };

  return { stats, loading };
}
