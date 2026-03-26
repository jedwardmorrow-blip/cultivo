import { useMemo, useState, useCallback } from 'react';
import { Package, Scale, Leaf, Clock, Printer, Box, Scissors, X } from 'lucide-react';
import { DailyInventoryActivity } from './DailyInventoryActivity';
import { InventoryTable } from './InventoryTable';
import { StatsCard } from './StatsCard';
import { InventoryLabelPrintModal } from './InventoryLabelPrintModal';
import { MultiLabelPrintModal } from './MultiLabelPrintModal';
import { RowActionMenu } from './RowActionMenu';
import type { RowAction } from './RowActionMenu';
import { QualityGradeBadge } from '@/shared/components';
import { qualityGradeService } from '@/services';
import { supabase } from '@/lib/supabase';
import { InventoryItemExtended } from '@/types';
import { useInventoryLabel } from '../hooks';
import { useMultiLabelPrint } from '../hooks/useMultiLabelPrint';
import type { InventoryItem, InventoryStats, BulkStats, PackagedStats, BulkSubTab } from '../types';
import { formatWeight } from '@/shared/utils/format';

function LabelModal({ labelHook }: { labelHook: ReturnType<typeof useInventoryLabel> }) {
  return (
    <InventoryLabelPrintModal
      isOpen={labelHook.isOpen}
      isLoading={labelHook.isLoading}
      isPrinting={labelHook.isPrinting}
      labelData={labelHook.labelData}
      logoDataUrl={labelHook.logoDataUrl}
      error={labelHook.error}
      onClose={labelHook.closeLabel}
      onPrint={labelHook.printLabel}
    />
  );
}

function SelectionSummary({ count, onClear, onPrintLabels }: { count: number; onClear: () => void; onPrintLabels?: () => void }) {
  if (count === 0) return null;
  return (
    <div className="bg-blue-900/15 border border-blue-800/40 rounded-lg p-3 mb-6 flex items-center justify-between">
      <span className="text-sm text-blue-300 font-medium">
        {count} package{count !== 1 ? 's' : ''} selected
      </span>
      <div className="flex items-center gap-2">
        {onPrintLabels && (
          <button
            onClick={onPrintLabels}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-500 rounded-md transition-colors"
          >
            <Printer className="w-3 h-3" />
            Print Labels
          </button>
        )}
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cult-silver hover:text-cult-white bg-cult-medium-gray/40 hover:bg-cult-medium-gray/60 rounded-md transition-colors"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      </div>
    </div>
  );
}

function GradeColumn(onDataRefresh?: () => void) {
  return {
    header: 'Grade',
    accessor: (item: InventoryItem) => item,
    align: 'center' as const,
    sortable: false,
    format: (_: any, item: InventoryItem) => (
      <QualityGradeBadge
        gradeId={(item as InventoryItemExtended).quality_grade_id}
        editable
        onGradeChange={async (newGradeId) => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            await qualityGradeService.assignItemGrade(item.id, newGradeId, user?.id || null);
            onDataRefresh?.();
          } catch (err) {
            console.error('Failed to update grade:', err);
          }
        }}
      />
    ),
  };
}

interface BinnedViewProps {
  items: InventoryItem[];
  stats: InventoryStats;
  onDataRefresh?: () => void;
}

