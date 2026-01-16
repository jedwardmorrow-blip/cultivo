import { useState, useEffect, useCallback } from 'react';
import { getInventoryRequirements } from '../services/inventory.service';

/**
 * useInventoryOversight
 *
 * Fetches real-time inventory requirements from the projected_inventory_requirements view.
 * Shows what inventory is needed for active orders with fulfillment details.
 *
 * @returns {Object} requirements - Array of inventory requirement records
 * @returns {boolean} loading - Loading state
 * @returns {Error|null} error - Error state
 * @returns {Function} reload - Manual refresh function
 *
 * @example
 * const { requirements, loading, error, reload } = useInventoryOversight();
 */

interface InventoryRequirement {
  strain: string;
  product_type: string;
  product_category: string;
  product_name: string;
  total_units_needed: number;
  packaged_units_available: number;
  units_still_needed: number;
  bulk_grams_available: number;
  bucked_grams_needed: number;
  order_count: number;
  earliest_delivery_date: string | null;
}

export function useInventoryOversight() {
  const [requirements, setRequirements] = useState<InventoryRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequirements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await getInventoryRequirements();

      setRequirements(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch inventory requirements'));
      console.error('Error fetching inventory requirements:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  return {
    requirements,
    loading,
    error,
    reload: fetchRequirements,
  };
}
