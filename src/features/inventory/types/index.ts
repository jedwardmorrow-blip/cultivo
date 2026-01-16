import { Database } from '@/lib/database';

export type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
export type InventorySnapshot = Database['public']['Tables']['inventory_snapshots']['Row'];

export type InventoryTab = 'daily-activity' | 'conversions' | 'binned' | 'bucked' | 'bulk' | 'packaged' | 'audits';
export type BulkSubTab = 'flower' | 'smalls' | 'trim';
export type StageFilter = 'all' | 'binned' | 'bucked' | 'bulk' | 'packaged';

// Export audit system types
export * from './audit.types';
export * from './variance.types';
export * from './adjustment.types';

// Re-export conversions types for convenience
export * from './conversions.types';

// Export combine packages types
export * from './combine.types';

export interface InventoryStats {
  totalPackages: number;
  totalWeight: number;
  strainCount?: number;
  oldestPackage?: number;
}

export interface BulkStats {
  totalPackages: number;
  flower: number;
  smalls: number;
  trim: number;
}

export interface PackagedStats {
  totalUnits: number;
  total_3_5g: number;
  total_14g: number;
}

export interface AllInventoryStats {
  totalPackages: number;
  totalWeight: number;
  binnedCount: number;
  buckedCount: number;
  bulkCount: number;
  packagedCount: number;
  strainCount: number;
}

export interface SearchResult {
  package_id: string;
  stage_display_name: string;
  match_reason: string;
  strain: string;
  batch?: string;
  room?: string;
  weight_or_units: number;
  unit: string;
  status?: string;
}

export interface InventoryNamingValidation {
  package_id: string;
  current_name: string;
  standardized_name: string;
  is_valid: boolean;
  needs_update: boolean;
  category: string;
  strain: string;
}

export interface NamingNormalizationResult {
  total_items: number;
  updated_count: number;
  skipped_count: number;
  failed_count: number;
  validations: InventoryNamingValidation[];
  errors: Array<{ package_id: string; error: string }>;
}

export interface InternalInventoryLabel {
  package_id: string;
  strain: string;
  batch_id: string;
  product_type: string;
  harvest_date: string;
  weight_grams: number;
}

export interface InventoryLabelData {
  id?: string;
  package_id: string;
  label_data: InternalInventoryLabel;
  printed_at?: string;
  created_at?: string;
}

export interface InventoryLabelState {
  isOpen: boolean;
  isLoading: boolean;
  isPrinting: boolean;
  labelData: InternalInventoryLabel | null;
  logoDataUrl: string;
  error: string | null;
}

export type NavigationSection = 'inventory-items' | 'inventory-functions';
export type InventoryItemView = 'all-inventory' | 'binned' | 'bucked' | 'bulk' | 'packaged';
export type InventoryFunctionView = 'daily-activity' | 'conversions' | 'conversion-history' | 'audits';
export type InventorySidebarView = InventoryItemView | InventoryFunctionView;

export interface SidebarNavigationItem {
  id: InventorySidebarView;
  label: string;
  icon?: string;
  badge?: string | number;
  badgeColor?: 'default' | 'warning' | 'success' | 'error' | 'info';
  children?: SidebarNavigationItem[];
}

export interface SidebarSection {
  id: NavigationSection;
  title: string;
  items: SidebarNavigationItem[];
}

export interface SidebarNavigationState {
  selectedView: InventorySidebarView;
  expandedSections: NavigationSection[];
  bulkSubTab: BulkSubTab;
  isSidebarCollapsed: boolean;
  activeStageFilter: StageFilter;
}
