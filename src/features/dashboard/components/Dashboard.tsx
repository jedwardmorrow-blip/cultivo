import { Component, ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { RevenueGoalBanner } from './RevenueGoalBanner';
import { KPIRow } from './KPIRow';
import { InventoryFunnel } from './InventoryFunnel';
import { RevenueChart } from './RevenueChart';
import { ActiveOrdersTable } from './ActiveOrdersTable';
import { TopCustomers } from './TopCustomers';
import { ProductionSessions } from './ProductionSessions';
import { FacilityStatus } from './FacilityStatus';
import { ActiveStrainsWidget } from './ActiveStrainsWidget';
import { HarvestPipeline } from './HarvestPipeline';
import { ProjectionChart } from './ProjectionChart';
import { VegPipeline } from './VegPipeline';
import { WeeklyRevenueChart } from './WeeklyRevenueChart';

/* Widget-level error boundary — isolates crashes to one card */
class WidgetBoundary extends Component<{ name: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error(`[Dashboard] Widget "${this.props.name}" crashed:`, error); }
  render() {
    if (this.state.error) {
      return (
        <div className="bg-cult-surface-raised border border-cult-danger rounded-cult p-6 animate-fade-in">
          <p className="text-cult-danger text-xs font-semibold uppercase tracking-wider mb-1">{this.props.name} — Error</p>
          <p className="text-cult-text-muted text-xs">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function useElapsed(since: Date | null): string {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!since) return;
    const id = setInterval(() => setTick(t => t + 1), 15_000);
    return () => clearInterval(id);
  }, [since]);

  if (!since) return '';
  const diffSec = Math.floor((Date.now() - since.getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

export function Dashboard({
  onSelectOrder,
}: {
  onSelectOrder: (orderId: string) => void;
}) {
  const navigate = useNavigate();
  const { data, loading, error, lastUpdated, refresh } = useDashboardData();
  const elapsed = useElapsed(lastUpdated);
  const isStale = lastUpdated ? Date.now() - lastUpdated.getTime() > STALE_THRESHOLD_MS : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="font-sans text-xs text-cult-text-muted tracking-widest animate-pulse uppercase">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cult-danger text-sm">{error || 'Failed to load dashboard'}</div>
      </div>
    );
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-[1440px] mx-auto space-y-4 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 pb-5 border-b border-cult-border mb-4">
        <div>
          <h1 className="text-xl sm:text-h1 text-cult-text-primary uppercase tracking-wider">
            CULT <span className="text-cult-text-secondary font-light">OPS</span>
          </h1>
          <p className="text-xs sm:text-caption text-cult-text-secondary mt-1 tracking-wider">
            Operations Management
          </p>
        </div>
        <div className="text-left sm:text-right text-xs sm:text-caption text-cult-text-secondary font-light">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full animate-pulse ${isStale ? 'bg-yellow-500' : 'bg-cult-success'}`} />
            {isStale ? (
              <span className="text-yellow-500">Stale Data</span>
            ) : (
              'Live Data'
            )}
          </div>
          <div className="text-cult-text-muted mt-1 hidden sm:block">{dateStr} · Production DB</div>
          {elapsed && (
            <div className="flex items-center justify-end gap-2 mt-1">
              <span className="text-cult-text-faint text-xs">Updated {elapsed}</span>
              <button
                onClick={refresh}
                className="text-xs text-cult-text-muted hover:text-cult-text-primary transition-colors underline underline-offset-2"
                title="Refresh dashboard data"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Revenue Goal Banner ── */}
      <WidgetBoundary name="RevenueGoalBanner">
        <RevenueGoalBanner data={data.revenueGoal} />
      </WidgetBoundary>

      {/* ── KPI Cards ── */}
      <WidgetBoundary name="KPIRow">
        <KPIRow data={data.kpi} />
      </WidgetBoundary>

      {/* ── Row 1: Pipeline + Revenue Trend ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <WidgetBoundary name="InventoryFunnel">
          <InventoryFunnel stages={data.funnel} />
        </WidgetBoundary>
        <WidgetBoundary name="RevenueChart">
          <RevenueChart data={data.monthlyRevenue} />
        </WidgetBoundary>
      </div>

      {/* ── Row 2: Active Orders + Top Customers ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <WidgetBoundary name="ActiveOrdersTable">
          <ActiveOrdersTable orders={data.orders} onSelectOrder={onSelectOrder} onViewAll={() => navigate('/orders')} />
        </WidgetBoundary>
        <WidgetBoundary name="TopCustomers">
          <TopCustomers customers={data.customers} />
        </WidgetBoundary>
      </div>

      {/* ── Row 3: Production + Facility + Strains ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <WidgetBoundary name="ProductionSessions">
          <ProductionSessions data={data.production} />
        </WidgetBoundary>
        <WidgetBoundary name="FacilityStatus">
          <FacilityStatus
            cultivation={data.cultivation}
            dryRooms={data.dryRooms}
          />
        </WidgetBoundary>
        <WidgetBoundary name="ActiveStrainsWidget">
          <ActiveStrainsWidget strains={data.activeStrains} />
        </WidgetBoundary>
      </div>

      {/* ── Row 4: Harvest Pipeline + Revenue Projections ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <WidgetBoundary name="HarvestPipeline">
          <HarvestPipeline windows={data.harvestPipeline} />
        </WidgetBoundary>
        <WidgetBoundary name="ProjectionChart">
          <ProjectionChart windows={data.harvestPipeline} />
        </WidgetBoundary>
      </div>

      {/* ── Row 5: Veg Pipeline (full width) ── */}
      {data.vegStrains.length > 0 && (
        <WidgetBoundary name="VegPipeline">
          <VegPipeline strains={data.vegStrains} />
        </WidgetBoundary>
      )}

      {/* ── Row 6: Weekly Revenue (full width) ── */}
      <WidgetBoundary name="WeeklyRevenueChart">
        <WeeklyRevenueChart data={data.weeklyRevenue} />
      </WidgetBoundary>

      {/* ── Footer ── */}
      <div className="text-center py-6 text-cult-text-faint text-xs font-light tracking-[1px] uppercase">
        CULT OPS — Built by the operator, for operators · Syn-Ag Inc.
      </div>
    </div>
  );
}
