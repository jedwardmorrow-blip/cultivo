/**
 * Inventory Audit System Types
 *
 * Defines TypeScript types for the AZDHS-compliant inventory audit system.
 * This system manages physical inventory counts, variance tracking, and
 * compliance reporting with proper audit trails.
 *
 * @module audit.types
 */

import { Database } from '@/lib/database/database.types';

// =====================================================
// DATABASE RECORD TYPES
// =====================================================

/**
 * Inventory Audit Record
 *
 * Represents a complete audit lifecycle from initiation to completion.
 * One audit at a time, can cover multiple inventory stages.
 */
export type InventoryAudit = Database['public']['Tables']['inventory_audits']['Row'];
export type InventoryAuditInsert = Database['public']['Tables']['inventory_audits']['Insert'];
export type InventoryAuditUpdate = Database['public']['Tables']['inventory_audits']['Update'];

/**
 * Inventory Audit Line Record
 *
 * Represents a single line item on an audit sheet.
 * Contains snapshot of expected quantity and actual counted quantity.
 */
export type InventoryAuditLine = Database['public']['Tables']['inventory_audit_lines']['Row'];
export type InventoryAuditLineInsert = Database['public']['Tables']['inventory_audit_lines']['Insert'];
export type InventoryAuditLineUpdate = Database['public']['Tables']['inventory_audit_lines']['Update'];

// =====================================================
// ENUM TYPES
// =====================================================

/**
 * Audit Status
 *
 * Lifecycle states of an inventory audit
 */
export type AuditStatus = 'initiated' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Inventory Stage Selection
 *
 * Stages that can be audited
 */
export type AuditStageSelection = 'Binned' | 'Bucked' | 'Bulk' | 'Packaged';

// =====================================================
// REQUEST/RESPONSE TYPES
// =====================================================

/**
 * Audit Initiation Request
 *
 * Data required to start a new audit
 */
export interface AuditInitiationRequest {
  selected_stages: AuditStageSelection[];
  notes?: string;
}

/**
 * Audit Initiation Response
 *
 * Result of audit creation
 */
export interface AuditInitiationResponse {
  audit_id: string;
  audit_number: string;
  total_packages: number;
  selected_stages: string[];
}

/**
 * Audit Line Update Request
 *
 * Data for updating a single audit line
 */
export interface AuditLineUpdateRequest {
  line_id: string;
  actual_qty: number;
  variance_reason?: string;
  variance_notes?: string;
}

/**
 * Add Package to Audit Request
 *
 * Data for adding a newly discovered package during audit
 */
export interface AddPackageToAuditRequest {
  audit_id: string;
  package_id: string;
  product_name: string;
  strain?: string;
  batch?: string;
  room?: string;
  stage: string;
  actual_qty: number;
  unit: 'g' | 'unit';
  variance_reason: string;
  variance_notes?: string;
}

/**
 * Audit Completion Summary
 *
 * Result of completing an audit
 */
export interface AuditCompletionSummary {
  audit_id: string;
  audit_number: string;
  adjustments_applied: number;
  variance_logs_created: number;
  completed_at: string;
}

/**
 * Audit Cancellation Request
 *
 * Data for cancelling an audit
 */
export interface AuditCancellationRequest {
  audit_id: string;
  cancellation_reason: string;
}

// =====================================================
// VIEW/EXTENDED TYPES
// =====================================================

/**
 * Audit with Statistics
 *
 * Enhanced audit record with computed statistics
 */
export interface AuditWithStats extends InventoryAudit {
  total_lines: number;
  confirmed_lines: number;
  unconfirmed_lines: number;
  lines_with_variance: number;
  progress_percentage: number;
}

/**
 * Audit Line with Computed Fields
 *
 * Audit line with additional computed properties
 */
export interface AuditLineWithComputed extends InventoryAuditLine {
  variance_severity: 'low' | 'medium' | 'high' | 'critical';
  requires_reason: boolean;
}

// =====================================================
// UI STATE TYPES
// =====================================================

/**
 * Audit Entry Form State
 *
 * State for the audit entry interface
 */
export interface AuditEntryState {
  audit: InventoryAudit | null;
  lines: InventoryAuditLine[];

  // Filters
  showConfirmed: boolean;
  searchTerm: string;
  stageFilter: string | null;

