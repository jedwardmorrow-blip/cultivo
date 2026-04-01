import { sectionDefinitions, getActiveSectionId } from './sectionNavigation';
import type { SectionDefinition } from './sectionNavigation';

interface SectionTabsProps {
  currentView: string;
  onSectionChange: (sectionId: string, defaultView: string) => void;
  allowedSectionIds?: string[];
}

export function SectionTabs({ currentView, onSectionChange, allowedSectionIds }: SectionTabsProps) {
  const activeSectionId = getActiveSectionId(currentView);

  const visibleSections = allowedSectionIds
    ? sectionDefinitions.filter((s) => allowedSectionIds.includes(s.id))
    : sectionDefinitions;

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
      {visibleSections.map((section: SectionDefinition) => {
        const isActive = section.id === activeSectionId;
        const Icon = section.icon;

        return (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id, section.defaultView)}
            className={`
              flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-200 whitespace-nowrap
              ${
                isActive
                  ? 'bg-cult-off-white text-cult-black shadow-sm'
                  : 'text-cult-silver hover:text-cult-off-white hover:bg-cult-charcoal/60'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span className={isActive ? "inline sm:inline" : "hidden sm:inline"}>{section.label}</span>
          </button>
        );
      })}
    </div>
  );
}
