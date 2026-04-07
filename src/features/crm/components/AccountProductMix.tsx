import { Package, TrendingUp, Hash } from 'lucide-react';
import { formatCurrencyShort } from '@/shared/utils/format';
import type { CustomerProductMix } from '../types';

interface AccountProductMixProps {
  productMix: CustomerProductMix[];
  loading: boolean;
  periodLabel?: string;
}

function getCategoryColor(category: string): string {
  switch (category?.toLowerCase()) {
    case 'flower': return 'bg-cult-success-muted text-cult-success';
    case 'pre-roll':
    case 'preroll': return 'bg-cult-warning-muted text-cult-warning';
    case 'concentrate': return 'bg-cult-info-muted text-cult-info';
    case 'edible': return 'bg-cult-danger-muted text-cult-danger';
    default: return 'bg-cult-medium-gray/30 text-cult-silver';
  }
}

export function AccountProductMix({ productMix, loading, periodLabel }: AccountProductMixProps) {
  if (loading) {
    return (
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cult-white" />
        </div>
      </div>
    );
  }

  const totalRevenue = productMix.reduce((sum, p) => sum + Number(p.total_revenue), 0);
  const totalUnits = productMix.reduce((sum, p) => sum + Number(p.total_units), 0);
  const uniqueStrains = new Set(productMix.map((p) => p.strain).filter(Boolean)).size;

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-cult-charcoal flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-cult-silver" />
          <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">Product Mix</h3>
          {periodLabel && (
            <span className="text-xs text-cult-light-gray bg-cult-dark-gray px-2 py-0.5 rounded-full">
              {periodLabel}
            </span>
          )}
        </div>
        <span className="text-xs text-cult-light-gray">{productMix.length} products</span>
      </div>

      {productMix.length > 0 && (
        <div className="px-5 py-3 border-b border-cult-charcoal/50 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-cult-silver">Revenue</p>
            <p className="text-sm font-bold text-cult-success">{formatCurrencyShort(totalRevenue)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-cult-silver">Units</p>
            <p className="text-sm font-bold text-cult-white">{totalUnits.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-cult-silver">Strains</p>
            <p className="text-sm font-bold text-cult-white">{uniqueStrains}</p>
          </div>
        </div>
      )}

      <div className="divide-y divide-cult-charcoal/50 max-h-[400px] overflow-y-auto">
        {productMix.map((product) => {
          const revenueShare = totalRevenue > 0 ? (Number(product.total_revenue) / totalRevenue) * 100 : 0;

          return (
            <div key={product.product_id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-cult-white truncate">{product.product_name}</span>
                    <span className={`px-1.5 py-0.5 text-xs rounded ${getCategoryColor(product.product_category)}`}>
                      {product.product_category}
                    </span>
                  </div>
                  {product.strain && (
                    <p className="text-xs text-cult-light-gray mt-0.5">{product.strain}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-cult-silver">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {product.order_count} orders
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {revenueShare.toFixed(1)}% of total
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-cult-success">{formatCurrencyShort(Number(product.total_revenue))}</p>
                  <p className="text-xs text-cult-silver">{product.total_units} units</p>
                  <p className="text-xs text-cult-light-gray">{formatCurrencyShort(Number(product.avg_unit_price))}/ea</p>
                </div>
              </div>
              <div className="mt-2 h-1 bg-cult-dark-gray rounded-full overflow-hidden">
                <div
                  className="h-full bg-cult-success/40 rounded-full transition-all"
                  style={{ width: `${Math.min(revenueShare, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
        {productMix.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-cult-light-gray">
            No product purchase history yet.
          </div>
        )}
      </div>
    </div>
  );
}
