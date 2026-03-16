/**
 * Variance Log Service
 *
 * Service for managing inventory variance logs.
 * Handles creation, retrieval, and analysis of variance records.
 *
 * Table: variance_log (production)
 */

import { supabase } from '@/lib/supabase';
import type { VarianceLogFilters } from '../types/variance.types';

/**
 * Create a new variance log entry
 *
 * Accepts a plain object matching variance_log column names
 * and passes it through directly to Supabase.
 */
export async function createVarianceLog(request: Record<string, unknown>): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('variance_log')
    .insert(request)
    .select('id')
    .single();

  if (error) throw error;
  return data as { id: string };
}

/**
 * Get variance logs with optional filters
 */
export async function getVarianceLogs(filters?: VarianceLogFilters) {
  let query = supabase
    .from('variance_log')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.inventory_id) {
    query = query.eq('inventory_item_id', filters.inventory_id);
  }
  if (filters?.audit_session_id) {
    query = query.eq('source_id', filters.audit_session_id);
  }
  if (filters?.start_date) {
    query = query.gte('created_at', filters.start_date);
  }
  if (filters?.end_date) {
    query = query.lte('created_at', filters.end_date);
  }
  if (filters?.min_variance_percentage) {
    query = query.gte('variance_percentage', filters.min_variance_percentage);
  }

  const { data, error } = await query.limit(100);

  if (error) throw error;
  return data || [];
}

/**
 * Get variance log by ID
 */
export async function getVarianceLogById(id: string) {
  const { data, error } = await supabase
    .from('variance_log')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete variance log entry
 */
export async function deleteVarianceLog(id: string): Promise<void> {
  const { error } = await supabase.from('variance_log').delete().eq('id', id);

  if (error) throw error;
}

/**
 * Log a variance (alias for createVarianceLog)
 */
export const logVariance = createVarianceLog;

export const varianceLogService = {
  createVarianceLog,
  getVarianceLogs,
  getVarianceLogById,
  deleteVarianceLog,
  logVariance,
};
