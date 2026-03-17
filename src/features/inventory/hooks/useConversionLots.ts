import { useState, useEffect, useCallback } from 'react';
import { getConversionSummary, getPendingConversions } from '../services/conversions.service';
import { supabase } from '@/lib/supabase';
import { PendingConversionSession, SortableRecord } from '@/types';

/**
 * useConversionLots - Simplified Hybrid Architecture
 *
 * Fetches conversion summary from database view with real-time updates.
 * Query conversion_summary_view which aggregates completed session outputs.
 *
 * @param {string} selectedDate - Optional date to filter
 * @returns {Object} Conversion summaries and state
 */

interface ConversionSummary {
  batch_id: string;
  product_id: string;
  strain_name: string;
  product_name: string;
  total_weight?: number;
  total_units?: number;
  session_count: number;
  session_date: string;
  source_session_ids: string[];
}

export function useConversionLots(selectedDate?: string) {
  const [lots, setLots] = useState<ConversionSummary[]>([]);
  const [filteredLots, setFilteredLots] = useState<ConversionSummary[]>([]);
  const [pendingConversions, setPendingConversions] = useState<PendingConversionSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLots = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      // Fetch from conversion_summary_view
      const data = await getConversionSummary(selectedDate);

      setLots(data);
      setFilteredLots(data);

      // Also fetch pending conversions for finalization workflow
      const pending = await getPendingConversions(selectedDate);
      setPendingConversions(pending);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch conversions'));
      console.error('Error fetching conversions:', err);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [selectedDate]);

  // Initial fetch
  useEffect(() => {
    fetchLots();
  }, [fetchLots]);

  // Real-time subscription to conversion_packages table
  // (when packages are created, we want to refresh the summary)
  useEffect(() => {
    const channel = supabase
      .channel('conversion-packages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversion_packages',
        },
        () => {
          fetchLots(true);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Failed to subscribe to conversion packages updates');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLots]);

  // Apply filters (search and status)
  const applyFilters = useCallback((filters: { search?: string; status?: string[] }) => {
    let filtered = [...lots];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(lot =>
        lot.strain_name?.toLowerCase().includes(searchLower) ||
        lot.batch_name?.toLowerCase().includes(searchLower) ||
        lot.product_name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(lot => filters.status!.includes(lot.status));
    }

    setFilteredLots(filtered);
  }, [lots]);

  // Apply sorting
  const applySort = useCallback((sort: { field: string; direction: 'asc' | 'desc' }) => {
    const sorted = [...filteredLots].sort((a, b) => {
      const aVal = (a as SortableRecord)[sort.field] || '';
      const bVal = (b as SortableRecord)[sort.field] || '';

      if (sort.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredLots(sorted);
  }, [filteredLots]);

  return {
    lots: filteredLots,
    pendingConversions,
    isLoading: loading,
    error: error?.message || null,
    applyFilters,
    applySort,
    refetch: fetchLots,
  };
}
