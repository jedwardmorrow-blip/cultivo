import type { OrderableProduct } from '@/types';

// Feature-specific Customer type (simplified for order form)
// Uses subset of fields from canonical Customer type
export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  dispensary_code?: string;
}

export type Product = OrderableProduct;

export interface OrderItem {
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  price_locked?: boolean;
}

export type MobileView = 'details' | 'products' | 'cart' | 'review';

export interface OrderFormState {
  selectedCustomerId: string;
  priority: string;
  requestedDeliveryDate: string;
  deliveryNotes: string;
  internalNotes: string;
  orderItems: OrderItem[];
  dateError: string | null;
}
