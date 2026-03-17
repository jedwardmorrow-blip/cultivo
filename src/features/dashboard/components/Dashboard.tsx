import { Component, ReactNode } from 'react';
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
        <div className="bg-cult-surface-raised border border-cult-accent rounded-cult p-6 animate-fade-in">
          <p className="text-cult-accent text-xs font-semibold uppercase tracking-wider mb-1">{this.props.name} — Error</p>
          <p className="text-cult-text-muted text-xs">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function Dashboard({
  onViewChange,
  onSelectOrder,
}: {
  onViewChange: (view: string) => void;
  onSelectOrder: (orderId: string) => void;
}) {
  const { data, loading, error } = useDashboardData();

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
        <div className="text-cult-accent text-sm">{error || 'Failed to load dashboard'}</div>
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
      <div className="flex justify-between items-start pb-5 border-b border-cult-border mb-4">
        <div>
          <h1 className="text-h1 text-cult-text-primary uppercase tracking-wider">
            <span className="text-cult-accent">CULT</span> OPS
          </h1>
          <p className="text-caption text-cult-text-secondary mt-1 tracking-wider">
            Operations Command Center — CULT Cannabis Cultivation
          </p>
        </div>
        <div className="text-right text-caption text-cult-text-secondary font-light">
          <div className="flex items-center gap-1.5 justify-end">
            <span className="inline-block w-2 h-2 bg-cult-success rounded-full animate-pulse" />
            Live Data
          </div>
          <div className="text-cult-text-muted mt-1">{dateStr} · Production DB</div>
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
      <div className="grid grid-cols-2 gap-4">
        <WidgetBoundary name="InventoryFunnel">
          <InventoryFunnel stages={data.funnel} />
        </WidgetBoundary>
        <WidgetBoundary name="RevenueChart">
          <RevenueChart data={data.monthlyRevenue} />
        </WidgetBoundary>
      </div>

      {/* ── Row 2: Active Orders + Top Customers ── */}
      <div className="grid grid-cols-2 gap-4">
        <WidgetBoundary name="ActiveOrdersTable">
          <ActiveOrdersTable orders={data.orders} onSelectOrder={onSelectOrder} />
        </WidgetBoundary>
        <WidgetBoundary name="TopCustomers">
          <TopCustomers customers={data.customers} />
        </WidgetBoundary>
      </div>

      {/* ── Row 3: Production + Facility + Strains ── */}
      <div className="grid grid-cols-3 gap-4">
        <WidgetBoundary name="ProductionSessions">
          <ProductionSessions data={data.production} />
        </WidgetBoundary>
        <WidgetBoundary name="FacilityStatus">
          <FacilityStatus
            cultivation={data.cultivation}
            dryRooms={data.dryRooms}
            onViewChange={onViewChange}
          />
        </WidgetBoundary>
        <WidgetBoundary name="ActiveStrainsWidget">
          <ActiveStrainsWidget strains={data.activeStrains} />
        </WidgetBoundary>
      </div>

      {/* ── Row 4: Harvest Pipeline + Revenue Projections ── */}
      <div className="grid grid-cols-2 gap-4">
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
      <div className="text-center py-6 text-cult-text-faint text-[0.625rem] font-light tracking-[1px] uppercase">
        CULT OPS — Built by the operator, for operators · Syn-Ag Inc.
      </div>
    </div>
  );
}
