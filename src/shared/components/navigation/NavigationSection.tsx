import { ChevronRight, ChevronDown } from 'lucide-react';
import { NavigationItem } from './NavigationItem';
import type { MenuSection } from './types';

interface NavigationSectionProps {
  section: MenuSection;
  isExpanded: boolean;
  onToggle: () => void;
  currentView: string;
  onNavigate: (viewId: string) => void;
  isAdmin: boolean;
}

export function NavigationSection({
  section,
  isExpanded,
  onToggle,
  currentView,
  onNavigate,
  isAdmin,
}: NavigationSectionProps) {
  const Icon = section.icon;
  const hasActiveItem = section.items.some((item) => item.id === currentView);

  const visibleItems = section.items.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  if (visibleItems.length === 0) return null;

  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className={`
          w-full flex items-center justify-between px-3 py-2 rounded-cult
          transition-colors duration-200
          ${
            hasActiveItem
              ? 'text-cult-white'
              : 'text-cult-silver hover:text-cult-white hover:bg-cult-charcoal/50'
          }
        `}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">{section.label}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-1 ml-3 space-y-1 animate-fade-in">
          {visibleItems.map((item) => (
            <NavigationItem
              key={item.id}
              item={item}
              isActive={currentView === item.id}
              onClick={() => onNavigate(item.id)}
              currentView={currentView}
            />
          ))}
        </div>
      )}
    </div>
  );
}
