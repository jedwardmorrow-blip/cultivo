/**
 * DS CONTRACT — working-instrument aesthetic, see CLAUDE.md > Banned patterns.
 *
 * NavigationDrawer is rendered on every authenticated route. Visual changes
 * here are seen on every screen.
 *
 * MUST NOT use:
 * - backdrop-blur (any variant)
 * - box-shadow / shadow-* (hairlines only)
 * - rounded-cult /2xl / 3xl
 * - stage colors as fills
 * - hover:-translate-y-*
 */
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
}: NavigationDrawerProps) {
 const handleNavigate = (viewId: string) => {
 onNavigate(viewId);
 onClose();
 };

 return (
 <>
 {isOpen && (
 <div
 className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
 onClick={onClose}
 aria-hidden="true"
 />
 )}

 <aside
 className={`
 fixed top-0 left-0 h-full w-[260px] sm:w-[280px] bg-cult-surface border-r border-cult-border z-50
 transform transition-transform duration-300 ease-in-out overflow-y-auto safe-top safe-bottom
 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
 `}
 role="navigation"
 aria-label="Main navigation"
 >
 <div className="flex items-center justify-between px-4 py-3 border-b border-cult-border-subtle">
 <h2 className="font-mono uppercase tracking-[0.18em] text-sm text-cult-text-primary">
 Navigation
 </h2>
 <button
 onClick={onClose}
 className="p-2.5 text-cult-text-muted hover:text-cult-text-primary transition-colors rounded hover:bg-cult-surface-raised min-w-[44px] min-h-[44px] flex items-center justify-center"
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
 />
 ))}
 </nav>
 </aside>
 </>
 );
}
