import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * useConversionLock
 *
 * Prevents concurrent conversions of the same inventory.
 * Uses a lock mechanism to ensure data integrity during conversions.
 *
 * @param {string|null} inventoryId - ID of inventory item to lock
 * @returns {Object} Lock state and functions
 *
 * @example
 * const { isLocked, lockError, acquireLock, releaseLock } = useConversionLock(inventoryId);
 */

export function useConversionLock(inventoryId: string | null) {
  const [isLocked, setIsLocked] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [lockId, setLockId] = useState<string | null>(null);

  const acquireLock = useCallback(async () => {
    if (!inventoryId) {
      setLockError('No inventory ID provided');
      return false;
    }

    try {
      setLockError(null);

      // Check if there's already an active lock
      const { data: existingLock, error: checkError } = await supabase
        .from('pending_conversions')
        .select('*')
        .eq('source_inventory_id', inventoryId)
        .eq('status', 'pending')
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingLock) {
        setLockError('This inventory is already being converted');
        return false;
      }

      // Create lock by inserting pending conversion
      const { data: lock, error: lockError } = await supabase
        .from('pending_conversions')
        .insert({
          source_inventory_id: inventoryId,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (lockError) throw lockError;

      setLockId(lock.id);
      setIsLocked(true);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to acquire lock';
      setLockError(errorMessage);
      console.error('Error acquiring conversion lock:', err);
      return false;
    }
  }, [inventoryId]);

  const releaseLock = useCallback(async () => {
    if (!lockId) return;

    try {
      // Remove lock by updating status or deleting
      await supabase
        .from('pending_conversions')
        .update({ status: 'completed' })
        .eq('id', lockId);

      setLockId(null);
      setIsLocked(false);
    } catch (err) {
      console.error('Error releasing conversion lock:', err);
    }
  }, [lockId]);

  // Cleanup lock on unmount
  useEffect(() => {
    return () => {
      if (lockId) {
        supabase
          .from('pending_conversions')
          .update({ status: 'cancelled' })
          .eq('id', lockId)
          .then(() => {
          });
      }
    };
  }, [lockId]);

  return {
    isLocked,
    lockError,
    acquireLock,
    releaseLock,
  };
}
