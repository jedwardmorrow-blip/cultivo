import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, Search } from 'lucide-react';
import { useReadyToShip, type ShipReadySku } from '../../../hooks/useReadyToShip';

function gramsToLbs(g: number): string {
  return (g / 453.592).toFixed(1);
}

function formatUsd(v: number): string {
  if (v === 0) return '$0';
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

interface ReadyToShipLensProps {
  onSkuClick?: (productId: string) => void;
}

export function ReadyToShipLens({ onSkuClick }: ReadyToShipLensProps) {
  const { skus, loading } = useReadyToShip();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return skus;
    const q = search.toLowerCase();
    return skus.filter(
      (s) =>
        s.strain.toLowerCase().includes(q) ||
        s.product_name.toLowerCase().includes(q) ||
        (s.sku?.toLowerCase().includes(q) ?? false),
    );
  }, [skus, search]);

  // Aggregate KPIs
  const totalUnits = filtered.reduce((s, r) => s + r.units_available, 0);
  const totalGrams = filtered.reduce((s, r) => s + r.total_grams_available, 0);
  const totalValue = filtered.reduce((s, r) => s + r.units_available * r.price_per_unit, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-5 h-[88px] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-5 h-[120px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (skus.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Package className="w-10 h-10 text-white/10 mx-auto mb-3" />
        <p className="text-white/50 font-medium">No sellable inventory</p>
        <p className="text-white/30 text-sm mt-1">Check the Batch Pipeline for in-process material.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-cult-surface rounded-cult p-4 border border-cult-border-subtle">
          <span className="text-xs text-white/40 uppercase tracking-wider">Units Ready</span>
          <p className="text-xl font-bold text-white tabular-nums mt-1">{totalUnits.toLocaleString()}</p>
          <p className="text-[10px] text-white/30">{filtered.length} SKUs</p>
        </div>
        <div className="bg-cult-surface rounded-cult p-4 border border-cult-border-subtle">
          <span className="text-xs text-white/40 uppercase tracking-wider">Total Weight</span>
          <p className="text-xl font-bold text-white tabular-nums mt-1">{gramsToLbs(totalGrams)} lbs</p>
          <p className="text-[10px] text-white/30">packaged</p>
        </div>
        <div className="bg-cult-surface rounded-cult p-4 border border-cult-border-subtle">
          <span className="text-xs text-white/40 uppercase tracking-wider">Est. Value</span>
          <p className="text-xl font-bold text-emerald-400 tabular-nums mt-1">{formatUsd(totalValue)}</p>
          <p className="text-[10px] text-white/30">at list price</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search SKUs…"
          className="glass-input w-full pl-8 pr-3 py-1.5 rounded-cult text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
      </div>

      {/* SKU grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((sku, i) => (
          <SkuCard key={sku.product_id} sku={sku} index={i} onClick={onSkuClick} />
        ))}
        {filtered.length === 0 && search && (
          <div className="col-span-full text-center py-8 text-white/30 text-sm">
            No SKUs match &ldquo;{search}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

function SkuCard({ sku, index, onClick }: { sku: ShipReadySku; index: number; onClick?: (productId: string) => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onClick?.(sku.product_id)}
      className="glass-card p-5 text-left w-full active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-white truncate">{sku.product_name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-white/30">{sku.strain}</span>
            {sku.sku && (
              <span className="text-[10px] text-white/20 font-mono">{sku.sku}</span>
            )}
          </div>
        </div>
        <span className="text-[10px] text-white/30 bg-cult-surface-raised px-2 py-0.5 rounded-full shrink-0">
          {sku.unit_weight_grams}g
        </span>
      </div>

      <div className="flex items-end justify-between mt-3">
        <div>
          <p className="text-2xl font-bold text-white tabular-nums">{sku.units_available}</p>
          <p className="text-[10px] text-white/30">units available</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-emerald-400 tabular-nums">
            {formatUsd(sku.price_per_unit)}/ea
          </p>
          <p className="text-[10px] text-white/20 tabular-nums">
            {formatUsd(sku.units_available * sku.price_per_unit)} total
          </p>
        </div>
      </div>
    </motion.button>
  );
}
