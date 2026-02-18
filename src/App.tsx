import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { ErrorBoundary, Layout } from './lib/components';
import { Login, ResetPassword } from './features/auth';
import { CoversheetPublic } from './pages/public/CoversheetPublic';
import { CoversheetLibrary } from './pages/public/CoversheetLibrary';
import { COALibrary } from './pages/public/COALibrary';
import { PublicMenu } from './pages/public/PublicMenu';
import { StandaloneOrderFormRefactored } from './features/order-form';
import { NewOrderForm } from './features/orders';

const Dashboard = lazy(() => import('./features/dashboard').then((m) => ({ default: m.Dashboard })));
const OrdersContainer = lazy(() => import('./features/orders').then((m) => ({ default: m.OrdersContainer })));
const DistributionCalendar = lazy(() => import('./features/delivery').then((m) => ({ default: m.DistributionCalendar })));
const ProductionDashboard = lazy(() => import('./features/sessions').then((m) => ({ default: m.ProductionDashboard })));
const BuckingSessionsRefactored = lazy(() => import('./features/sessions').then((m) => ({ default: m.BuckingSessionsRefactored })));
const TrimSessionsRefactored = lazy(() => import('./features/sessions').then((m) => ({ default: m.TrimSessionsRefactored })));
const PackagingSessionsRefactored = lazy(() => import('./features/sessions').then((m) => ({ default: m.PackagingSessionsRefactored })));
const BatchManagement = lazy(() => import('./features/batches').then((m) => ({ default: m.BatchManagement })));
const AllInventoryViewWrapper = lazy(() => import('./features/inventory').then((m) => ({ default: m.AllInventoryViewWrapper })));
const BinnedInventoryViewWrapper = lazy(() => import('./features/inventory').then((m) => ({ default: m.BinnedInventoryViewWrapper })));
const BuckedInventoryViewWrapper = lazy(() => import('./features/inventory').then((m) => ({ default: m.BuckedInventoryViewWrapper })));
const BulkInventoryViewWrapper = lazy(() => import('./features/inventory').then((m) => ({ default: m.BulkInventoryViewWrapper })));
const PackagedInventoryViewWrapper = lazy(() => import('./features/inventory').then((m) => ({ default: m.PackagedInventoryViewWrapper })));
const DailyActivityViewWrapper = lazy(() => import('./features/inventory').then((m) => ({ default: m.DailyActivityViewWrapper })));
const ConversionsViewWrapper = lazy(() => import('./features/inventory').then((m) => ({ default: m.ConversionsViewWrapper })));
const ConversionHistoryViewWrapper = lazy(() => import('./features/inventory').then((m) => ({ default: m.ConversionHistoryViewWrapper })));
const AuditsViewWrapper = lazy(() => import('./features/inventory').then((m) => ({ default: m.AuditsViewWrapper })));
const Settings = lazy(() => import('./features/settings').then((m) => ({ default: m.Settings })));
const AnalyticsDashboard = lazy(() => import('./features/analytics').then((m) => ({ default: m.AnalyticsDashboard })));
const EODSummary = lazy(() => import('./features/analytics').then((m) => ({ default: m.EODSummary })));
const CultivationDashboard = lazy(() => import('./features/cultivation').then((m) => ({ default: m.CultivationDashboard })));
const PlantGroupsList = lazy(() => import('./features/cultivation').then((m) => ({ default: m.PlantGroupsList })));
const HarvestSessionsList = lazy(() => import('./features/cultivation').then((m) => ({ default: m.HarvestSessionsList })));

function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cult-white" />
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [cloneFromOrder, setCloneFromOrder] = useState<any>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);
  const [isResetPasswordMode, setIsResetPasswordMode] = useState(false);

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
    setCurrentView(view);
    setShowNewOrderForm(false);
    setSelectedOrderId(null);
  }

  function handleCreateOrder(cloneFrom?: any) {
    setCloneFromOrder(cloneFrom || null);
    setShowNewOrderForm(true);
  }

  function handleOrderCreated() {
    setShowNewOrderForm(false);
    setCloneFromOrder(null);
    setCurrentView('orders');
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
        return <HarvestSessionsList />;
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
        return <AllInventoryViewWrapper />;
      case 'inventory-binned':
        return <BinnedInventoryViewWrapper />;
      case 'inventory-bucked':
        return <BuckedInventoryViewWrapper />;
      case 'inventory-bulk':
        return <BulkInventoryViewWrapper />;
      case 'inventory-packaged':
        return <PackagedInventoryViewWrapper />;
      case 'inventory-daily-activity':
        return <DailyActivityViewWrapper />;
      case 'inventory-conversions':
        return <ConversionsViewWrapper />;
      case 'inventory-conversion-history':
        return <ConversionHistoryViewWrapper />;
      case 'inventory-audits':
        return <AuditsViewWrapper />;
      case 'delivery':
        return <DistributionCalendar />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'eod-summary':
        return <EODSummary />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onViewChange={handleViewChange} onSelectOrder={handleSelectOrder} />;
    }
  }

  return (
    <>
      <Layout currentView={currentView} onViewChange={handleViewChange}>
        <Suspense fallback={<ViewFallback />}>
          {renderView()}
        </Suspense>
      </Layout>
      {showNewOrderForm && (
        <NewOrderForm
          onClose={() => { setShowNewOrderForm(false); setCloneFromOrder(null); }}
          onSuccess={handleOrderCreated}
          cloneFrom={cloneFromOrder}
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
