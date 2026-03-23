import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Circle } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { WeightBar } from '../components/WeightBar';
import { getHashPackages } from '../services/rosinLabService';
import type { HashPackage, RosinLabScreen } from '../types/rosin-lab.types';

interface HashInventoryProps {
  onNavigate: (screen: RosinLabScreen) => void;
}

type SortColumn =
  | 'package_id'
  | 'strain'
  | 'batch'
  | 'weight_grams'
  | 'remaining_weight_grams'
  | 'dried_date'
  | 'status';

type SortDir = 'asc' | 'desc';

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'available', label: 'Available' },
  { key: 'partial', label: 'Partial' },
  { key: 'depleted', label: 'Depleted' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'all', label: 'All' },
];

function getStrainName(pkg: HashPackage): string {
  return pkg.strain?.name ?? '—';
}

function getBatchNumber(pkg: HashPackage): string {
  return pkg.wash_run?.batch?.batch_number ?? '—';
}

function formatDriedDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
    <ChevronUp className="w-3 h-3 inline ml-1 text-amber-400" />
  ) : (
    <ChevronDown className="w-3 h-3 inline ml-1 text-amber-400" />
  );
}

export function HashInventory({ onNavigate }: HashInventoryProps) {
  const [packages, setPackages] = useState<HashPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('available');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<SortColumn>('dried_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    setLoading(true);
    getHashPackages(statusFilter).then(({ data }) => {
      setPackages(data ?? []);
      setLoading(false);
    });
  }, [statusFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return packages;
    const q = search.toLowerCase();
    return packages.filter((pkg) => {
      const strain = getStrainName(pkg).toLowerCase();
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
          valA = getStrainName(a);
          valB = getStrainName(b);
          break;
        case 'batch':
          valA = getBatchNumber(a);
          valB = getBatchNumber(b);
          break;
        case 'weight_grams':
          valA = a.weight_grams;
          valB = b.weight_grams;
          break;
        case 'remaining_weight_grams':
          valA = a.remaining_weight_grams;
          valB = b.remaining_weight_grams;
          break;
        case 'dried_date':
          valA = a.dried_date ? new Date(a.dried_date).getTime() : 0;
          valB = b.dried_date ? new Date(b.dried_date).getTime() : 0;
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
    const availableWeight = filtered
      .filter((p) => p.status === 'available' || p.status === 'partial')
      .reduce((sum, p) => sum + p.remaining_weight_grams, 0);
    return { count, availableWeight };
  }, [filtered]);

  function handleSort(col: SortColumn) {
    if (col === sortCol) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir(col === 'dried_date' || col === 'weight_grams' || col === 'remaining_weight_grams' ? 'desc' : 'asc');
    }
  }

  const thBase =
    'px-4 py-2.5 text-left text-xs font-semibold text-cult-text-muted uppercase tracking-wide cursor-pointer select-none group whitespace-nowrap';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-cult-text-primary">Hash Inventory</h1>
          <p className="text-sm text-cult-text-secondary mt-0.5">Dried hash available for pressing</p>
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

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center border border-cult-border rounded-[6px] overflow-hidden">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 text-sm transition-colors border-r border-cult-border last:border-r-0 ${
                statusFilter === key
                  ? 'bg-cult-surface-overlay text-cult-text-primary'
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
              {summary.availableWeight.toLocaleString()}g
            </span>{' '}
            available
          </p>
        )}
      </div>

      <div className="bg-cult-surface-raised rounded-[6px] overflow-hidden border border-cult-border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-cult-surface-overlay">
              <th className={`${thBase} font-mono`} style={{ width: 160 }} onClick={() => handleSort('package_id')}>
                Package ID
                <SortIcon column="package_id" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thBase} style={{ width: 150 }} onClick={() => handleSort('strain')}>
                Strain
                <SortIcon column="strain" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thBase} style={{ width: 120 }} onClick={() => handleSort('batch')}>
                Batch
                <SortIcon column="batch" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th
                className={`${thBase} text-right`}
                style={{ width: 90 }}
                onClick={() => handleSort('weight_grams')}
              >
                Weight
                <SortIcon column="weight_grams" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thBase} style={{ width: 160 }} onClick={() => handleSort('remaining_weight_grams')}>
                Remaining
                <SortIcon column="remaining_weight_grams" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thBase} style={{ width: 100 }} onClick={() => handleSort('dried_date')}>
                Dried
                <SortIcon column="dried_date" sortCol={sortCol} sortDir={sortDir} />
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
                    <Circle className="w-12 h-12 text-cult-text-muted" />
                    <p className="text-[16px] text-cult-text-secondary">No hash packages</p>
                    <p className="text-[14px] text-cult-text-muted">
                      Hash packages appear after wash and freeze dry runs complete
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((pkg) => {
                const strainName = getStrainName(pkg);
                const batchNumber = getBatchNumber(pkg);
                const showAction = pkg.status === 'available' || pkg.status === 'partial';

                return (
                  <tr
                    key={pkg.id}
                    className="border-b border-cult-border hover:bg-cult-surface-overlay/50 transition-colors"
                  >
                    <td
                      className="px-4 py-3 font-mono text-sm text-cult-text-primary"
                      style={{ boxShadow: 'inset 3px 0 0 #F59E0B' }}
                    >
                      {pkg.package_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-text-primary">{strainName}</td>
                    <td className="px-4 py-3 font-mono text-sm text-cult-text-secondary">{batchNumber}</td>
                    <td className="px-4 py-3 text-sm text-cult-text-primary text-right">
                      {pkg.weight_grams.toLocaleString()}g
                    </td>
                    <td className="px-4 py-3">
                      <WeightBar total={pkg.weight_grams} remaining={pkg.remaining_weight_grams} />
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-text-secondary">
                      {formatDriedDate(pkg.dried_date)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={pkg.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {showAction && (
                        <button
                          onClick={() => onNavigate('press')}
                          className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
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
