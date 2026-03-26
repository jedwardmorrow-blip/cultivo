/**
 * StrainAnalyticsDashboard
 *
 * Main entry point for the strain analytics / genetics library feature.
 * Displays a filterable, sortable table of all active strains with key
 * intelligence dimensions. Click a row to open the StrainDetailPanel.
 */

import { useState } from 'react';
import {
  Search,
  Dna,
  BarChart3,
  Package,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';
import { useStrainAnalytics } from '../hooks';
import { StrainDetailPanel } from './StrainDetailPanel';
import type { SortField, StrainTableRow } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatLbs(val: number | null): string {
  if (val === null) return '—';
  return `${val.toFixed(1)} lb`;
}

function formatPct(val: number | null): string {
  if (val === null) return '—';
  return `${val.toFixed(1)}%`;
}

function formatCurrency(val: number | null): string {
  if (val === null) return '—';
  return `$${val.toFixed(2)}`;
}

function formatNum(val: number | null): string {
  if (val === null) return '—';
  return val.toLocaleString();
}

function runwayBadge(status: string | null) {
  const map: Record<string, { label: string; classes: string }> = {
    critical: { label: 'Critical', classes: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    tight: { label: 'Tight', classes: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    healthy: { label: 'Healthy', classes: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    surplus: { label: 'Surplus', classes: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
    no_demand: { label: 'No Demand', classes: 'bg-cult-charcoal text-cult-silver border-cult-charcoal' },
    no_stock: { label: 'No Stock', classes: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
  };
  if (!status || !map[status]) return null;
  const { label, classes } = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
      {label}
    </span>
  );
}

function confidenceDot(confidence: string | null) {
  const map: Record<string, string> = {
    high: 'bg-emerald-400',
    medium: 'bg-amber-400',
    low: 'bg-rose-400',
    estimated: 'bg-cult-silver',
    calibrated: 'bg-emerald-400',
  };
  const color = confidence ? map[confidence] || 'bg-cult-charcoal' : 'bg-cult-charcoal';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} title={confidence || 'no data'} />;
}

function gradeBadge(grade: string | null) {
  if (!grade) return <span className="text-cult-text-muted text-xs">—</span>;
  const map: Record<string, string> = {
    CULT: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    B: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    C: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    D: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };
  const classes = map[grade] || 'bg-cult-charcoal text-cult-silver border-cult-charcoal';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${classes}`}>
      {grade}
    </span>
  );
}

function completenessBar(pct: number) {
  const color =
    pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-cult-charcoal rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-cult-text-muted">{pct}%</span>
    </div>
  );
}

// ── Sort Header ──────────────────────────────────────────────────────────────

function SortHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
  align = 'left',
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  direction: 'asc' | 'desc';
  onSort: (f: SortField) => void;
  align?: 'left' | 'right';
}) {
  const active = currentField === field;
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors
        ${active ? 'text-cult-white' : 'text-cult-text-muted hover:text-cult-silver'}
        ${align === 'right' ? 'ml-auto' : ''}`}
    >
      {label}
      <Icon className="w-3 h-3" />
    </button>
  );
}

// ── Hero Cards ───────────────────────────────────────────────────────────────

function HeroCards({ summary }: { summary: ReturnType<typeof useStrainAnalytics>['summary'] }) {
  const cards = [
    { icon: Dna, label: 'Active Strains', value: summary.totalStrains, sub: `${summary.strainsWithData} with data` },
    { icon: BarChart3, label: 'Cost Profiled', value: summary.strainsWithCost, sub: 'true cost/gram' },
    { icon: Package, label: 'In Demand', value: summary.strainsWithDemand, sub: 'open orders' },
    { icon: AlertTriangle, label: 'At Risk', value: summary.strainsAtRisk, sub: 'tight or critical runway', accent: summary.strainsAtRisk > 0 },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-cult-graphite rounded-cult border border-cult-charcoal p-4">
          <div className="flex items-center gap-2 mb-2">
            <card.icon className={`w-4 h-4 ${card.accent ? 'text-amber-400' : 'text-cult-silver'}`} />
            <span className="text-xs text-cult-text-muted uppercase tracking-wider">{card.label}</span>
          </div>
          <div className={`text-2xl font-bold ${card.accent ? 'text-amber-400' : 'text-cult-white'}`}>
            {card.value}
          </div>
          <div className="text-xs text-cult-text-muted mt-1">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({
  filters,
  setFilters,
  onReload,
}: {
  filters: ReturnType<typeof useStrainAnalytics>['filters'];
  setFilters: ReturnType<typeof useStrainAnalytics>['setFilters'];
  onReload: () => void;
}) {
  const hasActiveFilters = filters.search || filters.dominance || filters.runwayStatus || filters.hasData;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-text-muted" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          placeholder="Search strains..."
          className="w-full pl-9 pr-3 py-2 bg-cult-graphite border border-cult-charcoal rounded-cult text-sm text-cult-white placeholder:text-cult-text-muted focus:outline-none focus:border-cult-silver/40"
        />
      </div>

      {/* Dominance filter */}
      <select
        value={filters.dominance || ''}
        onChange={(e) => setFilters((f) => ({ ...f, dominance: e.target.value || null }))}
        className="px-3 py-2 bg-cult-graphite border border-cult-charcoal rounded-cult text-sm text-cult-white focus:outline-none focus:border-cult-silver/40"
      >
        <option value="">All Types</option>
        <option value="Indica">Indica</option>
        <option value="Indica-Hybrid">Indica-Hybrid</option>
        <option value="Hybrid">Hybrid</option>
        <option value="Sativa-Hybrid">Sativa-Hybrid</option>
        <option value="Sativa">Sativa</option>
      </select>

      {/* Runway status filter */}
      <select
        value={filters.runwayStatus || ''}
        onChange={(e) => setFilters((f) => ({ ...f, runwayStatus: e.target.value || null }))}
        className="px-3 py-2 bg-cult-graphite border border-cult-charcoal rounded-cult text-sm text-cult-white focus:outline-none focus:border-cult-silver/40"
      >
        <option value="">All Runway</option>
        <option value="critical">Critical</option>
        <option value="tight">Tight</option>
        <option value="healthy">Healthy</option>
        <option value="surplus">Surplus</option>
        <option value="no_demand">No Demand</option>
        <option value="no_stock">No Stock</option>
      </select>

      {/* Has data toggle */}
      <button
        onClick={() => setFilters((f) => ({ ...f, hasData: !f.hasData }))}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-cult text-sm border transition-colors ${
          filters.hasData
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            : 'bg-cult-graphite text-cult-text-muted border-cult-charcoal hover:text-cult-silver'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        Has Data
      </button>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={() => setFilters({ search: '', dominance: null, runwayStatus: null, hasData: false })}
          className="flex items-center gap-1 px-2 py-2 text-xs text-cult-text-muted hover:text-cult-silver transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}

      {/* Reload */}
      <button
        onClick={onReload}
        className="p-2 text-cult-text-muted hover:text-cult-silver transition-colors rounded-cult hover:bg-cult-charcoal/50 ml-auto"
        title="Refresh data"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Table Row ────────────────────────────────────────────────────────────────

function StrainRow({ row, onClick }: { row: StrainTableRow; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      className="border-b border-cult-charcoal/50 hover:bg-cult-charcoal/30 cursor-pointer transition-colors group"
    >
      {/* Strain name */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div>
            <div className="text-sm font-medium text-cult-white group-hover:text-emerald-400 transition-colors">
              {row.display_name}
            </div>
            {row.dominance_type && (
              <div className="text-xs text-cult-text-muted">{row.dominance_type}</div>
            )}
          </div>
        </div>
      </td>

      {/* Sessions & confidence */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-cult-silver">{row.total_session_count}</span>
          {confidenceDot(row.conversion_confidence)}
        </div>
      </td>

      {/* Quality: big bud % */}
      <td className="py-3 px-4 text-right">
        <span className="text-sm text-cult-silver">{formatPct(row.avg_big_bud_pct)}</span>
      </td>

      {/* Grade suggestion */}
      <td className="py-3 px-4 text-center">
        {gradeBadge(row.suggested_grade)}
      </td>

      {/* Inventory */}
      <td className="py-3 px-4 text-right">
        <span className="text-sm text-cult-silver">{formatLbs(row.total_sellable_lbs)}</span>
      </td>

      {/* Runway */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 justify-end">
          {row.runway_days !== null && (
            <span className="text-sm text-cult-silver">{row.runway_days}d</span>
          )}
          {runwayBadge(row.runway_status)}
        </div>
      </td>

      {/* Demand */}
      <td className="py-3 px-4 text-right">
        <div>
          <span className="text-sm text-cult-silver">{formatNum(row.demand_total_units)}</span>
          {row.order_count !== null && row.order_count > 0 && (
            <span className="text-xs text-cult-text-muted ml-1">({row.order_count})</span>
          )}
        </div>
      </td>

      {/* Margin */}
      <td className="py-3 px-4 text-right">
        <span className={`text-sm ${row.true_margin_per_gram !== null && row.true_margin_per_gram > 0 ? 'text-emerald-400' : row.true_margin_per_gram !== null ? 'text-rose-400' : 'text-cult-text-muted'}`}>
          {formatCurrency(row.true_margin_per_gram)}
        </span>
      </td>

      {/* Data completeness */}
      <td className="py-3 px-4">
        {completenessBar(row.data_completeness)}
      </td>

      {/* Chevron */}
      <td className="py-3 px-2">
        <ChevronRight className="w-4 h-4 text-cult-text-muted group-hover:text-cult-silver transition-colors" />
      </td>
    </tr>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export function StrainAnalyticsDashboard() {
  const {
    rows,
    loading,
    summary,
    filters,
    setFilters,
    sortField,
    sortDirection,
    handleSort,
    getStrainProfile,
    reload,
  } = useStrainAnalytics();

  const [selectedStrainId, setSelectedStrainId] = useState<string | null>(null);
  const selectedProfile = selectedStrainId ? getStrainProfile(selectedStrainId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cult-text-muted">Loading strain analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8 stagger-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">
          Strain Analytics
        </h1>
        <p className="text-cult-light-gray mt-1">
          Genetics library and production intelligence across {summary.totalStrains} active strains
        </p>
      </div>

      {/* Hero cards */}
      <HeroCards summary={summary} />

      {/* Filter bar */}
      <FilterBar filters={filters} setFilters={setFilters} onReload={reload} />

      {/* Results count */}
      <div className="text-xs text-cult-text-muted">
        Showing {rows.length} of {summary.totalStrains} strains
      </div>

      {/* Table */}
      <div className="bg-cult-graphite rounded-cult border border-cult-charcoal overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cult-charcoal bg-cult-black/30">
                <th className="py-3 px-4 text-left">
                  <SortHeader label="Strain" field="strain_name" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                </th>
                <th className="py-3 px-4 text-left">
                  <SortHeader label="Sessions" field="total_session_count" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                </th>
                <th className="py-3 px-4 text-right">
                  <SortHeader label="Big Bud %" field="avg_big_bud_pct" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" />
                </th>
                <th className="py-3 px-4 text-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-cult-text-muted">Grade</span>
                </th>
                <th className="py-3 px-4 text-right">
                  <SortHeader label="Sellable" field="total_sellable_lbs" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" />
                </th>
                <th className="py-3 px-4 text-right">
                  <SortHeader label="Runway" field="runway_days" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" />
                </th>
                <th className="py-3 px-4 text-right">
                  <SortHeader label="Demand" field="demand_total_units" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" />
                </th>
                <th className="py-3 px-4 text-right">
                  <SortHeader label="Margin/g" field="true_margin_per_gram" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" />
                </th>
                <th className="py-3 px-4">
                  <SortHeader label="Data" field="data_completeness" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                </th>
                <th className="py-3 px-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <StrainRow
                  key={row.strain_id}
                  row={row}
                  onClick={() => setSelectedStrainId(row.strain_id)}
                />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-cult-text-muted">
                    No strains match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {selectedProfile && (
        <StrainDetailPanel
          profile={selectedProfile}
          onClose={() => setSelectedStrainId(null)}
        />
      )}
    </div>
  );
}
