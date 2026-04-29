import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Icon as KitIcon } from '@/shared/icons';
import type { MenuItem } from './types';

interface NavigationItemProps {
  item: MenuItem;
  isActive: boolean;
  onClick: () => void;
  currentView: string;
  depth?: number;
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

export function NavigationItem({ item, isActive, onClick, currentView, depth = 0 }: NavigationItemProps) {
  const LucideIconCmp = item.icon;
  const hasChildren = item.children && item.children.length > 0;
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveChild = hasChildren && item.children!.some(child => child.id === currentView);
  const paddingLeft = depth > 0 ? `${(depth + 1) * 0.75}rem` : undefined;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else {
      onClick();
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`
          w-full flex items-center justify-between px-4 py-2.5 rounded
          transition-colors duration-150 text-sm
          ${
            isActive
              ? 'bg-cult-accent text-cult-opaque-black font-medium'
              : hasActiveChild
              ? 'bg-cult-surface-subtle text-cult-text-primary'
              : 'text-cult-text-muted hover:text-cult-text-primary hover:bg-cult-surface-subtle'
          }
        `}
        style={paddingLeft ? { paddingLeft } : undefined}
        aria-current={isActive ? 'page' : undefined}
        aria-expanded={hasChildren ? isExpanded : undefined}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {item.iconName ? (
            <KitIcon name={item.iconName} size={16} className="flex-shrink-0" />
          ) : (
            <LucideIconCmp className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="truncate">{item.label}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {item.badge !== undefined && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold min-w-[1.5rem] text-center ${getBadgeStyles(
                item.badgeColor
              )}`}
            >
              {item.badge}
            </span>
          )}
          {hasChildren && (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          )}
        </div>
      </button>

      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1 animate-fade-in">
          {item.children!.map((child) => (
            <NavigationItem
              key={child.id}
              item={child}
              isActive={currentView === child.id}
              onClick={onClick}
              currentView={currentView}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
