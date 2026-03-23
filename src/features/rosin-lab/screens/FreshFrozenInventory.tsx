import { useState, useEffect, useMemo } from 'react';
import { Search, Snowflake, ChevronUp, ChevronDown } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { getFreshFrozenPackages } from '../services/rosinLabService';
import type { FreshFrozenPackage, RosinLabScreen } from '../types/rosin-lab.types';

interface FreshFrozenInventoryProps {
  onNavigate: (screen: RosinLabScreen) => void;
}

type SortColumn =
  | 'batch_number'
  | 'strain'
  | 'package_number'
  | 'weight_grams'
  | 'freezer_location'
  | 'frozen_at'
  | 'age'
  | 'status';

type SortDir = 'asc' | 'desc';

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'stored', label: 'Stored' },
  { key: 'allocated', label: 'Allocated' },
  { key: 'washed', label: 'Washed' },
  { key: 'sold', label: 'Sold' },
  { key: 'all', label: 'All' },
];

function getStrainName(pkg: FreshFrozenPackage): string {
  return pkg.strain?.name ?? pkg.batch?.strain ?? '—';
}

function getBatchNumber(pkg: FreshFrozenPackage): string {
  return pkg.batch?.batch_number ?? '—';
}

function getAgeMs(pkg: FreshFrozenPackage): number | null {
  const dateStr = pkg.frozen_at ?? pkg.vacuum_sealed_at;
  if (!dateStr) return null;
  return Date.now() - new Date(dateStr).getTime();
}

function getAgeDays(pkg: FreshFrozenPackage): number | null {
  const ms = getAgeMs(pkg);
  if (ms === null) return null;
  return Math.floor(ms / 86400000);
}

function formatRelativeDate(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (days < 30) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  return `${months} months ago`;
}

function ageColorClass(days: number): string {
  if (days < 14) return 'text-emerald-400';
  if (days <= 30) return 'text-amber-400';
  return 'text-red-400';
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
    <ChevronUp className="w-3 h-3 inline ml-1 text-cyan-400" />
  ) : (
    <ChevronDown className="w-3 h-3 inline ml-1 text-cyan-400" />
  );
}

