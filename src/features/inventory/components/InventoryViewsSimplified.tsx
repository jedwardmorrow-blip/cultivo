import { useState, type ReactNode } from 'react';
import { Archive, Box, Leaf, Package } from 'lucide-react';
import { PageSkeleton } from '@/shared/components';
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
import { ConsolidateView } from './ConsolidateView';
import { SalesInventoryView } from './SalesInventoryView';
import type { BulkSubTab } from '../types';

/* ── Shared layout shell ──────────────────────────────────────── */

function ViewShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-cult-white">{title}</h1>
        <p className="text-cult-light-gray text-sm mt-2">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function InventoryLoadingState() {
  return <PageSkeleton variant="table" />;
}

function useInventoryContext() {
  const { inventoryItems, loading, fetchInventory } = useSharedInventoryData();
  const filters = useInventoryFilters(inventoryItems);
  const onDataRefresh = () => fetchInventory(true);
  return { loading, onDataRefresh, ...filters };
}

/* ── Stage tab types ──────────────────────────────────────────── */

type StageTab = 'all' | 'binned' | 'bucked' | 'bulk' | 'packaged';

const STAGE_TABS: { key: StageTab; label: string; icon: typeof Package }[] = [
  { key: 'all', label: 'All', icon: Archive },
  { key: 'binned', label: 'Binned', icon: Leaf },
  { key: 'bucked', label: 'Bucked', icon: Archive },
  { key: 'bulk', label: 'Bulk', icon: Box },
  { key: 'packaged', label: 'Packaged', icon: Package },
];

/* ── Unified Inventory View (replaces 5 separate nav items) ─── */