  // Statistics
  totalPackages: number;
  countedPackages: number;
  varianceCount: number;

  // UI state
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Selected line for editing
  selectedLineId: string | null;
}

/**
 * Audit Line Edit State
 *
 * State for editing a single audit line
 */
export interface AuditLineEditState {
  line: InventoryAuditLine;
  actualQty: string;
  varianceReason: string;
  varianceNotes: string;
  isValid: boolean;
  errors: {
    actualQty?: string;
    varianceReason?: string;
    varianceNotes?: string;
  };
}

// =====================================================
// FILTER & SEARCH TYPES
// =====================================================

/**
 * Audit History Filters
 *
 * Filters for browsing completed audits
 */
export interface AuditHistoryFilters {
  start_date?: string;
  end_date?: string;
  status?: AuditStatus[];
  stages?: AuditStageSelection[];
  initiated_by?: string;
  search?: string;
}

/**
 * Audit Sort Options
 */
export type AuditSortField = 'audit_number' | 'initiated_at' | 'completed_at' | 'total_packages' | 'packages_with_variance';

export interface AuditSort {
  field: AuditSortField;
  direction: 'asc' | 'desc';
}

// =====================================================
// LOCK STATUS TYPES
// =====================================================

/**
 * Stage Lock Status
 *
 * Result of checking if stages are locked
 */
export interface StageLockStatus {
  is_locked: boolean;
  locked_by_audit: string | null;
  audit_number: string | null;
  locked_stages?: string[];
}

/**
 * Active Audit Info
 *
 * Information about currently active audit
 */
export interface ActiveAuditInfo {
  audit_id: string;
  audit_number: string;
  status: AuditStatus;
  initiated_by: string;
  initiated_at: string;
  selected_stages: string[];
  is_locked: boolean;
}

// =====================================================
// PDF GENERATION TYPES
// =====================================================

/**
 * Audit Sheet Configuration
 *
 * Configuration for generating audit PDF sheet
 */
export interface AuditSheetConfig {
  audit_number: string;
  audit_date: string;
  selected_stages: string[];
  company_logo?: string;
  company_name: string;
}

/**
 * Audit Sheet Line Item
 *
 * Line item for PDF generation (organized and sorted)
 */
export interface AuditSheetLineItem {
  package_id: string;
  product_name: string;
  strain: string;
  batch: string;
  room: string;
  expected_qty: number;
  unit: string;
  stage: string;
}

/**
 * Audit Sheet Data
 *
 * Complete data structure for PDF generation
 */
export interface AuditSheetData {
  config: AuditSheetConfig;
  lines_by_stage: Record<string, AuditSheetLineItem[]>;
}

// =====================================================
// STATISTICS TYPES
// =====================================================

/**
 * Audit Statistics
 *
 * Summary statistics for audit dashboard
 */
export interface AuditStatistics {
  total_audits: number;
  completed_audits: number;
  active_audit: ActiveAuditInfo | null;

  // Recent metrics (last 30 days)
  recent_audit_count: number;
  recent_variance_count: number;
  recent_average_variance_percentage: number;

  // By stage
  audits_by_stage: Record<string, number>;

  // Last audit
  last_audit_date: string | null;
  last_audit_number: string | null;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Calculate variance severity based on percentage
 */
export function getVarianceSeverity(percentage: number): 'low' | 'medium' | 'high' | 'critical' {
  const abs = Math.abs(percentage);
  if (abs < 1) return 'low';
  if (abs < 3) return 'medium';
  if (abs < 5) return 'high';
  return 'critical';
}

/**
 * Get color class for variance severity
 */
export function getVarianceColorClass(severity: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (severity) {
    case 'low':
      return 'text-green-600 bg-green-50';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50';
    case 'high':
      return 'text-orange-600 bg-orange-50';
    case 'critical':
      return 'text-red-600 bg-red-50';
  }
}

/**
 * Check if variance reason is required
 */
export function requiresVarianceReason(varianceQty: number): boolean {
  return Math.abs(varianceQty) > 0;
}

/**
 * Format audit stage name for display
 */
export function formatStageName(stage: string): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

/**
 * Calculate audit progress percentage
 */
export function calculateAuditProgress(totalLines: number, confirmedLines: number): number {
  if (totalLines === 0) return 0;
  return Math.round((confirmedLines / totalLines) * 100);
}
