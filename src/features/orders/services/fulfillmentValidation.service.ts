import { supabase } from '@/lib/supabase';
import type {
  FulfillmentStatus,
  FulfillmentSummary,
  OrderItemFulfillment,
  OrderFulfillmentSummary,
  InventoryAvailability,
  AssignmentValidation,
  FulfillmentThresholds,
  PackageAssignmentSummary,
} from '../types/fulfillment.types';
import { DEFAULT_FULFILLMENT_THRESHOLDS } from '../types/fulfillment.types';

export class FulfillmentValidationService {
  private thresholds: FulfillmentThresholds = DEFAULT_FULFILLMENT_THRESHOLDS;

  setThresholds(thresholds: Partial<FulfillmentThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  calculateFulfillmentStatus(
    orderedQuantity: number,
    assignedQuantity: number
  ): FulfillmentStatus {
    if (orderedQuantity === 0) return 'unfulfilled';

    const percentage = (assignedQuantity / orderedQuantity) * 100;

    if (percentage >= this.thresholds.fullyFulfilledPercent) {
      return 'fully_fulfilled';
    } else if (percentage > this.thresholds.unfulfillmentPercent) {
      return 'partially_fulfilled';
    } else {
      return 'unfulfilled';
    }
  }

  calculateFulfillmentSummary(
    orderedQuantity: number,
    assignedQuantity: number
  ): FulfillmentSummary {
    const remainingQuantity = Math.max(0, orderedQuantity - assignedQuantity);
    const fulfillmentPercentage = orderedQuantity > 0
      ? (assignedQuantity / orderedQuantity) * 100
      : 0;
    const status = this.calculateFulfillmentStatus(orderedQuantity, assignedQuantity);

    return {
      orderedQuantity,
      assignedQuantity,
      remainingQuantity,
      fulfillmentPercentage,
      status,
      isFullyFulfilled: status === 'fully_fulfilled',
      isPartiallyFulfilled: status === 'partially_fulfilled',
      isUnfulfilled: status === 'unfulfilled',
    };
  }

  async getOrderItemFulfillment(orderItemId: string): Promise<OrderItemFulfillment | null> {
    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .select(`
        id,
        product_id,
        quantity,
        strain,
        products (
          id,
          name
        )
      `)
      .eq('id', orderItemId)
      .maybeSingle();

    if (itemError || !orderItem) {
      console.error('Error fetching order item:', itemError);
      return null;
    }

    const { data: assignments, error: assignError } = await supabase
      .from('package_assignments_with_reservations')
      .select('*')
      .eq('order_item_id', orderItemId);

    if (assignError) {
      console.error('Error fetching assignments:', assignError);
      return null;
    }

    const assignedQuantity = assignments?.reduce(
      (sum, a) => sum + Number(a.quantity_assigned || 0),
      0
    ) || 0;

    const assignmentSummaries: PackageAssignmentSummary[] = assignments?.map(a => ({
      assignmentId: a.id,
      packageId: a.package_id,
      quantityAssigned: Number(a.quantity_assigned),
      reservationStatus: (a.assignment_status || 'reserved') as any,
      labelId: a.label_id,
      inventoryAvailable: a.available_qty ? Number(a.available_qty) : undefined,
      inventoryReserved: a.reserved_qty ? Number(a.reserved_qty) : undefined,
    })) || [];

    const summary = this.calculateFulfillmentSummary(
      Number(orderItem.quantity),
      assignedQuantity
    );

    return {
      orderItemId: orderItem.id,
      productId: orderItem.product_id,
      productName: (orderItem.products as any)?.name || 'Unknown',
      strain: orderItem.strain || '',
      orderedQuantity: Number(orderItem.quantity),
      assignedQuantity,
      remainingQuantity: summary.remainingQuantity,
      fulfillmentPercentage: summary.fulfillmentPercentage,
      status: summary.status,
      assignments: assignmentSummaries,
    };
  }

  async getOrderFulfillmentSummary(orderId: string): Promise<OrderFulfillmentSummary | null> {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      return null;
    }

    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('id')
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      return null;
    }

    const itemFulfillments: OrderItemFulfillment[] = [];
    let fulfilledCount = 0;
    let partiallyFulfilledCount = 0;
    let unfulfilledCount = 0;
    let totalFulfillmentPercentage = 0;

    for (const item of orderItems || []) {
      const fulfillment = await this.getOrderItemFulfillment(item.id);
      if (fulfillment) {
        itemFulfillments.push(fulfillment);
        totalFulfillmentPercentage += fulfillment.fulfillmentPercentage;

        if (fulfillment.status === 'fully_fulfilled') {
          fulfilledCount++;
        } else if (fulfillment.status === 'partially_fulfilled') {
          partiallyFulfilledCount++;
        } else {
          unfulfilledCount++;
        }
      }
    }

    const totalItems = itemFulfillments.length;
    const overallFulfillmentPercentage = totalItems > 0
      ? totalFulfillmentPercentage / totalItems
      : 0;

