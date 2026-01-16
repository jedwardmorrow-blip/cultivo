import { useState, useCallback } from 'react';
import {
  initiateAudit,
  getAuditLines,
  updateAuditLine,
  completeAudit as completeAuditService,
  cancelAudit as cancelAuditService,
} from '../services/audit.service';
import { notificationService } from '@/services/notification.service';
import type { InventoryAudit, InventoryAuditLine } from '../types/audit.types';

/**
 * useAudit
 *
 * Main hook for audit workflow orchestration.
 * Handles audit session creation, line management, and variance resolution.
 *
 * @returns {Object} Audit state and functions
 *
 * @example
 * const { session, lines, startAudit, updateLine, completeAudit } = useAudit();
 */

export function useAudit() {
  const [session, setSession] = useState<InventoryAudit | null>(null);
  const [lines, setLines] = useState<InventoryAuditLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAudit = useCallback(async (stages: string[]) => {
    try {
      setLoading(true);
      setError(null);

      const response = await initiateAudit({
        selected_stages: stages as any,
        notes: 'Audit started via UI',
      });

      // Fetch the created audit
      const auditLines = await getAuditLines(response.audit_id);
      setLines(auditLines);

      notificationService.success('Audit session started');

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start audit';
      setError(errorMessage);
      notificationService.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLine = useCallback(async (lineId: string, actualQty: number, varianceReason?: string) => {
    try {
      await updateAuditLine({
        line_id: lineId,
        actual_qty: actualQty,
        variance_reason: varianceReason,
      });

      // Refetch lines after update
      if (session) {
        const auditLines = await getAuditLines(session.id);
        setLines(auditLines);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update audit line';
      notificationService.error(errorMessage);
      throw err;
    }
  }, [session]);

  const completeAudit = useCallback(async (auditId: string) => {
    try {
      setLoading(true);
      setError(null);

      await completeAuditService(auditId);

      notificationService.success('Audit completed and variances recorded');
      setSession(null);
      setLines([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete audit';
      setError(errorMessage);
      notificationService.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelAudit = useCallback(async (auditId: string, reason: string) => {
    try {
      await cancelAuditService({ audit_id: auditId, cancellation_reason: reason });
      setSession(null);
      setLines([]);
      notificationService.info('Audit cancelled');
    } catch (err) {
      console.error('Error cancelling audit:', err);
    }
  }, []);

  return {
    session,
    lines,
    loading,
    error,
    startAudit,
    updateLine,
    completeAudit,
    cancelAudit,
  };
}
