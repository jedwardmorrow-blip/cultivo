import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CoaStatus } from './useCoaBatches';

/**
 * Valid COA status transitions.
 * curing → pending_sampling → testing_in_progress → coa_received → available
 *                                                  └→ coa_failed
 */
const TRANSITIONS: Record<string, CoaStatus[]> = {
  curing: ['pending_sampling'],
  pending_sampling: ['testing_in_progress'],
  testing_in_progress: ['coa_received', 'coa_failed'],
  coa_received: ['available'],
  coa_failed: ['testing_in_progress'], // resubmit
};

const TRANSITION_LABELS: Record<string, string> = {
  pending_sampling: 'Mark Ready to Sample',
  testing_in_progress: 'Submit for Testing',
  coa_received: 'Results Received',
  coa_failed: 'Mark Failed',
  available: 'Clear for Sale',
};

export function getNextStatuses(current: CoaStatus): CoaStatus[] {
  return TRANSITIONS[current] ?? [];
}

export function getTransitionLabel(target: CoaStatus): string {
  return TRANSITION_LABELS[target] ?? target;
}

/**
 * Hook to advance a batch's COA status.
 * Updates batch_registry.coa_status and relevant timestamp columns.
 */
export function useCoaAdvance() {
  const [advancing, setAdvancing] = useState(false);

  const advance = useCallback(async (batchId: string, targetStatus: CoaStatus) => {
    setAdvancing(true);
    try {
      const updates: Record<string, any> = { coa_status: targetStatus };

      // Set relevant timestamps on transitions
      if (targetStatus === 'testing_in_progress') {
        updates.testing_submitted_at = new Date().toISOString();
      }
      if (targetStatus === 'pending_sampling') {
        updates.cure_expected_complete_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('batch_registry')
        .update(updates)
        .eq('id', batchId);

      if (error) {
        console.error('[useCoaAdvance] update failed:', error);
        throw error;
      }

      return true;
    } catch (err) {
      console.error('[useCoaAdvance] Failed:', err);
      return false;
    } finally {
      setAdvancing(false);
    }
  }, []);

  return { advance, advancing };
}
