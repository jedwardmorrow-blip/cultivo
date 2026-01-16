import type { LucideIcon } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  testPortalOnly?: boolean;
  badge?: number | string;
  badgeColor?: 'warning' | 'success' | 'error' | 'info' | 'default';
  children?: MenuItem[];
}

export interface MenuSection {
  id: string;
  label: string;
  icon: LucideIcon;
  items: MenuItem[];
}

export interface NavigationState {
  isOpen: boolean;
  expandedSections: Set<string>;
  expandedItems: Set<string>;
}

export interface BadgeCounts {
  orders: number;
  trimSessions: number;
  packagingSessions: number;
  batches: number;
  inventoryTotal: number;
  inventoryBinned: number;
  inventoryBucked: number;
  inventoryBulk: number;
  inventoryPackaged: number;
  pendingConversions: number;
  activeAudit: boolean;
}
