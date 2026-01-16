/**
 * Variance Log Service
 *
 * Service for managing inventory variance logs.
 * Handles creation, retrieval, and analysis of variance records.
 */

import { supabase } from '@/lib/supabase';
import type { VarianceRecordRequest, VarianceRecord, VarianceLogFilters } from '../types/variance.types';

/**
 * Create a new variance log entry
 */
export async function createVarianceLog(request: VarianceRecordRequest): Promise<VarianceRecord> {
  const { data, error } = await supabase
    .from('inventory_variance_log')
    .insert({
      inventory_id: request.inventory_id,
      audit_session_id: request.audit_session_id,
      expected_qty: request.expected_qty,
      actual_qty: request.actual_qty,
      variance_qty: request.variance_qty,
      variance_percentage: request.variance_percentage,
      reason: request.reason,
      notes: request.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data as VarianceRecord;
}

/**
 * Get variance logs with optional filters
 */
export async function getVarianceLogs(filters?: VarianceLogFilters): Promise<VarianceRecord[]> {
  let query = supabase
    .from('inventory_variance_log')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.inventory_id) {
    query = query.eq('inventory_id', filters.inventory_id);
  }
  if (filters?.audit_session_id) {
    query = query.eq('audit_session_id', filters.audit_session_id);
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
  return (data || []) as VarianceRecord[];
}

/**
 * Get variance log by ID
 */
export async function getVarianceLogById(id: string): Promise<VarianceRecord> {
  const { data, error } = await supabase
    .from('inventory_variance_log')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as VarianceRecord;
}

/**
 * Delete variance log entry
 */
export async function deleteVarianceLog(id: string): Promise<void> {
  const { error } = await supabase.from('inventory_variance_log').delete().eq('id', id);

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
