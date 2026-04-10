import { supabase } from '@/lib/supabase';
import { errorService } from '@/services/error.service';
import { inventoryMovementService } from '@/services/inventoryMovement.service';

export interface AvailablePackage {
  id: string;
  package_id: string;
  product_name: string;
  strain: string | null;
  batch: string | null;
  batch_id: string | null;
  batch_number: string | null;
  available_qty: number;
  unit: string;
  status: string;
  room: string | null;
  package_date: string | null;
  thc_percentage: number | null;
  cbd_percentage: number | null;
}

export interface PackageAssignment {
  id: string;
  order_id: string;
  order_item_id: string;
  package_id: string;
  quantity_assigned: number;
  status: 'reserved' | 'fulfilled' | 'released';
  label_id: string | null;
  notes: string | null;
  assigned_by: string | null;
  assigned_at: string;
  created_at: string;
  updated_at: string;
}

export interface PackageAssignmentWithDetails extends PackageAssignment {
  assignment_status: string;
  order_number: string;
  customer_id: string;
  scheduled_delivery_date: string | null;
  order_status: string;
  order_item_quantity: number;
  unit_price: number;
  order_item_strain: string | null;
  product_name: string;
  product_type: string;
  inventory_item_id: string | null;
  inventory_product_name: string | null;
  strain: string | null;
  batch: string | null;
  available_qty: number | null;
  unit: string | null;
  room: string | null;
  package_date: string | null;
  label_number: string | null;
  barcode_data: string | null;
  printed_at: string | null;
  voided_at: string | null;
}

class PackageAssignmentServiceError extends Error {
  constructor(message: string, public originalError?: any, public code?: string) {
    super(message);
    this.name = 'PackageAssignmentServiceError';
  }
}

