import {
  Package,
  Truck,
  BarChart3,
  Settings,
  Scissors,
  Archive,
  Layers,
  TrendingUp,
  FileText,
  Zap,
  Leaf,
  Box,
  Activity,
  RefreshCw,
  FileCheck,
  History,
} from 'lucide-react';
import type { MenuSection } from './types';

export const menuStructure: MenuSection[] = [
  {
    id: 'operations',
    label: 'Operations',
    icon: Package,
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      { id: 'orders', label: 'Orders', icon: Package },
      { id: 'batches', label: 'Batches', icon: Layers },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: Archive,
        children: [
          { id: 'inventory-all', label: 'All Inventory', icon: Archive },
          { id: 'inventory-binned', label: 'Binned', icon: Leaf },
          { id: 'inventory-bucked', label: 'Bucked', icon: Archive },
          { id: 'inventory-bulk', label: 'Bulk', icon: Box },
          { id: 'inventory-packaged', label: 'Packaged', icon: Package },
          { id: 'inventory-daily-activity', label: 'Daily Activity', icon: Activity },
          { id: 'inventory-conversions', label: 'Conversions', icon: RefreshCw },
          { id: 'inventory-conversion-history', label: 'Conversion History', icon: History },
          { id: 'inventory-audits', label: 'Audits', icon: FileCheck },
        ],
      },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    icon: Scissors,
    items: [
      { id: 'sessions', label: 'All Sessions', icon: Scissors },
      { id: 'trim-sessions', label: 'Trim Sessions', icon: Leaf },
      { id: 'packaging-sessions', label: 'Packaging Sessions', icon: Box },
    ],
  },
  {
    id: 'distribution',
    label: 'Distribution',
    icon: Truck,
    items: [
      { id: 'delivery', label: 'Delivery Calendar', icon: Truck },
      { id: 'eod-summary', label: 'EOD Summary', icon: FileText },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: TrendingUp,
    items: [
      { id: 'analytics', label: 'Analytics Dashboard', icon: TrendingUp },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Zap,
    items: [
      {
        id: 'test-portal',
        label: 'Test Portal',
        icon: Zap,
        adminOnly: true,
        testPortalOnly: true,
        badgeColor: 'warning',
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];
