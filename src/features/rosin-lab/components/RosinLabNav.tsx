import {
  LayoutDashboard,
  Snowflake,
  Circle,
  Droplet,
  Waves,
  ArrowDownToLine,
  ClipboardList,
  BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RosinLabScreen } from '../types/rosin-lab.types';

interface NavItemConfig {
  key: RosinLabScreen;
  label: string;
  Icon: LucideIcon;
  dotColor?: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'fresh-frozen', label: 'Fresh Frozen', Icon: Snowflake },
  { key: 'hash', label: 'Hash', Icon: Circle },
  { key: 'rosin', label: 'Rosin', Icon: Droplet },
  { key: 'wash', label: 'New Wash', Icon: Waves, dotColor: '#3B82F6' },
  { key: 'press', label: 'Press', Icon: ArrowDownToLine, dotColor: '#F97316' },
  { key: 'log', label: 'Press & Cure Log', Icon: ClipboardList, dotColor: '#8B5CF6' },
  { key: 'analytics', label: 'Analytics', Icon: BarChart3 },
];

interface RosinLabNavProps {
  activeScreen: RosinLabScreen;
  onNavigate: (screen: RosinLabScreen) => void;
  activeCounts?: Record<string, number>;
}

export function RosinLabNav({ activeScreen, onNavigate, activeCounts = {} }: RosinLabNavProps) {
  return (
    <nav className="flex flex-col gap-0.5 py-4">
      <div className="px-4 pb-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-cult-text-muted">
          Rosin Lab
        </span>
      </div>

      {NAV_ITEMS.map(({ key, label, Icon, dotColor }) => {
        const isActive = activeScreen === key;
        const count = dotColor ? (activeCounts[key] ?? 0) : 0;

        return (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`
              relative flex items-center justify-between gap-2 px-4 py-2.5 w-full text-left
              transition-all duration-150 group
              ${isActive
                ? 'text-cult-white bg-cult-surface-overlay border-l-[3px] border-cult-accent'
                : 'text-cult-text-secondary hover:text-cult-white hover:bg-cult-surface-overlay/50 border-l-[3px] border-transparent'
              }
            `}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  isActive ? 'text-cult-white' : 'text-cult-text-muted group-hover:text-cult-text-secondary'
                }`}
              />
              <span className="text-[13px] font-medium truncate">{label}</span>
            </div>

            {dotColor && count > 0 && (
              <span
                className="flex-shrink-0 w-2 h-2 rounded-full"
                style={{ backgroundColor: dotColor }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
