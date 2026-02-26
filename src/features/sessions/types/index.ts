import { Database } from '@/lib/database';

/**
 * Production Session Types
 *
 * All session types follow consistent patterns:
 * - session_status: 'active' | 'completed' | 'cancelled'
 * - Inventory is reserved on INSERT when status = 'active'
 * - Inventory is released on UPDATE when status changes to 'cancelled'
 * - Pending conversions created on UPDATE when status changes to 'completed'
 */

/** Trim session: Processes bucked flower into flower, smalls, and trim */
export type TrimSession = Database['public']['Tables']['trim_sessions']['Row'];
export type TrimSessionInsert = Database['public']['Tables']['trim_sessions']['Insert'];
export type TrimSessionUpdate = Database['public']['Tables']['trim_sessions']['Update'];

/** Packaging session: Packages bulk inventory into retail units (3.5g, 14g, 454g) */
export type PackagingSession = Database['public']['Tables']['packaging_sessions']['Row'];
export type PackagingSessionInsert = Database['public']['Tables']['packaging_sessions']['Insert'];
export type PackagingSessionUpdate = Database['public']['Tables']['packaging_sessions']['Update'];

/** Bucking session: Processes raw plant material into bucked flower and smalls */
export type BuckingSession = Database['public']['Tables']['bucking_sessions']['Row'];
export type BuckingSessionInsert = Database['public']['Tables']['bucking_sessions']['Insert'];
export type BuckingSessionUpdate = Database['public']['Tables']['bucking_sessions']['Update'];

/** Inventory item with reservation tracking via available_qty */
export type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];

/** Session type discriminator */
export type SessionType = 'bucking' | 'trim' | 'packaging';

/** Valid session status values - consistent across all session types */
export type SessionStatus = 'active' | 'completed' | 'cancelled';

export interface BaseSessionStats {
  activeSessions: number;
  completedToday: number;
}

export interface TrimSessionStats extends BaseSessionStats {
  avgGramsPerHour: number;
  totalFlowerToday: number;
}

export interface PackagingSessionStats extends BaseSessionStats {
  totalUnitsToday: number;
  avgUnitsPerHour: number;
}

export interface BuckingSessionStats extends BaseSessionStats {
  avgKgPerHour: number;
  totalFlowerToday: number;
  totalSmallsToday: number;
  totalWasteToday: number;
}

export interface ConsolidatedPackages {
  flower?: string;
  smalls?: string;
  trim?: string;
}

/**
 * Form data for completing a trim session
 * Records output weights and any additional bucked smalls discovered
 */
export interface TrimCompleteForm {
  big_buds_grams: number;
  small_buds_grams: number;
  trim_grams: number;
  waste_grams: number;
  bucked_smalls_grams: number;
  bucked_smalls_inventory_id: string;
  notes: string;
  quality_grade_id?: string | null;
}

export interface PackagingCompleteForm {
  ending_weight: number;
  units_3_5g: number;
  units_14g: number;
  units_454g: number;
  trim_grams: number;
  waste_grams: number;
  notes: string;
  quality_grade_id?: string | null;
}

export interface BuckingCompleteForm {
  bucked_flower_grams: number;
  bucked_smalls_grams: number;
  waste_grams: number;
  notes: string;
  quality_grade_id?: string | null;
}
