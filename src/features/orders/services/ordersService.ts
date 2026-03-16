import { supabase } from '@/lib/supabase';
import type { Order, OrderItem, Product, WorkflowSummary } from '../types';

class OrdersDataService {
  async fetchOrders(includeArchived: boolean = false): Promise<Order[]> {
    let query = supabase
      .from('order_pipeline')
      .select('*')
      .neq('status', 'cancelled');

    if (!includeArchived) {
      query = query.eq('archived', false);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Order[]) || [];
  }

  async fetchOrderDetails(orderId: string): Promise<{
    items: OrderItem[];
    workflowSummary: WorkflowSummary | null;
  }> {
    const [itemsResult, workflowResult] = await Promise.all([
      supabase
        .from('order_items')
        .select('id, quantity, unit_price, subtotal, notes, product_id, status, batch_id, is_sample')
        .eq('order_id', orderId),
      supabase
        .from('order_workflow_summary')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle()
        .then(result => {
          if (result.error && (result.error.code === 'PGRST116' || result.error.code === '42P01')) {
            return { data: null, error: null };
          }
          return result;
        })
    ]);

    if (itemsResult.error) throw itemsResult.error;

    if (!itemsResult.data || itemsResult.data.length === 0) {
      return {
        items: [],
        workflowSummary: null
      };
    }

    const productIds = itemsResult.data.map(item => item.product_id);

    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, name, type, strain, pricing_unit, product_category, strain_id, strains(name)')
      .in('id', productIds);

    if (productsError) throw productsError;

    const productsMap = new Map(productsData?.map(p => [p.id, p]) || []);

    const items: OrderItem[] = itemsResult.data.map(item => {
      const product = productsMap.get(item.product_id);
      const strainName = (product as any)?.strains?.name || product?.strain || '';
      return {
        id: item.id,
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        notes: item.notes,
        product_name: product?.name || 'Unknown',
        product_type: product?.type || 'flower',
        strain: strainName,
        status: item.status || 'trimming',
        pricing_unit: product?.pricing_unit,
        product_category: product?.product_category,
        batch_id: item.batch_id || null,
        is_sample: item.is_sample ?? false,
      };
    });

    return {
      items,
      workflowSummary: workflowResult.data as WorkflowSummary | null
    };
  }

  async fetchProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, type, strain, price_per_unit, pricing_unit, product_category, allows_fractional_quantity')
      .eq('is_archived', false)
      .or('product_category.in.(packaged,preroll),name.ilike.%Fresh Frozen%')
      .order('name');

    if (error) throw error;
    return (data as Product[]) || [];
  }

  async updateOrderStatus(orderId: string, newStatus: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) throw error;
  }

  async updateItemStatus(itemId: string, newStatus: string): Promise<void> {
    const { error } = await supabase
      .from('order_items')
      .update({ status: newStatus })
      .eq('id', itemId);

    if (error) throw error;
  }

  async updateItemQuantity(itemId: string, newQuantity: number): Promise<void> {
    const { error } = await supabase
      .from('order_items')
      .update({ quantity: newQuantity })
      .eq('id', itemId);

    if (error) throw error;
  }

  async updateItemPrice(itemId: string, newPrice: number): Promise<void> {
    const { error } = await supabase
      .from('order_items')
      .update({ unit_price: newPrice })
      .eq('id', itemId);

    if (error) throw error;
  }

  async updateItemSample(itemId: string, isSample: boolean): Promise<void> {
    const updates: Record<string, unknown> = { is_sample: isSample };
    if (isSample) {
      updates.unit_price = 0;
    }
    const { error } = await supabase
      .from('order_items')
      .update(updates)
      .eq('id', itemId);

    if (error) throw error;
  }

  async updateOrderSampleFlag(orderId: string): Promise<void> {
    const { data } = await supabase
      .from('order_items')
      .select('is_sample')
      .eq('order_id', orderId);

    const hasSamples = data?.some(item => item.is_sample) ?? false;
    const { error } = await supabase
      .from('orders')
      .update({ is_sample: hasSamples })
      .eq('id', orderId);

    if (error) throw error;
  }

  async updateItemBatch(itemId: string, batchId: string | null, strain: string | null): Promise<void> {
    if (batchId && strain) {
      const { data, error } = await supabase
        .rpc('validate_batch_strain_match', {
          p_batch_id: batchId,
          p_strain: strain
        });

      if (error) throw error;
      if (!data) {
        throw new Error(`Batch does not match strain: ${strain}. Please select a batch from the correct strain.`);
      }
    }

    const { error } = await supabase
      .from('order_items')
      .update({ batch_id: batchId })
      .eq('id', itemId);

    if (error) throw error;
  }

  async deleteOrderItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  }

  async deleteOrder(orderId: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) throw error;
  }

  async addItemToOrder(orderId: string, productId: string, quantity: number, unitPrice: number): Promise<void> {
    const { error } = await supabase
      .from('order_items')
      .insert({
        order_id: orderId,
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        status: 'trimming',
      });

    if (error) throw error;
  }

  async updateDeliveryDate(orderId: string, newDate: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        requested_delivery_date: newDate,
        scheduled_delivery_date: newDate,
      })
      .eq('id', orderId);

    if (error) throw error;
  }

  async archiveOrder(orderId: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ archived: true })
      .eq('id', orderId);

    if (error) throw error;
  }
}

export const ordersDataService = new OrdersDataService();
