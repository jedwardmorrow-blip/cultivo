import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Test Portal Context
 *
 * Manages the Test Portal - a completely isolated sandbox environment
 * for testing workflows without affecting production data.
 *
 * Architecture:
 * - Production Portal: Shows only production data (test_mode = false)
 * - Test Portal: Shows only test data (test_mode = true)
 * - Portal switching is intentional and obvious
 * - All queries automatically filtered by portal context
 * - All writes automatically tagged with portal context
 *
 * @see docs/TEST-MODE.md for complete documentation
 */

export type Portal = 'production' | 'test';

export interface TestPortalStats {
  test_orders: number;
  test_inventory_items: number;
  test_sessions: number;
  test_movements: number;
  total_audit_entries: number;
  audit_entries_last_24h: number;
}

export interface TestModeAuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  validation_bypassed: string;
  context: Record<string, unknown>;
  created_at: string;
}

interface TestPortalContextValue {
  // Portal state
  currentPortal: Portal;
  isTestPortal: boolean;
  isProductionPortal: boolean;

  // Portal switching
  switchToProduction: () => void;
  switchToTest: () => void;

  // Data filtering
  portalFilter: { test_mode: boolean };
  getTaggedData: <T extends Record<string, any>>(data: T) => T & { test_mode: boolean };

  // Statistics
  stats: TestPortalStats | null;
  isLoadingStats: boolean;
  refreshStats: () => Promise<void>;

  // Audit logging
  logBypass: (action: string, validation: string, context?: Record<string, unknown>) => Promise<void>;

  // Reset operations
  resetTestOrders: () => Promise<void>;
  resetTestInventory: () => Promise<void>;
  resetTestSessions: () => Promise<void>;
  resetAllTestData: () => Promise<void>;
}

const TestPortalContext = createContext<TestPortalContextValue | undefined>(undefined);

interface TestPortalProviderProps {
  children: ReactNode;
}

