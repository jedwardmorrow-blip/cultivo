/**
 * useFinalizationWorkflow Hook
 *
 * Manages the manual finalization workflow for conversion packages.
 * Allows managers to explicitly approve session outputs and create packages.
 *
 * @module useFinalizationWorkflow
 */

import { useState, useCallback } from 'react';
import {
  PendingConversionSession,
  CreatePackageInput,
  ConversionPackage,
} from '@/types';
import {
  getPendingConversions,
  finalizeConversion,
  voidConversion,
} from '../services/conversions.service';
import { notificationService } from '@/services/notification.service';

export interface UseFinalizationWorkflowReturn {
  pendingSessions: PendingConversionSession[];
  isLoading: boolean;
  error: string | null;
  isFinalizing: boolean;
  isVoiding: boolean;

  fetchPendingSessions: (date?: string) => Promise<void>;

  handleFinalize: (params: {
    batch_id: string;
    product_id: string | null;   // Kept for conversion_packages compatibility
    product_name: string;          // NEW: Product name from session
    session_type: 'trim' | 'packaging' | 'bucking';
    session_ids: string[];
    packages: CreatePackageInput[];
    inventory_stage_id?: string;
  }) => Promise<ConversionPackage[]>;

  handleVoid: (params: {
    batch_id: string;
    product_name: string;  // Changed from product_id to product_name
    session_type: 'trim' | 'packaging' | 'bucking';
    void_reason: string;
  }) => Promise<void>;

  refetch: () => Promise<void>;
}

export function useFinalizationWorkflow(initialDate?: string): UseFinalizationWorkflowReturn {
  const [pendingSessions, setPendingSessions] = useState<PendingConversionSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [currentDate, setCurrentDate] = useState(initialDate);

  const fetchPendingSessions = useCallback(async (date?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const targetDate = date || currentDate;
      if (date) {
        setCurrentDate(date);
      }

      const sessions = await getPendingConversions(targetDate);
      setPendingSessions(sessions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pending conversions';
      setError(errorMessage);
      console.error('Error fetching pending conversions:', err);
      notificationService.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  const handleFinalize = useCallback(async (params: {
    batch_id: string;
    product_id: string | null;   // Kept for conversion_packages compatibility
    product_name: string;          // NEW: Product name from session
    session_type: 'trim' | 'packaging' | 'bucking';
    session_ids: string[];
    aggregation_id: string;  // Added: stable ID for linking packages to aggregation
    packages: CreatePackageInput[];
    inventory_stage_id?: string;
  }): Promise<ConversionPackage[]> => {
    try {
      setIsFinalizing(true);
      setError(null);

      const createdPackages = await finalizeConversion(params);

      const sessionCount = params.session_ids.length;
      const packageCount = createdPackages.length;

      notificationService.success(
        `Successfully finalized ${sessionCount} session(s) into ${packageCount} package(s)`
      );

      await fetchPendingSessions(currentDate);

      return createdPackages;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to finalize conversion';
      setError(errorMessage);
      console.error('Error finalizing conversion:', err);
      notificationService.error(errorMessage);
      throw err;
    } finally {
      setIsFinalizing(false);
    }
  }, [currentDate, fetchPendingSessions]);

  const handleVoid = useCallback(async (params: {
    batch_id: string;
    product_name: string;  // Changed from product_id to product_name
    session_type: 'trim' | 'packaging' | 'bucking';
    void_reason: string;
  }): Promise<void> => {
    try {
      setIsVoiding(true);
      setError(null);

      await voidConversion(params);

      notificationService.success('Sessions voided successfully');

      await fetchPendingSessions(currentDate);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to void sessions';
      setError(errorMessage);
      console.error('Error voiding sessions:', err);
      notificationService.error(errorMessage);
      throw err;
    } finally {
      setIsVoiding(false);
    }
  }, [currentDate, fetchPendingSessions]);

  const refetch = useCallback(() => {
    return fetchPendingSessions(currentDate);
  }, [currentDate, fetchPendingSessions]);

  return {
    pendingSessions,
    isLoading,
    error,
    isFinalizing,
    isVoiding,
    fetchPendingSessions,
    handleFinalize,
    handleVoid,
    refetch,
  };
}
