/**
 * Coversheet Button Component
 *
 * Wrapper component for CoversheetActions that automatically fetches existing
 * coversheet data and provides a simplified interface for order views.
 *
 * This component:
 * - Fetches existing coversheet data for the order
 * - Renders CoversheetActions with appropriate props
 * - Handles loading and error states
 * - Refreshes data after generation/regeneration
 *
 * @component
 * @example
 * <CoversheetButton
 *   orderId="uuid-here"
 *   orderNumber="ORD-001"
 * />
 */

import { useEffect, useState } from 'react';
import { CoversheetActions } from './coversheet';
import { getCoversheetByOrderId } from '../services/coversheet.service';
import type { Coversheet } from '@/types';

interface CoversheetButtonProps {
  orderId: string;
  orderNumber: string;
}

/**
 * CoversheetButton Component
 *
 * Fetches and displays coversheet actions for an order.
 *
 * Features:
 * - Automatic data fetching on mount
 * - Refresh after generation/regeneration
 * - Loading state while fetching
 * - Error handling
 * - Pass-through to CoversheetActions component
 *
 * Design notes:
 * - Minimal wrapper to simplify usage in parent components
 * - All UI logic delegated to CoversheetActions
 * - Handles data fetching and state management
 */
export function CoversheetButton({ orderId }: CoversheetButtonProps) {
  const [coversheet, setCoversheet] = useState<Coversheet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch existing coversheet data
   */
  const fetchCoversheet = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getCoversheetByOrderId(orderId);
      setCoversheet(data);
    } catch (err) {
      console.error('Failed to fetch coversheet:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch coversheet');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch coversheet on component mount
   */
  useEffect(() => {
    fetchCoversheet();
  }, [orderId]);

  /**
   * Handle successful generation/regeneration
   * Refresh coversheet data to show updated state
   */
  const handleGenerated = (_url: string) => {
    // Refresh data to show new coversheet state
    fetchCoversheet();
  };

  // Show loading state while fetching initial data
  if (isLoading) {
    return (
      <div className="text-cult-lighter-gray text-sm">
        Loading coversheet data...
      </div>
    );
  }

  // Show error if data fetch failed (but still render actions)
  if (error && !coversheet) {
    return (
      <div className="text-cult-lighter-gray text-sm">
        <p className="mb-2">{error}</p>
        <CoversheetActions
          orderId={orderId}
          existingCoversheet={null}
          onGenerated={handleGenerated}
        />
      </div>
    );
  }

  // Render coversheet actions with fetched data
  return (
    <CoversheetActions
      orderId={orderId}
      existingCoversheet={coversheet}
      onGenerated={handleGenerated}
    />
  );
}
