import { Icon as KitIcon, type IconName } from '@/shared/icons';
import type { RosinLabScreen } from '../types/rosin-lab.types';

interface NavItemConfig {
  key: RosinLabScreen;
  label: string;
  iconName: IconName;
  dotColor?: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  { key: 'dashboard', label: 'Dashboard', iconName: 'dashboard' },
  { key: 'materials', label: 'Materials', iconName: 'materials' },
  { key: 'wash', label: 'Wash & Dry', iconName: 'wash-dry', dotColor: '#3B82F6' },
  { key: 'press', label: 'Press & Cure', iconName: 'press-cure', dotColor: '#F97316' },
  { key: 'analytics', label: 'Analytics', iconName: 'analytics' },
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
        <h1 className="font-mono uppercase tracking-[0.18em] text-xs text-cult-text-primary">
          Rosin Lab
        </h1>
      </div>

      {NAV_ITEMS.map(({ key, label, iconName, dotColor }) => {
        const isActive = activeScreen === key;
        const count = dotColor ? (activeCounts[key] ?? 0) : 0;

        return (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`
              relative flex items-center justify-between gap-2 px-4 py-2.5 w-full text-left
              transition-colors duration-150 group
              ${isActive
                ? 'text-cult-text-primary bg-cult-surface-overlay border-l-[3px] border-cult-accent'
                : 'text-cult-text-secondary hover:text-cult-text-primary hover:bg-cult-surface-subtle border-l-[3px] border-transparent'
              }
            `}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <KitIcon
                name={iconName}
                size={16}
                className={`flex-shrink-0 transition-colors ${
                  isActive ? 'text-cult-text-primary' : 'text-cult-text-muted group-hover:text-cult-text-secondary'
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
