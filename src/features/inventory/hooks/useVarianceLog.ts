import { useState, useEffect, useCallback } from 'react';
import type { VarianceRecord } from '../types/audit.types';
import { getVarianceLogs } from '../services/varianceLog.service';

/**
 * useVarianceLog
 *
 * Fetches and manages inventory variance logs.
 * Shows historical variances from audits and adjustments.
 *
 * @param {Object} filters - Optional filters (inventory_id, date_range, etc.)
 * @returns {Object} Variance records and state
 *
 * @example
 * const { variances, loading, error, refetch } = useVarianceLog({ inventory_id: 'PKG-123' });
 */

interface VarianceFilters {
  inventory_id?: string;
  audit_session_id?: string;
  start_date?: string;
  end_date?: string;
}

export function useVarianceLog(filters?: VarianceFilters) {
  const [variances, setVariances] = useState<VarianceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchVariances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch variances using service
      const data = await getVarianceLogs(filters);

      setVariances(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch variance log'));
      console.error('Error fetching variance log:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchVariances();
  }, [fetchVariances]);

  return {
    variances,
    loading,
    error,
    refetch: fetchVariances,
  };
}
