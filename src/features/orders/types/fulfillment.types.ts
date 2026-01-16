export type FulfillmentStatus = 'unfulfilled' | 'partially_fulfilled' | 'fully_fulfilled';

export type ReservationStatus = 'reserved' | 'released' | 'fulfilled';

export interface FulfillmentSummary {
  orderedQuantity: number;
  assignedQuantity: number;
  remainingQuantity: number;
  fulfillmentPercentage: number;
  status: FulfillmentStatus;
  isFullyFulfilled: boolean;
  isPartiallyFulfilled: boolean;
  isUnfulfilled: boolean;
}

export interface OrderItemFulfillment {
  orderItemId: string;
  productId: string;
  productName: string;
  strain: string;
  orderedQuantity: number;
  assignedQuantity: number;
  remainingQuantity: number;
  fulfillmentPercentage: number;
  status: FulfillmentStatus;
  assignments: PackageAssignmentSummary[];
}

export interface PackageAssignmentSummary {
  assignmentId: string;
  packageId: string;
  quantityAssigned: number;
  reservationStatus: ReservationStatus;
  labelId?: string;
  labelStatus?: 'pending' | 'printed' | 'voided';
  inventoryAvailable?: number;
  inventoryReserved?: number;
}

export interface OrderFulfillmentSummary {
  orderId: string;
  orderNumber: string;
  totalItems: number;
  fulfilledItems: number;
  partiallyFulfilledItems: number;
  unfulfilledItems: number;
  overallFulfillmentPercentage: number;
  overallStatus: FulfillmentStatus;
  items: OrderItemFulfillment[];
}

export interface InventoryAvailability {
  packageId: string;
  productName: string;
  strain: string;
  batch: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  isAvailable: boolean;
  canFulfillQuantity: (requestedQty: number) => boolean;
}

export interface AssignmentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  availableQuantity: number;
  requestedQuantity: number;
  wouldOverAllocate: boolean;
  wouldOverFulfill: boolean;
}

export interface FulfillmentThresholds {
  minPartialFulfillmentPercent: number;
  fullyFulfilledPercent: number;
  unfulfillmentPercent: number;
}

export const DEFAULT_FULFILLMENT_THRESHOLDS: FulfillmentThresholds = {
  minPartialFulfillmentPercent: 1,
  fullyFulfilledPercent: 100,
  unfulfillmentPercent: 0,
};