export function UnifiedInventoryViewWrapper() {
  const ctx = useInventoryContext();
  const [activeStage, setActiveStage] = useState<StageTab>('all');
  const [bulkSubTab, setBulkSubTab] = useState<BulkSubTab>('flower');

  if (ctx.loading) return <InventoryLoadingState />;

  // Stage item counts for tab badges
  const stageCounts = {
    all: ctx.allItems.length,
    binned: ctx.binnedItems.length,
    bucked: ctx.buckedItems.length,
    bulk: ctx.bulkItems.length,
    packaged: ctx.packagedItems.length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-cult-white">Inventory</h1>
        <p className="text-cult-light-gray text-sm mt-2">
          {activeStage === 'all' && 'View all inventory across all stages'}
          {activeStage === 'binned' && 'Fresh flower directly from harvest, ready for processing'}
          {activeStage === 'bucked' && 'Flower that has been bucked and is ready for trimming'}
          {activeStage === 'bulk' && 'Processed flower, smalls, and trim ready for packaging'}
          {activeStage === 'packaged' && 'Final packaged products ready for distribution'}
        </p>
      </div>

      {/* Stage tabs */}
      <div className="flex gap-1 p-1 bg-cult-dark-gray rounded-lg w-fit">
        {STAGE_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveStage(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeStage === key
                ? 'bg-cult-medium-gray text-cult-white shadow-sm'
                : 'text-cult-silver hover:text-cult-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${
              activeStage === key ? 'bg-cult-lighter-gray/30 text-cult-white' : 'bg-cult-medium-gray/50 text-cult-lighter-gray'
            }`}>
              {stageCounts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Stage content */}
      {activeStage === 'all' && (
        <AllInventoryView
          items={ctx.allItems}
          stats={ctx.allInventoryStats}
          stageFilter="all"
          onStageFilterChange={() => {}}
          onDataRefresh={ctx.onDataRefresh}
        />
      )}
      {activeStage === 'binned' && (
        <BinnedInventoryView items={ctx.binnedItems} stats={ctx.binnedStats} onDataRefresh={ctx.onDataRefresh} />
      )}
      {activeStage === 'bucked' && (
        <BuckedInventoryView items={ctx.buckedItems} stats={ctx.buckedStats} onDataRefresh={ctx.onDataRefresh} />
      )}
      {activeStage === 'bulk' && (
        <BulkInventoryView items={ctx.bulkItems} stats={ctx.bulkStats} subTab={bulkSubTab} onSubTabChange={setBulkSubTab} onDataRefresh={ctx.onDataRefresh} />
      )}
      {activeStage === 'packaged' && (
        <PackagedInventoryView items={ctx.packagedItems} stats={ctx.packagedStats} onDataRefresh={ctx.onDataRefresh} />
      )}
    </div>
  );
}

/* ── Legacy wrappers (kept for redirect compatibility) ─────── */

export function AllInventoryViewWrapper() {
  const { loading, allItems, allInventoryStats, onDataRefresh } = useInventoryContext();
  if (loading) return <InventoryLoadingState />;

  return (
    <ViewShell title="All Inventory" subtitle="View all inventory across all stages">
      <AllInventoryView
        items={allItems}
        stats={allInventoryStats}
        stageFilter="all"
        onStageFilterChange={() => {}}
        onDataRefresh={onDataRefresh}
      />
    </ViewShell>
  );
}

export function BinnedInventoryViewWrapper() {
  const { loading, binnedItems, binnedStats, onDataRefresh } = useInventoryContext();
  if (loading) return <InventoryLoadingState />;

  return (
    <ViewShell title="Binned Inventory" subtitle="Fresh flower directly from harvest, ready for processing">
      <BinnedInventoryView items={binnedItems} stats={binnedStats} onDataRefresh={onDataRefresh} />
    </ViewShell>
  );
}

export function BuckedInventoryViewWrapper() {
  const { loading, buckedItems, buckedStats, onDataRefresh } = useInventoryContext();
  if (loading) return <InventoryLoadingState />;

  return (
    <ViewShell title="Bucked Inventory" subtitle="Flower that has been bucked and is ready for trimming">
      <BuckedInventoryView items={buckedItems} stats={buckedStats} onDataRefresh={onDataRefresh} />
    </ViewShell>
  );
}

export function BulkInventoryViewWrapper() {
  const { loading, bulkItems, bulkStats, onDataRefresh } = useInventoryContext();
  const [subTab, setSubTab] = useState<BulkSubTab>('flower');
  if (loading) return <InventoryLoadingState />;

  return (
    <ViewShell title="Bulk Inventory" subtitle="Processed flower, smalls, and trim ready for packaging">
      <BulkInventoryView items={bulkItems} stats={bulkStats} subTab={subTab} onSubTabChange={setSubTab} onDataRefresh={onDataRefresh} />
    </ViewShell>
  );
}

export function PackagedInventoryViewWrapper() {
  const { loading, packagedItems, packagedStats, onDataRefresh } = useInventoryContext();
  if (loading) return <InventoryLoadingState />;

  return (
    <ViewShell title="Packaged Inventory" subtitle="Final packaged products ready for distribution">
      <PackagedInventoryView items={packagedItems} stats={packagedStats} onDataRefresh={onDataRefresh} />
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
    <ViewShell title="Inventory Audits" subtitle="Scoped inventory audit sessions — rewriting for Sunday baseline reset">
      <div className="rounded-2xl border border-cult-border bg-cult-surface-raised p-8 text-center">
        <p className="text-cult-text-primary font-medium">Inventory Audit UI under reconstruction</p>
        <p className="text-cult-text-muted text-sm mt-2">
          Phase B rewrite in progress. The audit DB contract and RPCs are live on staging and production; this
          screen reappears with the new scoped-session workflow.
        </p>
      </div>
    </ViewShell>
  );
}

export function ConsolidateViewWrapper() {
  const { loading, allItems, onDataRefresh } = useInventoryContext();
  if (loading) return <InventoryLoadingState />;

  return (
    <ViewShell title="Consolidate Inventory" subtitle="Combine fragmented packages by strain, batch, and stage">
      <ConsolidateView items={allItems} onDataRefresh={onDataRefresh} />
    </ViewShell>
  );
}

export function SalesInventoryViewWrapper() {
  return <SalesInventoryView />;
}
