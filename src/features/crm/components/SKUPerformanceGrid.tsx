import { useState, useMemo } from 'react';
import { Package, Users, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrencyShort } from '@/shared/utils/format';
import type { SKUPerformance } from '../types';

type SortKey = 'revenue' | 'units' | 'avg_price' | 'customers';
type SortDir = 'asc' | 'desc';

interface SKUPerformanceGridProps {
  skus: SKUPerformance[];
  periodLabel?: string;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 text-cult-border" />;
  return dir === 'desc'
    ? <ArrowDown className="w-3 h-3 text-cult-success" />
    : <ArrowUp className="w-3 h-3 text-cult-success" />;
}

function getCategoryColor(category: string): string {
  switch (category?.toLowerCase()) {
    case 'flower': return 'bg-cult-success-muted text-cult-success';
    case 'pre-roll':
    case 'preroll': return 'bg-cult-warning-muted text-cult-warning';
    case 'concentrate': return 'bg-sky-500/15 text-sky-400';
    case 'edible': return 'bg-rose-500/15 text-rose-400';
    default: return 'bg-cult-border/30 text-cult-text-secondary';
  }
}

export function SKUPerformanceGrid({ skus, periodLabel }: SKUPerformanceGridProps) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const topRevenue = useMemo(() => {
    if (skus.length === 0) return 0;
    return Math.max(...skus.map((s) => Number(s.total_revenue)));
  }, [skus]);

  const sorted = useMemo(() => {
    const list = [...skus].slice(0, 20);
    const dir = sortDir === 'desc' ? -1 : 1;
    list.sort((a, b) => {
      switch (sortKey) {
        case 'revenue':
          return (Number(a.total_revenue) - Number(b.total_revenue)) * dir;
        case 'units':
          return (Number(a.total_units_sold) - Number(b.total_units_sold)) * dir;
        case 'avg_price':
          return (Number(a.avg_unit_price) - Number(b.avg_unit_price)) * dir;
        case 'customers':
          return (Number(a.unique_customers) - Number(b.unique_customers)) * dir;
        default:
          return 0;
      }
    });
    return list;
  }, [skus, sortKey, sortDir]);

  return (
    <div className="bg-cult-surface border border-cult-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-cult-surface-raised flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-cult-text-secondary" />
          <h3 className="text-sm font-semibold text-cult-text-primary uppercase tracking-wider">Top Products</h3>
          {periodLabel && (
            <span className="text-xs text-cult-text-muted bg-cult-surface px-2 py-0.5 rounded-full">
              {periodLabel}
            </span>
          )}
        </div>
        <span className="text-xs text-cult-text-muted">{skus.length} products</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cult-surface-raised">
              <th className="px-4 py-3 w-6"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-secondary uppercase tracking-wider">Product</th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-cult-text-secondary uppercase tracking-wider cursor-pointer hover:text-cult-text-primary transition-colors select-none"
                onClick={() => handleSort('revenue')}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Revenue <SortIcon active={sortKey === 'revenue'} dir={sortDir} />
                </span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-secondary uppercase tracking-wider hidden xl:table-cell w-[120px]"></th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-cult-text-secondary uppercase tracking-wider hidden md:table-cell cursor-pointer hover:text-cult-text-primary transition-colors select-none"
                onClick={() => handleSort('units')}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Units <SortIcon active={sortKey === 'units'} dir={sortDir} />
                </span>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-cult-text-secondary uppercase tracking-wider hidden md:table-cell cursor-pointer hover:text-cult-text-primary transition-colors select-none"
                onClick={() => handleSort('avg_price')}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Avg Price <SortIcon active={sortKey === 'avg_price'} dir={sortDir} />
                </span>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-cult-text-secondary uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:text-cult-text-primary transition-colors select-none"
                onClick={() => handleSort('customers')}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Customers <SortIcon active={sortKey === 'customers'} dir={sortDir} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-surface-raised/50">
            {sorted.map((sku) => {
              const isExpanded = expandedId === sku.product_id;
              const revenue = Number(sku.total_revenue);
              const barWidth = topRevenue > 0 ? (revenue / topRevenue) * 100 : 0;

              return (
                <tr
                  key={sku.product_id}
                  onClick={() => setExpandedId(isExpanded ? null : sku.product_id)}
                  className="hover:bg-cult-surface/30 transition-colors cursor-pointer group"
                >
                  <td className="pl-4 py-3 w-6">
                    {isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 text-cult-success" />
                      : <ChevronRight className="w-3.5 h-3.5 text-cult-border group-hover:text-cult-text-secondary transition-colors" />
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-cult-text-primary truncate max-w-[250px]">{sku.product_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {sku.sku && (
                          <span className="text-xs font-mono text-cult-text-muted">{sku.sku}</span>
                        )}
                        <span className={`px-1.5 py-0.5 text-xs rounded ${getCategoryColor(sku.product_category)}`}>
                          {sku.product_category}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-cult-success">{formatCurrencyShort(revenue)}</span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <div className="h-1.5 bg-cult-surface rounded-full overflow-hidden w-full">
                      <div
                        className="h-full bg-cult-success/40 rounded-full transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <span className="text-sm text-cult-text-muted">{Number(sku.total_units_sold).toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <span className="text-sm text-cult-text-muted">${Number(sku.avg_unit_price).toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    <div className="flex items-center justify-end gap-1">
                      <Users className="w-3 h-3 text-cult-border" />
                      <span className="text-sm text-cult-text-muted">{sku.unique_customers}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
