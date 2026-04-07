import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
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
      return 'bg-white/[0.10] text-cult-text-secondary border border-white/[0.10]';
  }
}

export function NavigationItem({ item, isActive, onClick, currentView, depth = 0 }: NavigationItemProps) {
  const Icon = item.icon;
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
          w-full flex items-center justify-between px-4 py-2.5 rounded-cult
          transition-all duration-200 text-sm
          ${
            isActive
              ? 'bg-cult-off-white text-cult-black font-medium shadow-sm'
              : hasActiveChild
              ? 'bg-cult-charcoal/50 text-cult-white'
              : 'text-cult-silver hover:text-cult-white hover:bg-cult-charcoal'
          }
        `}
        style={paddingLeft ? { paddingLeft } : undefined}
        aria-current={isActive ? 'page' : undefined}
        aria-expanded={hasChildren ? isExpanded : undefined}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Icon className="w-4 h-4 flex-shrink-0" />
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
