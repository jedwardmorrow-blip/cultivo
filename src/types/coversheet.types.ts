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

export interface BatchComplianceInfo {
  strain: string;
  batch_id: string;
  harvest_date: string;
  manufacture_date: string;
  package_date: string;
  coa_url?: string;
  coa_pdf_url?: string;
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
  originator_name: string;
  originator_license: string;
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
