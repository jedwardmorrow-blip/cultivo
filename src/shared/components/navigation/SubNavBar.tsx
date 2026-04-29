import { Icon as KitIcon } from '@/shared/icons';
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
      return 'bg-cult-warning/15 text-cult-warning border border-cult-warning/30';
    case 'success':
      return 'bg-cult-success/15 text-cult-success border border-cult-success/30';
    case 'error':
      return 'bg-cult-danger/15 text-cult-danger border border-cult-danger/30';
    case 'info':
      return 'bg-cult-info/15 text-cult-info border border-cult-info/30';
    default:
      return 'bg-cult-surface-active text-cult-text-secondary border border-cult-border';
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
    <div className="border-b border-cult-border sticky z-30 bg-cult-surface" style={{ top: 'calc(65px + env(safe-area-inset-top, 0px))' }}>
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6">
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
            <div className="w-px h-6 bg-cult-surface-raised mx-1 flex-shrink-0" />
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
  const LucideIconCmp = item.icon;
  const badge = badgeInfo?.badge;
  const badgeColor = badgeInfo?.badgeColor;

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium
        transition-colors duration-150 whitespace-nowrap flex-shrink-0
        ${
          isActive
            ? 'bg-cult-surface-raised text-cult-text-primary'
            : 'text-cult-text-muted hover:text-cult-text-primary hover:bg-cult-surface-subtle'
        }
      `}
    >
      {item.iconName ? (
        <KitIcon name={item.iconName} size={14} />
      ) : (
        <LucideIconCmp className="w-3.5 h-3.5" />
      )}
      <span>{item.label}</span>
      {badge !== undefined && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-xs font-bold min-w-[1.25rem] text-center leading-none ${getBadgeStyles(
            badgeColor
          )}`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
