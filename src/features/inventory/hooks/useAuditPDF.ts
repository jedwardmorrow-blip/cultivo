import { useState, useCallback } from 'react';
import { buildAuditSheetData } from '../services/auditPDF.service';
import { notificationService } from '@/services/notification.service';
import type { InventoryAudit, InventoryAuditLine } from '../types/audit.types';

/**
 * useAuditPDF
 *
 * Generates PDF documents for audit sheets and reports.
 * Creates printable audit forms with barcode/QR codes.
 *
 * @returns {Object} PDF generation state and functions
 *
 * @example
 * const { generating, generateAuditSheet, generateAuditReport } = useAuditPDF();
 */

export function useAuditPDF() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAuditSheet = useCallback(async (auditId: string) => {
    try {
      setGenerating(true);
      setError(null);

      await buildAuditSheetData(auditId);

      notificationService.success('Audit sheet generated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate audit sheet';
      setError(errorMessage);
      notificationService.error(errorMessage);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  const generateAuditReport = useCallback(
    async (_auditId: string) => {
      try {
        setGenerating(true);
        setError(null);

        // Use browser print functionality
        window.print();

        notificationService.success('Audit report generated successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate audit report';
        setError(errorMessage);
        notificationService.error(errorMessage);
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  return {
    generating,
    error,
    generateAuditSheet,
    generateAuditReport,
  };
}
