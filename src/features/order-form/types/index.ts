import type { OrderableProduct } from '@/types';

export interface OrderFormCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  dispensary_code?: string;
}

export type OrderFormProduct = OrderableProduct;

export interface OrderFormItem {
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
  orderItems: OrderFormItem[];
  dateError: string | null;
}
