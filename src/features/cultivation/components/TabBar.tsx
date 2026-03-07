const TABS = [
  { key: 'rooms', label: 'Rooms' },
  { key: 'plant-groups', label: 'Plant Groups' },
  { key: 'harvests', label: 'Harvests' },
  { key: 'drying', label: 'Drying' },
  { key: 'task-board', label: 'Task Board' },
  { key: 'digest', label: 'Digest' },
] as const;

export type CultivationTab = (typeof TABS)[number]['key'];

interface TabBarProps {
  activeTab: CultivationTab;
  onTabChange: (tab: CultivationTab) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="sticky top-0 z-10 bg-cult-black border-b border-cult-dark-gray overflow-x-auto scrollbar-hide">
      <div className="flex gap-1 min-w-max px-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`
                px-4 py-3 text-sm font-semibold uppercase tracking-wider whitespace-nowrap transition-colors
                ${isActive
                  ? 'text-cult-white border-b-2 border-cult-accent'
                  : 'text-cult-medium-gray hover:text-cult-light-gray border-b-2 border-transparent'
                }
              `}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
