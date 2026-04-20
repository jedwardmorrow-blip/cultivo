import { useState, useEffect, useCallback } from 'react';
import { getAuditHistory } from '../services/audit.service';
import type { InventoryAudit, AuditHistoryFilters } from '../types/audit.types';

/**
 * useAuditHistory
 *
 * Fetches historical audit records with optional filtering.
 * Used for browsing completed and cancelled audits.
 *
 * @param {AuditHistoryFilters} filters - Optional filters for audits
 * @returns {Object} Audit history and state
 *
 * @example
 * const { audits, loading, error, refetch } = useAuditHistory({ status: ['completed'] });
 */

export function useAuditHistory(filters?: AuditHistoryFilters) {
  const [audits, setAudits] = useState<InventoryAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAudits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getAuditHistory(filters || {});
      setAudits(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch audit history'));
      console.error('Error fetching audit history:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  return {
    audits,
    loading,
    error,
    refetch: fetchAudits,
  };
}
