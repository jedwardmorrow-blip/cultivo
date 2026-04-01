/**
 * ConsolidateView Component
 *
 * Shows inventory groups (strain + category + batch) that have 2+ fragments.
 * Two combine modes per group:
 *   - "Combine All" — merges every package in the group into one.
 *   - Checkbox selection + "Combine Selected" — merge only the checked packages.
 * Per-package reclassify: change a package's category so it can be combined
 * with a different group (e.g. move bigs into smalls).
 * Search bar filters groups by strain, batch, or category.
 * Directly calls fn_combine_inventory_packages via existing combine service.
 */

import { useMemo, useState, useCallback } from 'react';
import { Combine, Loader2, CheckCircle, AlertTriangle, ChevronDown, ChevronRight, Search, ArrowRightLeft, X } from 'lucide-react';
import { combineInventoryPackages, generateCombinedPackageId } from '../services/combine.service';
import { notificationService } from '@/services/notification.service';
import { supabase } from '@/lib/supabase';
import type { InventoryItem } from '../types';
import { formatWeight } from '@/shared/utils/format';

interface ConsolidateViewProps {
  items: InventoryItem[];
  onDataRefresh?: () => void;
}

interface ConsolidateGroup {
  key: string;
  strain: string;
  category: string;
  categoryLabel: string;
  batchNumber: string;
  batchId: string;
  unit: string;
  packages: PackageSummary[];
  totalQty: number;
}

interface PackageSummary {
  id: string;
  packageId: string;
  qty: number;
  unit: string;
  createdAt: string;
  category: string;
}

type CombineStatus = 'idle' | 'combining' | 'success' | 'error';

const CATEGORY_LABELS: Record<string, string> = {
  flower_binned: 'Flower (Binned)',
  smalls_binned: 'Smalls (Binned)',
  flower_bucked: 'Flower (Bucked)',
  smalls_bucked: 'Smalls (Bucked)',
  flower_bulk: 'Flower (Bulk)',
  smalls_bulk: 'Smalls (Bulk)',
  trim_bulk: 'Trim (Bulk)',
  flower_trimmed: 'Flower (Trimmed)',
  smalls_trimmed: 'Smalls (Trimmed)',
  trim_trimmed: 'Trim (Trimmed)',
  flower_packaged: 'Flower (Packaged)',
  smalls_packaged: 'Smalls (Packaged)',
  fresh_frozen: 'Fresh Frozen',
};

const CATEGORY_COLORS: Record<string, string> = {
  flower_binned: 'border-emerald-700/50 bg-emerald-900/10',
  smalls_binned: 'border-emerald-700/30 bg-emerald-900/5',
  flower_bucked: 'border-blue-700/50 bg-blue-900/10',
  smalls_bucked: 'border-blue-700/30 bg-blue-900/5',
  flower_bulk: 'border-amber-700/50 bg-amber-900/10',
  smalls_bulk: 'border-purple-700/50 bg-purple-900/10',
  trim_bulk: 'border-orange-700/50 bg-orange-900/10',
  flower_packaged: 'border-teal-700/50 bg-teal-900/10',
  smalls_trimmed: 'border-pink-700/50 bg-pink-900/10',
  smalls_packaged: 'border-teal-700/30 bg-teal-900/5',
};

// Categories grouped by processing stage — reclassify targets within the same stage
const RECLASSIFY_TARGETS: Record<string, string[]> = {
  flower_binned: ['smalls_binned'],
  smalls_binned: ['flower_binned'],
  flower_bucked: ['smalls_bucked'],
  smalls_bucked: ['flower_bucked'],
  flower_bulk: ['smalls_bulk', 'trim_bulk'],
  smalls_bulk: ['flower_bulk', 'trim_bulk'],
  trim_bulk: ['flower_bulk', 'smalls_bulk'],
  flower_trimmed: ['smalls_trimmed', 'trim_trimmed'],
  smalls_trimmed: ['flower_trimmed', 'trim_trimmed'],
  trim_trimmed: ['flower_trimmed', 'smalls_trimmed'],
  flower_packaged: ['smalls_packaged'],
  smalls_packaged: ['flower_packaged'],
};

function formatQty(qty: number, unit: string): string {
  if (unit === 'unit') return `${qty} units`;
  return formatWeight(qty);
}

