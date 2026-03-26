/**
 * Strain Analytics Service
 *
 * Single-query data source using the unified v_strain_analytics_summary view.
 * This view joins all strain intelligence server-side by strain_id,
 * eliminating the name-based join bugs from the 5-view approach.
 */

import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';
import type { StrainAnalyticsRow } from '../types';

/**
 * Fetches the unified strain analytics summary — one row per active strain
 * with cultivation, quality, throughput, inventory, demand, cost, grade,
 * and variance data pre-joined by strain_id.
 */
export async function getStrainAnalyticsSummary() {
  try {
    const { data, error } = await supabase
      .from('v_strain_analytics_summary')
      .select('*')
      .order('strain_name');

    if (error) throw error;
    return { data: data as StrainAnalyticsRow[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to fetch strain analytics');
    return { data: null, error };
  }
}
