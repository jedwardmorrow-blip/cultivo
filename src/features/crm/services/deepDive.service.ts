import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';
import type { AccountHealthScore, CustomerProductMix } from '../types';

export async function getAccountHealthScores() {
  try {
    const { data, error } = await supabase
      .from('crm_account_scores')
      .select('*')
      .order('health_score', { ascending: false });

    if (error) throw error;
    return { data: data as AccountHealthScore[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load account health scores');
    return { data: null, error };
  }
}

export async function getAccountHealthById(customerId: string) {
  try {
    const { data, error } = await supabase
      .from('crm_account_scores')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (error) throw error;
    return { data: data as AccountHealthScore | null, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load account health score');
    return { data: null, error };
  }
}

export async function getCustomerProductMix(customerId: string) {
  try {
    const { data, error } = await supabase
      .from('crm_product_mix_by_customer')
      .select('*')
      .eq('customer_id', customerId)
      .order('total_revenue', { ascending: false });

    if (error) throw error;
    return { data: data as CustomerProductMix[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load customer product mix');
    return { data: null, error };
  }
}

export interface DeliveryHistoryItem {
  order_id: string;
  order_number: string;
  order_date: string;
  total_amount: number;
  status: string;
  requested_delivery_date: string | null;
  scheduled_delivery_date: string | null;
  item_count: number;
}

export async function getCustomerDeliveryHistory(customerId: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_date,
        total_amount,
        status,
        requested_delivery_date,
        scheduled_delivery_date,
        order_items(id)
      `)
      .eq('customer_id', customerId)
      .eq('test_mode', false)
      .in('status', ['completed', 'ready_for_delivery', 'delivered'])
      .order('order_date', { ascending: false })
      .limit(50);

    if (error) throw error;

    const deliveries: DeliveryHistoryItem[] = (data || []).map((row: any) => ({
      order_id: row.id,
      order_number: row.order_number,
      order_date: row.order_date,
      total_amount: row.total_amount,
      status: row.status,
      requested_delivery_date: row.requested_delivery_date,
      scheduled_delivery_date: row.scheduled_delivery_date,
      item_count: Array.isArray(row.order_items) ? row.order_items.length : 0,
    }));

    return { data: deliveries, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load delivery history');
    return { data: null, error };
  }
}

export async function getCustomerProductMixByRange(
  customerId: string,
  startDate: string,
  endDate: string
) {
  try {
    const { data, error } = await supabase.rpc('crm_product_mix_by_customer_range', {
      p_customer_id: customerId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) throw error;

    const mix: CustomerProductMix[] = (data || []).map((row: any) => ({
      ...row,
      total_units: Number(row.total_units) || 0,
      total_revenue: Number(row.total_revenue) || 0,
      avg_unit_price: Number(row.avg_unit_price) || 0,
      order_count: Number(row.order_count) || 0,
    }));

    return { data: mix, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load customer product mix');
    return { data: null, error };
  }
}

export async function getCustomerDeliveryHistoryByRange(
  customerId: string,
  startDate: string,
  endDate: string
) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_date,
        total_amount,
        status,
        requested_delivery_date,
        scheduled_delivery_date,
        order_items(id)
      `)
      .eq('customer_id', customerId)
      .eq('test_mode', false)
      .in('status', ['completed', 'ready_for_delivery', 'delivered'])
      .gte('order_date', startDate)
      .lte('order_date', endDate + 'T23:59:59')
      .order('order_date', { ascending: false })
      .limit(50);

    if (error) throw error;

    const deliveries: DeliveryHistoryItem[] = (data || []).map((row: any) => ({
      order_id: row.id,
      order_number: row.order_number,
      order_date: row.order_date,
      total_amount: row.total_amount,
      status: row.status,
      requested_delivery_date: row.requested_delivery_date,
      scheduled_delivery_date: row.scheduled_delivery_date,
      item_count: Array.isArray(row.order_items) ? row.order_items.length : 0,
    }));

    return { data: deliveries, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load delivery history');
    return { data: null, error };
  }
}
