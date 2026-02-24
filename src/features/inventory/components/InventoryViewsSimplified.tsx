import { useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useSharedInventoryData } from '../context/InventoryDataContext';
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
import type { BulkSubTab } from '../types';

function ViewShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-cult-white tracking-tight">{title}</h1>
        <p className="text-cult-silver text-sm mt-1">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function InventoryLoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex items-center gap-3 text-cult-silver">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading inventory...</span>
      </div>
    </div>
  );
}

function useInventoryContext() {
  const { inventoryItems, loading } = useSharedInventoryData();
  const filters = useInventoryFilters(inventoryItems);
  return { loading, ...filters };
}

export function AllInventoryViewWrapper() {
  const { loading, allItems, allInventoryStats } = useInventoryContext();
  if (loading) return <InventoryLoadingState />;

  return (
    <ViewShell title="All Inventory" subtitle="View all inventory across all stages">
      <AllInventoryView
        items={allItems}
        stats={allInventoryStats}
        stageFilter="all"
        onStageFilterChange={() => {}}
      />
    </ViewShell>
  );
}

export function BinnedInventoryViewWrapper() {
  const { loading, binnedItems, binnedStats } = useInventoryContext();
  if (loading) return <InventoryLoadingState />;

  return (
    <ViewShell title="Binned Inventory" subtitle="Fresh flower directly from harvest, ready for processing">
      <BinnedInventoryView items={binnedItems} stats={binnedStats} />
    </ViewShell>
  );
}

export function BuckedInventoryViewWrapper() {
  const { loading, buckedItems, buckedStats } = useInventoryContext();
  if (loading) return <InventoryLoadingState />;

  return (
    <ViewShell title="Bucked Inventory" subtitle="Flower that has been bucked and is ready for trimming">
      <BuckedInventoryView items={buckedItems} stats={buckedStats} />
    </ViewShell>
  );
}

export function BulkInventoryViewWrapper() {
  const { loading, bulkItems, bulkStats } = useInventoryContext();
  const [subTab, setSubTab] = useState<BulkSubTab>('flower');
  if (loading) return <InventoryLoadingState />;

  return (
    <ViewShell title="Bulk Inventory" subtitle="Processed flower, smalls, and trim ready for packaging">
      <BulkInventoryView items={bulkItems} stats={bulkStats} subTab={subTab} onSubTabChange={setSubTab} />
    </ViewShell>
  );
}

export function PackagedInventoryViewWrapper() {
  const { loading, packagedItems, packagedStats } = useInventoryContext();
  if (loading) return <InventoryLoadingState />;

  return (
    <ViewShell title="Packaged Inventory" subtitle="Final packaged products ready for distribution">
      <PackagedInventoryView items={packagedItems} stats={packagedStats} />
    </ViewShell>
  );
}

export function DailyActivityViewWrapper() {
  return (
    <ViewShell title="Daily Activity" subtitle="Track daily inventory movements and changes">
      <DailyActivityView />
    </ViewShell>
  );
}

export function ConversionsViewWrapper() {
  return (
    <ViewShell title="Conversions" subtitle="Convert completed production sessions into final inventory">
      <ConversionsView />
    </ViewShell>
  );
}

export function ConversionHistoryViewWrapper() {
  return (
    <ViewShell title="Conversion History" subtitle="View past conversions, track performance, and analyze variance trends">
      <ConversionHistoryView />
    </ViewShell>
  );
}

export function AuditsViewWrapper() {
  return (
    <ViewShell title="Audit Management" subtitle="Perform inventory audits and track variances">
      <AuditManagement />
    </ViewShell>
  );
}
