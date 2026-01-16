/**
 * @deprecated This component is deprecated as of 2025-01-12.
 * Inventory navigation has been migrated to the main navigation menu with nested items.
 * Use the main navigation drawer instead.
 * This file is kept for reference only.
 */
import { ChevronRight, ChevronDown, Package, Archive, Box, Leaf, Activity, RefreshCw, FileCheck, Menu, X, History } from 'lucide-react';
import type { SidebarSection, SidebarNavigationItem, InventorySidebarView, NavigationSection } from '../types';

interface InventorySidebarProps {
  sections: SidebarSection[];
  selectedView: InventorySidebarView;
  expandedSections: NavigationSection[];
  isSidebarCollapsed: boolean;
  onSelectView: (view: InventorySidebarView) => void;
  onToggleSection: (section: NavigationSection) => void;
  onToggleSidebar: () => void;
}

const ICON_MAP = {
  binned: Leaf,
  bucked: Archive,
  bulk: Box,
  packaged: Package,
  'daily-activity': Activity,
  conversions: RefreshCw,
  'conversion-history': History,
  audits: FileCheck,
};

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
      return 'bg-gray-500 text-white';
  }
}

function SidebarItemComponent({
  item,
  isSelected,
  onSelect,
  depth = 0,
}: {
  item: SidebarNavigationItem;
  isSelected: boolean;
  onSelect: () => void;
  depth?: number;
}) {
  const Icon = ICON_MAP[item.id as keyof typeof ICON_MAP];
  const paddingLeft = `${(depth + 1) * 0.75}rem`;

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
        isSelected
          ? 'bg-cult-off-white text-cult-black font-medium shadow-sm'
          : 'text-cult-silver hover:bg-cult-charcoal hover:text-cult-white'
      }`}
      style={{ paddingLeft }}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
        <span className="text-sm truncate">{item.label}</span>
      </div>
      {item.badge && (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${getBadgeStyles(
            item.badgeColor
          )}`}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}

function SidebarSectionComponent({
  section,
  selectedView,
  isExpanded,
  onToggle,
  onSelectView,
}: {
  section: SidebarSection;
  selectedView: InventorySidebarView;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectView: (view: InventorySidebarView) => void;
}) {
  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-cult-silver hover:text-cult-white transition-colors"
      >
        <span className="text-xs font-bold uppercase tracking-wider">{section.title}</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>
      {isExpanded && (
        <div className="mt-1 space-y-1">
          {section.items.map((item) => (
            <div key={item.id}>
              <SidebarItemComponent
                item={item}
                isSelected={selectedView === item.id}
                onSelect={() => onSelectView(item.id)}
              />
              {item.children && item.children.length > 0 && selectedView === item.id && (
                <div className="mt-1 space-y-1">
                  {item.children.map((child) => (
                    <SidebarItemComponent
                      key={child.id}
                      item={child}
                      isSelected={false}
                      onSelect={() => {}}
                      depth={1}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function InventorySidebar({
  sections,
  selectedView,
  expandedSections,
  isSidebarCollapsed,
  onSelectView,
  onToggleSection,
  onToggleSidebar,
}: InventorySidebarProps) {
  return (
    <>
      <button
        onClick={onToggleSidebar}
        className="lg:hidden fixed top-20 left-4 z-30 p-2 bg-cult-graphite border border-cult-charcoal rounded-lg text-cult-white hover:bg-cult-charcoal transition-colors shadow-glow"
      >
        {isSidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
      </button>

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen bg-cult-graphite border-r border-cult-charcoal z-30 transition-transform duration-300 ${
          isSidebarCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
        }`}
        style={{ width: '280px' }}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-cult-charcoal">
            <h2 className="text-xl font-bold text-cult-white">Inventory</h2>
            <p className="text-xs text-cult-silver mt-1">Navigate and manage inventory</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {sections.map((section) => (
              <SidebarSectionComponent
                key={section.id}
                section={section}
                selectedView={selectedView}
                isExpanded={expandedSections.includes(section.id)}
                onToggle={() => onToggleSection(section.id)}
                onSelectView={onSelectView}
              />
            ))}
          </div>

          <div className="p-4 border-t border-cult-charcoal">
            <button
              onClick={onToggleSidebar}
              className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 text-cult-silver hover:text-cult-white transition-colors text-sm"
            >
              <ChevronRight className="w-4 h-4" />
              <span>Collapse</span>
            </button>
          </div>
        </div>
      </aside>

      {!isSidebarCollapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={onToggleSidebar}
        />
      )}
    </>
  );
}
