/**
 * useCombineWorkflow Hook
 *
 * Manages the workflow for combining multiple inventory packages.
 * Handles selection, validation, ID generation, variance confirmation, and execution.
 *
 * @module useCombineWorkflow
 */

import { useState, useCallback, useEffect } from 'react';
import {
  CombineStep,
  SelectedPackage,
  CombineValidationResult,
  VarianceReason,
  CombineResult,
} from '../types/combine.types';
import {
  validatePackagesForCombine,
  combineInventoryPackages,
} from '../services/combine.service';
import { notificationService } from '@/services/notification.service';

interface UseCombineWorkflowProps {
  preselectedPackages?: SelectedPackage[];
  onComplete: () => void;
  onClose: () => void;
}

interface UseCombineWorkflowReturn {
  // Current step
  step: CombineStep;
  goToStep: (step: CombineStep) => void;
  nextStep: () => void;
  previousStep: () => void;

  // Selected packages
  selectedPackages: SelectedPackage[];
  setSelectedPackages: (packages: SelectedPackage[]) => void;

  // Validation
  validation: CombineValidationResult | null;
  isValidating: boolean;
  validateSelection: () => Promise<void>;

  // New package ID
  newPackageId: string;
  setNewPackageId: (id: string) => void;
  generatePackageId: () => void;

  // Variance
  hasVariance: boolean;
  varianceAmount: number;
  variancePercentage: number;
  varianceReason: VarianceReason | null;
  varianceNote: string;
  setVarianceReason: (reason: VarianceReason | null) => void;
  setVarianceNote: (note: string) => void;

  // Execution
  isExecuting: boolean;
  result: CombineResult | null;
  executeCombine: () => Promise<void>;

  // UI State
  canProceed: boolean;
  error: string | null;
  clearError: () => void;
}

export function useCombineWorkflow({
  preselectedPackages = [],
  onComplete,
  onClose,
}: UseCombineWorkflowProps): UseCombineWorkflowReturn {
  // Step state
  const [step, setStep] = useState<CombineStep>('select_packages');

  // Package selection
  const [selectedPackages, setSelectedPackages] = useState<SelectedPackage[]>(
    preselectedPackages
  );

  // Validation
  const [validation, setValidation] = useState<CombineValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // New package ID
  const [newPackageId, setNewPackageId] = useState('');

  // Variance
  const [varianceReason, setVarianceReason] = useState<VarianceReason | null>(null);
  const [varianceNote, setVarianceNote] = useState('');

  // Execution
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<CombineResult | null>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Auto-validate when packages change
  useEffect(() => {
    if (selectedPackages.length >= 2) {
      validateSelection();
    } else {
      setValidation(null);
    }
  }, [selectedPackages]);

  // Auto-generate package ID when validation succeeds
  useEffect(() => {
    if (validation?.is_valid && !newPackageId && validation.summary) {
      generatePackageId();
    }
  }, [validation?.is_valid]);

  // Calculate variance from validation
  const hasVariance = false; // Will be calculated during execution
  const varianceAmount = 0; // Will be known after actual measurement
  const variancePercentage = 0;

  // Validate selected packages
  const validateSelection = useCallback(async () => {
    if (selectedPackages.length < 2) {
      setValidation(null);
      return;
    }

    try {
      setIsValidating(true);
      setError(null);

      const packageIds = selectedPackages.map((p) => p.id);
      const validationResult = await validatePackagesForCombine(packageIds);

      setValidation(validationResult);

      if (!validationResult.is_valid) {
        notificationService.error(validationResult.errors[0] || 'Validation failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Validation failed';
      setError(errorMsg);
      notificationService.error(errorMsg);
    } finally {
      setIsValidating(false);
    }
  }, [selectedPackages]);

  // Generate package ID
  const generatePackageId = useCallback(() => {
    if (!validation?.summary) return;

    const today = new Date();
    const yy = today.getFullYear().toString().slice(-2);
    const mm = (today.getMonth() + 1).toString().padStart(2, '0');
    const dd = today.getDate().toString().padStart(2, '0');

    // Extract strain code (first 3 chars or abbreviation)
    const strain = validation.summary.strain || 'XXX';
    const strainCode = strain.substring(0, 3).toUpperCase();

    const suggested = `${yy}${mm}${dd}-${strainCode}-COMBINED-001`;
    setNewPackageId(suggested);
  }, [validation?.summary]);

  // Execute combination
  const executeCombine = useCallback(async () => {
    if (!validation?.is_valid || !newPackageId.trim()) {
      notificationService.error('Invalid configuration');
      return;
    }

    try {
      setIsExecuting(true);
      setError(null);
      setStep('completing');

      const combineResult = await combineInventoryPackages({
        source_package_ids: selectedPackages.map((p) => p.id),
        new_package_id: newPackageId.trim(),
        variance_reason: varianceReason || undefined,
        notes: varianceNote.trim() || undefined,
      });

      if (!combineResult.success) {
        throw new Error(combineResult.error || 'Combination failed');
      }

      setResult(combineResult);
      setStep('complete');

      notificationService.success(
        `Combined ${combineResult.source_package_count} packages into ${combineResult.new_package_id}`
      );

      // Auto-close after success
      setTimeout(() => {
        onComplete();
        onClose();
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Combination failed';
      setError(errorMsg);
      setStep('confirm_variance'); // Go back to allow retry
      notificationService.error(errorMsg);
    } finally {
      setIsExecuting(false);
    }
  }, [
    validation,
    newPackageId,
    selectedPackages,
    varianceReason,
    varianceNote,
    onComplete,
    onClose,
  ]);

  // Step navigation
  const goToStep = useCallback((newStep: CombineStep) => {
    setStep(newStep);
    setError(null);
  }, []);

  const nextStep = useCallback(() => {
    const stepOrder: CombineStep[] = [
      'select_packages',
      'generate_id',
      'confirm_variance',
      'completing',
      'complete',
    ];
    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex < stepOrder.length - 1) {
      setStep(stepOrder[currentIndex + 1]);
      setError(null);
    }
  }, [step]);

  const previousStep = useCallback(() => {
    const stepOrder: CombineStep[] = [
      'select_packages',
      'generate_id',
      'confirm_variance',
      'completing',
      'complete',
    ];
    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex > 0) {
      setStep(stepOrder[currentIndex - 1]);
      setError(null);
    }
  }, [step]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Determine if can proceed
  const canProceed = (() => {
    switch (step) {
      case 'select_packages':
        return validation?.is_valid === true;
      case 'generate_id':
        return newPackageId.trim().length > 0;
      case 'confirm_variance':
        return true; // Can always proceed from variance confirmation
      case 'completing':
        return false; // Processing
      case 'complete':
        return false; // Done
      default:
        return false;
    }
  })();

  return {
    // Step management
    step,
    goToStep,
    nextStep,
    previousStep,

    // Package selection
    selectedPackages,
    setSelectedPackages,

    // Validation
    validation,
    isValidating,
    validateSelection,

    // Package ID
    newPackageId,
    setNewPackageId,
    generatePackageId,

    // Variance
    hasVariance,
    varianceAmount,
    variancePercentage,
    varianceReason,
    varianceNote,
    setVarianceReason,
    setVarianceNote,

    // Execution
    isExecuting,
    result,
    executeCombine,

    // UI State
    canProceed,
    error,
    clearError,
  };
}
