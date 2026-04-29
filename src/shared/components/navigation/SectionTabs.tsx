import { Icon as KitIcon } from '@/shared/icons';
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
        const LucideIconCmp = section.icon;

        return (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id, section.defaultView)}
            className={`
              flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded text-sm font-medium
              transition-colors duration-150 whitespace-nowrap
              ${
                isActive
                  ? 'bg-cult-surface-raised border border-cult-border-strong text-cult-accent'
                  : 'border border-transparent text-cult-text-muted hover:text-cult-text-primary hover:bg-cult-surface-subtle'
              }
            `}
          >
            {section.iconName ? (
              <KitIcon name={section.iconName} size={16} />
            ) : (
              <LucideIconCmp className="w-4 h-4" />
            )}
            <span className={isActive ? "inline" : "hidden xl:inline"}>{section.label}</span>
          </button>
        );
      })}
    </div>
  );
}
