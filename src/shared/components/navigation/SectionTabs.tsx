import { sectionDefinitions, getActiveSectionId } from './sectionNavigation';
import type { SectionDefinition } from './sectionNavigation';

interface SectionTabsProps {
  currentView: string;
  onSectionChange: (sectionId: string, defaultView: string) => void;
}

export function SectionTabs({ currentView, onSectionChange }: SectionTabsProps) {
  const activeSectionId = getActiveSectionId(currentView);

  return (
    <div className="flex items-center gap-1">
      {sectionDefinitions.map((section: SectionDefinition) => {
        const isActive = section.id === activeSectionId;
        const Icon = section.icon;

        return (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id, section.defaultView)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-200 whitespace-nowrap
              ${
                isActive
                  ? 'bg-cult-off-white text-cult-black shadow-sm'
                  : 'text-cult-silver hover:text-cult-off-white hover:bg-cult-charcoal/60'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{section.label}</span>
          </button>
        );
      })}
    </div>
  );
}
