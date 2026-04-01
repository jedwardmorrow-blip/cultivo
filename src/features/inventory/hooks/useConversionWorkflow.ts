/**
 * useConversionWorkflow Hook - Simplified Hybrid Architecture
 *
 * Manages conversion workflow without complexity tables.
 * Directly creates packages and moves to inventory with review workflow.
 *
 * @module useConversionWorkflow
 */

import { useState, useCallback } from 'react';
import {
  ConversionPackage,
  PackageInProgress,
  VarianceReason,
  ConsolidatedPackageInput,
} from '@/types';
import {
  createConversionPackages,
  createConsolidatedPackage,
  finalizeConversionPackages,
  generateNextPackageId,
} from '../services/conversions.service';
import { notificationService } from '@/services/notification.service';

interface ConversionSummary {
  batch_id: string;
  product_id: string;
  strain_name: string;
  product_name: string;
  total_weight?: number;
  total_units?: number;
  session_count: number;
  source_session_ids: string[];
}

interface UseConversionWorkflowProps {
  conversion: ConversionSummary;
  onComplete: () => void;
  onError: (error: string) => void;
}

interface UseConversionWorkflowReturn {
  // Mode
  consolidateMode: boolean;
  toggleConsolidateMode: () => void;

  // Individual packages
  packages: PackageInProgress[];
  addPackage: () => Promise<void>;
  removePackage: (index: number) => void;
  updatePackage: (index: number, weight?: number, units?: number) => void;

  // Quantities
  allocatedWeight: number;
  allocatedUnits: number;
  remainingWeight: number;
  remainingUnits: number;

  // Variance
  hasVariance: boolean;
  varianceAmount: number;
  variancePercentage: number;
  varianceReason: VarianceReason | null;
  varianceNote: string;
  setVarianceReason: (reason: VarianceReason | null) => void;
  setVarianceNote: (note: string) => void;

  // Submission
  canSubmit: boolean;
  isSaving: boolean;
  errors: string[];
  submitConversion: () => Promise<void>;

  // Consolidation
  handleConsolidatedSubmit: (data: {
    package_id: string;
    weight?: number;
    units?: number;
    variance_reason?: VarianceReason;
    variance_notes?: string;
  }) => Promise<void>;

  // Finalization
  createdPackages: ConversionPackage[];
  showFinalization: boolean;
  isFinalized: boolean;
  isFinalizing: boolean;
  handleFinalization: () => Promise<void>;

  // Loading
  isLoading: boolean;
}

