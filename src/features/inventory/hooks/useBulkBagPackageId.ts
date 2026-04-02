/**
 * useBulkBagPackageId Hook
 *
 * Generates package IDs for bulk bags in the correct format: YYMMDD-STRAIN-NNN
 * Uses strain abbreviations from the strains table.
 * Supports generating multiple sequential IDs for batch creation.
 *
 * @module useBulkBagPackageId
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface BulkBagPackageIdGenerator {
  /**
   * Generate a single package ID with auto-incremented sequence
   */
  generatePackageId: () => Promise<string>;

  /**
   * Generate multiple package IDs with sequential numbering
   */
  generateBatchIds: (count: number) => Promise<string[]>;

  /**
   * Get the next available sequence number for preview
   */
  getNextSequence: () => Promise<number>;

  /**
   * Last generated ID for reference
   */
  lastGeneratedId: string | null;

  /**
   * Loading state while fetching strain data
   */
  isLoading: boolean;

  /**
   * Error state
   */
  error: string | null;
}

export function useBulkBagPackageId(
  batchId: string | null,
  strainId: string | null
): BulkBagPackageIdGenerator {
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null);
  const [strainAbbreviation, setStrainAbbreviation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch strain abbreviation when strainId changes
  useEffect(() => {
    if (!strainId) {
      setStrainAbbreviation(null);
      return;
    }

    const fetchStrainAbbreviation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('strains')
          .select('abbreviation')
          .eq('id', strainId)
          .single();

        if (fetchError) throw fetchError;

        setStrainAbbreviation(data.abbreviation || 'UNK');
      } catch (err) {
        console.error('Error fetching strain abbreviation:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch strain');
        setStrainAbbreviation('UNK');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStrainAbbreviation();
  }, [strainId]);

  /**
   * Get the next available sequence number by checking existing packages
   */
  const getNextSequence = useCallback(async (): Promise<number> => {
    if (!batchId || !strainAbbreviation) return 1;

    try {
      const today = new Date();
      const yy = today.getFullYear().toString().slice(-2);
      const mm = (today.getMonth() + 1).toString().padStart(2, '0');
      const dd = today.getDate().toString().padStart(2, '0');
      const datePrefix = `${yy}${mm}${dd}-${strainAbbreviation}`;

      // Query conversion_packages for packages starting with this date+strain
      const { data, error: queryError } = await supabase
        .from('conversion_packages')
        .select('package_id')
        .eq('batch_id', batchId)
        .ilike('package_id', `${datePrefix}-%`);

      if (queryError) throw queryError;

      if (!data || data.length === 0) return 1;

      // Extract sequence numbers from existing package IDs
      const sequences = data
        .map(pkg => {
          const match = pkg.package_id.match(/-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(seq => seq > 0);

      // Return next sequence (max + 1)
      const maxSequence = Math.max(...sequences, 0);
      return maxSequence + 1;
    } catch (err) {
      console.error('Error getting next sequence:', err);
      return 1;
    }
  }, [batchId, strainAbbreviation]);

  /**
   * Generate a single package ID
   */
  const generatePackageId = useCallback(async (): Promise<string> => {
    if (!strainAbbreviation) {
      throw new Error('Strain abbreviation not available');
    }

    const today = new Date();
    const yy = today.getFullYear().toString().slice(-2);
    const mm = (today.getMonth() + 1).toString().padStart(2, '0');
    const dd = today.getDate().toString().padStart(2, '0');

    const sequence = await getNextSequence();
    const seqStr = sequence.toString().padStart(3, '0');

    const packageId = `${yy}${mm}${dd}-${strainAbbreviation}-${seqStr}`;
    setLastGeneratedId(packageId);
    return packageId;
  }, [strainAbbreviation, getNextSequence]);

  /**
   * Generate multiple package IDs with sequential numbering
   */
  const generateBatchIds = useCallback(async (count: number): Promise<string[]> => {
    if (!strainAbbreviation) {
      throw new Error('Strain abbreviation not available');
    }

    if (count < 1) {
      throw new Error('Count must be at least 1');
    }

    const today = new Date();
    const yy = today.getFullYear().toString().slice(-2);
    const mm = (today.getMonth() + 1).toString().padStart(2, '0');
    const dd = today.getDate().toString().padStart(2, '0');

    const startSequence = await getNextSequence();
    const ids: string[] = [];

    for (let i = 0; i < count; i++) {
      const sequence = startSequence + i;
      const seqStr = sequence.toString().padStart(3, '0');
      const packageId = `${yy}${mm}${dd}-${strainAbbreviation}-${seqStr}`;
      ids.push(packageId);
    }

    setLastGeneratedId(ids[ids.length - 1]);
    return ids;
  }, [strainAbbreviation, getNextSequence]);

  return {
    generatePackageId,
    generateBatchIds,
    getNextSequence,
    lastGeneratedId,
    isLoading,
    error,
  };
}
