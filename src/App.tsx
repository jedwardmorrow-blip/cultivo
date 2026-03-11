import { useState, useEffect, Suspense } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { ErrorBoundary, Layout } from './lib/components';
import { Login, ResetPassword } from './features/auth';
import { CoversheetPublic } from './pages/public/CoversheetPublic';
import { CoversheetLibrary } from './pages/public/CoversheetLibrary';
import { COALibrary } from './pages/public/COALibrary';
import { PublicMenu } from './pages/public/PublicMenu';
import { StandaloneOrderFormRefactored } from './features/order-form';
import { NewOrderForm } from './features/orders';
import { InventoryDataProvider } from './features/inventory/context/InventoryDataContext';
import { createActivity } from './features/crm/services/crm.service';
import { lazyRetry } from './lib/utils';

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
const Settings = lazyRetry(() => import('./features/settings'), 'Settings');
const AnalyticsDashboard = lazyRetry(() => import('./features/analytics'), 'AnalyticsDashboard');
const EODSummary = lazyRetry(() => import('./features/analytics'), 'EODSummary');
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
const AccountHealthDashboard = lazyRetry(() => import('./features/crm'), 'AccountHealthDashboard');
const VisitCadenceDashboard = lazyRetry(() => import('./features/crm'), 'VisitCadenceDashboard');
const RevenueTrackingDashboard = lazyRetry(() => import('./features/crm'), 'RevenueTrackingDashboard');
const AutomatedTaskEngine = lazyRetry(() => import('./features/crm'), 'AutomatedTaskEngine');
const RosinLabModule = lazyRetry(() => import('./features/rosin-lab'), 'RosinLabModule');

