import { Package, Archive, Box, Leaf, Clock, Printer } from 'lucide-react';
import { DailyInventoryActivity } from './DailyInventoryActivity';
import { InventoryTable } from './InventoryTable';
import { StatsCard } from './StatsCard';
import { InventoryLabelPrintModal } from './InventoryLabelPrintModal';
import { useInventoryLabel } from '../hooks';
import type { InventoryItem, InventoryStats, BulkStats, PackagedStats, BulkSubTab } from '../types';

interface BinnedViewProps {
  items: InventoryItem[];
  stats: InventoryStats;
}

export function BinnedInventoryView({ items, stats }: BinnedViewProps) {
  const labelHook = useInventoryLabel();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Total Packages" value={stats.totalPackages} icon={<Package className="w-8 h-8 text-green-500" />} />
        <StatsCard label="Total Weight (g)" value={stats.totalWeight.toFixed(0)} icon={<Archive className="w-8 h-8 text-blue-500" />} />
        <StatsCard label="Unique Strains" value={stats.strainCount || 0} icon={<Package className="w-8 h-8 text-purple-500" />} />
        <StatsCard label="Oldest Package" value={`${stats.oldestPackage || 0} days`} icon={<Clock className="w-8 h-8 text-amber-500" />} />
      </div>

      {(stats.oldestPackage || 0) > 14 && (
        <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700 rounded-lg">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <h3 className="text-amber-400 font-bold uppercase tracking-wider">Aging Alert</h3>
              <p className="text-amber-200 text-sm mt-1">
                You have binned material that's been waiting {stats.oldestPackage} days. Consider processing soon for optimal quality.
              </p>
            </div>
          </div>
        </div>
      )}

      <InventoryTable
        items={items.sort((a, b) => new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime())}
        columns={[
          { header: 'Package ID', accessor: 'package_id', format: (val) => <span className="font-medium text-white">{val}</span> },
          { header: 'Strain', accessor: 'strain', format: (val) => <span className="text-white">{val}</span> },
          { header: 'Batch', accessor: 'batch_number', format: (val) => <span className="text-cult-light-gray">{val || '-'}</span> },
          { header: 'Room', accessor: 'room', format: (val) => <span className="text-cult-light-gray">{val || '-'}</span> },
          { header: 'Available (g)', accessor: 'available_qty', align: 'right', format: (val) => <span className="font-medium text-white">{(val || 0).toFixed(0)}</span> },
          {
            header: 'Status',
            accessor: 'status',
            align: 'center',
            format: (val) => <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">{val || 'Fresh'}</span>
          },
          {
            header: 'Days in Binned',
            accessor: (item) => Math.floor((Date.now() - new Date(item.last_updated).getTime()) / (1000 * 60 * 60 * 24)),
            align: 'center',
            format: (days) => {
              const isAging = days > 14;
              return (
                <span className={`px-2 py-1 rounded text-xs font-medium ${isAging ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                  {days} days
                </span>
              );
            }
          },
          {
            header: 'Actions',
            accessor: (item) => item,
            align: 'center',
            format: (_, item) => (
              <button
                onClick={() => labelHook.openLabel(item)}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
                title="Print Label"
              >
                <Printer className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            )
          },
        ]}
        emptyIcon={<Leaf className="w-12 h-12 text-gray-400 mx-auto mb-3" />}
        emptyMessage="No binned inventory found"
        rowClassName={(item) => {
          const days = Math.floor((Date.now() - new Date(item.last_updated).getTime()) / (1000 * 60 * 60 * 24));
          return days > 14 ? 'bg-amber-900/10' : '';
        }}
      />
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
    </>
  );
}

interface BuckedViewProps {
  items: InventoryItem[];
  stats: InventoryStats;
}

export function BuckedInventoryView({ items, stats }: BuckedViewProps) {
  const labelHook = useInventoryLabel();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StatsCard label="Total Packages" value={stats.totalPackages} icon={<Package className="w-8 h-8 text-blue-500" />} />
        <StatsCard label="Total Weight (g)" value={stats.totalWeight.toFixed(0)} icon={<Archive className="w-8 h-8 text-orange-500" />} />
      </div>

      <InventoryTable
        items={items}
        columns={[
          { header: 'Package ID', accessor: 'package_id', format: (val) => <span className="font-medium text-white">{val}</span> },
          { header: 'Strain', accessor: 'strain', format: (val) => <span className="text-white">{val}</span> },
          { header: 'Batch', accessor: 'batch_number', format: (val) => <span className="text-cult-light-gray">{val || '-'}</span> },
          { header: 'Room', accessor: 'room', format: (val) => <span className="text-cult-light-gray">{val || '-'}</span> },
          { header: 'Available (g)', accessor: 'available_qty', align: 'right', format: (val) => <span className="font-medium text-white">{(val || 0).toFixed(0)}</span> },
          {
            header: 'Status',
            accessor: 'status',
            align: 'center',
            format: (val) => <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">{val || 'Ready'}</span>
          },
          {
            header: 'Actions',
            accessor: (item) => item,
            align: 'center',
            format: (_, item) => (
              <button
                onClick={() => labelHook.openLabel(item)}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
                title="Print Label"
              >
                <Printer className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            )
          },
        ]}
        emptyIcon={<Archive className="w-12 h-12 text-gray-400 mx-auto mb-3" />}
        emptyMessage="No bucked inventory found"
      />
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
    </>
  );
}

interface BulkViewProps {
  items: InventoryItem[];
  stats: BulkStats;
  subTab: BulkSubTab;
  onSubTabChange: (tab: BulkSubTab) => void;
}

export function BulkInventoryView({ items, stats, subTab, onSubTabChange }: BulkViewProps) {
  const labelHook = useInventoryLabel();

  const filteredItems = items.filter(item => {
    const name = item.product_name?.toLowerCase() || '';
    if (subTab === 'flower') return name.includes('flower');
    if (subTab === 'smalls') return name.includes('smalls');
    if (subTab === 'trim') return name.includes('trim');
    return false;
  });

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Total Packages" value={stats.totalPackages} icon={<Package className="w-8 h-8 text-green-500" />} />
        <StatsCard label="Flower (g)" value={stats.flower.toFixed(0)} icon={<Leaf className="w-8 h-8 text-green-600" />} />
        <StatsCard label="Smalls (g)" value={stats.smalls.toFixed(0)} icon={<Archive className="w-8 h-8 text-yellow-500" />} />
        <StatsCard label="Trim (g)" value={stats.trim.toFixed(0)} icon={<Box className="w-8 h-8 text-orange-500" />} />
      </div>

      <div className="mb-6 flex gap-2">
        {(['flower', 'smalls', 'trim'] as BulkSubTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => onSubTabChange(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              subTab === tab
                ? 'bg-white text-cult-black'
                : 'bg-cult-dark-gray text-white hover:bg-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <InventoryTable
        items={filteredItems}
        columns={[
          { header: 'Package ID', accessor: 'package_id', format: (val) => <span className="font-medium text-white">{val}</span> },
          { header: 'Product Name', accessor: 'product_name', format: (val) => <span className="text-white">{val}</span> },
          { header: 'Strain', accessor: 'strain', format: (val) => <span className="text-white">{val}</span> },
          { header: 'Batch', accessor: 'batch_number', format: (val) => <span className="text-cult-light-gray">{val || '-'}</span> },
          { header: 'Room', accessor: 'room', format: (val) => <span className="text-cult-light-gray">{val || '-'}</span> },
          { header: 'Available (g)', accessor: 'available_qty', align: 'right', format: (val) => <span className="font-medium text-white">{(val || 0).toFixed(1)}</span> },
          {
            header: 'Actions',
            accessor: (item) => item,
            align: 'center',
            format: (_, item) => (
              <button
                onClick={() => labelHook.openLabel(item)}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
                title="Print Label"
              >
                <Printer className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            )
          },
        ]}
        emptyIcon={<Box className="w-12 h-12 text-gray-400 mx-auto mb-3" />}
        emptyMessage={`No bulk ${subTab} inventory found`}
      />
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
    </>
  );
}

interface PackagedViewProps {
  items: InventoryItem[];
  stats: PackagedStats;
}

export function PackagedInventoryView({ items, stats }: PackagedViewProps) {
  const labelHook = useInventoryLabel();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatsCard label="Total Units" value={stats.totalUnits.toFixed(0)} icon={<Package className="w-8 h-8 text-purple-500" />} />
        <StatsCard label="3.5g Units" value={stats.total_3_5g.toFixed(0)} icon={<Box className="w-8 h-8 text-blue-500" />} />
        <StatsCard label="14g Units" value={stats.total_14g.toFixed(0)} icon={<Archive className="w-8 h-8 text-green-500" />} />
      </div>

      <InventoryTable
        items={items}
        columns={[
          { header: 'Package ID', accessor: 'package_id', format: (val) => <span className="font-medium text-white">{val}</span> },
          { header: 'Product Name', accessor: 'product_name', format: (val) => <span className="text-white">{val}</span> },
          { header: 'Strain', accessor: 'strain', format: (val) => <span className="text-white">{val}</span> },
          { header: 'Batch', accessor: 'batch_number', format: (val) => <span className="text-cult-light-gray">{val || '-'}</span> },
          { header: 'Room', accessor: 'room', format: (val) => <span className="text-cult-light-gray">{val || '-'}</span> },
          { header: 'Available (qty)', accessor: 'available_qty', align: 'right', format: (val) => <span className="font-medium text-white">{(val || 0).toFixed(0)}</span> },
          {
            header: 'Actions',
            accessor: (item) => item,
            align: 'center',
            format: (_, item) => (
              <button
                onClick={() => labelHook.openLabel(item)}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
                title="Print Label"
              >
                <Printer className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            )
          },
        ]}
        emptyIcon={<Box className="w-12 h-12 text-gray-400 mx-auto mb-3" />}
        emptyMessage="No packaged inventory found"
      />
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
    </>
  );
}

export function DailyActivityView() {
  return <DailyInventoryActivity />;
}
