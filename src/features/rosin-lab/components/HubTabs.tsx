interface HubTab {
  key: string;
  label: string;
  badge?: number;
}

interface HubTabsProps {
  tabs: HubTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  accentColor?: string;
}

export function HubTabs({ tabs, activeTab, onTabChange, accentColor = '#3B82F6' }: HubTabsProps) {
  const badgeBg = `${accentColor}33`;

  return (
    <div className="flex items-end gap-0 px-4 border-b border-cult-border">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`
              relative flex items-center gap-2 px-4 py-3 text-sm transition-colors
              border-b-2 -mb-px whitespace-nowrap
              ${isActive
                ? 'text-cult-text-primary font-medium border-transparent'
                : 'text-cult-text-secondary hover:text-cult-text-primary border-transparent'
              }
            `}
            style={isActive ? { borderBottomColor: accentColor } : undefined}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className="text-xs rounded-full px-1.5 py-0.5 font-semibold leading-none"
                style={{ backgroundColor: badgeBg, color: accentColor }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
