import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';
import type { CustomerPriceOverride } from '../types';

export async function getCustomerPriceList(customerId: string) {
  try {
    const { data, error } = await supabase
      .from('customer_price_lists')
      .select(`
        *,
        products:product_id(name, sku, price_per_unit)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const overrides: CustomerPriceOverride[] = (data || []).map((row: any) => ({
      id: row.id,
      customer_id: row.customer_id,
      product_id: row.product_id,
      custom_price: Number(row.custom_price),
      effective_date: row.effective_date,
      expires_at: row.expires_at,
      notes: row.notes,
      created_at: row.created_at,
      product_name: row.products?.name || 'Unknown Product',
      product_sku: row.products?.sku || null,
      standard_price: row.products?.price_per_unit ? Number(row.products.price_per_unit) : null,
    }));

    return { data: overrides, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load customer price list');
    return { data: null, error };
  }
}

export async function getActivePriceForProduct(customerId: string, productId: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('customer_price_lists')
      .select('custom_price')
      .eq('customer_id', customerId)
      .eq('product_id', productId)
      .lte('effective_date', today)
      .or(`expires_at.is.null,expires_at.gte.${today}`)
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { data: data ? Number(data.custom_price) : null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getActivePricesForCustomer(customerId: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('customer_price_lists')
      .select('product_id, custom_price')
      .eq('customer_id', customerId)
      .lte('effective_date', today)
      .or(`expires_at.is.null,expires_at.gte.${today}`);

    if (error) throw error;

    const priceMap = new Map<string, number>();
    (data || []).forEach((row: any) => {
      priceMap.set(row.product_id, Number(row.custom_price));
    });

    return { data: priceMap, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createPriceOverride(input: {
  customer_id: string;
  product_id: string;
  custom_price: number;
  effective_date?: string;
  expires_at?: string | null;
  notes?: string;
}) {
  try {
    const { data, error } = await supabase
      .from('customer_price_lists')
      .insert([{
        customer_id: input.customer_id,
        product_id: input.product_id,
        custom_price: input.custom_price,
        effective_date: input.effective_date || new Date().toISOString().split('T')[0],
        expires_at: input.expires_at || null,
        notes: input.notes || null,
      }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to create price override');
    return { data: null, error };
  }
}

export async function updatePriceOverride(id: string, updates: {
  custom_price?: number;
  effective_date?: string;
  expires_at?: string | null;
  notes?: string;
}) {
  try {
    const { data, error } = await supabase
      .from('customer_price_lists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to update price override');
    return { data: null, error };
  }
}

export async function deletePriceOverride(id: string) {
  try {
    const { error } = await supabase
      .from('customer_price_lists')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to delete price override');
    return { error };
  }
}