export function ConsolidateView({ items, onDataRefresh }: ConsolidateViewProps) {
  const [combineStatuses, setCombineStatuses] = useState<Record<string, CombineStatus>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [combineErrors, setCombineErrors] = useState<Record<string, string>>({});
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [reclassifyingIds, setReclassifyingIds] = useState<Set<string>>(new Set());

  // Group available items by strain + category + batch
  const groups = useMemo(() => {
    const groupMap = new Map<string, ConsolidateGroup>();

    for (const item of items) {
      if (!item.on_hand_qty || item.on_hand_qty <= 0) continue;
      const status = (item.status || '').toLowerCase();
      if (status !== 'available' && status !== 'active') continue;

      const strain = item.strain || 'Unknown';
      const category = item.category || 'unknown';
      const batchId = item.batch_id || 'no-batch';
      const batchNumber = item.batch_number || 'Unknown';
      const key = `${strain}::${category}::${batchId}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          strain,
          category,
          categoryLabel: CATEGORY_LABELS[category] || category,
          batchNumber,
          batchId,
          unit: item.unit || 'g',
          packages: [],
          totalQty: 0,
        });
      }

      const group = groupMap.get(key)!;
      group.packages.push({
        id: item.id,
        packageId: item.package_id,
        qty: item.on_hand_qty,
        unit: item.unit || 'g',
        createdAt: item.created_at || '',
        category,
      });
      group.totalQty += item.on_hand_qty;
    }

    return Array.from(groupMap.values())
      .filter((g) => g.packages.length >= 2)
      .sort((a, b) => b.packages.length - a.packages.length);
  }, [items]);

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter(
      (g) =>
        g.strain.toLowerCase().includes(q) ||
        g.batchNumber.toLowerCase().includes(q) ||
        g.categoryLabel.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  const totalFragments = useMemo(
    () => groups.reduce((sum, g) => sum + g.packages.length, 0),
    [groups]
  );
  const totalAfterConsolidate = groups.length;

  const toggleExpanded = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const getSelection = useCallback(
    (groupKey: string): Set<string> => selections[groupKey] || new Set(),
    [selections]
  );

  const togglePackage = useCallback((groupKey: string, packageId: string) => {
    setSelections((prev) => {
      const current = new Set(prev[groupKey] || []);
      if (current.has(packageId)) current.delete(packageId);
      else current.add(packageId);
      return { ...prev, [groupKey]: current };
    });
  }, []);

  const toggleAllInGroup = useCallback((groupKey: string, allPackageIds: string[]) => {
    setSelections((prev) => {
      const current = prev[groupKey] || new Set();
      const allSelected = allPackageIds.every((id) => current.has(id));
      return {
        ...prev,
        [groupKey]: allSelected ? new Set() : new Set(allPackageIds),
      };
    });
  }, []);

  const handleCombine = useCallback(
    async (group: ConsolidateGroup, packageIds: string[]) => {
      if (packageIds.length < 2) {
        notificationService.error('Select at least 2 packages to combine');
        return;
      }

      setCombineStatuses((prev) => ({ ...prev, [group.key]: 'combining' }));
      setCombineErrors((prev) => {
        const next = { ...prev };
        delete next[group.key];
        return next;
      });

      try {
        const newPackageId = await generateCombinedPackageId(group.batchId);

        const result = await combineInventoryPackages({
          source_package_ids: packageIds,
          new_package_id: newPackageId,
        });

        if (!result.success) {
          throw new Error(result.error || 'Combination failed');
        }

        const count = packageIds.length;
        setCombineStatuses((prev) => ({ ...prev, [group.key]: 'success' }));
        setSelections((prev) => {
          const next = { ...prev };
          delete next[group.key];
          return next;
        });
        notificationService.success(
          `Combined ${count} ${group.strain} ${group.categoryLabel} packages → ${newPackageId}`
        );

        setTimeout(() => {
          onDataRefresh?.();
        }, 1500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Combination failed';
        setCombineStatuses((prev) => ({ ...prev, [group.key]: 'error' }));
        setCombineErrors((prev) => ({ ...prev, [group.key]: msg }));
        notificationService.error(msg);
      }
    },
    [onDataRefresh]
  );

  const handleReclassify = useCallback(
    async (pkg: PackageSummary, newCategory: string) => {
      setReclassifyingIds((prev) => new Set(prev).add(pkg.id));

      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) throw new Error('Not authenticated');

        const { data, error } = await supabase.rpc('fn_reclassify_inventory_item', {
          p_item_id: pkg.id,
          p_new_category: newCategory,
          p_user_id: userId,
        });

        if (error) throw new Error(error.message);
        if (!data?.success) throw new Error(data?.error || 'Reclassify failed');

        const label = CATEGORY_LABELS[newCategory] || newCategory;
        notificationService.success(
          `${pkg.packageId} reclassified → ${label}`
        );

        onDataRefresh?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Reclassify failed';
        notificationService.error(msg);
      } finally {
        setReclassifyingIds((prev) => {
          const next = new Set(prev);
          next.delete(pkg.id);
          return next;
        });
      }
    },
    [onDataRefresh]
  );

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-cult-light-gray">
        <CheckCircle className="w-12 h-12 text-green-500/60 mb-4" />
        <h3 className="text-lg font-medium text-cult-white mb-1">Inventory is clean</h3>
        <p className="text-sm">No combinable fragment groups found. Each strain/batch/stage has a single package.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + summary bar */}
      <div className="flex items-center gap-4 bg-cult-dark-card border border-cult-border rounded-lg px-4 py-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search strain, batch, or category..."
            className="w-full pl-9 pr-8 py-1.5 bg-cult-surface border border-cult-border rounded-lg text-sm text-cult-white placeholder-cult-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-cult-text-muted hover:text-cult-light-gray"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-cult-light-gray">Groups: </span>
            <span className="text-cult-white font-semibold">
              {filteredGroups.length !== groups.length ? `${filteredGroups.length}/` : ''}{groups.length}
            </span>
          </div>
          <div>
            <span className="text-cult-light-gray">Fragments: </span>
            <span className="text-amber-400 font-semibold">{totalFragments}</span>
          </div>
          <div>
            <span className="text-cult-light-gray">After: </span>
            <span className="text-green-400 font-semibold">{totalAfterConsolidate}</span>
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-3">
        {filteredGroups.map((group) => {
          const status = combineStatuses[group.key] || 'idle';
          const isExpanded = expandedGroups.has(group.key);
          const errorMsg = combineErrors[group.key];
          const colorClass = CATEGORY_COLORS[group.category] || 'border-cult-border bg-cult-dark-card';
          const selected = getSelection(group.key);
          const selectedCount = selected.size;
          const selectedQty = group.packages
            .filter((p) => selected.has(p.id))
            .reduce((sum, p) => sum + p.qty, 0);
          const allIds = group.packages.map((p) => p.id);
          const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

          return (
            <div
              key={group.key}
              className={`border rounded-lg overflow-hidden transition-all ${
                status === 'success' ? 'border-green-700/50 bg-green-900/10 opacity-60' : colorClass
              }`}
            >
              {/* Group header */}
              <div className="flex items-center justify-between px-5 py-3">
                <button
                  onClick={() => toggleExpanded(group.key)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-cult-light-gray flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-cult-light-gray flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-cult-white font-semibold truncate">{group.strain}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-cult-surface text-cult-light-gray border border-cult-border">
                        {group.categoryLabel}
                      </span>
                    </div>
                    <div className="text-xs text-cult-light-gray mt-0.5">
                      Batch {group.batchNumber} · {group.packages.length} packages · {formatQty(group.totalQty, group.unit)} total
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  {!isExpanded && (
                    <div className="hidden sm:flex items-center gap-1 text-xs text-cult-light-gray">
                      {group.packages
                        .sort((a, b) => a.qty - b.qty)
                        .slice(0, 5)
                        .map((p) => (
                          <span key={p.id} className="px-1.5 py-0.5 bg-cult-surface rounded text-cult-text-muted font-mono">
                            {p.unit === 'unit' ? p.qty : `${p.qty.toFixed(0)}g`}
                          </span>
                        ))}
                      {group.packages.length > 5 && (
                        <span className="text-cult-text-muted">+{group.packages.length - 5}</span>
                      )}
                    </div>
                  )}

                  {status === 'idle' && (
                    <div className="flex items-center gap-2">
                      {selectedCount >= 2 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCombine(group, Array.from(selected));
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Combine className="w-3.5 h-3.5" />
                          Combine {selectedCount} ({formatQty(selectedQty, group.unit)})
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCombine(group, allIds);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          selectedCount >= 2
                            ? 'bg-cult-surface text-cult-light-gray border border-cult-border hover:bg-cult-surface-raised'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        <Combine className="w-3.5 h-3.5" />
                        Combine All
                      </button>
                    </div>
                  )}
                  {status === 'combining' && (
                    <div className="flex items-center gap-2 px-4 py-1.5 text-sm text-blue-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Combining...
                    </div>
                  )}
                  {status === 'success' && (
                    <div className="flex items-center gap-2 px-4 py-1.5 text-sm text-green-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Done
                    </div>
                  )}
                  {status === 'error' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCombine(group, selectedCount >= 2 ? Array.from(selected) : allIds);
                      }}
                      className="flex items-center gap-2 px-4 py-1.5 bg-red-600/80 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Retry
                    </button>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div className="px-5 pb-2 text-xs text-red-400">{errorMsg}</div>
              )}

              {/* Expanded package list */}
              {isExpanded && (
                <div className="border-t border-cult-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-cult-text-muted uppercase border-b border-cult-border">
                        <th className="px-3 py-2 text-left w-10">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => toggleAllInGroup(group.key, allIds)}
                            className="rounded border-cult-border text-blue-600 focus:ring-blue-500 focus:ring-offset-0 bg-cult-surface cursor-pointer"
                          />
                        </th>
                        <th className="px-3 py-2 text-left">Package ID</th>
                        <th className="px-3 py-2 text-right">Quantity</th>
                        <th className="px-3 py-2 text-right">Created</th>
                        <th className="px-3 py-2 text-right w-40">Reclassify</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cult-border/50">
                      {group.packages
                        .sort((a, b) => a.qty - b.qty)
                        .map((pkg) => {
                          const isChecked = selected.has(pkg.id);
                          const isReclassifying = reclassifyingIds.has(pkg.id);
                          const targets = RECLASSIFY_TARGETS[pkg.category] || [];
                          return (
                            <tr
                              key={pkg.id}
                              onClick={() => togglePackage(group.key, pkg.id)}
                              className={`cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-blue-900/20 text-cult-white'
                                  : 'text-cult-light-gray hover:bg-cult-surface/30'
                              }`}
                            >
                              <td className="px-3 py-1.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePackage(group.key, pkg.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded border-cult-border text-blue-600 focus:ring-blue-500 focus:ring-offset-0 bg-cult-surface cursor-pointer"
                                />
                              </td>
                              <td className="px-3 py-1.5 font-mono text-sm font-medium">{pkg.packageId}</td>
                              <td className="px-3 py-1.5 text-right font-medium">{formatQty(pkg.qty, pkg.unit)}</td>
                              <td className="px-3 py-1.5 text-right text-xs text-cult-text-muted">
                                {pkg.createdAt ? new Date(pkg.createdAt).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-3 py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
                                {isReclassifying ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 ml-auto" />
                                ) : targets.length > 0 ? (
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) handleReclassify(pkg, e.target.value);
                                    }}
                                    className="bg-cult-surface border border-cult-border rounded px-2 py-0.5 text-xs text-cult-light-gray focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-full"
                                  >
                                    <option value="">Move to...</option>
                                    {targets.map((cat) => (
                                      <option key={cat} value={cat}>
                                        {CATEGORY_LABELS[cat] || cat}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-xs text-cult-text-muted">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>

                  {selectedCount > 0 && (
                    <div className="flex items-center justify-between px-5 py-2 bg-blue-900/15 border-t border-cult-border text-xs">
                      <span className="text-blue-300">
                        {selectedCount} of {group.packages.length} selected · {formatQty(selectedQty, group.unit)}
                      </span>
                      {selectedCount >= 2 && status === 'idle' && (
                        <button
                          onClick={() => handleCombine(group, Array.from(selected))}
                          className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                        >
                          <Combine className="w-3 h-3" />
                          Combine Selected
                        </button>
                      )}
                      {selectedCount < 2 && (
                        <span className="text-cult-text-muted">Select at least 2 to combine</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No results for search */}
      {filteredGroups.length === 0 && searchQuery && (
        <div className="text-center py-10 text-cult-light-gray text-sm">
          No groups matching "{searchQuery}"
        </div>
      )}
    </div>
  );
}
