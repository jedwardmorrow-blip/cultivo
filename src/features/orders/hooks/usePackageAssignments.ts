import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  packageAssignmentService,
  labelAutoFillService,
  type AvailablePackage,
  type PackageAssignmentWithDetails
} from '../services';
import { notificationService } from '@/services/notification.service';

/**
 * Hook to fetch available packages for a product
 */
export function useAvailablePackages(productName: string, requiredQty: number) {
  const [packages, setPackages] = useState<AvailablePackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const fetchPackages = useCallback(async () => {
    if (!productName || !isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const data = await packageAssignmentService.getAvailablePackagesForProduct(
        productName,
        requiredQty
      );

      if (isMountedRef.current) {
        setPackages(data);
      }
    } catch (err) {
      console.error('[useAvailablePackages] Error:', err);
      if (isMountedRef.current) {
        setError(err as Error);
        setPackages([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [productName, requiredQty]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchPackages();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchPackages]);

  return { packages, loading, error, refetch: fetchPackages };
}

/**
 * Hook to fetch package assignments for an order with real-time updates
 */
export function useOrderPackageAssignments(orderId: string) {
  const [assignments, setAssignments] = useState<PackageAssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const loadAssignments = useCallback(async () => {
    if (!orderId || !isMountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const data = await packageAssignmentService.getPackageAssignmentsForOrder(orderId);

      if (isMountedRef.current) {
        setAssignments(data);
      }
    } catch (err) {
      console.error('[useOrderPackageAssignments] Error:', err);
      if (isMountedRef.current) {
        setError(err as Error);
        setAssignments([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [orderId]);

  useEffect(() => {
    isMountedRef.current = true;
    loadAssignments();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`package-assignments-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'package_assignments',
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          if (isMountedRef.current) {
            loadAssignments();
          }
        }
      )
      .subscribe();

    return () => {
      isMountedRef.current = false;
      channel.unsubscribe();
    };
  }, [orderId, loadAssignments]);

  return { assignments, loading, error, refetch: loadAssignments };
}

/**
 * Hook to fetch package assignments for a specific order item
 */
export function useOrderItemPackageAssignments(orderItemId: string) {
  const [assignments, setAssignments] = useState<PackageAssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const loadAssignments = useCallback(async () => {
    if (!orderItemId || !isMountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const data = await packageAssignmentService.getPackageAssignmentsForOrderItem(orderItemId);

      if (isMountedRef.current) {
        setAssignments(data);
      }
    } catch (err) {
      console.error('[useOrderItemPackageAssignments] Error:', err);
      if (isMountedRef.current) {
        setError(err as Error);
        setAssignments([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [orderItemId]);

  useEffect(() => {
    isMountedRef.current = true;
    loadAssignments();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`package-assignments-item-${orderItemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'package_assignments',
          filter: `order_item_id=eq.${orderItemId}`,
        },
        () => {
          if (isMountedRef.current) {
            loadAssignments();
          }
        }
      )
      .subscribe();

    return () => {
      isMountedRef.current = false;
      channel.unsubscribe();
    };
  }, [orderItemId, loadAssignments]);

  return { assignments, loading, error, refetch: loadAssignments };
}

/**
 * Hook to assign a package to an order item
 */
export function useAssignPackage() {
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const assignPackage = useCallback(
    async (
      orderId: string,
      orderItemId: string,
      packageId: string,
      quantityAssigned: number,
      notes?: string,
      autoGenerateLabel: boolean = true
    ) => {
      setAssigning(true);
      setError(null);

      try {
        // Create the assignment
        const assignment = await packageAssignmentService.assignPackageToOrderItem(
          orderId,
          orderItemId,
          packageId,
          quantityAssigned,
          notes
        );

        // Automatically generate label if requested
        if (autoGenerateLabel) {
          try {
            const label = await labelAutoFillService.createLabelForAssignment(assignment.id);
            notificationService.success(
              `Package ${packageId} assigned with label ${label.label_number}`
            );
          } catch (labelError) {
            console.error('[useAssignPackage] Label generation failed:', labelError);
            notificationService.warning(
              `Package assigned but label generation failed. You can generate it manually.`
            );
          }
        } else {
          notificationService.success(`Package ${packageId} assigned successfully`);
        }

        return assignment;
      } catch (err) {
        console.error('[useAssignPackage] Error:', err);
        setError(err as Error);

        const errorMessage = (err as Error).message || 'Failed to assign package';
        notificationService.error(errorMessage);

        throw err;
      } finally {
        setAssigning(false);
      }
    },
    []
  );

  return { assignPackage, assigning, error };
}

/**
 * Hook to remove a package assignment
 */
export function useRemoveAssignment() {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const removeAssignment = useCallback(
    async (assignmentId: string, voidLabel: boolean = false) => {
      setRemoving(true);
      setError(null);

      try {
        await packageAssignmentService.removePackageAssignment(assignmentId, voidLabel);

        notificationService.success(
          voidLabel
            ? 'Assignment removed and label voided'
            : 'Assignment removed successfully'
        );
      } catch (err) {
        console.error('[useRemoveAssignment] Error:', err);
        setError(err as Error);

        const errorMessage = (err as Error).message || 'Failed to remove assignment';
        notificationService.error(errorMessage);

        throw err;
      } finally {
        setRemoving(false);
      }
    },
    []
  );

  return { removeAssignment, removing, error };
}

/**
 * Hook to get total assigned quantity for an order item
 */
export function useTotalAssignedQuantity(orderItemId: string) {
  const [totalAssigned, setTotalAssigned] = useState(0);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  const fetchTotal = useCallback(async () => {
    if (!orderItemId || !isMountedRef.current) return;

    try {
      setLoading(true);
      const total = await packageAssignmentService.getTotalAssignedQuantity(orderItemId);

      if (isMountedRef.current) {
        setTotalAssigned(total);
      }
    } catch (err) {
      console.error('[useTotalAssignedQuantity] Error:', err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [orderItemId]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchTotal();

    // Subscribe to changes
    const channel = supabase
      .channel(`assignments-total-${orderItemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'package_assignments',
          filter: `order_item_id=eq.${orderItemId}`,
        },
        () => {
          if (isMountedRef.current) {
            fetchTotal();
          }
        }
      )
      .subscribe();

    return () => {
      isMountedRef.current = false;
      channel.unsubscribe();
    };
  }, [orderItemId, fetchTotal]);

  return { totalAssigned, loading, refetch: fetchTotal };
}
