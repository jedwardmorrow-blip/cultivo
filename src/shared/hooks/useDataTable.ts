import { useState, useEffect, useCallback } from 'react';
import type { SearchableRecord } from '@/types';

interface UseDataTableOptions<T> {
  fetchFn: () => Promise<T[]>;
  initialSort?: { field: keyof T; direction: 'asc' | 'desc' };
}

export function useDataTable<T>({ fetchFn, initialSort }: UseDataTableOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [filteredData, setFilteredData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof T | undefined>(initialSort?.field);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSort?.direction || 'asc');

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
      setFilteredData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    let result = [...data];

    if (searchTerm) {
      result = result.filter((item) =>
        Object.values(item as SearchableRecord).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (sortField) {
      result.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        const modifier = sortDirection === 'asc' ? 1 : -1;

        if (aVal < bVal) return -1 * modifier;
        if (aVal > bVal) return 1 * modifier;
        return 0;
      });
    }

    setFilteredData(result);
  }, [data, searchTerm, sortField, sortDirection]);

  const sortBy = useCallback((field: keyof T) => {
    setSortDirection((prev) =>
      sortField === field && prev === 'asc' ? 'desc' : 'asc'
    );
    setSortField(field);
  }, [sortField]);

  return {
    data,
    filteredData,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    reload,
    sortBy,
    sortField,
    sortDirection,
  };
}
