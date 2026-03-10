import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';

/**
 * Dashboard Service
 *
 * Handles all database operations for dashboard widgets and metrics.
 */

/**
 * Fetches active production session counts
 *
 * @returns Promise<{ data: { trimSessions: number; packagingSessions: number } | null; error: any }>
 * @description Returns count of in-progress trim and packaging sessions
 */
export async function getActiveSessionCounts() {
  try {
    const [trimResult, packagingResult] = await Promise.all([
      supabase
        .from('trim_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('session_status', 'active'),
      supabase
        .from('packaging_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('session_status', 'active')
    ]);

    return {
      data: {
        trimSessions: trimResult.count || 0,
        packagingSessions: packagingResult.count || 0
      },
      error: null
    };
  } catch (error) {
    errorService.handle(error, 'Failed to load active session counts');
    return { data: null, error };
  }
}

/**
 * Fetches pending conversion lots
 *
 * @returns Promise<{ data: ConversionLot[] | null; error: any }>
 * @description Returns active conversion lots from RPC function
 */
export async function getPendingConversions() {
  try {
    const { data, error } = await supabase
      .rpc('get_conversion_lot_summary')
      .eq('status', 'active');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load pending conversions');
    return { data: null, error };
  }
}

/**
 * Fetches upcoming deliveries from order pipeline
 *
 * @returns Promise<{ data: Order[] | null; error: any }>
 * @description Returns processing/ready orders with delivery dates
 */
export async function getUpcomingDeliveries() {
  try {
    const { data, error } = await supabase
      .from('order_pipeline')
      .select('*')
      .in('status', ['processing', 'ready_for_delivery'])
      .not('requested_delivery_date', 'is', null)
      .order('requested_delivery_date');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load upcoming deliveries');
    return { data: null, error };
  }
}

/**
 * Fetches batch allocation overview
 *
 * @returns Promise<{ data: BatchAllocation[] | null; error: any }>
 * @description Returns batch inventory allocation by strain
 */
export async function getBatchAllocationOverview() {
  try {
    const { data, error } = await supabase
      .from('batch_allocation_overview')
      .select('*')
      .order('strain');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load batch allocation overview');
    return { data: null, error };
  }
}

/**
 * Fetches allocation health metrics
 *
 * @returns Promise<{ data: AllocationHealth | null; error: any }>
 * @description Returns over-allocation warnings and fulfillment status
 */
export async function getAllocationHealth() {
  try {
    const { data, error } = await supabase
      .from('order_workflow_summary')
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load allocation health');
    return { data: null, error };
  }
}

/**
 * Fetches order workflow status summary
 */
export async function getOrderWorkflowStatus() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('status')
      .eq('archived', false);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load order workflow status');
    return { data: null, error };
  }
}

/**
 * Fetches sales overview from order pipeline
 */
export interface PipelineRow {
  batch_id: string;
  batch_number: string;
  strain: string;
  stage: string | null;
  sort_order: number | null;
  weight_grams: number;
  unit_count: number;
  available_weight_grams: number;
  item_count: number;
}

export async function getInventoryPipeline() {
  try {
    const { data, error } = await supabase
      .from('v_batch_stage_balances')
      .select('batch_id, batch_number, strain, stage, sort_order, weight_grams, unit_count, available_weight_grams, item_count')
      .not('stage', 'is', null)
      .order('strain')
      .order('batch_number')
      .order('sort_order');

    if (error) throw error;
    return { data: data as PipelineRow[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load inventory pipeline');
    return { data: null, error };
  }
}

export async function getSalesOverview() {
  try {
    const { data, error } = await supabase
      .from('order_pipeline')
      .select('*')
      .eq('archived', false)
      .eq('is_sample', false)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to load sales overview');
    return { data: null, error };
  }
}
