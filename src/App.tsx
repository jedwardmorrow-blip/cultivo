import { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ErrorBoundary, Layout } from './lib/components';
import { Login, ResetPassword } from './features/auth';
import { CoversheetPublic } from './pages/public/CoversheetPublic';
import { CoversheetLibrary } from './pages/public/CoversheetLibrary';
import { COALibrary } from './pages/public/COALibrary';
import { PublicMenu } from './pages/public/PublicMenu';
import { LandingPage } from './pages/public/LandingPage';
import { BerlinLandingPage } from './pages/public/BerlinLandingPage';
import ProductionPlanner from './features/production-planner';
import { StandaloneOrderFormRefactored } from './features/order-form';
import { NewOrderForm } from './features/orders';
import { InventoryDataProvider } from './features/inventory/context/InventoryDataContext';
import { createActivity } from './features/crm/services/crm.service';
import { lazyRetry } from './lib/utils';
import AIChatWidget from './shared/components/AIChatWidget';
import { WorkerAuthProvider, useWorkerAuth } from './features/worker/hooks';
import { PinLoginPage, WorkerLayout, MyTasksView } from './features/worker/components';

const Dashboard = lazyRetry(() => import('./features/dashboard'), 'Dashboard');
const OrdersContainer = lazyRetry(() => import('./features/orders'), 'OrdersContainer');
const DistributionCommandCenter = lazyRetry(() => import('./features/distribution'), 'DistributionCommandCenter');
const DistributionCalendar = lazyRetry(() => import('./features/delivery'), 'DistributionCalendar');
const ProductionDispatchView = lazyRetry(() => import('./features/delivery'), 'ProductionDispatchView');
const OrderFulfillmentView = lazyRetry(() => import('./features/delivery'), 'OrderFulfillmentView');
const DispatchExecutionQueue = lazyRetry(() => import('./features/delivery'), 'DispatchExecutionQueue');
const ProductionDashboard = lazyRetry(() => import('./features/sessions'), 'ProductionDashboard');
const ProductionHub = lazyRetry(() => import('./features/sessions'), 'ProductionHub');
const ProductionCommandCenter = lazyRetry(() => import('./features/sessions'), 'ProductionCommandCenter');
const SessionsHub = lazyRetry(() => import('./features/sessions'), 'SessionsHub');
// Legacy individual session views — routes now redirect to sessions hub
// BuckingSessionsRefactored, TrimSessionsRefactored, PackagingSessionsRefactored
const BatchManagement = lazyRetry(() => import('./features/batches'), 'BatchManagement');
const UnifiedInventoryViewWrapper = lazyRetry(() => import('./features/inventory'), 'UnifiedInventoryViewWrapper');
// Legacy individual stage views — routes now redirect to unified view
// AllInventoryViewWrapper, BinnedInventoryViewWrapper, BuckedInventoryViewWrapper,
// BulkInventoryViewWrapper, PackagedInventoryViewWrapper consolidated into UnifiedInventoryViewWrapper
// DailyActivityViewWrapper removed (stub)
const ConversionsViewWrapper = lazyRetry(() => import('./features/inventory'), 'ConversionsViewWrapper');
const ConversionHistoryViewWrapper = lazyRetry(() => import('./features/inventory'), 'ConversionHistoryViewWrapper');
const AuditsViewWrapper = lazyRetry(() => import('./features/inventory'), 'AuditsViewWrapper');
const ConsolidateViewWrapper = lazyRetry(() => import('./features/inventory'), 'ConsolidateViewWrapper');
const SalesInventoryViewWrapper = lazyRetry(() => import('./features/inventory'), 'SalesInventoryViewWrapper');
const Settings = lazyRetry(() => import('./features/settings'), 'Settings');
const AnalyticsDashboard = lazyRetry(() => import('./features/analytics'), 'AnalyticsDashboard');
const EODSummary = lazyRetry(() => import('./features/analytics'), 'EODSummary');
import { CultivationErrorBoundary } from './features/cultivation/components/CultivationErrorBoundary';
const CultivationDashboard = lazyRetry(() => import('./features/cultivation'), 'CultivationDashboard');
const PlantGroupsList = lazyRetry(() => import('./features/cultivation'), 'PlantGroupsList');
const HarvestSessionsList = lazyRetry(() => import('./features/cultivation'), 'HarvestSessionsList');
const HarvestPipeline = lazyRetry(() => import('./features/cultivation'), 'HarvestPipeline');
const BinningSessionsView = lazyRetry(() => import('./features/cultivation'), 'BinningSessionsView');
const GrowRoomsManagement = lazyRetry(() => import('./features/cultivation'), 'GrowRoomsManagement');
const DryRoomsManagement = lazyRetry(() => import('./features/cultivation'), 'DryRoomsManagement');
const DailyTaskBoard = lazyRetry(() => import('./features/cultivation'), 'DailyTaskBoard');
const SchedulesPage = lazyRetry(() => import('./features/cultivation'), 'SchedulesPage');
const TaskSettingsPage = lazyRetry(() => import('./features/cultivation'), 'TaskSettingsPage');
const DailyDigestView = lazyRetry(() => import('./features/cultivation'), 'DailyDigestView');
const WorkerTaskView = lazyRetry(() => import('./features/cultivation'), 'WorkerTaskView');
const CultivationMapPage = lazyRetry(() => import('./features/cultivation'), 'CultivationMapPage');
const CommandCenter = lazyRetry(() => import('./features/cultivation'), 'CommandCenter');
const ClaudeDesignCanvas = lazyRetry(() => import('./features/cultivation'), 'ClaudeDesignCanvas');
const PlantAuditPage = lazyRetry(() => import('./features/cultivation'), 'PlantAuditPage');
const PerformanceLoop = lazyRetry(() => import('./features/cultivation'), 'PerformanceLoop');
const CRMDashboard = lazyRetry(() => import('./features/crm'), 'CRMDashboard');
const AccountDetail = lazyRetry(() => import('./features/crm'), 'AccountDetail');
const SalesQueue = lazyRetry(() => import('./features/crm'), 'SalesQueue');
const VisitCalendar = lazyRetry(() => import('./features/crm'), 'VisitCalendar');
const SalesPipeline = lazyRetry(() => import('./features/crm'), 'SalesPipeline');
const ProspectPipeline = lazyRetry(() => import('./features/crm'), 'ProspectPipeline');
const AccountsHub = lazyRetry(() => import('./features/crm'), 'AccountsHub');
// Standalone pages consolidated into AccountsHub tabs — routes redirect
// AccountHealthDashboard → AccountsHub Overview tab
// RevenueTrackingDashboard → AccountsHub Revenue tab
// StorePerformanceScorecard → AccountsHub Overview tab
// AutomatedTaskEngine → SalesQueue (merged)
const FinancialDashboard = lazyRetry(() => import('./features/financial'), 'FinancialDashboard');
const VendorBillEntry = lazyRetry(() => import('./features/financial'), 'VendorBillEntry');
const AccountsReceivable = lazyRetry(() => import('./features/financial'), 'AccountsReceivable');
const RosinLabModule = lazyRetry(() => import('./features/rosin-lab'), 'RosinLabModule');
const LabProductionPlanner = lazyRetry(() => import('./features/lab/production-planner'), 'LabProductionPlanner');
const ProductionQueue = lazyRetry(() => import('./features/production-queue'), 'ProductionQueue');
const ProductionPipelineBoard = lazyRetry(() => import('./features/production-queue'), 'ProductionPipelineBoard');
const TicketTriage = lazyRetry(() => import('./features/admin'), 'TicketTriage');
const StrainAnalyticsDashboard = lazyRetry(() => import('./features/strain-analytics'), 'StrainAnalyticsDashboard');
const HubBatchPipeline = lazyRetry(() => import('./features/hub'), 'BatchPipeline');
const HubPipelinePlanner = lazyRetry(() => import('./features/hub'), 'PipelinePlanner');
const HubStrainYieldAnalytics = lazyRetry(() => import('./features/hub'), 'StrainYieldAnalytics');
const COATimelineView = lazyRetry(() => import('./features/hub'), 'COATimelineView');
const CultivationHub = lazyRetry(() => import('./features/cultivation'), 'CultivationHub');
const CultivationTodayView = lazyRetry(() => import('./features/cultivation'), 'CultivationTodayView');
const PostProductionHub = lazyRetry(() => import('./features/hub'), 'PostProductionHub');
const InventoryHub = lazyRetry(() => import('./features/inventory'), 'InventoryHub');
const InventoryCommandCenterWrapper = lazyRetry(() => import('./features/inventory'), 'InventoryCommandCenterWrapper');
const SalesHub = lazyRetry(() => import('./features/crm'), 'SalesHub');
const OperationsHub = lazyRetry(() => import('./features/financial'), 'OperationsHub');
const ExecutiveHub = lazyRetry(() => import('./features/executive'), 'ExecutiveHub');

