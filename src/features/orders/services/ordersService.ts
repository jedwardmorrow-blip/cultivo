/**
 * Orders Service
 *
 * Comprehensive service for managing orders, order items, and fulfillment workflow.
 * Handles CRUD operations, status updates, and order pipeline management.
 *
 * @module ordersService
 */

import { supabase } from '@/lib/supabase';
import { errorService } from '@/services/error.service';
import type { Order, OrderItem, Product, FulfillmentChecklist, Allocation, WorkflowSummary } from '@/types';

/**
 * Custom error class for orders service operations
 */
class OrdersServiceError extends Error {
  constructor(message: string, public originalError?: any, public code?: string) {
    super(message);
    this.name = 'OrdersServiceError';
  }
}

export const ordersService = {
  /**
   * Fetches all orders from the order_pipeline view
   *
   * @param includeArchived - Whether to include archived orders (default: false)
   * @returns Promise<Order[]> - Array of orders with customer and product details
   * @throws {OrdersServiceError} If database query fails or permissions are insufficient
   *
   * @description
   * - Queries the order_pipeline view for comprehensive order data
   * - Excludes cancelled orders
   * - Includes automatic retry logic (2 attempts)
   * - Sorted by creation date (newest first)
   *
   * @example
   * const orders = await ordersService.fetchOrders();
   */
  async fetchOrders(includeArchived: boolean = false): Promise<Order[]> {
    errorService.debug('[ordersService] Fetching orders', { includeArchived });

    return errorService.retryOperation(
      async () => {
        let query = supabase
          .from('order_pipeline')
          .select('*')
          .neq('status', 'cancelled');

        if (!includeArchived) {
          query = query.eq('archived', false);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
            throw new OrdersServiceError(
              'You do not have permission to view orders. Please contact your administrator.',
              error,
              'PGRST301'
            );
          }
          if (error.code === '42P01' || error.code === 'PGRST200' || error.message?.includes('does not exist')) {
            throw new OrdersServiceError(
              'Orders view not found. The database may need to be refreshed. Please reload the page.',
              error,
              error.code
            );
          }
          throw new OrdersServiceError('Failed to load orders. Please try again.', error, error.code);
        }

        errorService.debug('[ordersService] Successfully fetched orders', { count: data?.length || 0 });
        return (data as Order[]) || [];
      },
      {
        maxRetries: 2,
        delayMs: 1000,
        onRetry: (attempt, error) => {
          errorService.warn(`Retrying fetchOrders (attempt ${attempt})`, error);
        },
      }
    ).catch((error) => {
      errorService.handle(error, {
        operation: 'Fetch Orders',
        metadata: { includeArchived },
      });
      throw error;
    });
  },

  /**
   * Fetches detailed order information including items, checklist, and allocations
   *
   * @param orderId - Order UUID
   * @returns Promise<{ items: OrderItem[]; checklists: FulfillmentChecklist[]; allocations: Allocation[]; workflowSummary: WorkflowSummary | null }>
   * @description Returns comprehensive order details for order management view
   */
  async fetchOrderDetails(orderId: string) {
    const [itemsResult, checklistResult, allocationsResult, workflowResult] = await Promise.all([
      supabase
        .from('order_items')
        .select('id, quantity, unit_price, subtotal, notes, product_id, status')
        .eq('order_id', orderId),
      supabase
        .from('order_fulfillment_checklist')
        .select('*')
        .eq('order_id', orderId),
      supabase
        .from('order_item_allocations')
        .select('*')
        .eq('order_id', orderId)
        .in('allocation_status', ['reserved', 'confirmed', 'consumed']),
      supabase
        .from('order_workflow_summary')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle()
        .then(result => {
          if (result.error && (result.error.code === 'PGRST116' || result.error.code === '42P01')) {
            console.warn('[ordersService] order_workflow_summary view not found - workflow tracking unavailable');
            return { data: null, error: null };
          }
          if (result.error) {
            console.error('[ordersService] Error fetching workflow summary:', result.error);
            return { data: null, error: null };
          }
          return result;
        })
    ]);

    if (itemsResult.error) throw itemsResult.error;
    if (!itemsResult.data || itemsResult.data.length === 0) {
      return {
        items: [],
        checklists: [],
        allocations: [],
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
      };
    });

    return {
      items,
      checklists: checklistResult.data as FulfillmentChecklist[] || [],
      allocations: allocationsResult.data as Allocation[] || [],
      workflowSummary: workflowResult.data as WorkflowSummary | null
    };
  },

  /**
   * Fetches all active products
   *
   * @returns Promise<Product[]> - Products available for ordering
   */
  async fetchProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, type, strain, price_per_unit, pricing_unit, product_category, allows_fractional_quantity, strain_id, strains(name)')
      .eq('is_archived', false)
      .order('name');

    if (error) throw error;

    return (data?.map(p => ({
      ...p,
      strain: (p as any)?.strains?.name || p.strain || ''
    })) as Product[]) || [];
  },

  /**
   * Updates an order's status
   *
   * @param orderId - Order UUID
   * @param newStatus - New order status
   * @returns Promise<void>
   * @throws {Error} If fulfillment checklists incomplete for ready_for_delivery status
   */
  async updateOrderStatus(orderId: string, newStatus: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      if (error.message.includes('must have complete fulfillment checklists')) {
        throw new Error('Cannot mark as ready for delivery: All items must have complete fulfillment checklists');
      }
      throw error;
    }
  },

  /**
   * Updates an order item's status
   *
   * @param itemId - Order item UUID
   * @param newStatus - New item status
   * @returns Promise<void>
   */
  async updateItemStatus(itemId: string, newStatus: string): Promise<void> {
    const { error } = await supabase
      .from('order_items')
      .update({ status: newStatus })
      .eq('id', itemId);

    if (error) throw error;
  },

  /**
   * Archives an order
   *
   * @param orderId - Order UUID
   * @returns Promise<void>
   */
  async archiveOrder(orderId: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ archived: true })
      .eq('id', orderId);

    if (error) throw error;
  },

  /**
   * Deletes an order
   *
   * @param orderId - Order UUID
   * @returns Promise<void>
   */
  async deleteOrder(orderId: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) throw error;
  },

  /**
   * Deletes an order item
   *
   * @param itemId - Order item UUID
   * @returns Promise<void>
   */
  async deleteOrderItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },

  /**
   * Updates an order's requested delivery date
   *
   * @param orderId - Order UUID
   * @param newDate - New delivery date (ISO format)
   * @returns Promise<void>
   */
  async updateDeliveryDate(orderId: string, newDate: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ requested_delivery_date: newDate })
      .eq('id', orderId);

    if (error) throw error;
  },

  /**
   * Updates an order item's unit price
   *
   * @param itemId - Order item UUID
   * @param newPrice - New unit price
   * @returns Promise<void>
   */
  async updateItemPrice(itemId: string, newPrice: number): Promise<void> {
    const { error } = await supabase
      .from('order_items')
      .update({ unit_price: newPrice })
      .eq('id', itemId);

    if (error) throw error;
  },

  async updateItemQuantity(itemId: string, newQuantity: number): Promise<void> {
    const { error } = await supabase
      .from('order_items')
      .update({ quantity: newQuantity })
      .eq('id', itemId);

    if (error) throw error;
  },

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
  },

  async updateChecklistItem(checklistId: string, field: string, value: boolean): Promise<void> {
    const { error } = await supabase
      .from('order_fulfillment_checklist')
      .update({ [field]: value })
      .eq('id', checklistId);

    if (error) throw error;
  },

  async releaseAllocation(allocationId: string): Promise<void> {
    const { error } = await supabase
      .from('order_item_allocations')
      .update({ allocation_status: 'released' })
      .eq('id', allocationId);

    if (error) throw error;
  },

  /**
   * Fetches comprehensive order details with allocations
   *
   * @param orderId - Order UUID
   * @returns Promise<{ items: OrderItem[]; allocationsMap: Map; workflowSummary: WorkflowSummary | null }>
   * @description Returns order items with product details and workflow status
   */
  async fetchOrderDetailsWithAllocations(orderId: string) {
    console.log('[ordersService] Fetching order details for:', orderId);

    const [itemsResult, workflowResult] = await Promise.all([
      supabase
        .from('order_items')
        .select('id, quantity, unit_price, subtotal, notes, product_id, status, batch_id')
        .eq('order_id', orderId)
        .then(result => {
          if (result.error) {
            console.error('[ordersService] Error fetching order items:', result.error);
          } else {
            console.log('[ordersService] Successfully fetched order items:', result.data?.length || 0);
          }
          return result;
        }),
      supabase
        .from('order_workflow_summary')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle()
        .then(result => {
          if (result.error && (result.error.code === 'PGRST116' || result.error.code === '42P01')) {
            console.warn('[ordersService] order_workflow_summary view not found - workflow tracking unavailable');
            return { data: null, error: null };
          }
          if (result.error) {
            console.error('[ordersService] Error fetching workflow summary:', result.error);
            return { data: null, error: null };
          }
          return result;
        })
    ]);

    if (itemsResult.error) throw itemsResult.error;

    if (!itemsResult.data || itemsResult.data.length === 0) {
      console.log('[ordersService] No order items found for:', orderId);
      return {
        items: [],
        allocationsMap: new Map(),
        workflowSummary: null
      };
    }

    const productIds = itemsResult.data.map(item => item.product_id);
    console.log('[ordersService] Fetching products for IDs:', productIds);

    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, name, type, strain, pricing_unit, product_category, strain_id, strains(name)')
      .in('id', productIds);

    if (productsError) {
      console.error('[ordersService] Error fetching products:', productsError);
      throw productsError;
    }

    console.log('[ordersService] Successfully fetched products:', productsData?.length || 0);

    const productsMap = new Map(productsData?.map(p => [p.id, p]) || []);

    const items = itemsResult.data.map(item => {
      const product = productsMap.get(item.product_id);
      const strainName = (product as any)?.strains?.name || product?.strain || '';
      return {
        id: item.id,
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
      };
    });

    return {
      items,
      allocationsMap: new Map(),
      workflowSummary: workflowResult.data
    };
  },

  async validateBatchStrainMatch(batchId: string, strain: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('validate_batch_strain_match', {
        p_batch_id: batchId,
        p_strain: strain
      });

    if (error) {
      console.error('Error validating batch-strain match:', error);
      return false;
    }

    return data === true;
  },

  async updateItemBatch(itemId: string, batchId: string | null, strain: string | null): Promise<void> {
    if (batchId && strain) {
      const isValid = await this.validateBatchStrainMatch(batchId, strain);
      if (!isValid) {
        throw new Error(`Batch does not match strain: ${strain}. Please select a batch from the correct strain.`);
      }
    }

    const { error } = await supabase
      .from('order_items')
      .update({ batch_id: batchId })
      .eq('id', itemId);

    if (error) throw error;
  },

  /**
   * Fetch order pipeline view
   */
  async fetchOrderPipeline() {
    try {
      const { data, error } = await supabase
        .from('order_pipeline')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      errorService.handle(error, 'Fetch order pipeline');
      return { data: null, error };
    }
  },
};
