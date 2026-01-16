/**
 * @deprecated This component is deprecated as of 2025-01-12.
 * Inventory navigation has been migrated to the main navigation menu with nested items.
 * Use the simplified view wrappers in InventoryViewsSimplified.tsx instead.
 * This file is kept for reference only.
 */
import { ReactNode } from 'react';
import { InventorySidebar } from './InventorySidebar';
import { InventorySearch } from './InventorySearch';
import type {
  SidebarSection,
  InventorySidebarView,
  NavigationSection,
  InventorySnapshot,
  SearchResult,
} from '../types';

interface InventoryLayoutProps {
  sections: SidebarSection[];
  selectedView: InventorySidebarView;
  expandedSections: NavigationSection[];
  isSidebarCollapsed: boolean;
  onSelectView: (view: InventorySidebarView) => void;
  onToggleSection: (section: NavigationSection) => void;
  onToggleSidebar: () => void;
  children: ReactNode;
  latestSnapshot: InventorySnapshot | null;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  searching: boolean;
  searchResults: SearchResult[];
}

export function InventoryLayout({
  sections,
  selectedView,
  expandedSections,
  isSidebarCollapsed,
  onSelectView,
  onToggleSection,
  onToggleSidebar,
  children,
  latestSnapshot,
  searchTerm,
  onSearchTermChange,
  onSearch,
  onClearSearch,
  searching,
  searchResults,
}: InventoryLayoutProps) {
  const viewTitles: Record<InventorySidebarView, string> = {
    'all-inventory': 'All Inventory',
    binned: 'Binned Inventory (Fresh)',
    bucked: 'Bucked Inventory',
    bulk: 'Bulk Inventory',
    packaged: 'Packaged Inventory',
    'daily-activity': 'Daily Activity',
    conversions: 'Conversions',
    'conversion-history': 'Conversion History',
    audits: 'Audit Management',
  };

  const viewDescriptions: Record<InventorySidebarView, string> = {
    'all-inventory': 'View all inventory across all stages (Binned → Bucked → Bulk → Packaged)',
    binned: 'Fresh flower directly from harvest, ready for processing',
    bucked: 'Flower that has been bucked and is ready for trimming',
    bulk: 'Processed flower, smalls, and trim ready for packaging',
    packaged: 'Final packaged products ready for distribution',
    'daily-activity': 'Track daily inventory movements and changes',
    conversions: 'Convert completed production sessions into final inventory',
    'conversion-history': 'View past conversions, track performance, and analyze variance trends',
    audits: 'Perform inventory audits and track variances',
  };

  return (
    <div className="flex bg-cult-black">
      <InventorySidebar
        sections={sections}
        selectedView={selectedView}
        expandedSections={expandedSections}
        isSidebarCollapsed={isSidebarCollapsed}
        onSelectView={onSelectView}
        onToggleSection={onToggleSection}
        onToggleSidebar={onToggleSidebar}
      />

      <main className="flex-1 lg:ml-0 min-h-[calc(100vh-200px)]">
        <div className="p-6 max-w-[1800px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6">
            <div className="lg:ml-12 xl:ml-0">
              <h1 className="text-3xl font-bold text-cult-white">{viewTitles[selectedView]}</h1>
              <p className="text-cult-silver mt-1">{viewDescriptions[selectedView]}</p>
              {latestSnapshot && (
                <p className="text-sm text-cult-silver/70 mt-2">
                  Last import: {new Date(latestSnapshot.import_date).toLocaleString()} (
                  {latestSnapshot.row_count} items)
                </p>
              )}
            </div>
          </div>

          <InventorySearch
            searchTerm={searchTerm}
            onSearchTermChange={onSearchTermChange}
            onSearch={onSearch}
            onClear={onClearSearch}
            searching={searching}
            searchResults={searchResults}
          />

          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
