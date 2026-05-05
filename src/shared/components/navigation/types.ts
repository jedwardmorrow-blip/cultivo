import type { LucideIcon } from 'lucide-react';
import type { IconName } from '@/shared/icons';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Cultivo kit icon name. When set, takes precedence over `icon` (lucide). */
  iconName?: IconName;
  adminOnly?: boolean;
  badge?: number | string;
  badgeColor?: 'warning' | 'success' | 'error' | 'info' | 'default';
  children?: MenuItem[];
}

export interface MenuSection {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Cultivo kit icon name. When set, takes precedence over `icon` (lucide). */
  iconName?: IconName;
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
