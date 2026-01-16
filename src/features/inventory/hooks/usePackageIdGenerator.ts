import { useState, useCallback } from 'react';

/**
 * usePackageIdGenerator
 *
 * Generates unique package IDs for new inventory items.
 * Uses timestamp and random string for uniqueness.
 *
 * @param {string} prefix - Optional prefix for package IDs
 * @returns {Object} Generator state and function
 *
 * @example
 * const { generatePackageId, lastGeneratedId } = usePackageIdGenerator('PKG');
 */

export function usePackageIdGenerator(prefix: string = 'PKG') {
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null);

  const generatePackageId = useCallback(() => {
    // Format: PREFIX-TIMESTAMP-RANDOM
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const packageId = `${prefix}-${timestamp}-${random}`;

    setLastGeneratedId(packageId);
    return packageId;
  }, [prefix]);

  const generateBatchIds = useCallback((count: number) => {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const sequence = i.toString().padStart(3, '0');
      ids.push(`${prefix}-${timestamp}-${sequence}-${random}`);
    }
    setLastGeneratedId(ids[ids.length - 1]);
    return ids;
  }, [prefix]);

  return {
    generatePackageId,
    generateBatchIds,
    lastGeneratedId,
  };
}
