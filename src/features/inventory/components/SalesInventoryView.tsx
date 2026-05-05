import { useState, useMemo } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { useStrainPosition } from '../hooks/useStrainPosition';
import { MenuView, PositionView, fmtLbsCompact } from './sales-position';

type Layout = 'menu' | 'position';

export function SalesInventoryView() {
  const { positions, loading, refetch } = useStrainPosition();
  const [layout, setLayout] = useState<Layout>('menu');
  const [search, setSearch] = useState('');

  // Top-line summary across all positions
  const summary = useMemo(() => {
    let gradedG = 0;
    let ungradedG = 0;
    let demandG = 0;
    let overCount = 0;
    let strainCount = 0;
    for (const p of positions) {
      gradedG += p.graded_g;
      ungradedG += p.ungraded_g;
      demandG += p.open_demand_g;
      if (p.state === 'over_committed') overCount += 1;
      if (p.graded_g > 0 || p.ungraded_g > 0 || p.units_available > 0) strainCount += 1;
    }
    return { gradedG, ungradedG, demandG, overCount, strainCount };
  }, [positions]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-cult-text-primary">Sales Inventory</h1>
          <p className="text-cult-text-muted text-sm mt-1.5">
            {loading
              ? 'loading…'
              : `${fmtLbsCompact(summary.gradedG)} lbs quotable · ${fmtLbsCompact(
                  summary.ungradedG
                )} lbs ungraded · ${fmtLbsCompact(summary.demandG)} lbs open demand · ${
                  summary.strainCount
                } strains`}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 text-sm text-cult-text-secondary hover:text-cult-text-primary transition-colors mt-1"
          title="Refresh"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Prototype banner — explicit "we're testing two layouts" framing */}
      <div className="border border-cult-border bg-cult-surface px-4 py-3 rounded">
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-cult-text-secondary leading-relaxed">
            <span className="font-mono uppercase tracking-wider text-[10px] text-cult-text-muted">
              prototype
            </span>{' '}
            — two layouts of the same data, tell us which one matches how you think about
            inventory
          </div>
          <div className="flex border border-cult-border-strong rounded overflow-hidden flex-shrink-0">
            <button
              onClick={() => setLayout('menu')}
              className={`px-3 py-1.5 font-mono uppercase tracking-wider text-[10px] transition-colors ${
                layout === 'menu'
                  ? 'bg-cult-surface-raised text-cult-text-primary'
                  : 'text-cult-text-secondary hover:text-cult-text-primary'
              }`}
            >
              A · Menu
            </button>
            <button
              onClick={() => setLayout('position')}
              className={`px-3 py-1.5 font-mono uppercase tracking-wider text-[10px] transition-colors border-l border-cult-border-strong ${
                layout === 'position'
                  ? 'bg-cult-surface-raised text-cult-text-primary'
                  : 'text-cult-text-secondary hover:text-cult-text-primary'
              }`}
            >
              B · Position
            </button>
          </div>
        </div>
      </div>

      {/* Risk strip — only renders when there's something to flag */}
      {summary.overCount > 0 && (
        <div className="border border-cult-danger bg-cult-surface px-4 py-2.5 rounded">
          <span className="font-mono uppercase tracking-wider text-[10px] text-cult-danger">
            attention
          </span>
          <span className="ml-3 text-sm text-cult-text-primary">
            {summary.overCount} strain{summary.overCount === 1 ? '' : 's'} over-committed
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search strains…"
          className="w-full pl-9 pr-4 py-2 bg-cult-surface border border-cult-border rounded text-cult-text-primary placeholder-cult-text-secondary focus:ring-1 focus:ring-cult-border-strong focus:border-cult-border-strong text-sm outline-none"
        />
      </div>

      {/* Body */}
      {loading ? (
        <div className="text-cult-text-secondary text-sm py-12 text-center">
          loading inventory…
        </div>
      ) : layout === 'menu' ? (
        <MenuView positions={positions} search={search} />
      ) : (
        <PositionView positions={positions} search={search} />
      )}
    </div>
  );
}
