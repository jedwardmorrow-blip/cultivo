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
