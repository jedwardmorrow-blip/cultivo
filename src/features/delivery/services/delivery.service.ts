import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';

/**
 * Delivery Service
 *
 * Handles all database operations for delivery schedules, orders, and related functionality.
 */

/**
 * Fetches delivery schedules for a specific date
 *
 * @param selectedDate - Date in ISO 8601 format (YYYY-MM-DD)
 * @returns Promise<{ data: DeliverySchedule[] | null; error: any }>
 * @description Returns schedules with order and customer details joined
 */
export async function getDeliverySchedules(selectedDate: string) {
  try {
    const { data, error } = await supabase
      .from('delivery_schedule')
      .select(`
        *,
        orders!inner(order_number, customers(name, address))
      `)
      .gte('scheduled_date', selectedDate)
      .lte('scheduled_date', selectedDate)
      .order('scheduled_time_window');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load delivery schedules');
    return { data: null, error };
  }
}

/**
 * Updates the status of a delivery schedule
 *
 * @param id - Delivery schedule UUID
 * @param newStatus - New status (scheduled, in_transit, delivered, failed)
 * @returns Promise<{ error: any | null }>
 * @description Auto-sets actual_delivery_time when status is 'delivered'
 */
export async function updateDeliveryStatus(id: string, newStatus: string) {
  try {
    const updates: any = { status: newStatus };

    if (newStatus === 'delivered') {
      updates.actual_delivery_time = new Date().toISOString();
    }

    const { error } = await supabase
      .from('delivery_schedule')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to update delivery status');
    return { error };
  }
}

/**
 * Updates the order status based on delivery status
 *
 * @param orderId - Order UUID
 * @param deliveryStatus - Delivery status (delivered, in_transit, etc.)
 * @returns Promise<{ error: any | null }>
 * @description Maps delivery status to order status (delivered→delivered, in_transit→out_for_delivery)
 */
export async function updateOrderStatusFromDelivery(orderId: string, deliveryStatus: string) {
  try {
    let orderStatus: string;

    if (deliveryStatus === 'delivered') {
      orderStatus = 'delivered';
    } else if (deliveryStatus === 'in_transit') {
      orderStatus = 'out_for_delivery';
    } else {
      return { error: null }; // No order status update needed
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: orderStatus })
      .eq('id', orderId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to update order status from delivery');
    return { error };
  }
}

/**
 * Fetches orders for the distribution calendar
 *
 * @param archived - Include archived orders (default: false)
 * @returns Promise<{ data: Order[] | null; error: any }>
 * @description Returns basic order info for calendar display
 */
export async function getOrdersForCalendar(archived: boolean = false) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_id, requested_delivery_date, total_amount, status, archived')
      .eq('archived', archived);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load orders for calendar');
    return { data: null, error };
  }
}

/**
 * Fetches order item counts for multiple orders
 *
 * @param orderIds - Array of order UUIDs
 * @returns Promise<{ data: OrderItem[] | null; error: any }>
 * @description Returns order_items to calculate counts per order
 */
export async function getOrderItemCounts(orderIds: string[]) {
  try {
    if (orderIds.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('order_items')
      .select('order_id')
      .in('order_id', orderIds);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load order item counts');
    return { data: null, error };
  }
}

/**
 * Fetches customer names for multiple customer IDs
 *
 * @param customerIds - Array of customer UUIDs
 * @returns Promise<{ data: Customer[] | null; error: any }>
 * @description Returns id and name for batch customer lookup
 */
export async function getCustomerNames(customerIds: string[]) {
  try {
    if (customerIds.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .in('id', customerIds);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load customer names');
    return { data: null, error };
  }
}

/**
 * Updates an order's requested delivery date
 */
export async function updateOrderDeliveryDate(orderId: string, newDate: string) {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ requested_delivery_date: newDate })
      .eq('id', orderId)
      .select();

    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to update order delivery date');
    return { error };
  }
}

/**
 * Gets facility coordinates from app settings
 */
export async function getFacilityCoordinates() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['facility_latitude', 'facility_longitude']);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load facility coordinates');
    return { data: null, error };
  }
}

/**
 * Gets all customers with location data for routing
 */
export async function getCustomersWithLocation() {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, address, latitude, longitude')
      .order('name');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load customers with location');
    return { data: null, error };
  }
}

/**
 * Gets routing API key from settings
 */
export async function getRoutingApiKey() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('category', 'routing')
      .eq('setting_key', 'routing_api_key')
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load routing API key');
    return { data: null, error };
  }
}

export interface CalendarOrder {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  requested_delivery_date: string | null;
  total_amount: number;
  item_count: number;
  status: string;
  customer_lat: number | null;
  customer_lon: number | null;
  customer_city: string | null;
  preferred_delivery_day: string | null;
  cached_duration_seconds: number | null;
  cached_distance_meters: number | null;
}

