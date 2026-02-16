import {
  Settings,
  TrendingUp,
  Zap,
  Home,
} from 'lucide-react';
import type { MenuSection } from './types';

export const menuStructure: MenuSection[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
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
