import { useState, useCallback } from 'react';
import { adjustInventoryItem } from '../services/adjustment.service';
import { notificationService } from '@/services/notification.service';
import type { AdjustmentRequest } from '../types/adjustment.types';

/**
 * useAdjustment
 *
 * Handles inventory quantity adjustments.
 * Used for corrections, waste, loss, or other manual adjustments.
 *
 * @returns {Object} Adjustment state and functions
 *
 * @example
 * const { adjusting, applyAdjustment } = useAdjustment();
 */

export function useAdjustment() {
  const [adjusting, setAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyAdjustment = useCallback(async (request: AdjustmentRequest) => {
    try {
      setAdjusting(true);
      setError(null);

      await adjustInventoryItem(request);

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

  const applyBulkAdjustment = useCallback(async (requests: AdjustmentRequest[]) => {
    try {
      setAdjusting(true);
      setError(null);

      for (const request of requests) {
        await adjustInventoryItem(request);
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
