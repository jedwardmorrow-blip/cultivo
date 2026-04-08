import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

const Dashboard = lazy(() => import('./features/dashboard').then(m => ({ default: m.Dashboard })));
const OrdersContainer = lazy(() => import('./features/orders').then(m => ({ default: m.OrdersContainer })));
const ProductionCommandCenter = lazy(() => import('./features/sessions').then(m => ({ default: m.ProductionCommandCenter })));
const SessionsUnified = lazy(() => import('./features/sessions').then(m => ({ default: m.SessionsUnified })));
const TrimSessions = lazy(() => import('./features/sessions').then(m => ({ default: m.TrimSessionsRefactored })));
const PackagingSessions = lazy(() => import('./features/sessions').then(m => ({ default: m.PackagingSessionsRefactored })));
const BatchManagement = lazy(() => import('./features/batches').then(m => ({ default: m.BatchManagement })));
const InventoryOversightDashboard = lazy(() => import('./features/inventory').then(m => ({ default: m.InventoryOversightDashboard })));
const DistributionCalendar = lazy(() => import('./features/delivery').then(m => ({ default: m.DistributionCalendar })));
const AnalyticsDashboard = lazy(() => import('./features/analytics').then(m => ({ default: m.AnalyticsDashboard })));
const PipelinePlanner = lazy(() => import('./features/hub').then(m => ({ default: m.PipelinePlanner })));
const BatchPipeline = lazy(() => import('./features/hub').then(m => ({ default: m.BatchPipeline })));
const StrainYieldAnalytics = lazy(() => import('./features/hub').then(m => ({ default: m.StrainYieldAnalytics })));
const EODSummary = lazy(() => import('./features/analytics').then(m => ({ default: m.EODSummary })));
const Settings = lazy(() => import('./features/settings').then(m => ({ default: m.Settings })));
const StandaloneOrderForm = lazy(() => import('./features/order-form').then(m => ({ default: m.StandaloneOrderFormRefactored })));
const CoversheetPublic = lazy(() => import('./pages/public/CoversheetPublic').then(m => ({ default: m.CoversheetPublic })));
const CoversheetLibrary = lazy(() => import('./pages/public/CoversheetLibrary').then(m => ({ default: m.CoversheetLibrary })));
const COALibrary = lazy(() => import('./pages/public/COALibrary').then(m => ({ default: m.COALibrary })));
const PublicMenu = lazy(() => import('./pages/public/PublicMenu').then(m => ({ default: m.PublicMenu })));

export const publicRoutes: RouteObject[] = [
  {
    path: '/order',
    element: <StandaloneOrderForm />,
  },
  {
    path: '/coversheet',
    element: <CoversheetPublic />,
  },
  {
    path: '/coversheet-library',
    element: <CoversheetLibrary />,
  },
  {
    path: '/coa-library',
    element: <COALibrary />,
  },
  {
    path: '/menu',
    element: <PublicMenu />,
  },
];

export const protectedRoutes: RouteObject[] = [
  {
    path: '/',
    element: <Dashboard />,
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    path: '/orders',
    element: <OrdersContainer />,
  },
  {
    path: '/production',
    element: <ProductionCommandCenter />,
  },
  {
    path: '/sessions',
    element: <SessionsUnified />,
  },
  {
    path: '/trim-sessions',
    element: <TrimSessions />,
  },
  {
    path: '/packaging-sessions',
    element: <PackagingSessions />,
  },
  {
    path: '/batches',
    element: <BatchManagement />,
  },
  {
    path: '/inventory-oversight',
    element: <InventoryOversightDashboard />,
  },
  {
    path: '/delivery',
    element: <DistributionCalendar />,
  },
  {
    path: '/pipeline-planner',
    element: <PipelinePlanner />,
  },
  {
    path: '/hub',
    element: <BatchPipeline />,
  },
  {
    path: '/hub-strain-analytics',
    element: <StrainYieldAnalytics />,
  },
  {
    path: '/analytics',
    element: <AnalyticsDashboard />,
  },
  {
    path: '/eod-summary',
    element: <EODSummary />,
  },
  {
    path: '/settings',
    element: <Settings />,
  },
];
