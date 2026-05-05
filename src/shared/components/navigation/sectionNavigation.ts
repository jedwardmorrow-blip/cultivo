import {
  Package,
  Truck,
  Scissors,
  Archive,
  Leaf,
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
  Target,
  Users,
  Settings,
  Crown,
  Map,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { IconName } from '@/shared/icons';

export interface SubNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Cultivo kit icon name. When set, takes precedence over `icon` (lucide). */
  iconName?: IconName;
  group?: 'primary' | 'secondary';
  badge?: number | string;
  badgeColor?: 'warning' | 'success' | 'error' | 'info' | 'default';
}

export interface SectionDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Cultivo kit icon name. When set, takes precedence over `icon` (lucide). */
  iconName?: IconName;
  defaultView: string;
  items: SubNavItem[];
}

export const sectionDefinitions: SectionDefinition[] = [
  {
    id: 'hub',
    label: 'Hub',
    icon: Crown,
    iconName: 'hub',
    defaultView: 'executive-hub',
    items: [
      { id: 'executive-hub', label: 'Overview', icon: LayoutDashboard, iconName: 'dashboard', group: 'primary' },
      { id: 'hub', label: 'Batch Pipeline', icon: GitBranch, iconName: 'pipeline', group: 'primary' },
      { id: 'pipeline-planner', label: 'Planner', icon: Target, iconName: 'calendar', group: 'primary' },
      { id: 'hub-strain-analytics', label: 'Strain Intel', icon: BarChart3, iconName: 'bar-chart', group: 'secondary' },
      { id: 'strain-analytics', label: 'Strain Analytics', icon: Dna, iconName: 'analytics', group: 'secondary' },
      { id: 'coa-timeline', label: 'COA Timeline', icon: FlaskConical, iconName: 'history', group: 'secondary' },
    ],
  },
  /**
   * Cultivation IA:
   * Primary: Today (task board) | Crew (worker view) | Schedule (builder) | Rooms (live dashboard) | Reports
   * Secondary: Plant Groups | Harvests | Drying | Room Config (admin) | Dry Room Config (admin)
   *
   * cultivation-rooms and cultivation-dry-rooms are admin/config pages — secondary group intentional.
   * worker-tasks is a shared route used by floor workers via direct link (not a sub-feature).
   */
  {
    id: 'cultivation',
    label: 'Cultivation',
    icon: Sprout,
    iconName: 'cultivation',
    defaultView: 'cultivation-command-center',
    items: [
      { id: 'cultivation-command-center', label: 'Command Center', icon: LayoutDashboard, iconName: 'command-center', group: 'primary' },
      { id: 'cultivation-harvest', label: 'Harvests & Drying', icon: Warehouse, iconName: 'harvest', group: 'primary' },
      { id: 'cultivation-schedules', label: 'Templates', icon: CalendarDays, iconName: 'templates', group: 'primary' },
      { id: 'worker-tasks', label: 'Crew', icon: Users, iconName: 'crew', group: 'primary' },
      { id: 'cultivation-plant-audit', label: 'Plant Audit', icon: ClipboardList, iconName: 'plant-audit', group: 'secondary' },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    icon: Scissors,
    iconName: 'production',
    defaultView: 'production-overview',
    items: [
      { id: 'production-overview', label: 'Command Center', icon: LayoutDashboard, iconName: 'command-center', group: 'primary' },
    ],
  },
  {
    id: 'crm',
    label: 'Sales',
    icon: DollarSign,
    iconName: 'sales',
    defaultView: 'crm-dashboard',
    items: [
      { id: 'crm-dashboard', label: 'Sales Dashboard', icon: BarChart3, iconName: 'dashboard', group: 'primary' },
      { id: 'crm-queue', label: 'My Queue', icon: ClipboardList, iconName: 'queue', group: 'primary' },
      { id: 'crm-visit-calendar', label: 'Visit Calendar', icon: CalendarDays, iconName: 'calendar', group: 'primary' },
      { id: 'crm-pipeline', label: 'Inventory Pipeline', icon: GitBranch, iconName: 'pipeline', group: 'primary' },
      { id: 'crm-accounts-hub', label: 'Accounts Hub', icon: Building2, iconName: 'accounts', group: 'primary' },
      { id: 'crm-prospect-pipeline', label: 'Prospect Pipeline', icon: TrendingUp, iconName: 'prospect', group: 'primary' },
      { id: 'crm-inventory', label: 'Available Inventory', icon: Archive, iconName: 'available', group: 'primary' }
    ],
  },
  {
    id: 'sales',
    label: 'Distribution',
    icon: Truck,
    iconName: 'distribution',
    defaultView: 'distribution-command-center',
    items: [
      { id: 'distribution-command-center', label: 'Command Center', icon: LayoutDashboard, iconName: 'command-center', group: 'primary' },
      { id: 'orders', label: 'Orders', icon: Package, iconName: 'orders', group: 'primary' },
      { id: 'eod-summary', label: 'EOD Summary', icon: FileText, iconName: 'summary', group: 'primary' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Archive,
    iconName: 'inventory',
    defaultView: 'inventory-command-center',
    items: [
      { id: 'inventory-command-center', label: 'Command Center', icon: LayoutDashboard, iconName: 'command-center', group: 'primary', badge: 'new', badgeColor: 'info' as const },
      { id: 'inventory-all', label: 'Inventory', icon: Archive, iconName: 'inventory', group: 'secondary' },
      { id: 'batches', label: 'Batches', icon: Layers, iconName: 'batches', group: 'secondary' },
      { id: 'inventory-conversions', label: 'Conversions', icon: RefreshCw, iconName: 'conversions', group: 'secondary' },
      { id: 'inventory-conversion-history', label: 'Conversion History', icon: History, iconName: 'history', group: 'secondary' },
      { id: 'inventory-consolidate', label: 'Consolidate', icon: Combine, iconName: 'consolidate', group: 'secondary' },
      { id: 'inventory-audits', label: 'Audits', icon: FileCheck, iconName: 'audit', group: 'secondary' }
    ],
  },
  {
    id: 'rosin-lab',
    label: 'Lab',
    icon: FlaskConical,
    iconName: 'lab',
    defaultView: 'rosin-lab',
    items: [
      { id: 'rosin-lab', label: 'Dashboard', icon: LayoutDashboard, iconName: 'dashboard', group: 'primary' },
      { id: 'rosin-lab-materials', label: 'Materials', icon: Layers, iconName: 'materials', group: 'primary' },
      { id: 'rosin-lab-wash', label: 'Wash & Dry', icon: Waves, iconName: 'wash-dry', group: 'primary' },
      { id: 'rosin-lab-press', label: 'Press & Cure', icon: ArrowDownToLine, iconName: 'press-cure', group: 'primary' },
      { id: 'rosin-lab-analytics', label: 'Analytics', icon: BarChart3, iconName: 'analytics', group: 'secondary' }
    ],
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: Wallet,
    iconName: 'financial',
    defaultView: 'operations-hub',
    items: [
      { id: 'operations-hub', label: 'HUB', icon: LayoutDashboard, iconName: 'hub', group: 'primary' },
      { id: 'financial', label: 'Dashboard', icon: LayoutDashboard, iconName: 'dashboard', group: 'primary' },
      { id: 'financial-ar', label: 'Accounts Receivable', icon: DollarSign, iconName: 'receivable', group: 'primary' },
      { id: 'financial-ap', label: 'Accounts Payable', icon: CreditCard, iconName: 'payable', group: 'primary' },
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

export function isRosinLabView(viewId: string): boolean {
  return viewId === 'rosin-lab' || viewId.startsWith('rosin-lab-');
}

export function getActiveSectionId(currentView: string): string | null {
  const section = getSectionForView(currentView);
  return section?.id ?? null;
}
