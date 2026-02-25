import { Package, Users } from 'lucide-react';
import type { SKUPerformance } from '../types';

interface SKUPerformanceGridProps {
  skus: SKUPerformance[];
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function SKUPerformanceGrid({ skus }: SKUPerformanceGridProps) {
  const topSKUs = skus.slice(0, 12);

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-cult-charcoal flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-cult-silver" />
          <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">Top Products</h3>
        </div>
        <span className="text-xs text-cult-light-gray">By revenue</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cult-charcoal">
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">Product</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider">Revenue</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider hidden md:table-cell">Units</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider hidden md:table-cell">Avg Price</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider hidden lg:table-cell">Customers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-charcoal/50">
            {topSKUs.map((sku) => (
              <tr key={sku.product_id} className="hover:bg-cult-dark-gray/30 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm text-cult-white truncate max-w-[250px]">{sku.product_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {sku.sku && (
                        <span className="text-[10px] font-mono text-cult-light-gray">{sku.sku}</span>
                      )}
                      <span className="text-[10px] text-cult-silver capitalize">{sku.product_type}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-emerald-400">{formatCurrency(Number(sku.total_revenue))}</span>
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <span className="text-sm text-cult-light-gray">{Number(sku.total_units_sold).toLocaleString()}</span>
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <span className="text-sm text-cult-light-gray">${Number(sku.avg_unit_price).toFixed(2)}</span>
                </td>
                <td className="px-4 py-3 text-right hidden lg:table-cell">
                  <div className="flex items-center justify-end gap-1">
                    <Users className="w-3 h-3 text-cult-medium-gray" />
                    <span className="text-sm text-cult-light-gray">{sku.unique_customers}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