export function FreshFrozenInventory({ onNavigate }: FreshFrozenInventoryProps) {
  const [packages, setPackages] = useState<FreshFrozenPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('stored');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<SortColumn>('frozen_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    setLoading(true);
    getFreshFrozenPackages(statusFilter).then(({ data }) => {
      setPackages(data ?? []);
      setLoading(false);
    });
  }, [statusFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return packages;
    const q = search.toLowerCase();
    return packages.filter((pkg) => {
      const strain = getStrainName(pkg).toLowerCase();
      const batch = getBatchNumber(pkg).toLowerCase();
      const loc = (pkg.freezer_location ?? '').toLowerCase();
      return strain.includes(q) || batch.includes(q) || loc.includes(q);
    });
  }, [packages, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA: number | string = '';
      let valB: number | string = '';

      switch (sortCol) {
        case 'batch_number':
          valA = getBatchNumber(a);
          valB = getBatchNumber(b);
          break;
        case 'strain':
          valA = getStrainName(a);
          valB = getStrainName(b);
          break;
        case 'package_number':
          valA = a.package_number;
          valB = b.package_number;
          break;
        case 'weight_grams':
          valA = a.weight_grams;
          valB = b.weight_grams;
          break;
        case 'freezer_location':
          valA = a.freezer_location ?? '';
          valB = b.freezer_location ?? '';
          break;
        case 'frozen_at': {
          const da = a.frozen_at ?? a.vacuum_sealed_at;
          const db = b.frozen_at ?? b.vacuum_sealed_at;
          valA = da ? new Date(da).getTime() : 0;
          valB = db ? new Date(db).getTime() : 0;
          break;
        }
        case 'age':
          valA = getAgeMs(a) ?? 0;
          valB = getAgeMs(b) ?? 0;
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
    const weight = filtered.reduce((sum, p) => sum + p.weight_grams, 0);
    return { count, weight };
  }, [filtered]);

  function handleSort(col: SortColumn) {
    if (col === sortCol) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir(col === 'frozen_at' || col === 'age' ? 'desc' : 'asc');
    }
  }

  const thBase =
    'px-4 py-2.5 text-left text-xs font-semibold text-cult-text-muted uppercase tracking-wide cursor-pointer select-none group whitespace-nowrap';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-cult-text-primary">Fresh Frozen Inventory</h1>
          <p className="text-sm text-cult-text-secondary mt-0.5">Frozen material available for washing</p>
        </div>
        <div className="relative flex-shrink-0" style={{ width: 280 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search strain, batch, location…"
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
              {summary.weight.toLocaleString()}g
            </span>{' '}
            total
          </p>
        )}
      </div>

      <div className="bg-cult-surface-raised rounded-[6px] overflow-hidden border border-cult-border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-cult-surface-overlay">
              <th className={thBase} style={{ width: 120 }} onClick={() => handleSort('batch_number')}>
                Batch
                <SortIcon column="batch_number" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thBase} style={{ width: 160 }} onClick={() => handleSort('strain')}>
                Strain
                <SortIcon column="strain" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th
                className={`${thBase} text-center`}
                style={{ width: 60 }}
                onClick={() => handleSort('package_number')}
              >
                Pkg #
                <SortIcon column="package_number" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th
                className={`${thBase} text-right`}
                style={{ width: 100 }}
                onClick={() => handleSort('weight_grams')}
              >
                Weight
                <SortIcon column="weight_grams" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thBase} style={{ width: 140 }} onClick={() => handleSort('freezer_location')}>
                Location
                <SortIcon column="freezer_location" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thBase} style={{ width: 110 }} onClick={() => handleSort('frozen_at')}>
                Frozen
                <SortIcon column="frozen_at" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className={thBase} style={{ width: 80 }} onClick={() => handleSort('age')}>
                Age
                <SortIcon column="age" sortCol={sortCol} sortDir={sortDir} />
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
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-cult-text-muted">
                  Loading…
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Snowflake className="w-12 h-12 text-cult-text-muted" />
                    <p className="text-[16px] text-cult-text-secondary">No fresh frozen packages</p>
                    <p className="text-[14px] text-cult-text-muted">
                      Packages will appear here after harvest processing
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((pkg) => {
                const ageDays = getAgeDays(pkg);
                const strainName = getStrainName(pkg);
                const batchNumber = getBatchNumber(pkg);

                let frozenDisplay = '—';
                if (pkg.frozen_at) {
                  frozenDisplay = formatRelativeDate(pkg.frozen_at);
                } else if (pkg.vacuum_sealed_at) {
                  frozenDisplay = `Sealed ${formatRelativeDate(pkg.vacuum_sealed_at)}`;
                }

                const showAction = pkg.status === 'stored' || pkg.status === 'allocated';

                return (
                  <tr
                    key={pkg.id}
                    className="border-b border-cult-border hover:bg-cult-surface-overlay/50 transition-colors"
                  >
                    <td
                      className="px-4 py-3 font-mono text-sm text-cult-text-primary"
                      style={{ boxShadow: 'inset 3px 0 0 #06B6D4' }}
                    >
                      {batchNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-text-primary">{strainName}</td>
                    <td className="px-4 py-3 text-sm text-cult-text-muted text-center">
                      {pkg.package_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-text-primary text-right">
                      {pkg.weight_grams.toLocaleString()}g
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-text-secondary">
                      {pkg.freezer_location ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-text-secondary">{frozenDisplay}</td>
                    <td className="px-4 py-3 text-sm">
                      {ageDays !== null ? (
                        <span className={`font-medium ${ageColorClass(ageDays)}`}>{ageDays}d</span>
                      ) : (
                        <span className="text-cult-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={pkg.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {showAction && (
                        <button
                          onClick={() => pkg.status === 'allocated' && onNavigate('wash')}
                          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
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