export function BinnedInventoryView({ items, stats, onDataRefresh }: BinnedViewProps) {
  const labelHook = useInventoryLabel();
  const multiLabelHook = useMultiLabelPrint();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sortedItems = useMemo(() =>
    [...items].sort((a, b) => new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime()),
    [items]
  );

  const handlePrintLabelsClick = useCallback(() => {
    const selected = sortedItems.filter((item) => selectedIds.has(item.id));
    if (selected.length > 0) multiLabelHook.openMultiLabel(selected);
  }, [sortedItems, selectedIds, multiLabelHook]);

  const renderRowActions = useCallback((item: InventoryItem) => {
    const actions: RowAction[] = [
      { label: 'Print Label', icon: <Printer className="w-4 h-4" />, onClick: () => labelHook.openLabel(item) },
    ];
    return <RowActionMenu actions={actions} />;
  }, [labelHook]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Packages" value={stats.totalPackages} icon={<Package className="w-5 h-5" />} accentColor="border-emerald-800/40" />
        <StatsCard label="Total Weight" value={formatWeight(stats.totalWeight)} icon={<Scale className="w-5 h-5" />} accentColor="border-blue-800/40" />
        <StatsCard label="Unique Strains" value={stats.strainCount || 0} icon={<Leaf className="w-5 h-5" />} accentColor="border-cult-medium-gray" />
        <StatsCard
          label="Oldest Package"
          value={`${stats.oldestPackage || 0}d`}
          icon={<Clock className="w-5 h-5" />}
          accentColor={(stats.oldestPackage || 0) > 14 ? 'border-amber-700/60' : 'border-cult-medium-gray'}
          subtitle={(stats.oldestPackage || 0) > 14 ? 'Aging - consider processing' : undefined}
        />
      </div>

      {(stats.oldestPackage || 0) > 14 && (
        <div className="mb-6 px-4 py-3 bg-amber-900/10 border border-amber-800/40 rounded-lg flex items-center gap-3">
          <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-amber-300/90 text-sm">
            Binned material waiting <span className="font-semibold">{stats.oldestPackage} days</span> -- process soon for optimal quality.
          </p>
        </div>
      )}

      <SelectionSummary count={selectedIds.size} onClear={() => setSelectedIds(new Set())} onPrintLabels={handlePrintLabelsClick} />

      <InventoryTable
        items={sortedItems}
        searchable
        searchPlaceholder="Search binned inventory..."
        gradeFilterable
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        columns={[
          { header: 'Package ID', accessor: 'package_id', format: (val) => <span className="font-medium text-cult-white">{val}</span> },
          { header: 'Strain', accessor: 'strain', format: (val) => <span className="text-cult-white">{val}</span> },
          { header: 'Batch', accessor: 'batch_number', format: (val) => <span className="text-cult-silver">{val || '-'}</span> },
          { header: 'Available (g)', accessor: 'available_qty', align: 'right', format: (val) => <span className="font-medium text-cult-white tabular-nums">{(val || 0).toFixed(0)}</span> },
          {
            header: 'Age',
            accessor: (item) => Math.floor((Date.now() - new Date(item.last_updated).getTime()) / (1000 * 60 * 60 * 24)),
            align: 'center',
            sortable: false,
            format: (days) => {
              const isAging = days > 14;
              return (
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${isAging ? 'bg-amber-900/30 text-amber-400' : 'text-cult-silver'}`}>
                  {days}d
                </span>
              );
            }
          },
          GradeColumn(onDataRefresh),
        ]}
        renderRowActions={renderRowActions}
        emptyMessage="No binned inventory"
        rowClassName={(item) => {
          const days = Math.floor((Date.now() - new Date(item.last_updated).getTime()) / (1000 * 60 * 60 * 24));
          return days > 14 ? 'bg-amber-900/5' : '';
        }}
      />
      <LabelModal labelHook={labelHook} />
      <MultiLabelPrintModal
        isOpen={multiLabelHook.isOpen}
        isLoading={multiLabelHook.isLoading}
        isPrinting={multiLabelHook.isPrinting}
        labels={multiLabelHook.labels}
        logoDataUrl={multiLabelHook.logoDataUrl}
        error={multiLabelHook.error}
        onClose={multiLabelHook.closeMultiLabel}
        onPrint={multiLabelHook.printLabels}
      />
    </>
  );
}

interface BuckedViewProps {
  items: InventoryItem[];
  stats: InventoryStats;
  onDataRefresh?: () => void;
}

export function BuckedInventoryView({ items, stats, onDataRefresh }: BuckedViewProps) {
  const labelHook = useInventoryLabel();
  const multiLabelHook = useMultiLabelPrint();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handlePrintLabelsClick = useCallback(() => {
    const selected = items.filter((item) => selectedIds.has(item.id));
    if (selected.length > 0) multiLabelHook.openMultiLabel(selected);
  }, [items, selectedIds, multiLabelHook]);

  const renderRowActions = useCallback((item: InventoryItem) => {
    const actions: RowAction[] = [
      { label: 'Print Label', icon: <Printer className="w-4 h-4" />, onClick: () => labelHook.openLabel(item) },
    ];
    return <RowActionMenu actions={actions} />;
  }, [labelHook]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatsCard label="Packages" value={stats.totalPackages} icon={<Package className="w-5 h-5" />} accentColor="border-blue-800/40" />
        <StatsCard label="Total Weight" value={formatWeight(stats.totalWeight)} icon={<Scale className="w-5 h-5" />} accentColor="border-cyan-800/40" />
        <StatsCard label="Unique Strains" value={stats.strainCount || 0} icon={<Leaf className="w-5 h-5" />} accentColor="border-cult-medium-gray" />
      </div>

      <SelectionSummary count={selectedIds.size} onClear={() => setSelectedIds(new Set())} onPrintLabels={handlePrintLabelsClick} />

      <InventoryTable
        items={items}
        searchable
        searchPlaceholder="Search bucked inventory..."
        gradeFilterable
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        columns={[
          { header: 'Package ID', accessor: 'package_id', format: (val) => <span className="font-medium text-cult-white">{val}</span> },
          { header: 'Strain', accessor: 'strain', format: (val) => <span className="text-cult-white">{val}</span> },
          { header: 'Batch', accessor: 'batch_number', format: (val) => <span className="text-cult-silver">{val || '-'}</span> },
          { header: 'Available (g)', accessor: 'available_qty', align: 'right', format: (val) => <span className="font-medium text-cult-white tabular-nums">{(val || 0).toFixed(0)}</span> },
          {
            header: 'Status',
            accessor: 'status',
            align: 'center',
            sortable: false,
            format: (val) => <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-900/30 text-blue-400">{val || 'Ready'}</span>
          },
          GradeColumn(onDataRefresh),
        ]}
        renderRowActions={renderRowActions}
        emptyMessage="No bucked inventory"
      />
      <LabelModal labelHook={labelHook} />
      <MultiLabelPrintModal
        isOpen={multiLabelHook.isOpen}
        isLoading={multiLabelHook.isLoading}
        isPrinting={multiLabelHook.isPrinting}
        labels={multiLabelHook.labels}
        logoDataUrl={multiLabelHook.logoDataUrl}
        error={multiLabelHook.error}
        onClose={multiLabelHook.closeMultiLabel}
        onPrint={multiLabelHook.printLabels}
      />
    </>
  );
}

interface BulkViewProps {
  items: InventoryItem[];
  stats: BulkStats;
  subTab: BulkSubTab;
  onSubTabChange: (tab: BulkSubTab) => void;
  onDataRefresh?: () => void;
}

const bulkTabs: { key: BulkSubTab; label: string; icon: typeof Leaf }[] = [
  { key: 'flower', label: 'Flower', icon: Leaf },
  { key: 'smalls', label: 'Smalls', icon: Package },
  { key: 'trim', label: 'Trim', icon: Scissors },
];

function getBulkTabCount(items: InventoryItem[], tab: BulkSubTab): number {
  return items.filter(item => {
    const name = item.product_name?.toLowerCase() || '';
    if (tab === 'flower') return name.includes('flower') && !name.includes('smalls');
    if (tab === 'smalls') return name.includes('smalls');
    if (tab === 'trim') return name.includes('trim');
    return false;
  }).length;
}

export function BulkInventoryView({ items, stats, subTab, onSubTabChange, onDataRefresh }: BulkViewProps) {
  const labelHook = useInventoryLabel();
  const multiLabelHook = useMultiLabelPrint();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredItems = useMemo(() => items.filter(item => {
    const name = item.product_name?.toLowerCase() || '';
    if (subTab === 'flower') return name.includes('flower') && !name.includes('smalls');
    if (subTab === 'smalls') return name.includes('smalls');
    if (subTab === 'trim') return name.includes('trim');
    return false;
  }), [items, subTab]);

  const handlePrintLabelsClick = useCallback(() => {
    const selected = filteredItems.filter((item) => selectedIds.has(item.id));
    if (selected.length > 0) multiLabelHook.openMultiLabel(selected);
  }, [filteredItems, selectedIds, multiLabelHook]);

  const renderRowActions = useCallback((item: InventoryItem) => {
    const actions: RowAction[] = [
      { label: 'Print Label', icon: <Printer className="w-4 h-4" />, onClick: () => labelHook.openLabel(item) },
    ];
    return <RowActionMenu actions={actions} />;
  }, [labelHook]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Total Packages" value={stats.totalPackages} icon={<Package className="w-5 h-5" />} accentColor="border-emerald-800/40" />
        <StatsCard label="Flower" value={formatWeight(stats.flower)} icon={<Leaf className="w-5 h-5" />} accentColor="border-green-800/40" />
        <StatsCard label="Smalls" value={formatWeight(stats.smalls)} icon={<Package className="w-5 h-5" />} accentColor="border-amber-800/40" />
        <StatsCard label="Trim" value={formatWeight(stats.trim)} icon={<Scissors className="w-5 h-5" />} accentColor="border-orange-800/40" />
      </div>

      <div className="mb-6 flex gap-1 p-1 bg-cult-dark-gray rounded-lg w-fit">
        {bulkTabs.map(({ key, label, icon: Icon }) => {
          const count = getBulkTabCount(items, key);
          return (
            <button
              key={key}
              onClick={() => onSubTabChange(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                subTab === key
                  ? 'bg-cult-medium-gray text-cult-white shadow-sm'
                  : 'text-cult-silver hover:text-cult-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                subTab === key ? 'bg-cult-lighter-gray/30 text-cult-white' : 'bg-cult-medium-gray/50 text-cult-lighter-gray'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <SelectionSummary count={selectedIds.size} onClear={() => setSelectedIds(new Set())} onPrintLabels={handlePrintLabelsClick} />

      <InventoryTable
        items={filteredItems}
        searchable
        searchPlaceholder={`Search bulk ${subTab}...`}
        gradeFilterable
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        columns={[
          { header: 'Package ID', accessor: 'package_id', format: (val) => <span className="font-medium text-cult-white">{val}</span> },
          { header: 'Product', accessor: 'product_name', format: (val) => <span className="text-cult-white">{val}</span> },
          { header: 'Strain', accessor: 'strain', format: (val) => <span className="text-cult-white">{val}</span> },
          { header: 'Batch', accessor: 'batch_number', format: (val) => <span className="text-cult-silver">{val || '-'}</span> },
          { header: 'Available (g)', accessor: 'available_qty', align: 'right', format: (val) => <span className="font-medium text-cult-white tabular-nums">{(val || 0).toFixed(1)}</span> },
          GradeColumn(onDataRefresh),
        ]}
        renderRowActions={renderRowActions}
        emptyMessage={`No bulk ${subTab} inventory`}
      />
      <LabelModal labelHook={labelHook} />
      <MultiLabelPrintModal
        isOpen={multiLabelHook.isOpen}
        isLoading={multiLabelHook.isLoading}
        isPrinting={multiLabelHook.isPrinting}
        labels={multiLabelHook.labels}
        logoDataUrl={multiLabelHook.logoDataUrl}
        error={multiLabelHook.error}
        onClose={multiLabelHook.closeMultiLabel}
        onPrint={multiLabelHook.printLabels}
      />
    </>
  );
}

interface PackagedViewProps {
  items: InventoryItem[];
  stats: PackagedStats;
  onDataRefresh?: () => void;
}

export function PackagedInventoryView({ items, stats, onDataRefresh }: PackagedViewProps) {
  const labelHook = useInventoryLabel();
  const multiLabelHook = useMultiLabelPrint();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handlePrintLabelsClick = useCallback(() => {
    const selected = items.filter((item) => selectedIds.has(item.id));
    if (selected.length > 0) multiLabelHook.openMultiLabel(selected);
  }, [items, selectedIds, multiLabelHook]);

  const renderRowActions = useCallback((item: InventoryItem) => {
    const actions: RowAction[] = [
      { label: 'Print Label', icon: <Printer className="w-4 h-4" />, onClick: () => labelHook.openLabel(item) },
    ];
    return <RowActionMenu actions={actions} />;
  }, [labelHook]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatsCard label="Total Units" value={stats.totalUnits.toFixed(0)} icon={<Box className="w-5 h-5" />} accentColor="border-teal-800/40" />
        <StatsCard label="3.5g Units" value={stats.total_3_5g.toFixed(0)} icon={<Package className="w-5 h-5" />} accentColor="border-blue-800/40" />
        <StatsCard label="14g Units" value={stats.total_14g.toFixed(0)} icon={<Package className="w-5 h-5" />} accentColor="border-emerald-800/40" />
      </div>

      <SelectionSummary count={selectedIds.size} onClear={() => setSelectedIds(new Set())} onPrintLabels={handlePrintLabelsClick} />

      <InventoryTable
        items={items}
        searchable
        searchPlaceholder="Search packaged inventory..."
        gradeFilterable
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        columns={[
          { header: 'Package ID', accessor: 'package_id', format: (val) => <span className="font-medium text-cult-white">{val}</span> },
          { header: 'Product', accessor: 'product_name', format: (val) => <span className="text-cult-white">{val}</span> },
          { header: 'Strain', accessor: 'strain', format: (val) => <span className="text-cult-white">{val}</span> },
          { header: 'Batch', accessor: 'batch_number', format: (val) => <span className="text-cult-silver">{val || '-'}</span> },
          { header: 'Available (qty)', accessor: 'available_qty', align: 'right', format: (val) => <span className="font-medium text-cult-white tabular-nums">{(val || 0).toFixed(0)}</span> },
          GradeColumn(onDataRefresh),
        ]}
        renderRowActions={renderRowActions}
        emptyMessage="No packaged inventory"
      />
      <LabelModal labelHook={labelHook} />
      <MultiLabelPrintModal
        isOpen={multiLabelHook.isOpen}
        isLoading={multiLabelHook.isLoading}
        isPrinting={multiLabelHook.isPrinting}
        labels={multiLabelHook.labels}
        logoDataUrl={multiLabelHook.logoDataUrl}
        error={multiLabelHook.error}
        onClose={multiLabelHook.closeMultiLabel}
        onPrint={multiLabelHook.printLabels}
      />
    </>
  );
}

export function DailyActivityView() {
  return <DailyInventoryActivity />;
}
