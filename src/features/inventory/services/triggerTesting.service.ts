/**
 * Trigger Testing Service
 *
 * Service for testing and validating database triggers.
 * Provides functions to run automated tests, check trigger health,
 * simulate scenarios, and view error logs.
 *
 * @module triggerTesting.service
 */

import { supabase } from '@/lib/supabase';

// =====================================================
// TYPES
// =====================================================

export interface TriggerHealthStatus {
  trigger_name: string;
  status: string;
  enabled: boolean;
  last_execution: string | null;
  total_movements: number;
  movements_last_24h: number;
  errors_last_24h: number;
  error_rate_24h: number;
}

export interface TriggerTestResult {
  test_name: string;
  status: string;
  expected_qty: number;
  actual_qty: number;
  passed: boolean;
}

export interface ScenarioStep {
  step: string;
  action: string;
  result: string;
}

export interface MovementMetric {
  time_bucket: string;
  movement_count: number;
  avg_qty: number;
  error_count: number;
  success_rate: number;
}

export interface PerformanceSummary {
  metric: string;
  value: number;
  unit: string;
  status: string;
}

export interface MovementError {
  id: string;
  movement_data: any;
  error_message: string;
  error_code: string | null;
  error_context: any;
  created_at: string;
  resolved_at: string | null;
}

export interface MovementStat {
  movement_kind: string;
  total_count: number;
  total_qty: number;
  avg_qty: number;
  min_qty: number;
  max_qty: number;
  unique_items: number;
  active_days: number;
  first_movement: string;
  last_movement: string;
}

// =====================================================
// TRIGGER HEALTH
// =====================================================

/**
 * Check trigger health status
 */
export async function checkTriggerHealth(): Promise<TriggerHealthStatus | null> {
  const { data, error } = await supabase
    .rpc('check_trigger_health')
    .single();

  if (error) {
    console.error('Error checking trigger health:', error);
    throw error;
  }

  return data;
}

/**
 * Get performance summary
 */
export async function getPerformanceSummary(): Promise<PerformanceSummary[]> {
  const { data, error } = await supabase
    .rpc('get_trigger_performance_summary');

  if (error) {
    console.error('Error getting performance summary:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get movement metrics for specified hours
 */
export async function getMovementMetrics(hours: number = 24): Promise<MovementMetric[]> {
  const { data, error } = await supabase
    .rpc('get_movement_metrics', { p_hours: hours });

  if (error) {
    console.error('Error getting movement metrics:', error);
    throw error;
  }

  return data || [];
}

// =====================================================
// AUTOMATED TESTING
// =====================================================

/**
 * Run automated trigger tests
 */
export async function runTriggerTests(): Promise<TriggerTestResult[]> {
  const { data, error } = await supabase
    .rpc('test_movement_trigger');

  if (error) {
    console.error('Error running trigger tests:', error);
    throw error;
  }

  return data || [];
}

/**
 * Simulate movement scenario
 */
export async function simulateScenario(scenarioName: 'production' | 'fulfillment' | 'reconciliation'): Promise<ScenarioStep[]> {
  const { data, error } = await supabase
    .rpc('simulate_movement_scenario', { scenario_name: scenarioName });

  if (error) {
    console.error('Error simulating scenario:', error);
    throw error;
  }

  return data || [];
}

// =====================================================
// ERROR MANAGEMENT
// =====================================================

/**
 * Get recent movement errors
 */
export async function getRecentErrors(limit: number = 50): Promise<MovementError[]> {
  const { data, error } = await supabase
    .rpc('get_recent_movement_errors', { p_limit: limit });

  if (error) {
    console.error('Error getting recent errors:', error);
    throw error;
  }

  return data || [];
}

/**
 * Resolve movement error
 */
export async function resolveError(errorId: string): Promise<void> {
  const { error } = await supabase
    .rpc('resolve_movement_error', { p_error_id: errorId });

  if (error) {
    console.error('Error resolving movement error:', error);
    throw error;
  }
}

// =====================================================
// STATISTICS
// =====================================================

/**
 * Get movement statistics by kind
 */
export async function getMovementStats(): Promise<MovementStat[]> {
  const { data, error } = await supabase
    .from('v_movement_stats')
    .select('*');

  if (error) {
    console.error('Error getting movement stats:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get daily movement volume (last 30 days)
 */
export async function getDailyVolume(): Promise<any[]> {
  const { data, error } = await supabase
    .from('v_daily_movement_volume')
    .select('*')
    .order('movement_date', { ascending: false });

  if (error) {
    console.error('Error getting daily volume:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get error rate trend
 */
export async function getErrorRateTrend(): Promise<any[]> {
  const { data, error } = await supabase
    .from('v_movement_error_rate')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error getting error rate trend:', error);
    throw error;
  }

  return data || [];
}

// =====================================================
// TRIGGER CONTROL (ADMIN ONLY)
// =====================================================

/**
 * Disable movement trigger (emergency)
 */
export async function disableTrigger(): Promise<string> {
  const { data, error } = await supabase
    .rpc('disable_movement_trigger');

  if (error) {
    console.error('Error disabling trigger:', error);
    throw error;
  }

  return data;
}

/**
 * Enable movement trigger
 */
export async function enableTrigger(): Promise<string> {
  const { data, error } = await supabase
    .rpc('enable_movement_trigger');

  if (error) {
    console.error('Error enabling trigger:', error);
    throw error;
  }

  return data;
}

/**
 * Complete rollback to direct updates (emergency)
 */
export async function rollbackToDirectUpdates(): Promise<string> {
  const { data, error } = await supabase
    .rpc('rollback_to_direct_updates');

  if (error) {
    console.error('Error rolling back:', error);
    throw error;
  }

  return data;
}
