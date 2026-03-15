import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { packageAssignmentService, type AvailablePackage } from '@/features/orders/services';
import { useAssignPackage } from '@/features/orders/hooks/usePackageAssignments';
import type { AssignmentDraft, BatchAssignPreview, OrderLineItem } from '../types';

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
  const [step, setStep] = useState<'assign' | 'preview' | 'committing' | 'done'>('assign');
  const [commitProgress, setCommitProgress] = useState({ done: 0, total: 0 });
  const [commitErrors, setCommitErrors] = useState<string[]>([]);
  const { assignPackage, assigning } = useAssignPackage();

  /** Add a draft assignment */
  const addDraft = useCallback((draft: Omit<AssignmentDraft, 'draftId'>) => {
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setDrafts(prev => [...prev, { ...draft, draftId }]);
  }, []);

  /** Remove a draft by ID */
  const removeDraft = useCallback((draftId: string) => {
    setDrafts(prev => prev.filter(d => d.draftId !== draftId));
  }, []);

  /** Update quantity on an existing draft */
  const updateDraftQty = useCallback((draftId: string, newQty: number) => {
    setDrafts(prev => prev.map(d =>
      d.draftId === draftId ? { ...d, quantityToAssign: newQty } : d
    ));
  }, []);

  /** Clear all drafts and reset to assign step */
  const reset = useCallback(() => {
    setDrafts([]);
    setStep('assign');
    setCommitProgress({ done: 0, total: 0 });
    setCommitErrors([]);
  }, []);

  /** Generate preview summary from current drafts */
  const preview: BatchAssignPreview = {
    drafts,
    totalPackagesUsed: new Set(drafts.map(d => d.packageId)).size,
    totalOrderItemsTouched: new Set(drafts.map(d => d.orderItemId)).size,
    totalUnitsAssigned: drafts.reduce((sum, d) => sum + d.quantityToAssign, 0),
  };

  /** Move to preview step */
  const goToPreview = useCallback(() => {
    if (drafts.length === 0) return;
    setStep('preview');
  }, [drafts.length]);

  /** Go back to assign step from preview */
  const goBackToAssign = useCallback(() => {
    setStep('assign');
  }, []);

  /** Commit all draft assignments sequentially */
  const commitAll = useCallback(async () => {
    setStep('committing');
    setCommitProgress({ done: 0, total: drafts.length });
    setCommitErrors([]);
    const errors: string[] = [];

    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i];
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
        console.error('[useBatchAssign] Assignment failed:', msg);
      }
      setCommitProgress({ done: i + 1, total: drafts.length });
    }

    setCommitErrors(errors);
    setStep('done');
  }, [drafts, assignPackage]);

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
   * Get remaining needed qty for an order item after accounting for
   * already-drafted assignments to that order item.
   */
  const getRemainingOrderItemQty = useCallback((orderItemId: string, originalNeeded: number) => {
    const draftedToItem = drafts
      .filter(d => d.orderItemId === orderItemId)
      .reduce((sum, d) => sum + d.quantityToAssign, 0);
    return originalNeeded - draftedToItem;
  }, [drafts]);

  return {
    drafts,
    step,
    preview,
    commitProgress,
    commitErrors,
    assigning,
    addDraft,
    removeDraft,
    updateDraftQty,
    reset,
    goToPreview,
    goBackToAssign,
    commitAll,
    getRemainingPackageQty,
    getRemainingOrderItemQty,
  };
}
