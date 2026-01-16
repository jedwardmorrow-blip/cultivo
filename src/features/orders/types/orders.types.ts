import type { Database } from '@/lib/database/database.types';

// Re-export Order types from canonical location (Phase 1: Type Consolidation)
export type { Order, OrderInsert, OrderUpdate, OrderItem } from '@/types/order.types';

// Feature-specific OrderItem extension for orders feature
// Extends canonical OrderItem with additional display fields
export interface OrderItemExtended {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_type: string;
  strain: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string | null;
  status: string;
  pricing_unit?: string;
  product_category?: string;
  batch_id?: string | null;
}

// Feature-specific Product type for orders feature
// Simplified product view for order management
export interface OrderProduct {
  id: string;
  name: string;
  type: string;
  strain: string;
  price_per_unit: number;
  pricing_unit: string;
  product_category: string;
  allows_fractional_quantity: boolean;
}

export interface WorkflowSummary {
  order_id: string;
  total_quantity: number;
  allocated_quantity: number;
  trimming_quantity: number;
  packaging_quantity: number;
  ready_quantity: number;
  unallocated_quantity: number;
}

export interface OrderDetailsCache {
  items: OrderItem[];
  workflowSummary: WorkflowSummary | null;
  loadedAt: number;
}

export interface MonthGroup {
  month: string;
  monthName: string;
  statusGroups: StatusGroup[];
  totalOrders: number;
  totalAmount: number;
}

export interface StatusGroup {
  status: string;
  statusName: string;
  orders: Order[];
  count: number;
}

export type OrderStatus =
  | 'submitted'
  | 'accepted'
  | 'processing'
  | 'ready_for_delivery'
  | 'delivered'
  | 'cancelled';

export type OrderItemStatus =
  | 'trimming'
  | 'packaging'
  | 'ready'
  | 'delivered';

export type OrderSource =
  | 'manual'
  | 'dutchie'
  | 'import';

export interface OrderFilters {
  searchTerm: string;
  status: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface OrderExpansionState {
  expandedMonths: Set<string>;
  expandedStatuses: Set<string>;
  expandedOrders: Set<string>;
}
