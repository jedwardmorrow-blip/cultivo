import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  generateCoversheet,
  getCoversheetByOrderId,
  getCoversheetPublicUrl
} from '../services';
import type { Coversheet } from '@/types';

interface UseCoversheetResult {
  coversheet: Coversheet | null;
  loading: boolean;
  error: Error | null;
  generating: boolean;
  generateNew: () => Promise<void>;
  copyUrl: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useCoversheet(orderId: string): UseCoversheetResult {
  const [coversheet, setCoversheet] = useState<Coversheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadCoversheet = useCallback(async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getCoversheetByOrderId(orderId);
      setCoversheet(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading coversheet:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const generateNew = useCallback(async () => {
    try {
      setGenerating(true);
      setError(null);
      const data = await generateCoversheet(orderId);
      setCoversheet(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error generating coversheet:', err);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, [orderId]);

  const copyUrl = useCallback(async () => {
    if (!coversheet?.access_token) return false;

    try {
      const url = getCoversheetPublicUrl(coversheet.access_token);
      await navigator.clipboard.writeText(url);
      return true;
    } catch (err) {
      console.error('Error copying URL:', err);
      return false;
    }
  }, [coversheet?.access_token]);

  const refresh = useCallback(async () => {
    await loadCoversheet();
  }, [loadCoversheet]);

  useEffect(() => {
    loadCoversheet();
  }, [loadCoversheet]);

  useEffect(() => {
    const channel = supabase
      .channel(`coversheet-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coversheets',
          filter: `order_id=eq.${orderId}`
        },
        () => {
          loadCoversheet();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, loadCoversheet]);

  return {
    coversheet,
    loading,
    error,
    generating,
    generateNew,
    copyUrl,
    refresh
  };
}
