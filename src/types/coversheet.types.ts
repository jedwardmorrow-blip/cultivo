import type { Database } from '../lib/database/database.types';

export type Coversheet = Database['public']['Tables']['coversheets']['Row'];
export type CoversheetInsert = Database['public']['Tables']['coversheets']['Insert'];
export type CoversheetUpdate = Database['public']['Tables']['coversheets']['Update'];

export interface CoversheetItemSummary {
  product_id: string;
  product_name: string;
  product_type: string;
  quantity: number;
}

/**
 * Compliance Header Information
 *
 * Contains regulatory information required by Arizona DHS for cannabis distribution.
 * This data is displayed prominently at the top of all coversheets.
 *
 * @property company_name - Legal business entity name (e.g., "Kind Meds Inc.")
 * @property license_number - State-issued license identifier
 * @property pregnancy_warning - Mandatory health warning text
 */
export interface ComplianceHeader {
  company_name: string;
  license_number: string;
  pregnancy_warning: string;
}

/**
 * Batch Compliance Information
 *
 * Traceability data for each unique batch included in the order.
 * Required for Arizona seed-to-sale tracking and compliance audits.
 *
 * @property strain - Cannabis strain name (e.g., "Animal Tsunami")
 * @property batch_id - Unique batch identifier in format YYMMDD-XXX
 * @property harvest_date - Date product was harvested (MM/DD/YYYY)
 * @property manufacture_date - Date product was packaged/manufactured (MM/DD/YYYY)
 * @property coa_url - Optional URL to Certificate of Analysis for this batch
 */
export interface BatchComplianceInfo {
  strain: string;
  batch_id: string;
  harvest_date: string;
  manufacture_date: string;
  coa_url?: string;
}

/**
 * Distributed To Information
 *
 * Details about the receiving customer for compliance reporting.
 * Currently supports single-location customers per order.
 *
 * @property customer_name - Legal business name of receiving dispensary
 * @property license_number - Customer's state-issued license number
 * @property location_name - Optional location identifier (e.g., "North Phoenix")
 *
 * @future Multi-Location Distribution
 * Some customers have multiple locations that handle their own distribution.
 * When implementing multi-location support:
 * - Change this to an array type: DistributedToInfo[]
 * - Add location-specific delivery tracking
 * - Update DistributedToSection component to render multiple entries
 * - Consider creating customer_locations table for proper relational structure
 */
export interface DistributedToInfo {
  customer_name: string;
  license_number: string;
  location_name?: string;
}

/**
 * Enhanced Coversheet Data
 *
 * Extended coversheet information including all compliance data.
 * Used when fetching complete coversheet details for display.
 */
export interface CoversheetWithDetails extends Coversheet {
  compliance_header?: ComplianceHeader | null;
  batch_details?: BatchComplianceInfo[];
  distributed_to?: DistributedToInfo;
}
