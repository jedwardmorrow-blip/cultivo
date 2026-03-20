/**
 * ConsolidateView Component
 *
 * Shows inventory groups (strain + category + batch) that have 2+ fragments.
 * One-click "Combine All" per group — no wizard, no manual package selection.
 * Directly calls fn_combine_inventory_packages via existing combine service.
 */

import { useMemo, useState, useCallback } from 'react';
import { Combine, Loader2, CheckCircle, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { combineInventoryPackages, generateCombinedPackageId } from '../services/combine.service';
import { notificationService } from '@/services/notification.service';
import type { InventoryItem } from '../types';

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
}

type CombineStatus = 'idle' | 'combining' | 'success' | 'error';

const CATEGORY_LABELS: Record<string, string> = {
  flower_binned: 'Flower (Binned)',
  flower_bucked: 'Flower (Bucked)',
  flower_bulk: 'Flower (Bulk)',
  smalls_bulk: 'Smalls (Bulk)',
  trim_bulk: 'Trim (Bulk)',
  flower_packaged: 'Flower (Packaged)',
  smalls_trimmed: 'Smalls (Trimmed)',
};

const CATEGORY_COLORS: Record<string, string> = {
  flower_binned: 'border-emerald-700/50 bg-emerald-900/10',
  flower_bucked: 'border-blue-700/50 bg-blue-900/10',
  flower_bulk: 'border-amber-700/50 bg-amber-900/10',
  smalls_bulk: 'border-purple-700/50 bg-purple-900/10',
  trim_bulk: 'border-orange-700/50 bg-orange-900/10',
  flower_packaged: 'border-teal-700/50 bg-teal-900/10',
  smalls_trimmed: 'border-pink-700/50 bg-pink-900/10',
};

function formatQty(qty: number, unit: string): string {
  if (unit === 'unit') return `${qty} units`;
  if (qty >= 1000) return `${(qty / 1000).toFixed(2)} kg`;
  return `${qty.toFixed(1)} g`;
}

export function ConsolidateView({ items, onDataRefresh }: ConsolidateViewProps) {
  const [combineStatuses, setCombineStatuses] = useState<Record<string, CombineStatus>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [combineErrors, setCombineErrors] = useState<Record<string, string>>({});

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
      });
      group.totalQty += item.on_hand_qty;
    }

    // Filter to groups with 2+ packages, sort by package count descending
    return Array.from(groupMap.values())
      .filter((g) => g.packages.length >= 2)
      .sort((a, b) => b.packages.length - a.packages.length);
  }, [items]);

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

  const handleCombineAll = useCallback(
    async (group: ConsolidateGroup) => {
      setCombineStatuses((prev) => ({ ...prev, [group.key]: 'combining' }));
      setCombineErrors((prev) => {
        const next = { ...prev };
        delete next[group.key];
        return next;
      });

      try {
        // Generate package ID
        const newPackageId = await generateCombinedPackageId(group.batchId);

        // Execute combine
        const result = await combineInventoryPackages({
          source_package_ids: group.packages.map((p) => p.id),
          new_package_id: newPackageId,
        });

        if (!result.success) {
          throw new Error(result.error || 'Combination failed');
        }

        setCombineStatuses((prev) => ({ ...prev, [group.key]: 'success' }));
        notificationService.success(
          `Combined ${group.packages.length} ${group.strain} ${group.categoryLabel} packages → ${newPackageId}`
        );

        // Refresh data after a brief pause so user sees the success state
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
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-cult-dark-card border border-cult-border rounded-lg px-5 py-3">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-cult-light-gray">Fragment groups: </span>
            <span className="text-cult-white font-semibold">{groups.length}</span>
          </div>
          <div>
            <span className="text-cult-light-gray">Total fragments: </span>
            <span className="text-amber-400 font-semibold">{totalFragments}</span>
          </div>
          <div>
            <span className="text-cult-light-gray">After consolidation: </span>
            <span className="text-green-400 font-semibold">{totalAfterConsolidate}</span>
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-3">
        {groups.map((group) => {
          const status = combineStatuses[group.key] || 'idle';
          const isExpanded = expandedGroups.has(group.key);
          const errorMsg = combineErrors[group.key];
          const colorClass = CATEGORY_COLORS[group.category] || 'border-cult-border bg-cult-dark-card';

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

                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  {/* Fragments preview */}
                  <div className="hidden sm:flex items-center gap-1 text-xs text-cult-light-gray">
                    {group.packages
                      .sort((a, b) => a.qty - b.qty)
                      .slice(0, 5)
                      .map((p, i) => (
                        <span key={p.id} className="px-1.5 py-0.5 bg-cult-surface rounded text-cult-text-muted font-mono">
                          {p.unit === 'unit' ? p.qty : `${p.qty.toFixed(0)}g`}
                        </span>
                      ))}
                    {group.packages.length > 5 && (
                      <span className="text-cult-text-muted">+{group.packages.length - 5}</span>
                    )}
                  </div>

                  {/* Combine button */}
                  {status === 'idle' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCombineAll(group);
                      }}
                      className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Combine className="w-3.5 h-3.5" />
                      Combine All
                    </button>
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
                        handleCombineAll(group);
                      }}
                      className="flex items-center gap-2 px-4 py-1.5 bg-red-600/80 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Retry
                    </button>
                  )}
                </div>
              </div>

              {/* Error message */}
              {errorMsg && (
                <div className="px-5 pb-2 text-xs text-red-400">{errorMsg}</div>
              )}

              {/* Expanded package list */}
              {isExpanded && (
                <div className="border-t border-cult-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-cult-text-muted uppercase border-b border-cult-border">
                        <th className="px-5 py-2 text-left">Package ID</th>
                        <th className="px-5 py-2 text-right">Quantity</th>
                        <th className="px-5 py-2 text-right">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cult-border/50">
                      {group.packages
                        .sort((a, b) => a.qty - b.qty)
                        .map((pkg) => (
                          <tr key={pkg.id} className="text-cult-light-gray hover:bg-cult-surface/30">
                            <td className="px-5 py-1.5 font-mono text-xs">{pkg.packageId}</td>
                            <td className="px-5 py-1.5 text-right font-medium">{formatQty(pkg.qty, pkg.unit)}</td>
                            <td className="px-5 py-1.5 text-right text-xs text-cult-text-muted">
                              {pkg.createdAt ? new Date(pkg.createdAt).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
