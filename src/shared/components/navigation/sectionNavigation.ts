import {
  Package,
  Truck,
  Scissors,
  Archive,
  Leaf,
  Box,
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
  Waves,
  ArrowDownToLine,
  TrendingUp,
  Combine,
  Wallet,
  CreditCard,
  Dna,
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
    defaultView: 'cultivation-taskboard',
    items: [
      { id: 'cultivation-taskboard', label: 'Today', icon: ClipboardList, group: 'primary' },
      { id: 'cultivation-schedules', label: 'Schedule', icon: CalendarDays, group: 'primary' },
      { id: 'cultivation-dashboard', label: 'Rooms', icon: LayoutDashboard, group: 'primary' },
      { id: 'cultivation-digest', label: 'Reports', icon: FileText, group: 'primary' },
      { id: 'cultivation-plants', label: 'Plant Groups', icon: Leaf, group: 'secondary' },
      { id: 'cultivation-harvest', label: 'Harvests', icon: Warehouse, group: 'secondary' },
      { id: 'cultivation-binning', label: 'Drying', icon: Wind, group: 'secondary' },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    icon: Scissors,
    defaultView: 'production-overview',
    items: [
      { id: 'production-overview', label: 'Overview', icon: LayoutDashboard, group: 'primary' },
      { id: 'production-sessions', label: 'Sessions', icon: Scissors, group: 'primary' },
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
      { id: 'inventory-all', label: 'Inventory', icon: Archive, group: 'primary' },
      { id: 'batches', label: 'Batches', icon: Layers, group: 'primary' },
      { id: 'inventory-conversions', label: 'Conversions', icon: RefreshCw, group: 'primary' },
      { id: 'inventory-conversion-history', label: 'History', icon: History, group: 'secondary' },
      { id: 'inventory-consolidate', label: 'Consolidate', icon: Combine, group: 'secondary' },
      { id: 'inventory-audits', label: 'Audits', icon: FileCheck, group: 'secondary' }
    ],
  },
  {
    id: 'rosin-lab',
    label: 'Lab',
    icon: FlaskConical,
    defaultView: 'rosin-lab',
    items: [
      { id: 'rosin-lab', label: 'Dashboard', icon: LayoutDashboard, group: 'primary' },
      { id: 'rosin-lab-materials', label: 'Materials', icon: Layers, group: 'primary' },
      { id: 'rosin-lab-wash', label: 'Wash & Dry', icon: Waves, group: 'primary' },
      { id: 'rosin-lab-press', label: 'Press & Cure', icon: ArrowDownToLine, group: 'primary' },
      { id: 'rosin-lab-analytics', label: 'Analytics', icon: BarChart3, group: 'secondary' }
    ],
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: Wallet,
    defaultView: 'financial',
    items: [
      { id: 'financial', label: 'Dashboard', icon: LayoutDashboard, group: 'primary' },
      { id: 'financial-ar', label: 'Accounts Receivable', icon: DollarSign, group: 'primary' },
      { id: 'financial-ap', label: 'Accounts Payable', icon: CreditCard, group: 'primary' },
    ],
  },
  {
    id: 'hub',
    label: 'Hub',
    icon: Dna,
    defaultView: 'hub',
    items: [
      { id: 'hub', label: 'Batch Pipeline', icon: GitBranch, group: 'primary' },
      { id: 'hub-strain-analytics', label: 'Strain Analytics', icon: BarChart3, group: 'secondary' },
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