export function useConversionWorkflow({
  conversion,
  onComplete,
  onError,
}: UseConversionWorkflowProps): UseConversionWorkflowReturn {
  const isBulk = conversion.total_weight !== undefined;

  // Mode state
  const [consolidateMode, setConsolidateMode] = useState(false);

  // Package state
  const [packages, setPackages] = useState<PackageInProgress[]>([]);
  const [createdPackages, setCreatedPackages] = useState<ConversionPackage[]>([]);
  const [showFinalization, setShowFinalization] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);

  // Variance state
  const [varianceReason, setVarianceReason] = useState<VarianceReason | null>(null);
  const [varianceNote, setVarianceNote] = useState('');

  // Loading state
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Calculate quantities
  const expectedQuantity = isBulk
    ? (conversion.total_weight || 0)
    : (conversion.total_units || 0);

  const allocatedQuantity = packages.reduce(
    (sum, pkg) => sum + (isBulk ? (pkg.weight || 0) : (pkg.units || 0)),
    0
  );
  const remainingQuantity = expectedQuantity - allocatedQuantity;

  const allocatedWeight = isBulk ? allocatedQuantity : 0;
  const allocatedUnits = isBulk ? 0 : allocatedQuantity;
  const remainingWeight = isBulk ? remainingQuantity : 0;
  const remainingUnits = isBulk ? 0 : remainingQuantity;

  // Calculate variance
  const varianceAmount = allocatedQuantity - expectedQuantity;
  const variancePercentage =
    expectedQuantity === 0 ? 0 : (varianceAmount / expectedQuantity) * 100;
  const hasVariance = Math.abs(varianceAmount) > 0.1;

  // Validation
  const errors: string[] = [];
  if (packages.length === 0 && !consolidateMode) {
    errors.push('At least one package is required');
  }
  if (hasVariance && Math.abs(variancePercentage) > 5 && !varianceReason) {
    errors.push('Variance reason is required for differences over 5%');
  }

  const canSubmit = errors.length === 0 && packages.length > 0;

  // Toggle consolidate mode
  const toggleConsolidateMode = useCallback(() => {
    setConsolidateMode((prev) => !prev);
    setPackages([]); // Clear packages when switching modes
  }, []);

  // Add package (individual mode)
  const addPackage = useCallback(async () => {
    try {
      const packageId = await generateNextPackageId(conversion.batch_id);

      const newPackage: PackageInProgress = {
        temp_id: `temp-${Date.now()}`,
        package_id: packageId,
        weight: isBulk ? 0 : null,
        units: isBulk ? null : 0,
      };
      setPackages((prev) => [...prev, newPackage]);
    } catch (error) {
      console.error('Failed to generate package ID:', error);
      notificationService.error('Failed to generate package ID');
    }
  }, [conversion.batch_id, isBulk]);

  // Remove package
  const removePackage = useCallback((index: number) => {
    setPackages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Update package
  const updatePackage = useCallback((index: number, weight?: number, units?: number) => {
    setPackages((prev) =>
      prev.map((pkg, i) =>
        i === index
          ? {
              ...pkg,
              weight: weight !== undefined ? weight : pkg.weight,
              units: units !== undefined ? units : pkg.units,
            }
          : pkg
      )
    );
  }, []);

  // Submit conversion (individual packages)
  const submitConversion = useCallback(async () => {
    if (!canSubmit || isSaving) return;

    try {
      setIsSaving(true);
      notificationService.info(`Creating ${packages.length} package${packages.length !== 1 ? 's' : ''}...`);

      const result = await createConversionPackages(
        packages.map((pkg) => ({
          package_id: pkg.package_id,
          weight: pkg.weight || undefined,
          units: pkg.units || undefined,
        })),
        {
          batch_id: conversion.batch_id,
          product_id: conversion.product_id,
          source_session_ids: conversion.source_session_ids,
        }
      );

      setCreatedPackages(result);
      setShowFinalization(true);
      notificationService.success(
        `Created ${result.length} package${result.length !== 1 ? 's' : ''} successfully`
      );
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Conversion failed';
      let enhancedError = error;

      if (error.includes('unique constraint')) {
        enhancedError = 'Package ID already exists. Please refresh and try again.';
      } else if (error.includes('foreign key')) {
        enhancedError = 'Invalid batch or product reference.';
      } else if (error.includes('permission')) {
        enhancedError = 'You do not have permission to create packages.';
      }

      onError(enhancedError);
      notificationService.error(enhancedError);
    } finally {
      setIsSaving(false);
    }
  }, [canSubmit, isSaving, packages, conversion, onError]);

  // Handle consolidated submission
  const handleConsolidatedSubmit = useCallback(
    async (data: {
      package_id: string;
      weight?: number;
      units?: number;
      variance_reason?: VarianceReason;
      variance_notes?: string;
    }) => {
      if (isSaving) return;

      try {
        setIsSaving(true);
        notificationService.info(`Creating consolidated package ${data.package_id}...`);

        const input: ConsolidatedPackageInput = {
          batch_id: conversion.batch_id,
          product_id: conversion.product_id,
          package_id: data.package_id,
          weight: data.weight,
          units: data.units,
          expected_weight: isBulk ? expectedQuantity : undefined,
          expected_units: isBulk ? undefined : expectedQuantity,
          variance_reason: data.variance_reason,
          variance_notes: data.variance_notes,
          source_session_ids: conversion.source_session_ids,
        };

        const pkg = await createConsolidatedPackage(input);

        setCreatedPackages([pkg]);
        setShowFinalization(true);
        notificationService.success(`Package ${data.package_id} created successfully`);
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Consolidation failed';
        let enhancedError = error;

        if (error.includes('unique constraint')) {
          enhancedError = `Package ID ${data.package_id} already exists.`;
        } else if (error.includes('permission')) {
          enhancedError = 'You do not have permission to create packages.';
        }

        onError(enhancedError);
        notificationService.error(enhancedError);
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, conversion, isBulk, expectedQuantity, onError]
  );

  // Handle finalization
  const handleFinalization = useCallback(async () => {
    if (isFinalizing) return;

    try {
      setIsFinalizing(true);
      const packageIds = createdPackages.map(p => p.package_id);
      const packageCount = packageIds.length;

      notificationService.info(
        `Finalizing ${packageCount} package${packageCount !== 1 ? 's' : ''} to inventory...`
      );

      const result = await finalizeConversionPackages(packageIds);

      if (result.success) {
        setIsFinalized(true);
        notificationService.success(
          `Finalized ${result.packages_finalized} package${
            result.packages_finalized !== 1 ? 's' : ''
          } to inventory for review`
        );

        setTimeout(() => {
          onComplete();
        }, 1000);
      } else {
        throw new Error(result.error || 'Finalization failed');
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Finalization failed';
      let enhancedError = error;

      if (error.includes('not found')) {
        enhancedError = 'Packages not found.';
      } else if (error.includes('already finalized')) {
        enhancedError = 'These packages have already been finalized.';
      } else if (error.includes('permission')) {
        enhancedError = 'You do not have permission to finalize packages.';
      }

      onError(enhancedError);
      notificationService.error(enhancedError);
    } finally {
      setIsFinalizing(false);
    }
  }, [isFinalizing, createdPackages, onError, onComplete]);

  const isLoading = isSaving || isFinalizing;

  return {
    // Mode
    consolidateMode,
    toggleConsolidateMode,

    // Packages
    packages,
    addPackage,
    removePackage,
    updatePackage,

    // Quantities
    allocatedWeight,
    allocatedUnits,
    remainingWeight,
    remainingUnits,

    // Variance
    hasVariance,
    varianceAmount,
    variancePercentage,
    varianceReason,
    varianceNote,
    setVarianceReason,
    setVarianceNote,

    // Submission
    canSubmit,
    isSaving,
    errors,
    submitConversion,
    handleConsolidatedSubmit,

    // Finalization
    createdPackages,
    showFinalization,
    isFinalized,
    isFinalizing,
    handleFinalization,

    // Loading
    isLoading,
  };
}
