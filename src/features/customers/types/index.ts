// Re-export from canonical location (Phase 1: Type Consolidation)
export type {
  Customer,
  CustomerInsert as CustomerInput,
  CustomerUpdate
} from '@/types/customer.types';

export interface CustomerFilters {
  searchTerm?: string;
  hasGeocode?: boolean;
  hasLicense?: boolean;
}
