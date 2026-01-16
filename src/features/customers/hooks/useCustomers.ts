import { useDataTable } from '@/shared/hooks';
import { useTableSubscription } from '@/shared/hooks';
import { customersService } from '../services/customers.service';
import type { Customer } from '../types';

export function useCustomers() {
  const {
    data: allCustomers,
    filteredData: customers,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    reload,
    sortBy,
    sortField,
    sortDirection,
  } = useDataTable<Customer>({
    fetchFn: customersService.fetchAll,
    initialSort: { field: 'name', direction: 'asc' },
  });

  useTableSubscription('customers', reload, { debounceMs: 1000 });

  const geocodedCount = allCustomers.filter(c => c.latitude && c.longitude).length;
  const missingGeocodeCount = allCustomers.length - geocodedCount;

  return {
    customers,
    allCustomers,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    reload,
    sortBy,
    sortField,
    sortDirection,
    geocodedCount,
    missingGeocodeCount,
    totalCount: allCustomers.length,
  };
}
