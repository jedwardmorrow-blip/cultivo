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
      <RevenueGoalBanner data={data.revenueGoal} />

      {/* ── KPI Cards ── */}
      <KPIRow data={data.kpi} />

      {/* ── Row 1: Pipeline + Revenue Trend ── */}
      <div className="grid grid-cols-2 gap-4">
        <InventoryFunnel stages={data.funnel} />
        <RevenueChart data={data.monthlyRevenue} />
      </div>

      {/* ── Row 2: Active Orders + Top Customers ── */}
      <div className="grid grid-cols-2 gap-4">
        <ActiveOrdersTable orders={data.orders} onSelectOrder={onSelectOrder} />
        <TopCustomers customers={data.customers} />
      </div>

      {/* ── Row 3: Production + Facility + Strains ── */}
      <div className="grid grid-cols-3 gap-4">
        <ProductionSessions data={data.production} />
        <FacilityStatus
          cultivation={data.cultivation}
          dryRooms={data.dryRooms}
          onViewChange={onViewChange}
        />
        <ActiveStrainsWidget strains={data.activeStrains} />
      </div>

      {/* ── Row 4: Harvest Pipeline + Revenue Projections ── */}
      <div className="grid grid-cols-2 gap-4">
        <HarvestPipeline windows={data.harvestPipeline} />
        <ProjectionChart windows={data.harvestPipeline} />
      </div>

      {/* ── Row 5: Veg Pipeline (full width) ── */}
      {data.vegStrains.length > 0 && (
        <VegPipeline strains={data.vegStrains} />
      )}

      {/* ── Row 6: Weekly Revenue (full width) ── */}
      <WeeklyRevenueChart data={data.weeklyRevenue} />

      {/* ── Footer ── */}
      <div className="text-center py-6 text-cult-text-faint text-[0.625rem] font-light tracking-[1px] uppercase">
        CULT OPS — Built by the operator, for operators · Syn-Ag Inc.
      </div>
    </div>
  );
}
