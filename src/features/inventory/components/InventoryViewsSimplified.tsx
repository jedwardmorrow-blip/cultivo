import { useInventoryData } from '../hooks/useInventoryData';
import { useInventoryFilters } from '../hooks/useInventoryFilters';
import { AllInventoryView } from './AllInventoryView';
import {
  BinnedInventoryView,
  BuckedInventoryView,
  BulkInventoryView,
  PackagedInventoryView,
  DailyActivityView,
} from './InventoryViews';
import { ConversionsView } from './ConversionsView';
import { ConversionHistoryView } from './ConversionHistoryView';
import { AuditManagement } from './AuditManagement';
import type { StageFilter } from '../types';

export function AllInventoryViewWrapper() {
  const { inventoryItems, loading } = useInventoryData();
  const { allItems, allInventoryStats } = useInventoryFilters(inventoryItems);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-cult-silver">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cult-white">All Inventory</h1>
        <p className="text-cult-silver mt-1">
          View all inventory across all stages (Binned → Bucked → Bulk → Packaged)
        </p>
      </div>
      <AllInventoryView
        items={allItems}
        stats={allInventoryStats}
        stageFilter="all"
        onStageFilterChange={() => {}}
      />
    </div>
  );
}

export function BinnedInventoryViewWrapper() {
  const { inventoryItems, loading } = useInventoryData();
  const { binnedItems, binnedStats } = useInventoryFilters(inventoryItems);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-cult-silver">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cult-white">Binned Inventory</h1>
        <p className="text-cult-silver mt-1">Fresh flower directly from harvest, ready for processing</p>
      </div>
      <BinnedInventoryView items={binnedItems} stats={binnedStats} />
    </div>
  );
}

export function BuckedInventoryViewWrapper() {
  const { inventoryItems, loading } = useInventoryData();
  const { buckedItems, buckedStats } = useInventoryFilters(inventoryItems);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-cult-silver">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cult-white">Bucked Inventory</h1>
        <p className="text-cult-silver mt-1">Flower that has been bucked and is ready for trimming</p>
      </div>
      <BuckedInventoryView items={buckedItems} stats={buckedStats} />
    </div>
  );
}

export function BulkInventoryViewWrapper() {
  const { inventoryItems, loading } = useInventoryData();
  const { bulkItems, bulkStats } = useInventoryFilters(inventoryItems);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-cult-silver">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cult-white">Bulk Inventory</h1>
        <p className="text-cult-silver mt-1">Processed flower, smalls, and trim ready for packaging</p>
      </div>
      <BulkInventoryView items={bulkItems} stats={bulkStats} subTab="flower" onSubTabChange={() => {}} />
    </div>
  );
}

export function PackagedInventoryViewWrapper() {
  const { inventoryItems, loading } = useInventoryData();
  const { packagedItems, packagedStats } = useInventoryFilters(inventoryItems);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-cult-silver">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cult-white">Packaged Inventory</h1>
        <p className="text-cult-silver mt-1">Final packaged products ready for distribution</p>
      </div>
      <PackagedInventoryView items={packagedItems} stats={packagedStats} />
    </div>
  );
}

export function DailyActivityViewWrapper() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cult-white">Daily Activity</h1>
        <p className="text-cult-silver mt-1">Track daily inventory movements and changes</p>
      </div>
      <DailyActivityView />
    </div>
  );
}

export function ConversionsViewWrapper() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cult-white">Conversions</h1>
        <p className="text-cult-silver mt-1">Convert completed production sessions into final inventory</p>
      </div>
      <ConversionsView />
    </div>
  );
}

export function ConversionHistoryViewWrapper() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cult-white">Conversion History</h1>
        <p className="text-cult-silver mt-1">View past conversions, track performance, and analyze variance trends</p>
      </div>
      <ConversionHistoryView />
    </div>
  );
}

export function AuditsViewWrapper() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cult-white">Audit Management</h1>
        <p className="text-cult-silver mt-1">Perform inventory audits and track variances</p>
      </div>
      <AuditManagement />
    </div>
  );
}
