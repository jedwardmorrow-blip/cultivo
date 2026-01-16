/**
 * @deprecated This hook is deprecated as of 2025-01-12.
 * Inventory navigation has been migrated to the main navigation menu with nested items.
 * Badge counts are now managed by useBadgeCounts in src/hooks/useBadgeCounts.ts.
 * This file is kept for reference only.
 */
import { useState, useCallback, useMemo } from 'react';
import type {
  NavigationSection,
  InventorySidebarView,
  BulkSubTab,
  SidebarNavigationState,
  SidebarSection,
  InventoryItem,
  InventoryStats,
  BulkStats,
  PackagedStats,
  AllInventoryStats,
  StageFilter,
} from '../types';

interface UseSidebarNavigationProps {
  allInventoryStats: AllInventoryStats;
  binnedStats: InventoryStats;
  buckedStats: InventoryStats;
  bulkStats: BulkStats;
  packagedStats: PackagedStats;
  pendingConversionsCount?: number;
  activeAuditExists?: boolean;
}

export function useSidebarNavigation({
  allInventoryStats,
  binnedStats,
  buckedStats,
  bulkStats,
  packagedStats,
  pendingConversionsCount = 0,
  activeAuditExists = false,
}: UseSidebarNavigationProps) {
  const [selectedView, setSelectedView] = useState<InventorySidebarView>('all-inventory');
  const [expandedSections, setExpandedSections] = useState<NavigationSection[]>([
    'inventory-items',
    'inventory-functions',
  ]);
  const [bulkSubTab, setBulkSubTab] = useState<BulkSubTab>('flower');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeStageFilter, setActiveStageFilter] = useState<StageFilter>('all');

  const sections = useMemo<SidebarSection[]>(() => {
    const hasAgingInventory = (binnedStats.oldestPackage || 0) > 14;
    const totalInventoryCount = allInventoryStats.totalPackages;

    return [
      {
        id: 'inventory-items',
        title: 'Inventory Items',
        items: [
          {
            id: 'all-inventory',
            label: 'All Inventory',
            badge: totalInventoryCount > 0 ? totalInventoryCount : undefined,
            badgeColor: 'info',
            children: [
              {
                id: 'binned',
                label: 'Binned (Fresh)',
                badge: binnedStats.totalPackages > 0 ? binnedStats.totalPackages : undefined,
                badgeColor: hasAgingInventory ? 'warning' : 'default',
              },
              {
                id: 'bucked',
                label: 'Bucked',
                badge: buckedStats.totalPackages > 0 ? buckedStats.totalPackages : undefined,
                badgeColor: 'default',
              },
              {
                id: 'bulk',
                label: 'Bulk',
                badge: bulkStats.totalPackages > 0 ? bulkStats.totalPackages : undefined,
                badgeColor: 'default',
              },
              {
                id: 'packaged',
                label: 'Packaged',
                badge: packagedStats.totalUnits > 0 ? packagedStats.totalUnits.toFixed(0) : undefined,
                badgeColor: 'success',
              },
            ],
          },
        ],
      },
      {
        id: 'inventory-functions',
        title: 'Inventory Functions',
        items: [
          {
            id: 'daily-activity',
            label: 'Daily Activity',
            badgeColor: 'info',
          },
          {
            id: 'conversions',
            label: 'Conversions',
            badge: pendingConversionsCount > 0 ? pendingConversionsCount : undefined,
            badgeColor: pendingConversionsCount > 0 ? 'warning' : 'default',
          },
          {
            id: 'conversion-history',
            label: 'Conversion History',
            badgeColor: 'info',
          },
          {
            id: 'audits',
            label: 'Audits',
            badge: activeAuditExists ? 'Active' : undefined,
            badgeColor: activeAuditExists ? 'error' : 'default',
          },
        ],
      },
    ];
  }, [allInventoryStats, binnedStats, buckedStats, bulkStats, packagedStats, pendingConversionsCount, activeAuditExists]);

  const handleSelectView = useCallback((view: InventorySidebarView) => {
    setSelectedView(view);

    // When clicking stage-specific items, navigate to all-inventory view with that stage filter
    if (view === 'binned' || view === 'bucked' || view === 'bulk' || view === 'packaged') {
      setSelectedView('all-inventory');
      setActiveStageFilter(view);
    } else if (view === 'all-inventory') {
      // When clicking "All Inventory", show all stages
      setActiveStageFilter('all');
    }
  }, []);

  const handleStageFilterChange = useCallback((filter: StageFilter) => {
    setActiveStageFilter(filter);
  }, []);

  const handleToggleSection = useCallback((section: NavigationSection) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const navigationState: SidebarNavigationState = {
    selectedView,
    expandedSections,
    bulkSubTab,
    isSidebarCollapsed,
    activeStageFilter,
  };

  return {
    sections,
    selectedView,
    expandedSections,
    bulkSubTab,
    isSidebarCollapsed,
    activeStageFilter,
    navigationState,
    handleSelectView,
    handleToggleSection,
    handleToggleSidebar,
    handleStageFilterChange,
    setBulkSubTab,
  };
}