export function TestPortalProvider({ children }: TestPortalProviderProps) {
  const [currentPortal, setCurrentPortal] = useState<Portal>('production');
  const [stats, setStats] = useState<TestPortalStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  /**
   * Initialize portal from URL query parameter
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const portalParam = params.get('portal');

    if (portalParam === 'test') {
      setCurrentPortal('test');
    } else {
      setCurrentPortal('production');
    }

    // Load stats if in test portal
    if (portalParam === 'test') {
      fetchStats();
    }
  }, []);

  /**
   * Fetch test portal statistics
   */
  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      // Get counts for various test entities
      const [ordersRes, inventoryRes, trimRes, buckingRes, packagingRes, movementsRes, auditRes, audit24hRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('test_mode', true),
        supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('test_mode', true),
        supabase.from('trim_sessions').select('id', { count: 'exact', head: true }).eq('test_mode', true),
        supabase.from('bucking_sessions').select('id', { count: 'exact', head: true }).eq('test_mode', true),
        supabase.from('packaging_sessions').select('id', { count: 'exact', head: true }).eq('test_mode', true),
        supabase.from('inventory_ledger').select('id', { count: 'exact', head: true }).eq('test_mode', true),
        supabase.from('test_mode_audit_log').select('id', { count: 'exact', head: true }),
        supabase.from('test_mode_audit_log')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      setStats({
        test_orders: ordersRes.count || 0,
        test_inventory_items: inventoryRes.count || 0,
        test_sessions: (trimRes.count || 0) + (buckingRes.count || 0) + (packagingRes.count || 0),
        test_movements: movementsRes.count || 0,
        total_audit_entries: auditRes.count || 0,
        audit_entries_last_24h: audit24hRes.count || 0
      });
    } catch (error) {
      console.error('Failed to fetch test portal stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  /**
   * Switch to production portal
   */
  const switchToProduction = () => {
    setCurrentPortal('production');

    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.delete('portal');
    window.history.pushState({}, '', url.toString());

    // Clear stats
    setStats(null);
  };

  /**
   * Switch to test portal
   */
  const switchToTest = () => {
    setCurrentPortal('test');

    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('portal', 'test');
    window.history.pushState({}, '', url.toString());

    // Load stats
    fetchStats();
  };

  /**
   * Refresh statistics
   */
  const refreshStats = async () => {
    if (currentPortal === 'test') {
      await fetchStats();
    }
  };

  /**
   * Log a bypassed validation (only in test portal)
   */
  const logBypass = async (
    action: string,
    validation: string,
    context: Record<string, unknown> = {}
  ) => {
    // Only log if in test portal
    if (currentPortal !== 'test') return;

    try {
      const { error: insertError } = await supabase
        .from('test_mode_audit_log')
        .insert({
          action,
          validation_bypassed: validation,
          context: context as any
        });

      if (insertError) {
        console.error('Failed to log test mode bypass:', insertError);
      }
    } catch (err) {
      console.error('Failed to log test mode bypass:', err);
    }
  };

  /**
   * Reset test orders only
   */
  const resetTestOrders = async () => {
    try {
      // Delete order items first (foreign key constraint)
      await supabase.from('order_items').delete().eq('test_mode', true);

      // Delete orders
      await supabase.from('orders').delete().eq('test_mode', true);

      // Refresh stats
      await refreshStats();
    } catch (error) {
      console.error('Failed to reset test orders:', error);
      throw error;
    }
  };

  /**
   * Reset test inventory only
   */
  const resetTestInventory = async () => {
    try {
      // Delete inventory items
      await supabase.from('inventory_items').delete().eq('test_mode', true);

      // Delete inventory ledger entries
      await supabase.from('inventory_ledger').delete().eq('test_mode', true);

      // Refresh stats
      await refreshStats();
    } catch (error) {
      console.error('Failed to reset test inventory:', error);
      throw error;
    }
  };

  /**
   * Reset test sessions only
   */
  const resetTestSessions = async () => {
    try {
      // Delete all session types
      await supabase.from('trim_sessions').delete().eq('test_mode', true);
      await supabase.from('bucking_sessions').delete().eq('test_mode', true);
      await supabase.from('packaging_sessions').delete().eq('test_mode', true);

      // Refresh stats
      await refreshStats();
    } catch (error) {
      console.error('Failed to reset test sessions:', error);
      throw error;
    }
  };

  /**
   * Reset ALL test data (orders, inventory, sessions, audit logs)
   */
  const resetAllTestData = async () => {
    try {
      // Reset in order to respect foreign keys
      await resetTestOrders();
      await resetTestSessions();
      await resetTestInventory();

      // Delete audit logs
      await supabase.from('test_mode_audit_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Refresh stats
      await refreshStats();
    } catch (error) {
      console.error('Failed to reset all test data:', error);
      throw error;
    }
  };

  // Computed values
  const isTestPortal = currentPortal === 'test';
  const isProductionPortal = currentPortal === 'production';
  const portalFilter = { test_mode: isTestPortal };

  /**
   * Helper to tag data with current portal context
   */
  const getTaggedData = <T extends Record<string, any>>(data: T): T & { test_mode: boolean } => {
    return {
      ...data,
      test_mode: isTestPortal
    };
  };

  const value: TestPortalContextValue = {
    currentPortal,
    isTestPortal,
    isProductionPortal,
    switchToProduction,
    switchToTest,
    portalFilter,
    getTaggedData,
    stats,
    isLoadingStats,
    refreshStats,
    logBypass,
    resetTestOrders,
    resetTestInventory,
    resetTestSessions,
    resetAllTestData
  };

  return (
    <TestPortalContext.Provider value={value}>
      {children}
    </TestPortalContext.Provider>
  );
}

/**
 * Hook to access test portal context
 *
 * @throws Error if used outside TestPortalProvider
 *
 * @example
 * ```tsx
 * function OrdersList() {
 *   const { isTestPortal, portalFilter } = useTestPortal();
 *
 *   // Fetch orders filtered by portal
 *   const { data: orders } = await supabase
 *     .from('orders')
 *     .select('*')
 *     .match(portalFilter);  // Automatically filters by portal!
 *
 *   return (
 *     <div>
 *       {isTestPortal && <TestBadge />}
 *       {orders.map(order => <OrderCard order={order} />)}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * function NewOrderForm() {
 *   const { getTaggedData, logBypass } = useTestPortal();
 *
 *   const handleSubmit = async (orderData) => {
 *     // Automatically tag with test_mode
 *     const taggedOrder = getTaggedData(orderData);
 *
 *     await supabase.from('orders').insert(taggedOrder);
 *
 *     // Log bypass if in test portal
 *     await logBypass('create_order', 'inventory_check', {
 *       order_id: orderData.id
 *     });
 *   };
 * }
 * ```
 */
export function useTestPortal(): TestPortalContextValue {
  const context = useContext(TestPortalContext);

  if (context === undefined) {
    throw new Error('useTestPortal must be used within a TestPortalProvider');
  }

  return context;
}
