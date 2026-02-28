import { useState, useCallback } from 'react';
import { adjustInventoryItem } from '../services/adjustment.service';
import { notificationService } from '@/services/notification.service';
import { supabase } from '@/lib/supabase';
import type { QuickAdjustmentRequest } from '../types/adjustment.types';

export function useAdjustment() {
  const [adjusting, setAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyAdjustment = useCallback(async (request: QuickAdjustmentRequest) => {
    try {
      setAdjusting(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '';

      const result = await adjustInventoryItem(request, userId);
      if (!result.success) {
        throw new Error(result.error || 'Adjustment failed');
      }

      notificationService.success('Inventory adjustment applied successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply adjustment';
      setError(errorMessage);
      notificationService.error(errorMessage);
      throw err;
    } finally {
      setAdjusting(false);
    }
  }, []);

  const applyBulkAdjustment = useCallback(async (requests: QuickAdjustmentRequest[]) => {
    try {
      setAdjusting(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '';

      for (const request of requests) {
        await adjustInventoryItem(request, userId);
      }

      notificationService.success(`Successfully applied ${requests.length} adjustments`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply bulk adjustments';
      setError(errorMessage);
      notificationService.error(errorMessage);
      throw err;
    } finally {
      setAdjusting(false);
    }
  }, []);

  return {
    adjusting,
    error,
    applyAdjustment,
    applyBulkAdjustment,
  };
}
