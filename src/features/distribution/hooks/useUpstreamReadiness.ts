/**
 * useUpstreamReadiness — reads batches that are upstream of distribution
 * (curing, pending sampling, in testing) and surfaces their landing
 * window. Powers the UpstreamReadinessPanel.
 *
 * Data source: batch_registry directly (no v_batch_lifecycle view exists).
 *
 * Filters on coa_status IN ('curing', 'pending_sampling',
 * 'testing_in_progress'). Days-to-ready is computed from
 * cure_expected_complete_date when present, otherwise cure_start_date + 14d
 * fallback. Returns at most 5 visible cohorts (UI shows
 * "and N more" when truncated).
 *
 * Sort order: stuck first, then landing (≤2 days), then normal.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type UpstreamState = 'landing' | 'normal' | 'stuck';

export interface UpstreamCohort {
  batchId: string;
  batchNumber: string;
  strainName: string;
  roomCode: string;
  stage: 'cure' | 'harvest' | 'lab';
  daysToReady: number; // negative = overdue (stuck), 0 = today, positive = days remaining
  state: UpstreamState;
  weightLbs: number | null;
  coaStatus: string;
}

const VISIBLE_LIMIT = 5;

function diffDays(target: Date, now: Date): number {
  const ms = target.getTime() - now.getTime();
  return Math.round(ms / 86400000);
}

function classifyState(daysToReady: number, coaStatus: string): UpstreamState {
  // Stuck: ready date passed but still in upstream status
  if (daysToReady < 0) return 'stuck';
  // Landing: ready in next two days
  if (daysToReady <= 2) return 'landing';
  return 'normal';
}

function inferStage(coaStatus: string): UpstreamCohort['stage'] {
  if (coaStatus === 'curing') return 'cure';
  if (coaStatus === 'pending_sampling' || coaStatus === 'testing_in_progress') return 'lab';
  return 'cure';
}

export function useUpstreamReadiness() {
  const [cohorts, setCohorts] = useState<UpstreamCohort[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data, error, count } = await supabase
        .from('batch_registry')
        .select(
          `
          id,
          batch_number,
          strain,
          room,
          coa_status,
          cure_start_date,
          cure_expected_complete_date,
          fresh_frozen_weight_grams,
          initial_weight_grams
          `,
          { count: 'exact' },
        )
        .in('coa_status', ['curing', 'pending_sampling', 'testing_in_progress'])
        .order('cure_expected_complete_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const built: UpstreamCohort[] = (data || []).map((row: any) => {
        // Determine ready date: prefer cure_expected_complete_date,
        // else cure_start_date + 14 days
        let readyDate: Date | null = null;
        if (row.cure_expected_complete_date) {
          readyDate = new Date(row.cure_expected_complete_date);
        } else if (row.cure_start_date) {
          readyDate = new Date(row.cure_start_date);
          readyDate.setDate(readyDate.getDate() + 14);
        }

        const daysToReady = readyDate ? diffDays(readyDate, now) : 7;
        const grams = row.fresh_frozen_weight_grams || row.initial_weight_grams || 0;
        const weightLbs = grams > 0 ? Math.round((grams / 453.592) * 10) / 10 : null;

        return {
          batchId: row.id,
          batchNumber: row.batch_number || '—',
          strainName: row.strain || 'Unknown',
          roomCode: row.room || '—',
          stage: inferStage(row.coa_status),
          daysToReady,
          state: classifyState(daysToReady, row.coa_status),
          weightLbs,
          coaStatus: row.coa_status,
        };
      });

      // Sort: stuck → landing → normal; within group, soonest first
      const stateOrder: Record<UpstreamState, number> = { stuck: 0, landing: 1, normal: 2 };
      built.sort((a, b) => {
        const so = stateOrder[a.state] - stateOrder[b.state];
        if (so !== 0) return so;
        return a.daysToReady - b.daysToReady;
      });

      setCohorts(built.slice(0, VISIBLE_LIMIT));
      setTotalCount(count ?? built.length);
    } catch (err) {
      console.error('useUpstreamReadiness error:', err);
      setCohorts([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel('upstream-readiness-batch-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batch_registry' }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const overflowCount = Math.max(0, totalCount - cohorts.length);
  const landingCount = cohorts.filter((c) => c.state === 'landing').length;
  const stuckCount = cohorts.filter((c) => c.state === 'stuck').length;

  return {
    cohorts,
    totalCount,
    overflowCount,
    landingCount,
    stuckCount,
    loading,
    reload: load,
  };
}
