import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Droplets } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { getRosinPackages } from '../services/rosinLabService';
import type { RosinPackage, RosinLabScreen } from '../types/rosin-lab.types';

interface RosinInventoryProps {
  onNavigate: (screen: RosinLabScreen) => void;
}

type SortColumn =
  | 'package_id'
  | 'strain'
  | 'batch'
  | 'weight_grams'
  | 'destination'
  | 'cure_status'
  | 'status';

type SortDir = 'asc' | 'desc';

const DESTINATION_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'badder', label: 'Badder' },
  { key: 'jam', label: 'Jam' },
  { key: 'sauce', label: 'Sauce' },
  { key: 'fresh_press', label: 'Fresh Press' },
];

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'fresh', label: 'Fresh' },
  { key: 'curing', label: 'Curing' },
  { key: 'cured', label: 'Cured' },
  { key: 'packaged', label: 'Packaged' },
];

const DESTINATION_DOT_COLORS: Record<string, string> = {
  badder: '#F59E0B',
  jam: '#F97316',
  sauce: '#06B6D4',
  fresh_press: '#6366F1',
};

function DestinationDot({ destination }: { destination: string }) {
  const color = DESTINATION_DOT_COLORS[destination] ?? '#666666';
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: 6, height: 6, backgroundColor: color }}
    />
  );
}

function formatDestination(destination: string): string {
  return destination.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getCureStatusSortValue(pkg: RosinPackage): number {
  if (!pkg.cure_session) return 0;
  const s = pkg.cure_session.status;
  if (s === 'curing') return 1;
  if (s === 'completed') return 2;
  if (s === 'failed') return 3;
  return 0;
}

function CureStatusCell({ pkg }: { pkg: RosinPackage }) {
  if (!pkg.cure_session) {
    return <span className="text-[13px] text-[#666666]">Not started</span>;
  }

  const { status, target_end_date } = pkg.cure_session;

  if (status === 'curing') {
    let daysLabel = '';
    if (target_end_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(target_end_date);
      end.setHours(0, 0, 0, 0);
      const diffMs = end.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysLeft > 0) {
        daysLabel = ` · ${daysLeft}d left`;
      } else if (daysLeft === 0) {
        daysLabel = ' · today';
      } else {
        daysLabel = ` · ${Math.abs(daysLeft)}d over`;
      }
    }
    return (
      <span className="text-[13px] text-violet-400 font-medium">
        Curing{daysLabel}
      </span>
    );
  }

  if (status === 'completed') {
    return <span className="text-[13px] text-emerald-400 font-medium">Complete ✓</span>;
  }

  if (status === 'failed') {
    return <span className="text-[13px] text-red-400 font-medium">Failed</span>;
  }

  return <span className="text-[13px] text-[#666666]">—</span>;
}

interface SortIconProps {
  column: SortColumn;
  sortCol: SortColumn;
  sortDir: SortDir;
}

function SortIcon({ column, sortCol, sortDir }: SortIconProps) {
  if (column !== sortCol) {
    return <ChevronUp className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-30 transition-opacity" />;
  }
  return sortDir === 'asc' ? (
    <ChevronUp className="w-3 h-3 inline ml-1 text-indigo-400" />
  ) : (
    <ChevronDown className="w-3 h-3 inline ml-1 text-indigo-400" />
  );
}