function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cult-white" />
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'dashboard';
  });
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [cloneFromOrder, setCloneFromOrder] = useState<any>(null);
  const [preSelectedCustomerId, setPreSelectedCustomerId] = useState<string | null>(null);
  const [sampleMode, setSampleMode] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);
  const [isResetPasswordMode, setIsResetPasswordMode] = useState(false);
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('order') === 'new') {
      setIsStandaloneMode(true);
    }
    const path = window.location.pathname;
    if (path === '/reset-password') {
      setIsResetPasswordMode(true);
    }
    if (path === '/coversheet') {
      setCurrentView('public-coversheet');
    }
    if (path === '/coversheet-library') {
      setCurrentView('public-coversheet-library');
    }
    if (path === '/coa-library') {
      setCurrentView('public-coa');
    }
    if (path === '/menu') {
      setCurrentView('public-menu');
    }
  }, []);

  // Sync URL hash ↔ currentView for shareable deep-links & browser back/forward
  useEffect(() => {
    const newHash = currentView === 'dashboard' ? '' : currentView;
    if (window.location.hash.replace('#', '') !== newHash) {
      window.history.replaceState(null, '', newHash ? `#${newHash}` : window.location.pathname);
    }
  }, [currentView]);

  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash !== currentView) {
        setCurrentView(hash);
      } else if (!hash && currentView !== 'dashboard') {
        setCurrentView('dashboard');
      }
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [currentView]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cult-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (isResetPasswordMode) {
    return <ResetPassword />;
  }

  if (currentView === 'public-coversheet') {
    return <CoversheetPublic />;
  }
  if (currentView === 'public-coversheet-library') {
    return <CoversheetLibrary />;
  }
  if (currentView === 'public-coa') {
    return <COALibrary />;
  }
  if (currentView === 'public-menu') {
    return <PublicMenu />;
  }

  if (isStandaloneMode) {
    return <StandaloneOrderFormRefactored />;
  }

  if (!user) {
    return <Login />;
  }

  function handleViewChange(view: string) {
    const newHash = view === 'dashboard' ? '' : view;
    window.history.pushState(null, '', newHash ? `#${newHash}` : window.location.pathname);
    setCurrentView(view);
    setShowNewOrderForm(false);
    setSelectedOrderId(null);
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
    setCurrentView('orders');

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
    setCurrentView('orders');
  }

  function renderView() {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={handleViewChange} onSelectOrder={handleSelectOrder} />;
      case 'orders':
        return (
          <OrdersContainer
            key={ordersRefreshKey}
            onCreateOrder={handleCreateOrder}
            onSelectOrder={handleSelectOrder}
            selectedOrderId={selectedOrderId}
          />
        );
      case 'cultivation-dashboard':
        return <CultivationDashboard />;
      case 'cultivation-plants':
        return <PlantGroupsList />;
      case 'cultivation-harvest':
        return <HarvestSessionsList onViewChange={handleViewChange} />;
      case 'cultivation-binning':
        return <BinningSessionsView onViewChange={handleViewChange} />;
      case 'cultivation-taskboard':
        return <DailyTaskBoard />;
      case 'cultivation-digest':
        return <DailyDigestView />;
      case 'cultivation-rooms':
        return <GrowRoomsManagement />;
      case 'cultivation-dry-rooms':
        return <DryRoomsManagement />;
      case 'production-overview':
        return <ProductionDashboard onViewChange={handleViewChange} />;
      case 'bucking-sessions':
        return <BuckingSessionsRefactored />;
      case 'trim-sessions':
        return <TrimSessionsRefactored />;
      case 'packaging-sessions':
        return <PackagingSessionsRefactored />;
      case 'batches':
        return <BatchManagement />;
      case 'inventory-all':
        return <InventoryDataProvider><AllInventoryViewWrapper /></InventoryDataProvider>;
      case 'inventory-binned':
        return <InventoryDataProvider><BinnedInventoryViewWrapper /></InventoryDataProvider>;
      case 'inventory-bucked':
        return <InventoryDataProvider><BuckedInventoryViewWrapper /></InventoryDataProvider>;
      case 'inventory-bulk':
        return <InventoryDataProvider><BulkInventoryViewWrapper /></InventoryDataProvider>;
      case 'inventory-packaged':
        return <InventoryDataProvider><PackagedInventoryViewWrapper /></InventoryDataProvider>;
      case 'inventory-daily-activity':
        return <DailyActivityViewWrapper />;
      case 'inventory-conversions':
        return <ConversionsViewWrapper />;
      case 'inventory-conversion-history':
        return <ConversionHistoryViewWrapper />;
      case 'inventory-audits':
        return <AuditsViewWrapper />;
      case 'delivery':
        return <DistributionCalendar onSelectOrder={handleSelectOrder} />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'eod-summary':
        return <EODSummary />;
      case 'crm-dashboard':
        return <CRMDashboard onViewChange={handleViewChange} onCreateOrder={(customerId) => customerId ? handleCreateOrderForCustomer(customerId) : setShowNewOrderForm(true)} />;
      case 'crm-queue':
        return <SalesQueue />;
      case 'crm-visit-calendar':
        return <VisitCalendar onSelectOrder={handleSelectOrder} />;
      case 'crm-pipeline':
        return <SalesPipeline />;
      case 'crm-prospect-pipeline':
        return <ProspectPipeline onViewChange={handleViewChange} />;
      case 'crm-health':
        return <AccountHealthDashboard onViewChange={handleViewChange} />;
      case 'crm-cadence':
        return <VisitCadenceDashboard onViewChange={handleViewChange} />;
      case 'crm-revenue':
        return <RevenueTrackingDashboard onViewChange={handleViewChange} />;
      case 'crm-tasks':
        return <AutomatedTaskEngine onViewChange={handleViewChange} />;
      case 'crm-accounts':
        return <AccountsList onViewChange={handleViewChange} />;
      case 'settings':
        return <Settings />;
      default:
        if (currentView.startsWith('crm-account-detail:')) {
          const acctId = currentView.replace('crm-account-detail:', '');
          return <AccountDetail accountId={acctId} onViewChange={handleViewChange} onCreateOrder={handleCreateOrderForCustomer} onCreateSampleOrder={handleCreateSampleOrder} onSelectOrder={handleSelectOrder} />;
        }
        if (currentView === 'rosin-lab' || currentView.startsWith('rosin-lab-')) {
          return <RosinLabModule setCurrentView={handleViewChange} currentView={currentView} />;
        }
        return <Dashboard onViewChange={handleViewChange} onSelectOrder={handleSelectOrder} />;
    }
  }

  return (
    <>
      <Layout currentView={currentView} onViewChange={handleViewChange}>
        <ErrorBoundary resetKeys={[currentView]}>
          <Suspense fallback={<ViewFallback />}>
            {renderView()}
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
    </>
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
