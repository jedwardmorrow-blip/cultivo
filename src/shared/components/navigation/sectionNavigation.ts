import {
  Package,
  Truck,
  Scissors,
  Archive,
  Leaf,
  Box,
  Activity,
  RefreshCw,
  History,
  FileCheck,
  FileText,
  Calendar,
  Layers,
  LayoutDashboard,
  Sprout,
  Warehouse,
  Wind,
  DollarSign,
  BarChart3,
  Building2,
  ClipboardList,
  CalendarDays,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SubNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  group?: 'primary' | 'secondary';
  badge?: number | string;
  badgeColor?: 'warning' | 'success' | 'error' | 'info' | 'default';
}

export interface SectionDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  defaultView: string;
  items: SubNavItem[];
}

export const sectionDefinitions: SectionDefinition[] = [
  {
    id: 'cultivation',
    label: 'Cultivation',
    icon: Sprout,
    defaultView: 'cultivation-dashboard',
    items: [
      { id: 'cultivation-dashboard', label: 'Overview', icon: LayoutDashboard, group: 'primary' },
      { id: 'cultivation-plants', label: 'Plant Groups', icon: Leaf, group: 'primary' },
      { id: 'cultivation-harvest', label: 'Harvests', icon: Warehouse, group: 'primary' },
      { id: 'cultivation-binning', label: 'Drying', icon: Wind, group: 'primary' },
      { id: 'cultivation-rooms', label: 'Grow Rooms', icon: Sprout, group: 'primary' },
      { id: 'cultivation-dry-rooms', label: 'Dry Rooms', icon: Wind, group: 'secondary' },
    ],
  },
  {
    id: 'sales',
    label: 'Distribution',
    icon: Truck,
    defaultView: 'orders',
    items: [
      { id: 'orders', label: 'Orders', icon: Package, group: 'primary' },
      { id: 'delivery', label: 'Delivery Calendar', icon: Calendar, group: 'primary' },
      { id: 'eod-summary', label: 'EOD Summary', icon: FileText, group: 'primary' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Archive,
    defaultView: 'inventory-all',
    items: [
      { id: 'inventory-all', label: 'All Inventory', icon: Archive, group: 'primary' },
      { id: 'inventory-binned', label: 'Binned', icon: Leaf, group: 'primary' },
      { id: 'inventory-bucked', label: 'Bucked', icon: Archive, group: 'primary' },
      { id: 'inventory-bulk', label: 'Bulk', icon: Box, group: 'primary' },
      { id: 'inventory-packaged', label: 'Packaged', icon: Package, group: 'primary' },
      { id: 'batches', label: 'Batches', icon: Layers, group: 'secondary' },
      { id: 'inventory-daily-activity', label: 'Daily Activity', icon: Activity, group: 'secondary' },
      { id: 'inventory-conversions', label: 'Conversions', icon: RefreshCw, group: 'secondary' },
      { id: 'inventory-conversion-history', label: 'History', icon: History, group: 'secondary' },
      { id: 'inventory-audits', label: 'Audits', icon: FileCheck, group: 'secondary' },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    icon: Scissors,
    defaultView: 'production-overview',
    items: [
      { id: 'production-overview', label: 'Overview', icon: LayoutDashboard, group: 'primary' },
      { id: 'bucking-sessions', label: 'Bucking', icon: Scissors, group: 'primary' },
      { id: 'trim-sessions', label: 'Trim', icon: Leaf, group: 'primary' },
      { id: 'packaging-sessions', label: 'Packaging', icon: Box, group: 'primary' },
    ],
  },
  {
    id: 'crm',
    label: 'Sales',
    icon: DollarSign,
    defaultView: 'crm-dashboard',
    items: [
      { id: 'crm-dashboard', label: 'Sales Dashboard', icon: BarChart3, group: 'primary' },
      { id: 'crm-queue', label: 'My Queue', icon: ClipboardList, group: 'primary' },
      { id: 'crm-visit-calendar', label: 'Visit Calendar', icon: CalendarDays, group: 'primary' },
      { id: 'crm-accounts', label: 'Accounts', icon: Building2, group: 'primary' },
    ],
  },
];

export function getSectionForView(viewId: string): SectionDefinition | undefined {
  if (viewId.startsWith('crm-account-detail:')) {
    return sectionDefinitions.find((s) => s.id === 'crm');
  }
  return sectionDefinitions.find((section) =>
    section.items.some((item) => item.id === viewId)
  );
}

export function getActiveSectionId(currentView: string): string | null {
  const section = getSectionForView(currentView);
  return section?.id ?? null;
}
