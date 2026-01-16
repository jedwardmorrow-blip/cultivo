import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { ErrorBoundary, Layout } from './lib/components';
import { Dashboard } from './features/dashboard';
import { OrdersContainer, NewOrderForm } from './features/orders';
import { DistributionCalendar } from './features/delivery';
import { SessionsUnified, TrimSessionsRefactored, PackagingSessionsRefactored } from './features/sessions';
import {
  InventoryManagementSidebar,
  AllInventoryViewWrapper,
  BinnedInventoryViewWrapper,
  BuckedInventoryViewWrapper,
  BulkInventoryViewWrapper,
  PackagedInventoryViewWrapper,
  DailyActivityViewWrapper,
  ConversionsViewWrapper,
  ConversionHistoryViewWrapper,
  AuditsViewWrapper,
} from './features/inventory';
import { Settings } from './features/settings';
import { StandaloneOrderFormRefactored } from './features/order-form';
import { Login, ResetPassword } from './features/auth';
import { AnalyticsDashboard, EODSummary } from './features/analytics';
import { CoversheetPublic } from './pages/public/CoversheetPublic';
import { COALibrary } from './pages/public/COALibrary';
import { PublicMenu } from './pages/public/PublicMenu';
import { BatchManagement } from './features/batches';
import { TestModeProvider } from './contexts/TestModeContext';
import { TestPortalProvider } from './contexts/TestPortalContext';
import { TestPortalDashboard } from './pages/TestPortalDashboard';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
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

  function handleCreateOrder() {
    setShowNewOrderForm(true);
  }

  function handleOrderCreated() {
    setShowNewOrderForm(false);
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
      case 'sessions':
        return <SessionsUnified />;
      case 'trim-sessions':
        return <TrimSessionsRefactored />;
      case 'packaging-sessions':
        return <PackagingSessionsRefactored />;
      case 'batches':
        return <BatchManagement />;
      case 'inventory':
        return <InventoryManagementSidebar />;
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
      case 'test-portal':
        return <TestPortalDashboard />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onViewChange={handleViewChange} onSelectOrder={handleSelectOrder} />;
    }
  }

  return (
    <>
      <Layout currentView={currentView} onViewChange={handleViewChange}>
        {renderView()}
      </Layout>
      {showNewOrderForm && (
        <NewOrderForm
          onClose={() => setShowNewOrderForm(false)}
          onSuccess={handleOrderCreated}
        />
      )}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <TestModeProvider>
          <TestPortalProvider>
            <AppContent />
          </TestPortalProvider>
        </TestModeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
