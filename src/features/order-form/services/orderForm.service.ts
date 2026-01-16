import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';

/**
 * Order Form Service
 *
 * Handles all database operations for the order form feature including
 * customers, draft orders, and order submission.
 */

/**
 * Fetches all customers ordered by name
 */
export async function getCustomers() {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load customers');
    return { data: null, error };
  }
}

/**
 * Loads the most recent draft order for a given session ID
 */
export async function getDraftOrder(sessionId: string) {
  try {
    const { data, error } = await supabase
      .from('draft_orders')
      .select('*')
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load draft order');
    return { data: null, error };
  }
}

/**
 * Creates a new draft order
 */
export async function createDraftOrder(draftData: {
  customer_id: string | null;
  priority: string;
  requested_delivery_date: string | null;
  delivery_notes: string | null;
  internal_notes: string | null;
  order_items: any[];
  session_id: string;
}) {
  try {
    const { data, error } = await supabase
      .from('draft_orders')
      .insert(draftData)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to create draft order');
    return { data: null, error };
  }
}

/**
 * Updates an existing draft order
 */
export async function updateDraftOrder(
  draftId: string,
  draftData: {
    customer_id: string | null;
    priority: string;
    requested_delivery_date: string | null;
    delivery_notes: string | null;
    internal_notes: string | null;
    order_items: any[];
    session_id: string;
  }
) {
  try {
    const { data, error } = await supabase
      .from('draft_orders')
      .update(draftData)
      .eq('id', draftId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to update draft order');
    return { data: null, error };
  }
}

/**
 * Deletes a draft order
 */
export async function deleteDraftOrder(draftId: string) {
  try {
    const { error } = await supabase
      .from('draft_orders')
      .delete()
      .eq('id', draftId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to delete draft order');
    return { error };
  }
}

/**
 * Creates a new order with items
 * Returns the created order with order_number
 */
export async function createOrder(orderData: {
  customer_id: string;
  priority: string;
  requested_delivery_date: string | null;
  delivery_notes: string | null;
  internal_notes: string | null;
  status: string;
}, orderItems: Array<{
  product_id: string;
  quantity: number;
  unit_price: number;
  notes?: string | null;
  status: string;
}>) {
  try {
    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const itemsToInsert = orderItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      notes: item.notes || null,
      status: item.status,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    return { data: order, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to create order');
    return { data: null, error };
  }
}
