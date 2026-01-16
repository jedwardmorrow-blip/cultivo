import { X } from 'lucide-react';
import { NavigationSection } from './NavigationSection';
import type { MenuSection } from './types';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sections: MenuSection[];
  currentView: string;
  onNavigate: (viewId: string) => void;
  expandedSections: Set<string>;
  onToggleSection: (sectionId: string) => void;
  isAdmin: boolean;
  isTestPortal: boolean;
}

export function NavigationDrawer({
  isOpen,
  onClose,
  sections,
  currentView,
  onNavigate,
  expandedSections,
  onToggleSection,
  isAdmin,
  isTestPortal,
}: NavigationDrawerProps) {
  const handleNavigate = (viewId: string) => {
    onNavigate(viewId);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-[280px] bg-cult-graphite border-r border-cult-charcoal z-50
          transform transition-transform duration-300 ease-in-out overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between p-4 border-b border-cult-charcoal">
          <h2 className="text-base font-bold text-cult-white uppercase tracking-wider">
            Navigation
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-cult-silver hover:text-cult-white transition-colors rounded-cult hover:bg-cult-charcoal"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4">
          {sections.map((section) => (
            <NavigationSection
              key={section.id}
              section={section}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => onToggleSection(section.id)}
              currentView={currentView}
              onNavigate={handleNavigate}
              isAdmin={isAdmin}
              isTestPortal={isTestPortal}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}