function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cult-accent" />
    </div>
  );
}

function AccountDetailRoute({ onCreateOrder, onCreateSampleOrder, onSelectOrder }: { onCreateOrder: (customerId: string) => void; onCreateSampleOrder: (customerId: string) => void; onSelectOrder: (orderId: string) => void }) {
  const { id } = useParams<{ id: string }>();
  return <AccountDetail accountId={id!} onCreateOrder={onCreateOrder} onCreateSampleOrder={onCreateSampleOrder} onSelectOrder={onSelectOrder} />;
}

function RosinLabRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const cleanView = location.pathname.replace(/^\//, '') || 'rosin-lab';
  return <RosinLabModule currentView={cleanView} setCurrentView={(v: string) => navigate(`/${v}`)} />;
}

function AuthenticatedApp() {
  const { user, loading, isSales, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [cloneFromOrder, setCloneFromOrder] = useState<any>(null);
  const [preSelectedCustomerId, setPreSelectedCustomerId] = useState<string | null>(null);
  const [sampleMode, setSampleMode] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen bg-cult-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Sandbox escape hatch: /lab/* routes with ?mock=1 bypass auth so the
  // visual prototype renders without a Supabase session. Real-data view
  // still requires sign-in. Confined to ?mock=1 so it can't be hit by
  // accident.
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const isLabMockRoute = location.pathname.startsWith('/lab/') && search.includes('mock=1');

  if (!user && !isLabMockRoute) {
    return <Login />;
  }

  function handleCreateOrder(cloneFrom?: any) {
    setCloneFromOrder(cloneFrom || null);
    setPreSelectedCustomerId(null);
    setSampleMode(false);
    setShowNewOrderForm(true);
  }

  function handleCreateOrderForCustomer(customerId: string) {
    setCloneFromOrder(null);
    setPreSelectedCustomerId(customerId);
    setSampleMode(false);
    setShowNewOrderForm(true);
  }

  function handleCreateSampleOrder(customerId: string) {
    setCloneFromOrder(null);
    setPreSelectedCustomerId(customerId);
    setSampleMode(true);
    setShowNewOrderForm(true);
  }

  function handleOrderCreated(orderData?: { id: string; order_number: string; customer_id: string }) {
    const customerId = preSelectedCustomerId;
    const wasSampleMode = sampleMode;
    setShowNewOrderForm(false);
    setCloneFromOrder(null);
    setPreSelectedCustomerId(null);
    setSampleMode(false);
    setOrdersRefreshKey((k) => k + 1);
    navigate('/orders');

    if (customerId && orderData) {
      createActivity({
        customer_id: customerId,
        activity_type: wasSampleMode ? 'sample' : 'note',
        subject: wasSampleMode ? 'Sample order sent' : 'Order created',
        body: `Order ${orderData.order_number} ${wasSampleMode ? 'sent as sample' : 'created'} from account view`,
        linked_order_id: orderData.id,
      });
    }
  }

  function handleSelectOrder(orderId: string) {
    setSelectedOrderId(orderId);
    navigate('/orders');
  }

  return (
    <>
      <Layout>
        <ErrorBoundary resetKeys={[location.pathname]}>
          <Suspense fallback={<ViewFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to={isSales && !isAdmin && !isManager ? '/crm-inventory' : '/dashboard'} replace />} />
              <Route path="/dashboard" element={isSales && !isAdmin && !isManager ? <Navigate to="/crm-inventory" replace /> : <Dashboard onSelectOrder={handleSelectOrder} />} />
              <Route path="/orders" element={<OrdersContainer key={ordersRefreshKey} onCreateOrder={handleCreateOrder} onSelectOrder={handleSelectOrder} selectedOrderId={selectedOrderId} />} />
              <Route path="/cultivation-dashboard" element={<CultivationErrorBoundary><CultivationDashboard /></CultivationErrorBoundary>} />
              <Route path="/cultivation-plants" element={<CultivationErrorBoundary><PlantGroupsList /></CultivationErrorBoundary>} />
              <Route path="/cultivation-harvest" element={<CultivationErrorBoundary><HarvestPipeline /></CultivationErrorBoundary>} />
              <Route path="/cultivation-plant-audit" element={<CultivationErrorBoundary><PlantAuditPage /></CultivationErrorBoundary>} />
              <Route path="/cultivation-performance" element={<CultivationErrorBoundary><PerformanceLoop /></CultivationErrorBoundary>} />
              <Route path="/cultivation-binning" element={<Navigate to="/cultivation-harvest" replace />} />
              <Route path="/cultivation-schedules" element={<CultivationErrorBoundary><SchedulesPage /></CultivationErrorBoundary>} />
              <Route path="/cultivation-task-settings" element={<CultivationErrorBoundary><TaskSettingsPage /></CultivationErrorBoundary>} />
              <Route path="/cultivation-taskboard" element={<CultivationErrorBoundary><DailyTaskBoard /></CultivationErrorBoundary>} />
              <Route path="/cultivation-digest" element={<CultivationErrorBoundary><DailyDigestView /></CultivationErrorBoundary>} />
              <Route path="/cultivation-map" element={<CultivationErrorBoundary><CultivationMapPage /></CultivationErrorBoundary>} />
              <Route path="/cultivation-command-center" element={<CultivationErrorBoundary><CommandCenter /></CultivationErrorBoundary>} />
              <Route path="/lab/production-planner" element={<LabProductionPlanner />} />
              <Route path="/cultivation-command" element={<Navigate to="/cultivation-command-center" replace />} />
              <Route path="/worker-tasks" element={<CultivationErrorBoundary><WorkerTaskView /></CultivationErrorBoundary>} />
              <Route path="/cultivation-rooms" element={<CultivationErrorBoundary><GrowRoomsManagement /></CultivationErrorBoundary>} />
              <Route path="/cultivation-dry-rooms" element={<CultivationErrorBoundary><DryRoomsManagement /></CultivationErrorBoundary>} />
              <Route path="/production-overview" element={<ProductionCommandCenter />} />
              <Route path="/production-dashboard-legacy" element={<ProductionDashboard />} />
              <Route path="/production-sessions" element={<SessionsHub />} />
              <Route path="/bucking-sessions" element={<Navigate to="/production-sessions?tab=bucking" replace />} />
              <Route path="/trim-sessions" element={<Navigate to="/production-sessions?tab=trim" replace />} />
              <Route path="/packaging-sessions" element={<Navigate to="/production-sessions?tab=packaging" replace />} />
              <Route path="/production-queue" element={<ProductionQueue />} />
              <Route path="/production-pipeline" element={<ProductionPipelineBoard />} />
              <Route path="/batches" element={<HubBatchPipeline />} />
              <Route path="/batches/list" element={<BatchManagement />} />
              <Route path="/inventory-all" element={<InventoryDataProvider><UnifiedInventoryViewWrapper /></InventoryDataProvider>} />
              <Route path="/inventory-conversions" element={<ConversionsViewWrapper />} />
              <Route path="/inventory-conversion-history" element={<ConversionHistoryViewWrapper />} />
              <Route path="/inventory-audits" element={<AuditsViewWrapper />} />
              <Route path="/inventory-consolidate" element={<InventoryDataProvider><ConsolidateViewWrapper /></InventoryDataProvider>} />
              <Route path="/distribution-command-center" element={<DistributionCommandCenter />} />
              <Route path="/delivery" element={<DistributionCalendar onSelectOrder={handleSelectOrder} />} />
              <Route path="/production-dispatch" element={<OrderFulfillmentView />} />
              <Route path="/production-dispatch-legacy" element={<ProductionDispatchView />} />
              <Route path="/dispatch-queue" element={<DispatchExecutionQueue />} />
              <Route path="/financial" element={<FinancialDashboard />} />
              <Route path="/financial-ar" element={<AccountsReceivable />} />
              <Route path="/financial-ap" element={<VendorBillEntry />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/strain-analytics" element={<StrainAnalyticsDashboard />} />
              <Route path="/hub" element={<HubBatchPipeline />} />
              <Route path="/pipeline-planner" element={<HubPipelinePlanner />} />
              <Route path="/hub-strain-analytics" element={<HubStrainYieldAnalytics />} />
              <Route path="/coa-timeline" element={<COATimelineView />} />
              <Route path="/cultivation-hub" element={<Navigate to="/cultivation-command-center" replace />} />
              <Route path="/cultivation-analytics" element={<Navigate to="/cultivation-command-center" replace />} />
              <Route path="/post-production-hub" element={<PostProductionHub />} />
              <Route path="/inventory-command-center" element={<InventoryCommandCenterWrapper />} />
              <Route path="/inventory-hub" element={<Navigate to="/inventory-command-center" replace />} />
              <Route path="/sales-hub" element={<SalesHub />} />
              <Route path="/operations-hub" element={<OperationsHub />} />
              <Route path="/executive-hub" element={<ExecutiveHub />} />
              <Route path="/eod-summary" element={<EODSummary />} />
              <Route path="/crm-inventory" element={<SalesInventoryViewWrapper />} />
              <Route path="/crm-dashboard" element={<CRMDashboard onCreateOrder={(customerId: string | null) => customerId ? handleCreateOrderForCustomer(customerId) : setShowNewOrderForm(true)} />} />
              <Route path="/crm-queue" element={<SalesQueue />} />
              <Route path="/crm-visit-calendar" element={<VisitCalendar onSelectOrder={handleSelectOrder} />} />
              <Route path="/crm-pipeline" element={<SalesPipeline />} />
              <Route path="/crm-prospect-pipeline" element={<ProspectPipeline />} />
              <Route path="/crm-tasks" element={<Navigate to="/crm-queue" replace />} />
              <Route path="/crm-accounts-hub" element={<AccountsHub />} />
              <Route path="/crm-health" element={<Navigate to="/crm-accounts-hub" replace />} />
              <Route path="/crm-revenue" element={<Navigate to="/crm-accounts-hub" replace />} />
              <Route path="/crm-scorecard" element={<Navigate to="/crm-accounts-hub" replace />} />
              <Route path="/crm-accounts" element={<Navigate to="/crm-accounts-hub" replace />} />
              <Route path="/crm-account-detail/:id" element={<AccountDetailRoute onCreateOrder={handleCreateOrderForCustomer} onCreateSampleOrder={handleCreateSampleOrder} onSelectOrder={handleSelectOrder} />} />
              <Route path="/rosin-lab/*" element={<RosinLabRoute />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/tickets" element={<TicketTriage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Layout>
      {showNewOrderForm && (
        <NewOrderForm
          onClose={() => { setShowNewOrderForm(false); setCloneFromOrder(null); setPreSelectedCustomerId(null); setSampleMode(false); }}
          onSuccess={handleOrderCreated}
          cloneFrom={cloneFromOrder}
          preSelectedCustomerId={preSelectedCustomerId || undefined}
          sampleMode={sampleMode}
        />
      )}
      <AIChatWidget />
    </>
  );
}

function WorkerAppContent() {
  const { staff, loading } = useWorkerAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cult-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cult-accent" />
      </div>
    );
  }

  if (!staff) {
    return <PinLoginPage />;
  }

  return (
    <WorkerLayout>
      <MyTasksView />
    </WorkerLayout>
  );
}

function WorkerApp() {
  return (
    <ErrorBoundary>
      <WorkerAuthProvider>
        <WorkerAppContent />
      </WorkerAuthProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('order') === 'new') {
      setIsStandaloneMode(true);
    }
  }, []);

  if (isStandaloneMode) {
    return <StandaloneOrderFormRefactored />;
  }

  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/coversheet" element={<CoversheetPublic />} />
      <Route path="/coversheet-library" element={<CoversheetLibrary />} />
      <Route path="/coa-library" element={<COALibrary />} />
      <Route path="/menu" element={<PublicMenu />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/berlin" element={<BerlinLandingPage />} />
      <Route path="/production-planner" element={<ProductionPlanner />} />
      
      <Route path="/worker/*" element={<WorkerApp />} />

      {import.meta.env.DEV && (
        <Route path="/claude-design-canvas" element={<Suspense fallback={<ViewFallback />}><ClaudeDesignCanvas /></Suspense>} />
      )}

      <Route path="/*" element={<AuthenticatedApp />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