export async function getEnrichedCalendarOrders(archived: boolean = false): Promise<{ data: CalendarOrder[]; error: any }> {
  try {
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, customer_id, requested_delivery_date, total_amount, status, archived')
      .eq('archived', archived)
      .not('status', 'eq', 'cancelled');

    if (ordersError) throw ordersError;
    if (!ordersData || ordersData.length === 0) return { data: [], error: null };

    const customerIds = [...new Set(ordersData.map(o => o.customer_id).filter(Boolean))];
    const orderIds = ordersData.map(o => o.id);

    const [customersResult, itemsResult, routesResult] = await Promise.all([
      customerIds.length > 0
        ? supabase.from('customers').select('id, name, latitude, longitude, city, preferred_delivery_day').in('id', customerIds)
        : { data: [], error: null },
      orderIds.length > 0
        ? supabase.from('order_items').select('order_id').in('order_id', orderIds)
        : { data: [], error: null },
      customerIds.length > 0
        ? supabase.from('delivery_routes').select('destination_customer_id, duration_seconds, distance_meters').in('destination_customer_id', customerIds)
        : { data: [], error: null },
    ]);

    const customerMap = new Map<string, any>();
    (customersResult.data || []).forEach(c => customerMap.set(c.id, c));

    const itemCountMap: Record<string, number> = {};
    (itemsResult.data || []).forEach(item => {
      itemCountMap[item.order_id] = (itemCountMap[item.order_id] || 0) + 1;
    });

    const routeMap = new Map<string, { duration_seconds: number; distance_meters: number }>();
    (routesResult.data || []).forEach(r => {
      if (!routeMap.has(r.destination_customer_id)) {
        routeMap.set(r.destination_customer_id, {
          duration_seconds: Number(r.duration_seconds),
          distance_meters: Number(r.distance_meters),
        });
      }
    });

    const enriched: CalendarOrder[] = ordersData.map(order => {
      const customer = order.customer_id ? customerMap.get(order.customer_id) : null;
      const route = order.customer_id ? routeMap.get(order.customer_id) : null;
      return {
        id: order.id,
        order_number: order.order_number,
        customer_id: order.customer_id,
        customer_name: customer?.name || 'Unknown',
        requested_delivery_date: order.requested_delivery_date,
        total_amount: Number(order.total_amount),
        item_count: itemCountMap[order.id] || 0,
        status: order.status,
        customer_lat: customer?.latitude ? Number(customer.latitude) : null,
        customer_lon: customer?.longitude ? Number(customer.longitude) : null,
        customer_city: customer?.city || null,
        preferred_delivery_day: customer?.preferred_delivery_day || null,
        cached_duration_seconds: route?.duration_seconds ?? null,
        cached_distance_meters: route?.distance_meters ?? null,
      };
    });

    return { data: enriched, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load enriched calendar orders');
    return { data: [], error };
  }
}

export interface CalendarOrderItem {
  id: string;
  product_name: string;
  strain_name: string | null;
  quantity: number;
  pricing_unit: string | null;
  status: string | null;
  is_sample: boolean;
  batch_number: string | null;
  quality_grade_id: string | null;
}

export async function getOrderItemsForCalendar(orderId: string): Promise<{ data: CalendarOrderItem[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        id,
        quantity,
        status,
        is_sample,
        strain,
        products!inner (
          name,
          pricing_unit
        ),
        batch_registry (
          batch_number,
          quality_grade_id
        )
      `)
      .eq('order_id', orderId);

    if (error) throw error;

    const items: CalendarOrderItem[] = (data || []).map((row: any) => {
      const product = row.products;
      return {
        id: row.id,
        product_name: product?.name || 'Unknown',
        strain_name: row.strain || null,
        quantity: Number(row.quantity),
        pricing_unit: product?.pricing_unit || null,
        status: row.status || null,
        is_sample: row.is_sample ?? false,
        batch_number: row.batch_registry?.batch_number || null,
        quality_grade_id: row.batch_registry?.quality_grade_id || null,
      };
    });

    return { data: items, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load order items for calendar');
    return { data: [], error };
  }
}

export async function clearOrderDeliveryDate(orderId: string) {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ requested_delivery_date: null })
      .eq('id', orderId)
      .select();

    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to clear order delivery date');
    return { error };
  }
}

/**
 * Updates customer geocode coordinates
 */
export async function updateCustomerCoordinates(customerId: string, latitude: number, longitude: number) {
  try {
    const { error } = await supabase
      .from('customers')
      .update({ latitude, longitude })
      .eq('id', customerId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to update customer coordinates');
    return { error };
  }
}