export function RosinInventory({ onNavigate: _onNavigate }: RosinInventoryProps) {
  const [packages, setPackages] = useState<RosinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [destinationFilter, setDestinationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<SortColumn>('package_id');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    setLoading(true);
    getRosinPackages(destinationFilter, statusFilter).then(({ data }) => {
      setPackages(data ?? []);
      setLoading(false);
    });
  }, [destinationFilter, statusFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return packages;
    const q = search.toLowerCase();
    return packages.filter((pkg) => {
      const strain = (pkg.strain?.name ?? '').toLowerCase();
      const pid = pkg.package_id.toLowerCase();
      return strain.includes(q) || pid.includes(q);
    });
  }, [packages, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA: number | string = '';
      let valB: number | string = '';

      switch (sortCol) {
        case 'package_id':
          valA = a.package_id;
          valB = b.package_id;
          break;
        case 'strain':
          valA = a.strain?.name ?? '';
          valB = b.strain?.name ?? '';
          break;
        case 'batch':
          valA = a.press_run?.batch?.batch_number ?? '';
          valB = b.press_run?.batch?.batch_number ?? '';
          break;
        case 'weight_grams':
          valA = a.weight_grams;
          valB = b.weight_grams;
          break;
        case 'destination':
          valA = a.destination;
          valB = b.destination;
          break;
        case 'cure_status':
          valA = getCureStatusSortValue(a);
          valB = getCureStatusSortValue(b);
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
      }

      let cmp = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const summary = useMemo(() => {
    const count = filtered.length;
    const totalWeight = filtered.reduce((sum, p) => sum + p.weight_grams, 0);
    return { count, totalWeight };
  }, [filtered]);

  function handleSort(col: SortColumn) {
    if (col === sortCol) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir(col === 'weight_grams' ? 'desc' : 'asc');
    }
  }

  const thBase =
    'px-4 py-2.5 text-left text-xs font-semibold text-cult-text-muted uppercase tracking-wide cursor-pointer select-none group whitespace-nowrap';

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-cult-text-primary">Rosin Inventory</h1>
          <p className="text-sm text-cult-text-secondary mt-0.5">Finished rosin packages</p>
        </div>
        <div className="relative flex-shrink-0" style={{ width: 280 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search strain, package ID…"
            className="w-full pl-9 pr-3 py-2 bg-cult-surface-overlay border border-cult-border rounded-[6px] text-sm text-cult-text-primary placeholder:text-cult-text-muted focus:outline-none focus:border-cult-border-strong transition-colors"
          />
        </div>
      </div>

      {/* Filter Row 1 — Consistency/Destination */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center border border-cult-border rounded-[6px] overflow-hidden">
          {DESTINATION_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDestinationFilter(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-sm transition-colors border-r border-cult-border last:border-r-0 ${
                destinationFilter === key
                  ? 'bg-cult-surface-overlay text-cult-text-primary'
                  : 'text-cult-text-secondary hover:text-cult-text-primary'
              }`}
            >
              {key !== 'all' && <DestinationDot destination={key} />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Row 2 — Status + Summary */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center border border-cult-border rounded-[6px] overflow-hidden">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 text-xs transition-colors border-r border-cult-border last:border-r-0 ${
                statusFilter === key
                  ? 'bg-cult-surface-overlay text-cult-text-primary font-medium'
                  : 'text-cult-text-secondary hover:text-cult-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {!loading && (
          <p className="text-[13px] text-cult-text-secondary">
            <span className="font-semibold text-cult-text-primary">
              {summary.count.toLocaleString()}
            </span>{' '}
            packages ·{' '}
            <span className="font-semibold text-cult-text-primary">
              {summary.totalWeight.toLocaleString()}g
            </span>{' '}
            total
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-cult-surface-raised rounded-[6px] overflow-hidden border border-cult-border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-cult-surface-overlay">
              <th className={`${thBase} font-mono`} style={{ width: 170 }} onClick={() => handleSort('package_id')}>
                Package ID
                <SortIcon column="package_id" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thBase} style={{ width: 140 }} onClick={() => handleSort('strain')}>
                Strain
                <SortIcon column="strain" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thBase} style={{ width: 110 }} onClick={() => handleSort('batch')}>
                Batch
                <SortIcon column="batch" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th
                className={`${thBase} text-right`}
                style={{ width: 80 }}
                onClick={() => handleSort('weight_grams')}
              >
                Weight
                <SortIcon column="weight_grams" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thBase} style={{ width: 100 }} onClick={() => handleSort('destination')}>
                Type
                <SortIcon column="destination" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thBase} style={{ width: 120 }} onClick={() => handleSort('cure_status')}>
                Cure Status
                <SortIcon column="cure_status" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thBase} style={{ width: 100 }} onClick={() => handleSort('status')}>
                Status
                <SortIcon column="status" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thBase} style={{ width: 60 }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-cult-text-muted">
                  Loading…
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Droplets className="w-12 h-12 text-cult-text-muted" />
                    <p className="text-[16px] text-cult-text-secondary">No rosin packages</p>
                    <p className="text-[14px] text-cult-text-muted">
                      Rosin packages appear after pressing hash
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((pkg) => {
                const strainName = pkg.strain?.name ?? '—';
                const batchNumber = pkg.press_run?.batch?.batch_number ?? '—';

                return (
                  <tr
                    key={pkg.id}
                    className="border-b border-cult-border hover:bg-cult-surface-overlay/50 transition-colors"
                  >
                    <td
                      className="px-4 py-3 font-mono text-sm text-cult-text-primary"
                      style={{ boxShadow: 'inset 3px 0 0 #6366F1' }}
                    >
                      {pkg.package_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-text-primary">{strainName}</td>
                    <td className="px-4 py-3 font-mono text-sm text-cult-text-secondary">{batchNumber}</td>
                    <td className="px-4 py-3 text-sm text-cult-text-primary text-right">
                      {pkg.weight_grams.toLocaleString()}g
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-sm text-cult-text-primary">
                        <DestinationDot destination={pkg.destination} />
                        {formatDestination(pkg.destination)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <CureStatusCell pkg={pkg} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={pkg.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(pkg.status === 'fresh' || pkg.status === 'cured') && (
                        <button
                          onClick={() => _onNavigate('log')}
                          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                        >
                          View →
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
