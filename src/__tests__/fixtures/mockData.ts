import type { Customer } from '@/types/customer.types';
import type { Product } from '@/types/product.types';
import type { Order, OrderItem } from '@/types/order.types';

export const createMockCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: 'cust-123',
  name: 'Test Dispensary',
  license_number: 'LIC-12345',
  license_name: 'Test License',
  address: '123 Main St',
  city: 'Phoenix',
  state: 'AZ',
  postal_code: '85001',
  delivery_address: null,
  delivery_city: null,
  delivery_state: null,
  delivery_postal_code: null,
  account_credit_balance: null,
  geocoding_error: null,
  formatted_address: null,
  contact_name: 'John Doe',
  phone: '555-0100',
  email: 'john@testdispensary.com',
  ato_number: 'ATO-123',
  dispensary_code: 'TD',
  latitude: 33.4484,
  longitude: -112.0740,
  geocoded_at: new Date().toISOString(),
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-123',
  name: 'Bulk - Test Strain - Flower',
  sku: 'BULK-TEST-FLR',
  category: 'Flower - Bulk',
  price_per_unit: 1200.00,
  bulk_pricing: null,
  strain: 'Test Strain',
  type: 'Flower',
  stage_id: null,
  type_id: null,
  strain_id: null,
  unit: 'lb',
  available_quantity: 100,
  gross_weight: null,
  net_weight: null,
  trim_time_minutes: null,
  packaging_time_minutes: null,
  generated_at: null,
  generation_batch_id: null,
  is_active: true,
  is_archived: false,
  notes: 'Test product description',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockOrderItem = (overrides: Partial<OrderItem> = {}): OrderItem => ({
  id: 'item-123',
  order_id: 'order-123',
  product_id: 'prod-123',
  quantity: 2,
  unit_price: 1200.00,
  total_price: 2400.00,
  subtotal: 2400.00,
  notes: null,
  price_locked: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-123',
  order_number: 'TD-2025-001',
  customer_id: 'cust-123',
  order_date: new Date().toISOString(),
  scheduled_delivery_date: new Date(Date.now() + 86400000).toISOString(),
  status: 'pending',
  priority: 'normal',
  order_source: 'internal',
  requested_delivery_date: null,
  delivery_notes: null,
  internal_notes: 'Test order notes',
  created_by: null,
  total_amount: 2400.00,
  is_archived: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockBatch = (overrides: any = {}) => ({
  id: 'batch-123',
  batch_number: 'BATCH-2025-001',
  strain_id: 'strain-123',
  harvest_date: new Date().toISOString(),
  current_stage: 'bulk',
  total_weight: 100,
  available_weight: 80,
  reserved_weight: 20,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockInventoryItem = (overrides: any = {}) => ({
  id: 'inv-123',
  package_id: 'PKG-2025-001',
  batch_id: 'batch-123',
  product_stage_id: null,
  parent_item_id: null,
  product_name: 'Bulk - Test Strain - Flower',
  strain: 'Test Strain',
  batch_number: 'BATCH-2025-001',
  on_hand_qty: 1000,
  reserved_qty: 0,
  unit: 'g',
  package_date: null,
  created_at: new Date().toISOString(),
  last_updated: new Date().toISOString(),
  ...overrides,
});

export const createMockUser = (overrides: any = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  role: 'admin',
  full_name: 'Test User',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const mockCustomers: Customer[] = [
  createMockCustomer({ id: 'cust-1', name: 'Dispensary One', dispensary_code: 'D1' }),
  createMockCustomer({ id: 'cust-2', name: 'Dispensary Two', dispensary_code: 'D2' }),
  createMockCustomer({ id: 'cust-3', name: 'Dispensary Three', dispensary_code: 'D3' }),
];

export const mockProducts: Product[] = [
  createMockProduct({ id: 'prod-1', name: 'Bulk - Blue Pave - Flower', sku: 'BULK-BP-FLR' }),
  createMockProduct({ id: 'prod-2', name: 'Bulk - Lemondary - Smalls', sku: 'BULK-LM-SML', category: 'Flower - Bulk' }),
  createMockProduct({ id: 'prod-3', name: 'Packaged - Z Marker - 3.5g Flower', sku: 'PKG-ZM-3.5' }),
];
