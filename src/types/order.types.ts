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
  is_sample: boolean;
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

export type PackageAssignmentStatus = 'reserved' | 'fulfilled' | 'released';

export interface WorkflowSummary {
  order_id: string;
  total_quantity: number;
  assigned_quantity: number;
  fulfilled_quantity: number;
  remaining_quantity: number;
}

export interface StatusGroup {
  status: string;
  statusName: string;
  orders: Order[];
  count: number;
}

export interface MonthGroup {
  month: string;
  monthName: string;
  statusGroups: StatusGroup[];
  totalOrders: number;
  totalAmount: number;
}
