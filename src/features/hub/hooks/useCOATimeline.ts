import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export type COAStatus =
  | 'curing'
  | 'pending_sampling'
  | 'testing_in_progress'
  | 'coa_received'
  | 'coa_failed'
  | 'available';

export interface COATimelineBatch {
  batch_id: string;
  batch_number: string;
  strain: string;
  harvest_date: string | null;
  coa_status: COAStatus;
  cure_expected_complete_date: string | null;
  testing_submitted_at: string | null;
  thc_percentage: number | null;
  cbd_percentage: number | null;
  // Derived
  days_until_available: number | null;
  bucket: 'available' | 'coa_received' | 'testing' | 'curing_soon' | 'curing' | 'failed';
}

const LAB_TURNAROUND_DAYS = 7;
const CURING_SOON_THRESHOLD_DAYS = 7;

function deriveBucket(batch: Omit<COATimelineBatch, 'days_until_available' | 'bucket'>): COATimelineBatch['bucket'] {
  switch (batch.coa_status) {
    case 'available': return 'available';
    case 'coa_received': return 'coa_received';
    case 'coa_failed': return 'failed';
    case 'testing_in_progress':
    case 'pending_sampling': return 'testing';
    case 'curing': {
      if (!batch.cure_expected_complete_date) return 'curing';
      const daysUntilCureComplete = Math.ceil(
        (new Date(batch.cure_expected_complete_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilCureComplete <= CURING_SOON_THRESHOLD_DAYS ? 'curing_soon' : 'curing';
    }
    default: return 'curing';
  }
}

function deriveDaysUntilAvailable(batch: Omit<COATimelineBatch, 'days_until_available' | 'bucket'>): number | null {
  switch (batch.coa_status) {
    case 'available':
    case 'coa_received':
      return 0;
    case 'coa_failed':
      return null;
    case 'testing_in_progress':
      return LAB_TURNAROUND_DAYS;
    case 'pending_sampling':
      return LAB_TURNAROUND_DAYS + 2;
    case 'curing': {
      if (!batch.cure_expected_complete_date) return null;
      const daysUntilCureComplete = Math.ceil(
        (new Date(batch.cure_expected_complete_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return Math.max(0, daysUntilCureComplete) + LAB_TURNAROUND_DAYS;
    }
    default: return null;
  }
}

export function useCOATimeline() {
  const [batches, setBatches] = useState<COATimelineBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('batch_with_coa_status')
        .select(`
          batch_id, batch_number, strain, harvest_date,
          coa_status, cure_expected_complete_date, testing_submitted_at,
          thc_percentage, cbd_percentage
        `)
        .in('batch_status', ['active', 'processing'])
        .order('cure_expected_complete_date', { ascending: true, nullsFirst: false });

      if (err) throw err;

      const result: COATimelineBatch[] = (data || []).map((row) => {
        const base = {
          batch_id: row.batch_id,
          batch_number: row.batch_number,
          strain: row.strain,
          harvest_date: row.harvest_date,
          coa_status: row.coa_status as COAStatus,
          cure_expected_complete_date: row.cure_expected_complete_date,
          testing_submitted_at: row.testing_submitted_at,
          thc_percentage: row.thc_percentage,
          cbd_percentage: row.cbd_percentage,
        };
        return {
          ...base,
          bucket: deriveBucket(base),
          days_until_available: deriveDaysUntilAvailable(base),
        };
      });

      setBatches(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load COA timeline');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const buckets = useMemo(() => ({
    available: batches.filter(b => b.bucket === 'available'),
    coa_received: batches.filter(b => b.bucket === 'coa_received'),
    testing: batches.filter(b => b.bucket === 'testing'),
    curing_soon: batches.filter(b => b.bucket === 'curing_soon'),
    curing: batches.filter(b => b.bucket === 'curing'),
    failed: batches.filter(b => b.bucket === 'failed'),
  }), [batches]);

  const stats = useMemo(() => ({
    available: buckets.available.length,
    readySoon: buckets.coa_received.length + buckets.testing.length + buckets.curing_soon.length,
    curing: buckets.curing.length,
    failed: buckets.failed.length,
    total: batches.length,
  }), [buckets, batches]);

  return { batches, buckets, stats, loading, error, reload: load };
}
