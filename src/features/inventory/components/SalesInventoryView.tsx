/**
 * SalesInventoryView
 *
 * Read-only view of available inventory grouped by strain.
 * Designed for the sales team — shows what is ready to sell
 * without exposing internal workflow actions.
 *
 * Shows bulk and packaged stages only (sellable product).
 */

import { useMemo, useState } from 'react';
import { Search, Package, Box, TrendingDown, RefreshCw } from 'lucide-react';
import { useInventoryData } from '../hooks/useInventoryData';
import { getItemStage } from '../hooks/useInventoryFilters';
import type { InventoryItem } from '../types';
import { formatWeight } from '@/shared/utils/format';

interface StrainSummary {
  strain: string;
  bulkGrams: number;
  packagedGrams: number;
  packagedUnits: number;
  packageCount: number;
  packages: InventoryItem[];
}

const SELLABLE_STAGES = new Set(['bulk', 'packaged']);

function buildStrainSummaries(items: InventoryItem[]): StrainSummary[] {
  const map = new Map<string, StrainSummary>();

  for (const item of items) {
    const stage = getItemStage(item);
    if (!SELLABLE_STAGES.has(stage)) continue;
    if ((item.available_qty ?? 0) <= 0) continue;

    const strain = item.strain || 'Unknown';
    if (!map.has(strain)) {
      map.set(strain, { strain, bulkGrams: 0, packagedGrams: 0, packagedUnits: 0, packageCount: 0, packages: [] });
    }
    const summary = map.get(strain)!;

    if (stage === 'bulk') {
      summary.bulkGrams += item.available_qty ?? 0;
    } else {
      // packaged — could be weight or units
      if (item.unit === 'units' || item.unit === 'unit') {
        summary.packagedUnits += item.available_qty ?? 0;
      } else {
        summary.packagedGrams += item.available_qty ?? 0;
      }
    }
    summary.packageCount++;
    summary.packages.push(item);
  }

  return Array.from(map.values()).sort((a, b) => {
    const totalA = a.bulkGrams + a.packagedGrams;
    const totalB = b.bulkGrams + b.packagedGrams;
    return totalB - totalA;
  });
}

function GramBadge({ grams, label }: { grams: number; label: string }) {
  if (grams <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-300 border border-amber-800/40">
      {label}: {formatWeight(grams)}
    </span>
  );
}

function UnitBadge({ units }: { units: number }) {
  if (units <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-teal-900/30 text-teal-300 border border-teal-800/40">
      Packaged: {units.toLocaleString()} units
    </span>
  );
}

export function SalesInventoryView() {
  const { inventoryItems, loading, fetchInventory } = useInventoryData();
  const [search, setSearch] = useState('');
  const [expandedStrain, setExpandedStrain] = useState<string | null>(null);

  const summaries = useMemo(() => buildStrainSummaries(inventoryItems), [inventoryItems]);

  const filtered = useMemo(() => {
    if (!search.trim()) return summaries;
    const q = search.toLowerCase();
    return summaries.filter((s) => s.strain.toLowerCase().includes(q));
  }, [summaries, search]);

  const totals = useMemo(
    () => ({
      strains: summaries.length,
      bulkGrams: summaries.reduce((s, x) => s + x.bulkGrams, 0),
      packagedGrams: summaries.reduce((s, x) => s + x.packagedGrams, 0),
      packagedUnits: summaries.reduce((s, x) => s + x.packagedUnits, 0),
    }),
    [summaries]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">Available Inventory</h1>
          <p className="text-cult-light-gray text-sm mt-2">
            Bulk and packaged inventory ready to sell — by strain
          </p>
        </div>
        <button
          onClick={() => fetchInventory()}
          className="flex items-center gap-2 text-sm text-cult-silver hover:text-cult-white transition-colors mt-1"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4">
          <div className="text-xs text-cult-silver uppercase tracking-wide mb-1">Strains</div>
          <div className="text-2xl font-bold text-cult-white">{totals.strains}</div>
        </div>
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4">
          <div className="text-xs text-cult-silver uppercase tracking-wide mb-1">Bulk Available</div>
          <div className="text-2xl font-bold text-amber-300">{formatWeight(totals.bulkGrams)}</div>
        </div>
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4">
          <div className="text-xs text-cult-silver uppercase tracking-wide mb-1">Packaged (g)</div>
          <div className="text-2xl font-bold text-teal-300">{formatWeight(totals.packagedGrams)}</div>
        </div>
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-4">
          <div className="text-xs text-cult-silver uppercase tracking-wide mb-1">Packaged (units)</div>
          <div className="text-2xl font-bold text-teal-300">{totals.packagedUnits.toLocaleString()}</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-silver" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search strains..."
          className="w-full pl-9 pr-4 py-2 bg-cult-near-black border border-cult-medium-gray rounded-lg text-cult-white placeholder-cult-silver focus:ring-2 focus:ring-cult-green focus:border-transparent text-sm"
        />
      </div>

      {/* Strain Table */}
      {loading ? (
        <div className="text-cult-silver text-sm py-8 text-center">Loading inventory...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-12 text-center">
          <TrendingDown className="w-12 h-12 text-cult-silver mx-auto mb-3" />
          <p className="text-cult-silver">
            {search ? `No strains match "${search}"` : 'No sellable inventory available'}
          </p>
        </div>
      ) : (
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-cult-dark-gray border-b border-cult-medium-gray">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">Strain</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider hidden sm:table-cell">Available</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider hidden md:table-cell">Packages</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cult-medium-gray">
              {filtered.map((s) => {
                const totalGrams = s.bulkGrams + s.packagedGrams;
                const isExpanded = expandedStrain === s.strain;
                return (
                  <>
                    <tr
                      key={s.strain}
                      className="hover:bg-cult-dark-gray/50 transition-colors cursor-pointer"
                      onClick={() => setExpandedStrain(isExpanded ? null : s.strain)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-cult-white">{s.strain}</div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex flex-wrap gap-1.5">
                          <GramBadge grams={s.bulkGrams} label="Bulk" />
                          <GramBadge grams={s.packagedGrams} label="Pkgd" />
                          <UnitBadge units={s.packagedUnits} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-cult-white">{formatWeight(totalGrams)}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="text-cult-silver text-sm">{s.packageCount}</span>
                      </td>
                    </tr>

                    {/* Expanded package breakdown */}
                    {isExpanded && (
                      <tr key={`${s.strain}-detail`}>
                        <td colSpan={4} className="bg-cult-dark-gray/60 px-6 py-3">
                          <div className="text-xs font-medium text-cult-silver uppercase tracking-wide mb-2">
                            Package Breakdown
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {s.packages.map((pkg) => {
                              const stage = getItemStage(pkg);
                              return (
                                <div
                                  key={pkg.id}
                                  className="flex items-center justify-between bg-cult-near-black border border-cult-medium-gray rounded p-2"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {stage === 'bulk' ? (
                                      <Box className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                    ) : (
                                      <Package className="w-4 h-4 text-teal-400 flex-shrink-0" />
                                    )}
                                    <span className="text-xs font-mono text-cult-silver truncate">
                                      {pkg.package_id}
                                    </span>
                                  </div>
                                  <span className="text-xs font-medium text-cult-white ml-2 flex-shrink-0">
                                    {pkg.unit === 'units' || pkg.unit === 'unit'
                                      ? `${(pkg.available_qty ?? 0).toLocaleString()} units`
                                      : formatWeight(pkg.available_qty ?? 0)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
