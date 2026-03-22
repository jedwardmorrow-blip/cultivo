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
const DistributionCalendar = lazyRetry(() => import('./features/delivery'), 'DistributionCalendar');
const ProductionDashboard = lazyRetry(() => import('./features/sessions'), 'ProductionDashboard');
const BuckingSessionsRefactored = lazyRetry(() => import('./features/sessions'), 'BuckingSessionsRefactored');
const TrimSessionsRefactored = lazyRetry(() => import('./features/sessions'), 'TrimSessionsRefactored');
const PackagingSessionsRefactored = lazyRetry(() => import('./features/sessions'), 'PackagingSessionsRefactored');
const BatchManagement = lazyRetry(() => import('./features/batches'), 'BatchManagement');
const AllInventoryViewWrapper = lazyRetry(() => import('./features/inventory'), 'AllInventoryViewWrapper');
const BinnedInventoryViewWrapper = lazyRetry(() => import('./features/inventory'), 'BinnedInventoryViewWrapper');
const BuckedInventoryViewWrapper = lazyRetry(() => import('./features/inventory'), 'BuckedInventoryViewWrapper');
const BulkInventoryViewWrapper = lazyRetry(() => import('./features/inventory'), 'BulkInventoryViewWrapper');
const PackagedInventoryViewWrapper = lazyRetry(() => import('./features/inventory'), 'PackagedInventoryViewWrapper');
const DailyActivityViewWrapper = lazyRetry(() => import('./features/inventory'), 'DailyActivityViewWrapper');
const ConversionsViewWrapper = lazyRetry(() => import('./features/inventory'), 'ConversionsViewWrapper');
const ConversionHistoryViewWrapper = lazyRetry(() => import('./features/inventory'), 'ConversionHistoryViewWrapper');
const AuditsViewWrapper = lazyRetry(() => import('./features/inventory'), 'AuditsViewWrapper');
const ConsolidateViewWrapper = lazyRetry(() => import('./features/inventory'), 'ConsolidateViewWrapper');
const Settings = lazyRetry(() => import('./features/settings'), 'Settings');
const AnalyticsDashboard = lazyRetry(() => import('./features/analytics'), 'AnalyticsDashboard');
const EODSummary = lazyRetry(() => import('./features/analytics'), 'EODSummary');
import { CultivationErrorBoundary } from './features/cultivation/components/CultivationErrorBoundary';
const CultivationDashboard = lazyRetry(() => import('./features/cultivation'), 'CultivationDashboard');
const PlantGroupsList = lazyRetry(() => import('./features/cultivation'), 'PlantGroupsList');
const HarvestSessionsList = lazyRetry(() => import('./features/cultivation'), 'HarvestSessionsList');
const BinningSessionsView = lazyRetry(() => import('./features/cultivation'), 'BinningSessionsView');
const GrowRoomsManagement = lazyRetry(() => import('./features/cultivation'), 'GrowRoomsManagement');
const DryRoomsManagement = lazyRetry(() => import('./features/cultivation'), 'DryRoomsManagement');
const DailyTaskBoard = lazyRetry(() => import('./features/cultivation'), 'DailyTaskBoard');
const DailyDigestView = lazyRetry(() => import('./features/cultivation'), 'DailyDigestView');
const CRMDashboard = lazyRetry(() => import('./features/crm'), 'CRMDashboard');
const AccountsList = lazyRetry(() => import('./features/crm'), 'AccountsList');
const AccountDetail = lazyRetry(() => import('./features/crm'), 'AccountDetail');
const SalesQueue = lazyRetry(() => import('./features/crm'), 'SalesQueue');
const VisitCalendar = lazyRetry(() => import('./features/crm'), 'VisitCalendar');
const SalesPipeline = lazyRetry(() => import('./features/crm'), 'SalesPipeline');
const ProspectPipeline = lazyRetry(() => import('./features/crm'), 'ProspectPipeline');
const AccountsHub = lazyRetry(() => import('./features/crm'), 'AccountsHub');
const AccountHealthDashboard = lazyRetry(() => import('./features/crm'), 'AccountHealthDashboard');
const RevenueTrackingDashboard = lazyRetry(() => import('./features/crm'), 'RevenueTrackingDashboard');
const AutomatedTaskEngine = lazyRetry(() => import('./features/crm'), 'AutomatedTaskEngine');
const StorePerformanceScorecard = lazyRetry(() => import('./features/crm'), 'StorePerformanceScorecard');
const RosinLabModule = lazyRetry(() => import('./features/rosin-lab'), 'RosinLabModule');
const ProductionQueue = lazyRetry(() => import('./features/production-queue'), 'ProductionQueue');

