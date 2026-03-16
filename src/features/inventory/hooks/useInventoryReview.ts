import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { notificationService } from '@/services/notification.service';
import type { InventoryItem } from '../types';

/**
 * useInventoryReview
 *
 * Temporary audit feature hook — provides single-click toggle to mark
 * inventory items as verified/unverified during physical walkthroughs.
 *
 * Uses the set_inventory_review_status RPC which atomically sets
 * review_status, reviewed_by, and reviewed_at.
 *
 * Designed for deprecation once the full monthly audit UI is built.
 *
 * @returns toggleReviewStatus - Optimistic toggle function
 */
export function useInventoryReview() {
  const { user } = useAuth();

  const toggleReviewStatus = useCallback(
    async (
      item: InventoryItem,
      optimisticUpdate: (itemId: string, verified: boolean) => void
    ) => {
      const isCurrentlyVerified = item.review_status === 'verified';
      const newVerified = !isCurrentlyVerified;

      // Optimistic UI update
      optimisticUpdate(item.id, newVerified);

      try {
        const { error } = await supabase.rpc('set_inventory_review_status', {
          p_item_id: item.id,
          p_verified: newVerified,
          p_user_id: user?.id || null,
        });

        if (error) throw error;
      } catch (err) {
        // Revert optimistic update on failure
        optimisticUpdate(item.id, isCurrentlyVerified);
        console.error('Failed to toggle review status:', err);
        notificationService.error('Failed to update verification status');
      }
    },
    [user?.id]
  );

  return { toggleReviewStatus };
}

export type ReviewFilter = 'all' | 'verified' | 'unverified';
