import { InventoryLayout } from './InventoryLayout';
import { useInventoryData } from '../hooks/useInventoryData';
import { useInventoryFilters } from '../hooks/useInventoryFilters';
import { useInventorySearch } from '../hooks/useInventorySearch';
import { useSidebarNavigation } from '../hooks/useSidebarNavigation';
import {
  BinnedInventoryView,
  BuckedInventoryView,
  BulkInventoryView,
  PackagedInventoryView,
  DailyActivityView,
} from './InventoryViews';
import { AllInventoryView } from './AllInventoryView';
import { ConversionsView } from './ConversionsView';
import { ConversionHistoryView } from './ConversionHistoryView';
import { AuditManagement } from './AuditManagement';

export function InventoryManagementSidebar() {
  const { inventoryItems, latestSnapshot, loading } = useInventoryData();
  const {
    searchTerm,
    setSearchTerm,
    searchResults,
    searching,
    handleSearch,
    clearSearch,
  } = useInventorySearch();

  const {
    allItems,
    binnedItems,
    buckedItems,
    bulkItems,
    packagedItems,
    allInventoryStats,
    binnedStats,
    buckedStats,
    bulkStats,
    packagedStats,
  } = useInventoryFilters(inventoryItems);

  const {
    sections,
    selectedView,
    expandedSections,
    bulkSubTab,
    isSidebarCollapsed,
    activeStageFilter,
    handleSelectView,
    handleToggleSection,
    handleToggleSidebar,
    handleStageFilterChange,
    setBulkSubTab,
  } = useSidebarNavigation({
    allInventoryStats,
    binnedStats,
    buckedStats,
    bulkStats,
    packagedStats,
    pendingConversionsCount: 0,
    activeAuditExists: false,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cult-black">
        <div className="text-white text-lg">Loading inventory...</div>
      </div>
    );
  }

  const renderContent = () => {
    switch (selectedView) {
      case 'all-inventory':
        return (
          <AllInventoryView
            items={allItems}
            stats={allInventoryStats}
            stageFilter={activeStageFilter}
            onStageFilterChange={handleStageFilterChange}
          />
        );
      case 'binned':
        return <BinnedInventoryView items={binnedItems} stats={binnedStats} />;
      case 'bucked':
        return <BuckedInventoryView items={buckedItems} stats={buckedStats} />;
      case 'bulk':
        return (
          <BulkInventoryView
            items={bulkItems}
            stats={bulkStats}
            subTab={bulkSubTab}
            onSubTabChange={setBulkSubTab}
          />
        );
      case 'packaged':
        return <PackagedInventoryView items={packagedItems} stats={packagedStats} />;
      case 'daily-activity':
        return <DailyActivityView />;
      case 'conversions':
        return <ConversionsView />;
      case 'conversion-history':
        return <ConversionHistoryView />;
      case 'audits':
        return <AuditManagement />;
      default:
        return <div className="text-white">View not found</div>;
    }
  };

  return (
    <InventoryLayout
      sections={sections}
      selectedView={selectedView}
      expandedSections={expandedSections}
      isSidebarCollapsed={isSidebarCollapsed}
      onSelectView={handleSelectView}
      onToggleSection={handleToggleSection}
      onToggleSidebar={handleToggleSidebar}
      latestSnapshot={latestSnapshot}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      onSearch={handleSearch}
      onClearSearch={clearSearch}
      searching={searching}
      searchResults={searchResults}
    >
      {renderContent()}
    </InventoryLayout>
  );
}
