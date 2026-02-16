import {
  Settings,
  TrendingUp,
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
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];
