import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { packageAssignmentService, type AvailablePackage } from '@/features/orders/services';
import { useAssignPackage } from '@/features/orders/hooks/usePackageAssignments';
import type { AssignmentDraft, BatchAllocationDraft, BatchAssignPreview, OrderLineItem } from '../types';

/**
 * Fetch available inventory packages for a given strain, optionally filtered
 * by product category. Uses inventory_items like the existing service,
 * but queries by strain instead of product_name.
 */
export function useAvailablePackagesForStrain(
  strainName: string,
  productCategory?: string
) {
  const [packages, setPackages] = useState<AvailablePackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const fetchPackages = useCallback(async () => {
    if (!strainName || !isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('inventory_items')
        .select('id, package_id, product_name, strain, batch, batch_number, available_qty, unit, status, room, package_date, thc_percentage, cbd_percentage')
        .ilike('strain', strainName)
        .gt('available_qty', 0)
        .in('status', ['Available', 'available', 'Reserved', 'reserved', 'Packaged', 'packaged'])
        .order('package_date', { ascending: false });

      // If a product category is specified, filter by product_name containing it
      // (e.g. "Flower" products include "3.5g Flower", "1oz Flower", etc.)
      if (productCategory && productCategory !== 'All') {
        query = query.ilike('product_name', `%${productCategory}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (isMountedRef.current) {
        setPackages((data as AvailablePackage[]) || []);
      }
    } catch (err) {
      console.error('[useAvailablePackagesForStrain] Error:', err);
      if (isMountedRef.current) {
        setError(err as Error);
        setPackages([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [strainName, productCategory]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchPackages();
    return () => { isMountedRef.current = false; };
  }, [fetchPackages]);

  return { packages, loading, error, refetch: fetchPackages };
}

/**
 * Core batch assign state machine.
 * Manages draft assignments, preview generation, and bulk commit.
 */
export function useBatchAssign() {
  const [drafts, setDrafts] = useState<AssignmentDraft[]>([]);
  const [batchDrafts, setBatchDrafts] = useState<BatchAllocationDraft[]>([]);
  const [step, setStep] = useState<'assign' | 'preview' | 'committing' | 'done'>('assign');
  const [commitProgress, setCommitProgress] = useState({ done: 0, total: 0 });
  const [commitErrors, setCommitErrors] = useState<string[]>([]);
  const { assignPackage, assigning } = useAssignPackage();

  // ─── Package draft callbacks (existing) ──────────────────────────────────

  /** Add a draft package assignment */
  const addDraft = useCallback((draft: Omit<AssignmentDraft, 'draftId'>) => {
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setDrafts(prev => [...prev, { ...draft, draftId }]);
  }, []);

  /** Remove a package draft by ID */
  const removeDraft = useCallback((draftId: string) => {
    setDrafts(prev => prev.filter(d => d.draftId !== draftId));
  }, []);

  /** Update quantity on an existing package draft */
  const updateDraftQty = useCallback((draftId: string, newQty: number) => {
    setDrafts(prev => prev.map(d =>
      d.draftId === draftId ? { ...d, quantityToAssign: newQty } : d
    ));
  }, []);

  // ─── Batch allocation draft callbacks (new) ──────────────────────────────

  /** Add a draft batch allocation (weight-based) */
  const addBatchDraft = useCallback((draft: Omit<BatchAllocationDraft, 'draftId'>) => {
    const draftId = `bdraft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setBatchDrafts(prev => [...prev, { ...draft, draftId }]);
  }, []);

  /** Remove a batch draft by ID */
  const removeBatchDraft = useCallback((draftId: string) => {
    setBatchDrafts(prev => prev.filter(d => d.draftId !== draftId));
  }, []);

  /** Update weight on an existing batch draft */
  const updateBatchDraftWeight = useCallback((draftId: string, newWeightGrams: number) => {
    setBatchDrafts(prev => prev.map(d =>
      d.draftId === draftId ? { ...d, weightGrams: newWeightGrams } : d
    ));
  }, []);

  // ─── Common flow ─────────────────────────────────────────────────────────

  /** Clear all drafts and reset to assign step */
  const reset = useCallback(() => {
    setDrafts([]);
    setBatchDrafts([]);
    setStep('assign');
    setCommitProgress({ done: 0, total: 0 });
    setCommitErrors([]);
  }, []);

  /** Total draft count across both types */
  const totalDraftCount = drafts.length + batchDrafts.length;

  /** Generate preview summary from current drafts */
  const preview: BatchAssignPreview = {
    drafts,
    batchDrafts,
    totalPackagesUsed: new Set(drafts.map(d => d.packageId)).size,
    totalOrderItemsTouched: new Set([
      ...drafts.map(d => d.orderItemId),
      ...batchDrafts.map(d => d.orderItemId),
    ]).size,
    totalUnitsAssigned: drafts.reduce((sum, d) => sum + d.quantityToAssign, 0),
    totalBatchAllocations: batchDrafts.length,
    totalBatchWeightG: batchDrafts.reduce((sum, d) => sum + d.weightGrams, 0),
  };

  /** Move to preview step (requires at least one draft of either type) */
  const goToPreview = useCallback(() => {
    if (totalDraftCount === 0) return;
    setStep('preview');
  }, [totalDraftCount]);

  /** Go back to assign step from preview */
  const goBackToAssign = useCallback(() => {
    setStep('assign');
  }, []);

  /** Commit all draft assignments — packages first, then batch allocations */
  const commitAll = useCallback(async () => {
    const totalOps = drafts.length + batchDrafts.length;
    setStep('committing');
    setCommitProgress({ done: 0, total: totalOps });
    setCommitErrors([]);
    const errors: string[] = [];
    let completed = 0;

    // 1. Commit package assignments
    for (const d of drafts) {
      try {
        await assignPackage(
          d.orderId,
          d.orderItemId,
          d.packageId,
          d.quantityToAssign,
          `Batch assigned from production queue`,
          true // auto-generate label
        );
      } catch (err) {
        const msg = `Failed: ${d.packageLabel} → ${d.orderNumber} (${(err as Error).message})`;
        errors.push(msg);
        console.error('[useBatchAssign] Package assignment failed:', msg);
      }
      completed++;
      setCommitProgress({ done: completed, total: totalOps });
    }

    // 2. Commit batch allocations (INSERT into batch_allocations)
    if (batchDrafts.length > 0) {
      // Batch insert all allocations at once for atomicity
      const rows = batchDrafts.map(d => ({
        batch_id: d.batchId,
        order_item_id: d.orderItemId,
        allocation_stage: d.allocationStage,
        allocated_weight_grams: d.weightGrams,
        projected_final_weight_grams: null,
        status: 'pending',
      }));

      try {
        const { error: insertError } = await supabase
          .from('batch_allocations')
          .insert(rows);

        if (insertError) throw insertError;
        completed += batchDrafts.length;
      } catch (err) {
        // If bulk insert fails, try individually to maximize success
        for (const d of batchDrafts) {
          try {
            const { error: singleError } = await supabase
              .from('batch_allocations')
              .insert({
                batch_id: d.batchId,
                order_item_id: d.orderItemId,
                allocation_stage: d.allocationStage,
                allocated_weight_grams: d.weightGrams,
                projected_final_weight_grams: null,
                status: 'pending',
              });
            if (singleError) throw singleError;
          } catch (singleErr) {
            const msg = `Failed: ${d.batchNumber} → ${d.orderNumber} (${(singleErr as Error).message})`;
            errors.push(msg);
            console.error('[useBatchAssign] Batch allocation failed:', msg);
          }
          completed++;
          setCommitProgress({ done: completed, total: totalOps });
        }
      }
      setCommitProgress({ done: completed, total: totalOps });
    }

    setCommitErrors(errors);
    setStep('done');
  }, [drafts, batchDrafts, assignPackage]);

  // ─── Remaining capacity helpers ──────────────────────────────────────────

  /**
   * Get remaining available qty for a package after accounting for
   * already-drafted assignments against that package.
   */
  const getRemainingPackageQty = useCallback((packageId: string, packageAvailableQty: number) => {
    const draftedFromPackage = drafts
      .filter(d => d.packageId === packageId)
      .reduce((sum, d) => sum + d.quantityToAssign, 0);
    return packageAvailableQty - draftedFromPackage;
  }, [drafts]);

  /**
   * Get remaining available grams for a batch after accounting for
   * already-drafted batch allocations against that batch.
   */
  const getRemainingBatchCapacity = useCallback((batchId: string, batchAvailableG: number) => {
    const draftedFromBatch = batchDrafts
      .filter(d => d.batchId === batchId)
      .reduce((sum, d) => sum + d.weightGrams, 0);
    return batchAvailableG - draftedFromBatch;
  }, [batchDrafts]);

  /**
   * Get remaining needed qty for an order item after accounting for
   * already-drafted assignments (both package and batch) to that order item.
   */
  const getRemainingOrderItemQty = useCallback((orderItemId: string, originalNeeded: number) => {
    const draftedToItem = drafts
      .filter(d => d.orderItemId === orderItemId)
      .reduce((sum, d) => sum + d.quantityToAssign, 0);
    return originalNeeded - draftedToItem;
  }, [drafts]);

  /**
   * Get remaining needed grams for an order item after accounting for
   * already-drafted batch allocations to that order item.
   * Used by batch allocation UI — batch allocations are weight-based.
   */
  const getRemainingOrderItemGrams = useCallback((
    orderItemId: string,
    originalNeededG: number,
    weightPerUnitG: number
  ) => {
    // Subtract package drafts (unit-based, converted to grams)
    const packageDraftG = drafts
      .filter(d => d.orderItemId === orderItemId)
      .reduce((sum, d) => sum + d.quantityToAssign * weightPerUnitG, 0);
    // Subtract batch drafts (already in grams)
    const batchDraftG = batchDrafts
      .filter(d => d.orderItemId === orderItemId)
      .reduce((sum, d) => sum + d.weightGrams, 0);
    return Math.max(0, originalNeededG - packageDraftG - batchDraftG);
  }, [drafts, batchDrafts]);

  return {
    drafts,
    batchDrafts,
    step,
    preview,
    commitProgress,
    commitErrors,
    assigning,
    totalDraftCount,
    // Package draft actions
    addDraft,
    removeDraft,
    updateDraftQty,
    // Batch draft actions
    addBatchDraft,
    removeBatchDraft,
    updateBatchDraftWeight,
    // Flow
    reset,
    goToPreview,
    goBackToAssign,
    commitAll,
    // Capacity helpers
    getRemainingPackageQty,
    getRemainingBatchCapacity,
    getRemainingOrderItemQty,
    getRemainingOrderItemGrams,
  };
}