export const packageAssignmentService = {
  /**
   * Get available packages for a specific product name and batch.
   * Always filters by product_name first; when batchId is provided, also filters by batch_id
   * to enforce batch-level chain of custody.
   *
   * When strain is provided and the exact product_name match returns 0 results,
   * falls back to strain-based matching (shows all inventory for that strain).
   */
  async getAvailablePackagesForProduct(
    productName: string,
    requiredQty: number,
    batchId?: string | null,
    strain?: string | null
  ): Promise<AvailablePackage[]> {
    errorService.debug('[packageAssignmentService] Fetching available packages', {
      productName,
      requiredQty,
      batchId,
      strain,
    });

    const SELECT_COLS = 'id, package_id, product_name, strain, batch, batch_id, batch_number, available_qty, unit, status, room, package_date, thc_percentage, cbd_percentage';
    const STATUS_WHITELIST = ['Available', 'available', 'Reserved', 'reserved', 'Packaged', 'packaged'];

    try {
      // Phase 1: exact product_name match
      let query = supabase
        .from('inventory_items')
        .select(SELECT_COLS)
        .eq('product_name', productName)
        .gt('available_qty', 0)
        .in('status', STATUS_WHITELIST);

      if (batchId) {
        query = query.eq('batch_id', batchId);
      }

      const { data, error } = await query.order('package_date', { ascending: false });

      if (error) {
        throw new PackageAssignmentServiceError(
          'Failed to fetch available packages',
          error,
          error.code
        );
      }

      if (data && data.length > 0) {
        errorService.debug('[packageAssignmentService] Exact product_name match', {
          count: data.length,
        });
        return (data as AvailablePackage[]) || [];
      }

      // Phase 2: strain-based fallback when exact match returns nothing
      if (!strain) {
        errorService.debug('[packageAssignmentService] No exact match, no strain for fallback');
        return [];
      }

      errorService.debug('[packageAssignmentService] Falling back to strain-based query', { strain });

      let strainQuery = supabase
        .from('inventory_items')
        .select(SELECT_COLS)
        .ilike('strain', strain)
        .gt('available_qty', 0)
        .in('status', STATUS_WHITELIST);

      if (batchId) {
        strainQuery = strainQuery.eq('batch_id', batchId);
      }

      const { data: strainData, error: strainError } = await strainQuery.order('package_date', { ascending: false });

      if (strainError) {
        throw new PackageAssignmentServiceError(
          'Failed to fetch strain-based packages',
          strainError,
          strainError.code
        );
      }

      errorService.debug('[packageAssignmentService] Strain fallback results', {
        count: strainData?.length || 0,
      });

      return (strainData as AvailablePackage[]) || [];
    } catch (error) {
      errorService.handle(error, {
        operation: 'Get Available Packages',
        metadata: { productName, requiredQty, strain },
      });
      throw error;
    }
  },

  /**
   * Validate that a package has sufficient available quantity
   */
  async validatePackageAvailability(
    packageId: string,
    requestedQty: number
  ): Promise<{ valid: boolean; available_qty: number; message?: string }> {
    errorService.debug('[packageAssignmentService] Validating package availability', {
      packageId,
      requestedQty
    });

    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('available_qty, status')
        .eq('package_id', packageId)
        .single();

      if (error || !data) {
        return {
          valid: false,
          available_qty: 0,
          message: 'Package not found',
        };
      }

      const validStatuses = ['Available', 'available', 'Reserved', 'reserved', 'Packaged', 'packaged'];
      if (!validStatuses.includes(data.status)) {
        return {
          valid: false,
          available_qty: data.available_qty,
          message: `Package status is ${data.status}`,
        };
      }

      if (data.available_qty < requestedQty) {
        return {
          valid: false,
          available_qty: data.available_qty,
          message: `Insufficient quantity. Available: ${data.available_qty}`,
        };
      }

      return {
        valid: true,
        available_qty: data.available_qty,
      };
    } catch (error) {
      errorService.handle(error, {
        operation: 'Validate Package Availability',
        metadata: { packageId, requestedQty },
      });
      throw error;
    }
  },

  /**
   * Assign a package to an order item
   * This will also trigger automatic label generation (via labelAutoFill service)
   */
  async assignPackageToOrderItem(
    orderId: string,
    orderItemId: string,
    packageId: string,
    quantityAssigned: number,
    notes?: string
  ): Promise<PackageAssignment> {
    errorService.debug('[packageAssignmentService] Assigning package to order item', {
      orderId,
      orderItemId,
      packageId,
      quantityAssigned,
    });

    try {
      // First validate availability
      const validation = await this.validatePackageAvailability(packageId, quantityAssigned);
      if (!validation.valid) {
        throw new PackageAssignmentServiceError(
          validation.message || 'Package validation failed',
          null,
          'VALIDATION_ERROR'
        );
      }

      // Validate against over-allocation
      const { data: orderItem, error: orderItemError } = await supabase
        .from('order_items')
        .select('quantity')
        .eq('id', orderItemId)
        .maybeSingle();

      if (orderItemError || !orderItem) {
        throw new PackageAssignmentServiceError(
          'Could not verify order item quantity',
          orderItemError,
          'ORDER_ITEM_NOT_FOUND'
        );
      }

      const totalAlreadyAssigned = await this.getTotalAssignedQuantity(orderItemId);
      if (totalAlreadyAssigned + quantityAssigned > orderItem.quantity) {
        throw new PackageAssignmentServiceError(
          `Cannot assign ${quantityAssigned} units: would exceed ordered quantity of ${orderItem.quantity} (already assigned: ${totalAlreadyAssigned})`,
          null,
          'OVER_ALLOCATION'
        );
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create assignment
      const { data, error } = await supabase
        .from('package_assignments')
        .insert({
          order_id: orderId,
          order_item_id: orderItemId,
          package_id: packageId,
          quantity_assigned: quantityAssigned,
          notes: notes || null,
          assigned_by: user?.id || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new PackageAssignmentServiceError(
            'This package is already assigned to this order item',
            error,
            'DUPLICATE_ASSIGNMENT'
          );
        }
        throw new PackageAssignmentServiceError(
          'Failed to create package assignment',
          error,
          error.code
        );
      }

      errorService.debug('[packageAssignmentService] Successfully created assignment', {
        assignmentId: data.id
      });

      return data as PackageAssignment;
    } catch (error) {
      errorService.handle(error, {
        operation: 'Assign Package to Order Item',
        metadata: { orderId, orderItemId, packageId, quantityAssigned },
      });
      throw error;
    }
  },

  /**
   * Get all package assignments for an order
   */
  async getPackageAssignmentsForOrder(orderId: string): Promise<PackageAssignmentWithDetails[]> {
    errorService.debug('[packageAssignmentService] Fetching package assignments for order', {
      orderId
    });

    try {
      const { data, error } = await supabase
        .from('package_assignments_details')
        .select('*')
        .eq('order_id', orderId)
        .order('assigned_at', { ascending: false });

      if (error) {
        throw new PackageAssignmentServiceError(
          'Failed to fetch package assignments',
          error,
          error.code
        );
      }

      errorService.debug('[packageAssignmentService] Successfully fetched assignments', {
        count: data?.length || 0
      });

      return (data as PackageAssignmentWithDetails[]) || [];
    } catch (error) {
      errorService.handle(error, {
        operation: 'Get Package Assignments for Order',
        metadata: { orderId },
      });
      throw error;
    }
  },

  /**
   * Get all package assignments for a specific order item
   */
  async getPackageAssignmentsForOrderItem(orderItemId: string): Promise<PackageAssignmentWithDetails[]> {
    errorService.debug('[packageAssignmentService] Fetching package assignments for order item', {
      orderItemId
    });

    try {
      const { data, error } = await supabase
        .from('package_assignments_details')
        .select('*')
        .eq('order_item_id', orderItemId)
        .order('assigned_at', { ascending: false });

      if (error) {
        throw new PackageAssignmentServiceError(
          'Failed to fetch package assignments',
          error,
          error.code
        );
      }

      return (data as PackageAssignmentWithDetails[]) || [];
    } catch (error) {
      errorService.handle(error, {
        operation: 'Get Package Assignments for Order Item',
        metadata: { orderItemId },
      });
      throw error;
    }
  },

  /**
   * Remove a package assignment
   * Optionally void the associated label
   */
  async removePackageAssignment(
    assignmentId: string,
    voidLabel: boolean = false
  ): Promise<void> {
    errorService.debug('[packageAssignmentService] Removing package assignment', {
      assignmentId,
      voidLabel
    });

    try {
      const { data: existing } = await supabase
        .from('package_assignments')
        .select('status, label_id')
        .eq('id', assignmentId)
        .single();

      if (existing?.status === 'fulfilled') {
        throw new PackageAssignmentServiceError(
          'Cannot remove a fulfilled assignment. The order has been completed.',
          null,
          'FULFILLED_ASSIGNMENT'
        );
      }

      if (voidLabel) {
        const assignment = existing;

        if (assignment?.label_id) {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase
            .from('labels')
            .update({
              voided_at: new Date().toISOString(),
              voided_by: user?.id || null,
              void_reason: 'Package assignment removed',
            })
            .eq('id', assignment.label_id)
            .is('voided_at', null);
        }
      }

      // Delete the assignment
      const { error } = await supabase
        .from('package_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        throw new PackageAssignmentServiceError(
          'Failed to remove package assignment',
          error,
          error.code
        );
      }

      errorService.debug('[packageAssignmentService] Successfully removed assignment');
    } catch (error) {
      errorService.handle(error, {
        operation: 'Remove Package Assignment',
        metadata: { assignmentId, voidLabel },
      });
      throw error;
    }
  },

  /**
   * Get total assigned quantity for an order item
   */
  async getTotalAssignedQuantity(orderItemId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('package_assignments')
        .select('quantity_assigned')
        .eq('order_item_id', orderItemId)
        .in('status', ['reserved', 'fulfilled']);

      if (error) {
        throw new PackageAssignmentServiceError(
          'Failed to calculate total assigned quantity',
          error,
          error.code
        );
      }

      const total = data.reduce((sum, assignment) => sum + Number(assignment.quantity_assigned), 0);
      return total;
    } catch (error) {
      errorService.handle(error, {
        operation: 'Get Total Assigned Quantity',
        metadata: { orderItemId },
      });
      throw error;
    }
  },

  /**
   * Get package assignments for a specific order item
   */
  async getAssignmentsForOrderItem(orderItemId: string) {
    try {
      const { data, error } = await supabase
        .from('package_assignments')
        .select(`
          *,
          inventory_items(*)
        `)
        .eq('order_item_id', orderItemId);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      errorService.handle(error, 'Get package assignments for order item');
      return { data: null, error };
    }
  },

  /**
   * Get labels for package assignments by order ID
   */
  async getLabelsForOrder(orderId: string) {
    try {
      // First get label IDs from assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('package_assignments')
        .select('label_id')
        .eq('order_id', orderId)
        .not('label_id', 'is', null);

      if (assignmentsError) throw assignmentsError;

      const labelIds = (assignments || []).map(a => a.label_id).filter(Boolean);

      if (labelIds.length === 0) {
        return { data: [], error: null };
      }

      // Fetch label details
      const { data, error } = await supabase
        .from('labels')
        .select(`
          id,
          label_number,
          package_id,
          product_name,
          strain,
          batch_id,
          batch_number,
          net_weight_grams,
          thc_percentage,
          cbd_percentage,
          qr_code_data,
          printed_at,
          voided_at,
          created_at
        `)
        .in('id', labelIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      errorService.handle(error, 'Get labels for order');
      return { data: null, error };
    }
  },

  /**
   * Get labels for package assignments by order item ID
   */
  async getLabelsByOrderItem(orderItemId: string) {
    try {
      // First get label IDs from assignments for this order item
      const { data: assignments, error: assignmentsError } = await supabase
        .from('package_assignments')
        .select('label_id')
        .eq('order_item_id', orderItemId)
        .not('label_id', 'is', null);

      if (assignmentsError) throw assignmentsError;

      const labelIds = (assignments || []).map(a => a.label_id).filter(Boolean);

      if (labelIds.length === 0) {
        return { data: [], error: null };
      }

      // Fetch label details with additional fields
      const { data, error } = await supabase
        .from('labels')
        .select(`
          id,
          label_number,
          package_id,
          product_name,
          strain,
          batch_id,
          batch_number,
          net_weight_grams,
          thc_percentage,
          cbd_percentage,
          qr_code_data,
          printed_at,
          voided_at,
          created_at,
          last_printed_at,
          print_count,
          dominance_type
        `)
        .in('id', labelIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      errorService.handle(error, 'Get labels for order item');
      return { data: null, error };
    }
  },
};
