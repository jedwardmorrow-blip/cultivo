import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/services/notification.service';

/**
 * Leo availability alert — subscribes to realtime changes on batch_registry
 * and fires a notification whenever a batch transitions to `coa_received`.
 *
 * Mount once at the app root (or in a layout component) to keep Leo informed.
 */
export function useBatchCOAAvailabilityAlert() {
  // Track batch numbers we have already alerted on to avoid duplicate toasts
  // within a single session (e.g. if the payload arrives twice).
  const alerted = useRef(new Set<string>());

  useEffect(() => {
    const channel = supabase
      .channel('batch-coa-availability')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'batch_registry',
          filter: 'coa_status=eq.coa_received',
        },
        (payload) => {
          const batch = payload.new as { batch_number?: string; id?: string };
          const key = batch.id ?? batch.batch_number ?? 'unknown';
          if (alerted.current.has(key)) return;
          alerted.current.add(key);

          const batchNumber = batch.batch_number ?? 'Unknown batch';
          notificationService.success(
            `${batchNumber} COA received — batch available for distribution review`,
            'COA Available',
            8000,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
