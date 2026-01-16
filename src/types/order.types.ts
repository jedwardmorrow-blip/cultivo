import type { Database } from '../lib/database/database.types';

export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type OrderUpdate = Database['public']['Tables']['orders']['Update'];

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  subtotal: number; // Added for test compatibility
  notes: string | null;
  price_locked: boolean;
  pricing_unit?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface FulfillmentChecklist {
  id: string;
  order_id: string;
  trim_complete: boolean;
  packaging_complete: boolean;
  labeling_complete: boolean;
  coa_attached: boolean;
  invoice_generated: boolean;
  ready_for_delivery: boolean;
  created_at: string;
  updated_at: string;
}

export interface Allocation {
  id: string;
  order_item_id: string;
  inventory_type: string;
  inventory_id: string;
  allocated_quantity: number;
  allocation_status: string;
  workflow_stage: string;
  active_trim_session_id: string | null;
  active_packaging_session_id: string | null;
  batch?: string | null;
  package_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowSummary {
  total_quantity: number;
  allocated_quantity: number;
  trimming_quantity: number;
  packaging_quantity: number;
  ready_quantity: number;
  unallocated_quantity: number;
}

export interface StatusGroup {
  status: string;
  orders: Order[];
  count: number;
}

export interface MonthGroup {
  month: string;
  statusGroups: StatusGroup[];
  totalOrders: number;
}
