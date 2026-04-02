/**
 * Analytics Service
 *
 * Handles all database queries for analytics and reporting features.
 * Centralizes access to analytics views and production summaries.
 */

import { supabase } from '@/lib/supabase';
import { errorService } from '@/services';

interface ThroughputData {
  metric_date: string;
  worker_type: string;
  total_workers: number;
  total_weight_grams: number;
  total_units: number;
  total_minutes: number;
  avg_grams_per_hour: number;
  avg_units_per_hour: number;
  total_sessions: number;
}

interface ConversionData {
  strain: string;
  from_stage: string;
  to_stage: string;
  actual_percentage: number;
  expected_percentage: number;
  variance_percentage: number;
  performance_status: string;
}

interface ConsolidatedPackage {
  id: string;
  package_id: string;
  package_date: string;
  strain: string;
  strain_abbreviation: string;
  product_stage: string;
  product_type: string;
  total_weight_grams: number;
  total_units: number;
  room: string;
  session_type: string;
  session_count: number;
  source_session_ids: string[];
  created_at: string;
}

interface PackageSource {
  id: string;
  session_id: string;
  session_type: string;
  session_date: string;
  contribution_weight_grams: number;
  contribution_units: number;
}

/**
 * Fetches daily throughput summary data for a date range
 *
 * @param startDate - Start date in ISO format (YYYY-MM-DD)
 * @param endDate - End date in ISO format (YYYY-MM-DD)
 * @returns Promise<{ data: ThroughputData[] | null; error: any }>
 * @description Returns worker productivity metrics aggregated by date
 */
export async function getThroughputSummary(startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase
      .from('daily_throughput_summary')
      .select('*')
      .gte('metric_date', startDate)
      .lte('metric_date', endDate)
      .order('metric_date', { ascending: false });

    if (error) throw error;
    return { data: data as ThroughputData[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to fetch throughput summary');
    return { data: null, error };
  }
}

/**
 * Fetches strain conversion analysis for a date range
 *
 * @param startDate - Start date in ISO format (YYYY-MM-DD)
 * @param endDate - End date in ISO format (YYYY-MM-DD)
 * @returns Promise<{ data: ConversionData[] | null; error: any }>
 * @description Returns actual vs expected conversion rates by strain and stage
 */
export async function getConversionAnalysis(startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase
      .from('strain_conversion_analysis')
      .select('*')
      .gte('analysis_date', startDate)
      .lte('analysis_date', endDate)
      .order('analysis_date', { ascending: false });

    if (error) throw error;
    return { data: data as ConversionData[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to fetch conversion analysis');
    return { data: null, error };
  }
}

/**
 * Fetches consolidated packages for a specific date
 *
 * @param date - Date in ISO format (YYYY-MM-DD)
 * @returns Promise<{ data: ConsolidatedPackage[] | null; error: any }>
 * @description Returns packages created on the date, grouped by strain/stage/type
 */
export async function getConsolidatedPackages(date: string) {
  try {
    const { data, error } = await supabase
      .from('consolidated_packages')
      .select('*')
      .eq('package_date', date)
      .order('strain')
      .order('product_stage')
      .order('product_type');

    if (error) throw error;
    return { data: data as ConsolidatedPackage[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to fetch consolidated packages');
    return { data: null, error };
  }
}

/**
 * Fetches package sources (contributing sessions) for a consolidated package
 *
 * @param packageId - Consolidated package UUID
 * @returns Promise<{ data: PackageSource[] | null; error: any }>
 * @description Returns sessions that contributed to the consolidated package
 */
export async function getPackageSources(packageId: string) {
  try {
    const { data, error } = await supabase
      .from('consolidated_package_sources')
      .select('*')
      .eq('consolidated_package_id', packageId)
      .order('session_date');

    if (error) throw error;
    return { data: data as PackageSource[], error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to fetch package sources');
    return { data: null, error };
  }
}

/**
 * Fetches completed trim sessions for a specific date
 *
 * @param date - Date in ISO format (YYYY-MM-DD)
 * @returns Promise<{ data: TrimSession[] | null; error: any }>
 * @description Returns trim sessions completed on the date
 */
export async function getCompletedTrimSessions(date: string) {
  try {
    const { data, error } = await supabase
      .from('trim_sessions')
      .select('*')
      .eq('session_date', date)
      .eq('session_status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to fetch trim sessions');
    return { data: null, error };
  }
}

/**
 * Fetches completed packaging sessions for a specific date
 *
 * @param date - Date in ISO format (YYYY-MM-DD)
 * @returns Promise<{ data: PackagingSession[] | null; error: any }>
 * @description Returns packaging sessions completed on the date
 */
export async function getCompletedPackagingSessions(date: string) {
  try {
    const { data, error } = await supabase
      .from('packaging_sessions')
      .select('*')
      .eq('session_date', date)
      .eq('session_status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    errorService.handle(error, 'Failed to fetch packaging sessions');
    return { data: null, error };
  }
}

/**
 * Fetch production data for a specific date (trim and packaging sessions)
 */
export async function getProductionData(date: string) {
  try {
    const [trimResult, packagingResult] = await Promise.all([
      getCompletedTrimSessions(date),
      getCompletedPackagingSessions(date)
    ]);

    return {
      trimSessions: trimResult.data || [],
      packagingSessions: packagingResult.data || [],
      error: trimResult.error || packagingResult.error
    };
  } catch (error) {
    errorService.handle(error, 'Failed to fetch production data');
    return {
      trimSessions: [],
      packagingSessions: [],
      error
    };
  }
}

// Export types for use in components
export type {
  ThroughputData,
  ConversionData,
  ConsolidatedPackage,
  PackageSource
};
