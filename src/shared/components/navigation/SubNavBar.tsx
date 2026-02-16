import { sectionDefinitions, getActiveSectionId } from './sectionNavigation';
import type { SubNavItem } from './sectionNavigation';

interface SubNavBarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
  badgeMap?: Record<string, { badge?: number | string; badgeColor?: string }>;
}

function getBadgeStyles(color?: string) {
  switch (color) {
    case 'warning':
      return 'bg-amber-500 text-white';
    case 'success':
      return 'bg-green-500 text-white';
    case 'error':
      return 'bg-red-500 text-white';
    case 'info':
      return 'bg-blue-500 text-white';
    default:
      return 'bg-cult-silver text-cult-black';
  }
}

export function SubNavBar({ currentView, onNavigate, badgeMap }: SubNavBarProps) {
  const activeSectionId = getActiveSectionId(currentView);
  const activeSection = sectionDefinitions.find((s) => s.id === activeSectionId);

  if (!activeSection) return null;

  const primaryItems = activeSection.items.filter((item) => item.group === 'primary');
  const secondaryItems = activeSection.items.filter((item) => item.group === 'secondary');
  const hasBothGroups = primaryItems.length > 0 && secondaryItems.length > 0;

  return (
    <div className="bg-cult-near-black border-b border-cult-charcoal/60 sticky top-[65px] z-30">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
          {primaryItems.map((item) => (
            <SubNavButton
              key={item.id}
              item={item}
              isActive={currentView === item.id}
              onClick={() => onNavigate(item.id)}
              badgeInfo={badgeMap?.[item.id]}
            />
          ))}

          {hasBothGroups && (
            <div className="w-px h-6 bg-cult-charcoal mx-1 flex-shrink-0" />
          )}

          {secondaryItems.map((item) => (
            <SubNavButton
              key={item.id}
              item={item}
              isActive={currentView === item.id}
              onClick={() => onNavigate(item.id)}
              badgeInfo={badgeMap?.[item.id]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface SubNavButtonProps {
  item: SubNavItem;
  isActive: boolean;
  onClick: () => void;
  badgeInfo?: { badge?: number | string; badgeColor?: string };
}

function SubNavButton({ item, isActive, onClick, badgeInfo }: SubNavButtonProps) {
  const Icon = item.icon;
  const badge = badgeInfo?.badge;
  const badgeColor = badgeInfo?.badgeColor;

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
        transition-all duration-200 whitespace-nowrap flex-shrink-0
        ${
          isActive
            ? 'bg-cult-charcoal text-cult-off-white shadow-sm'
            : 'text-cult-silver hover:text-cult-off-white hover:bg-cult-charcoal/40'
        }
      `}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{item.label}</span>
      {badge !== undefined && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[1.25rem] text-center leading-none ${getBadgeStyles(
            badgeColor
          )}`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