function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cult-white" />
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
  const { user, loading } = useAuth();
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

  if (!user) {
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
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard onSelectOrder={handleSelectOrder} />} />
              <Route path="/orders" element={<OrdersContainer key={ordersRefreshKey} onCreateOrder={handleCreateOrder} onSelectOrder={handleSelectOrder} selectedOrderId={selectedOrderId} />} />
              <Route path="/cultivation-dashboard" element={<CultivationErrorBoundary><CultivationDashboard /></CultivationErrorBoundary>} />
              <Route path="/cultivation-plants" element={<CultivationErrorBoundary><PlantGroupsList /></CultivationErrorBoundary>} />
              <Route path="/cultivation-harvest" element={<CultivationErrorBoundary><HarvestSessionsList /></CultivationErrorBoundary>} />
              <Route path="/cultivation-binning" element={<CultivationErrorBoundary><BinningSessionsView /></CultivationErrorBoundary>} />
              <Route path="/cultivation-taskboard" element={<CultivationErrorBoundary><DailyTaskBoard /></CultivationErrorBoundary>} />
              <Route path="/cultivation-digest" element={<CultivationErrorBoundary><DailyDigestView /></CultivationErrorBoundary>} />
              <Route path="/cultivation-rooms" element={<CultivationErrorBoundary><GrowRoomsManagement /></CultivationErrorBoundary>} />
              <Route path="/cultivation-dry-rooms" element={<CultivationErrorBoundary><DryRoomsManagement /></CultivationErrorBoundary>} />
              <Route path="/production-overview" element={<ProductionDashboard />} />
              <Route path="/bucking-sessions" element={<BuckingSessionsRefactored />} />
              <Route path="/trim-sessions" element={<TrimSessionsRefactored />} />
              <Route path="/packaging-sessions" element={<PackagingSessionsRefactored />} />
              <Route path="/production-queue" element={<ProductionQueue />} />
              <Route path="/batches" element={<BatchManagement />} />
              <Route path="/inventory-all" element={<InventoryDataProvider><AllInventoryViewWrapper /></InventoryDataProvider>} />
              <Route path="/inventory-binned" element={<InventoryDataProvider><BinnedInventoryViewWrapper /></InventoryDataProvider>} />
              <Route path="/inventory-bucked" element={<InventoryDataProvider><BuckedInventoryViewWrapper /></InventoryDataProvider>} />
              <Route path="/inventory-bulk" element={<InventoryDataProvider><BulkInventoryViewWrapper /></InventoryDataProvider>} />
              <Route path="/inventory-packaged" element={<InventoryDataProvider><PackagedInventoryViewWrapper /></InventoryDataProvider>} />
              <Route path="/inventory-daily-activity" element={<DailyActivityViewWrapper />} />
              <Route path="/inventory-conversions" element={<ConversionsViewWrapper />} />
              <Route path="/inventory-conversion-history" element={<ConversionHistoryViewWrapper />} />
              <Route path="/inventory-audits" element={<AuditsViewWrapper />} />
              <Route path="/inventory-consolidate" element={<InventoryDataProvider><ConsolidateViewWrapper /></InventoryDataProvider>} />
              <Route path="/delivery" element={<DistributionCalendar onSelectOrder={handleSelectOrder} />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/eod-summary" element={<EODSummary />} />
              <Route path="/crm-dashboard" element={<CRMDashboard onCreateOrder={(customerId: string | null) => customerId ? handleCreateOrderForCustomer(customerId) : setShowNewOrderForm(true)} />} />
              <Route path="/crm-queue" element={<SalesQueue />} />
              <Route path="/crm-visit-calendar" element={<VisitCalendar onSelectOrder={handleSelectOrder} />} />
              <Route path="/crm-pipeline" element={<SalesPipeline />} />
              <Route path="/crm-prospect-pipeline" element={<ProspectPipeline />} />
              <Route path="/crm-tasks" element={<AutomatedTaskEngine />} />
              <Route path="/crm-accounts-hub" element={<AccountsHub />} />
              <Route path="/crm-health" element={<AccountHealthDashboard />} />
              <Route path="/crm-revenue" element={<RevenueTrackingDashboard />} />
              <Route path="/crm-scorecard" element={<StorePerformanceScorecard />} />
              <Route path="/crm-accounts" element={<Navigate to="/crm-accounts-hub" replace />} />
              <Route path="/crm-account-detail/:id" element={<AccountDetailRoute onCreateOrder={handleCreateOrderForCustomer} onCreateSampleOrder={handleCreateSampleOrder} onSelectOrder={handleSelectOrder} />} />
              <Route path="/rosin-lab/*" element={<RosinLabRoute />} />
              <Route path="/settings" element={<Settings />} />
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cult-white" />
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
      
      <Route path="/worker/*" element={<WorkerApp />} />
      
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