    let overallStatus: FulfillmentStatus = 'unfulfilled';
    if (fulfilledCount === totalItems && totalItems > 0) {
      overallStatus = 'fully_fulfilled';
    } else if (fulfilledCount > 0 || partiallyFulfilledCount > 0) {
      overallStatus = 'partially_fulfilled';
    }

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      totalItems,
      fulfilledItems: fulfilledCount,
      partiallyFulfilledItems: partiallyFulfilledCount,
      unfulfilledItems: unfulfilledCount,
      overallFulfillmentPercentage,
      overallStatus,
      items: itemFulfillments,
    };
  }

  async checkInventoryAvailability(packageId: string): Promise<InventoryAvailability | null> {
    const { data: inventory, error } = await supabase
      .from('inventory_reservation_summary')
      .select('*')
      .eq('package_id', packageId)
      .maybeSingle();

    if (error || !inventory) {
      console.error('Error fetching inventory availability:', error);
      return null;
    }

    const totalQuantity = Number(inventory.total_qty || 0);
    const availableQuantity = Number(inventory.available_qty || 0);
    const reservedQuantity = Number(inventory.reserved_qty || 0);

    return {
      packageId: inventory.package_id,
      productName: inventory.product_name || '',
      strain: inventory.strain || '',
      batch: inventory.batch_number || '',
      totalQuantity,
      availableQuantity,
      reservedQuantity,
      isAvailable: availableQuantity > 0,
      canFulfillQuantity: (requestedQty: number) => availableQuantity >= requestedQty,
    };
  }

  async validateAssignment(
    orderItemId: string,
    packageId: string,
    requestedQuantity: number
  ): Promise<AssignmentValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (requestedQuantity <= 0) {
      errors.push('Requested quantity must be greater than 0');
    }

    const availability = await this.checkInventoryAvailability(packageId);
    if (!availability) {
      errors.push('Inventory package not found');
      return {
        isValid: false,
        errors,
        warnings,
        availableQuantity: 0,
        requestedQuantity,
        wouldOverAllocate: true,
        wouldOverFulfill: false,
      };
    }

    const wouldOverAllocate = requestedQuantity > availability.availableQuantity;
    if (wouldOverAllocate) {
      errors.push(
        `Insufficient inventory. Available: ${availability.availableQuantity}, Requested: ${requestedQuantity}`
      );
    }

    const itemFulfillment = await this.getOrderItemFulfillment(orderItemId);
    if (!itemFulfillment) {
      errors.push('Order item not found');
      return {
        isValid: false,
        errors,
        warnings,
        availableQuantity: availability.availableQuantity,
        requestedQuantity,
        wouldOverAllocate,
        wouldOverFulfill: false,
      };
    }

    const totalAssignedAfter = itemFulfillment.assignedQuantity + requestedQuantity;
    const wouldOverFulfill = totalAssignedAfter > itemFulfillment.orderedQuantity;

    if (wouldOverFulfill) {
      warnings.push(
        `This would over-fulfill the order item. Ordered: ${itemFulfillment.orderedQuantity}, ` +
        `Currently Assigned: ${itemFulfillment.assignedQuantity}, ` +
        `Requesting: ${requestedQuantity}, Total: ${totalAssignedAfter}`
      );
    }

    const remainingAfterAssignment = itemFulfillment.orderedQuantity - totalAssignedAfter;
    if (remainingAfterAssignment > 0 && remainingAfterAssignment < 1) {
      warnings.push(
        `Assigning ${requestedQuantity} will leave ${remainingAfterAssignment.toFixed(2)} units remaining`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      availableQuantity: availability.availableQuantity,
      requestedQuantity,
      wouldOverAllocate,
      wouldOverFulfill,
    };
  }

  async getTotalAssignedQuantity(orderItemId: string): Promise<number> {
    const { data: assignments, error } = await supabase
      .from('package_assignments')
      .select('quantity_assigned')
      .eq('order_item_id', orderItemId)
      .in('status', ['reserved', 'fulfilled']);

    if (error) {
      console.error('Error fetching total assigned quantity:', error);
      return 0;
    }

    return assignments?.reduce((sum, a) => sum + Number(a.quantity_assigned || 0), 0) || 0;
  }

  async canFullyFulfillOrderItem(orderItemId: string): Promise<boolean> {
    const fulfillment = await this.getOrderItemFulfillment(orderItemId);
    return fulfillment?.status === 'fully_fulfilled' || false;
  }

  async canFullyFulfillOrder(orderId: string): Promise<boolean> {
    const summary = await this.getOrderFulfillmentSummary(orderId);
    return summary?.overallStatus === 'fully_fulfilled' || false;
  }

  getFulfillmentStatusColor(status: FulfillmentStatus): string {
    switch (status) {
      case 'fully_fulfilled':
        return 'text-green-400';
      case 'partially_fulfilled':
        return 'text-yellow-400';
      case 'unfulfilled':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  }

  getFulfillmentStatusBadgeColor(status: FulfillmentStatus): string {
    switch (status) {
      case 'fully_fulfilled':
        return 'bg-green-600';
      case 'partially_fulfilled':
        return 'bg-yellow-600';
      case 'unfulfilled':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  }

  getFulfillmentStatusLabel(status: FulfillmentStatus): string {
    switch (status) {
      case 'fully_fulfilled':
        return 'Fully Fulfilled';
      case 'partially_fulfilled':
        return 'Partially Fulfilled';
      case 'unfulfilled':
        return 'Unfulfilled';
      default:
        return 'Unknown';
    }
  }
}

export const fulfillmentValidationService = new FulfillmentValidationService();
