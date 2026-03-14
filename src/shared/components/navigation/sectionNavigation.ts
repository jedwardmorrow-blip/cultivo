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
  GitBranch,
  FlaskConical,
  Snowflake,
  Circle,
  Droplet,
  Waves,
  ArrowDownToLine,
  TrendingUp,
  Zap,
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
      { id: 'cultivation-dashboard', label: 'Rooms', icon: LayoutDashboard, group: 'primary' },
      { id: 'cultivation-plants', label: 'Plant Groups', icon: Leaf, group: 'primary' },
      { id: 'cultivation-harvest', label: 'Harvests', icon: Warehouse, group: 'primary' },
      { id: 'cultivation-binning', label: 'Drying', icon: Wind, group: 'primary' },
      { id: 'cultivation-taskboard', label: 'Task Board', icon: ClipboardList, group: 'primary' },
      { id: 'cultivation-digest', label: 'Digest', icon: FileText, group: 'primary' }
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
      { id: 'eod-summary', label: 'EOD Summary', icon: FileText, group: 'primary' }
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
      { id: 'inventory-audits', label: 'Audits', icon: FileCheck, group: 'secondary' }
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
      { id: 'production-queue', label: 'Queue', icon: ClipboardList, group: 'primary' }
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
      { id: 'crm-pipeline', label: 'Inventory Pipeline', icon: GitBranch, group: 'primary' },
      { id: 'crm-accounts-hub', label: 'Accounts Hub', icon: Building2, group: 'primary' },
      { id: 'crm-prospect-pipeline', label: 'Prospect Pipeline', icon: TrendingUp, group: 'primary' }
    ],
  },
  {
    id: 'rosin-lab',
    label: 'Rosin Lab',
    icon: FlaskConical,
    defaultView: 'rosin-lab',
    items: [
      { id: 'rosin-lab', label: 'Dashboard', icon: LayoutDashboard, group: 'primary' },
      { id: 'rosin-lab-fresh-frozen', label: 'Fresh Frozen', icon: Snowflake, group: 'primary' },
      { id: 'rosin-lab-hash', label: 'Hash', icon: Circle, group: 'primary' },
      { id: 'rosin-lab-rosin', label: 'Rosin', icon: Droplet, group: 'primary' },
      { id: 'rosin-lab-wash', label: 'New Wash', icon: Waves, group: 'primary' },
      { id: 'rosin-lab-press', label: 'Press', icon: ArrowDownToLine, group: 'primary' },
      { id: 'rosin-lab-log', label: 'Press & Cure Log', icon: ClipboardList, group: 'secondary' },
      { id: 'rosin-lab-analytics', label: 'Analytics', icon: BarChart3, group: 'secondary' }
    ],
  }
];

export function getSectionForView(viewId: string): SectionDefinition | undefined {
  if (viewId.startsWith('crm-account-detail:')) {
    return sectionDefinitions.find((s) => s.id === 'crm');
  }
  return sectionDefinitions.find((section) =>
    section.items.some((item) => item.id === viewId)
  );
}

export function isRosinLabView(viewId: string): boolean {
  return viewId === 'rosin-lab' || viewId.startsWith('rosin-lab-');
}

export function getActiveSectionId(currentView: string): string | null {
  const section = getSectionForView(currentView);
  return section?.id ?? null;
}
