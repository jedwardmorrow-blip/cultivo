import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Test Mode Context
 *
 * Provides global test mode state and controls across the application.
 * Test mode enables facility testing and workflow validation by bypassing
 * inventory validations while maintaining audit trails.
 *
 * @see docs/TEST-MODE.md for complete documentation
 */

export interface TestModeAuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  validation_bypassed: string;
  context: Record<string, unknown>;
  created_at: string;
}

export interface TestModeStatus {
  enabled: boolean;
  retention_days: number;
  total_audit_entries: number;
  audit_entries_last_24h: number;
  unique_validations_bypassed: number;
}

interface TestModeContextValue {
  isTestMode: boolean;
  isLoading: boolean;
  error: string | null;
  status: TestModeStatus | null;
  enableTestMode: () => Promise<void>;
  disableTestMode: () => Promise<void>;
  logBypass: (action: string, validation: string, context?: Record<string, unknown>) => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const TestModeContext = createContext<TestModeContextValue | undefined>(undefined);

interface TestModeProviderProps {
  children: ReactNode;
}

export function TestModeProvider({ children }: TestModeProviderProps) {
  const [isTestMode, setIsTestMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TestModeStatus | null>(null);

  /**
   * Fetch current test mode status from database
   */
  const fetchTestModeStatus = async () => {
    try {
      setError(null);

      // Fetch test mode enabled setting
      const { data: enabledSetting, error: fetchError } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'test_mode_enabled')
        .maybeSingle();

      if (fetchError) throw fetchError;

      const isEnabled = enabledSetting?.setting_value === 'true';
      setIsTestMode(isEnabled);

      // Get basic stats for status
      const { count: auditCount } = await supabase
        .from('test_mode_audit_log')
        .select('*', { count: 'exact', head: true });

      const { count: audit24hCount } = await supabase
        .from('test_mode_audit_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      setStatus({
        enabled: isEnabled,
        retention_days: 30,
        total_audit_entries: auditCount || 0,
        audit_entries_last_24h: audit24hCount || 0,
        unique_validations_bypassed: 0
      });
    } catch (err) {
      console.error('Failed to fetch test mode status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsTestMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Enable test mode
   * Only admins can enable test mode
   */
  const enableTestMode = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Update setting in database
      const { error: updateError } = await supabase
        .from('app_settings')
        .update({ setting_value: 'true' })
        .eq('setting_key', 'test_mode_enabled');

      if (updateError) throw updateError;

      // Refresh status
      await fetchTestModeStatus();
    } catch (err) {
      console.error('Failed to enable test mode:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  /**
   * Disable test mode
   * Only admins can disable test mode
   */
  const disableTestMode = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Update setting in database
      const { error: updateError } = await supabase
        .from('app_settings')
        .update({ setting_value: 'false' })
        .eq('setting_key', 'test_mode_enabled');

      if (updateError) throw updateError;

      // Refresh status
      await fetchTestModeStatus();
    } catch (err) {
      console.error('Failed to disable test mode:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  /**
   * Log a bypassed validation
   * Called whenever test mode bypasses a validation
   */
  const logBypass = async (
    action: string,
    validation: string,
    context: Record<string, unknown> = {}
  ) => {
    // Only log if test mode is actually enabled
    if (!isTestMode) return;

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
   * Refresh test mode status
   */
  const refreshStatus = async () => {
    setIsLoading(true);
    await fetchTestModeStatus();
  };

  // Fetch initial status on mount
  useEffect(() => {
    fetchTestModeStatus();
  }, []);

  // Subscribe to test mode setting changes
  useEffect(() => {
    const channel = supabase
      .channel('test_mode_settings')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_settings',
          filter: 'setting_key=eq.test_mode_enabled'
        },
        () => {
          // Refresh status when setting changes
          fetchTestModeStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const value: TestModeContextValue = {
    isTestMode,
    isLoading,
    error,
    status,
    enableTestMode,
    disableTestMode,
    logBypass,
    refreshStatus
  };

  return (
    <TestModeContext.Provider value={value}>
      {children}
    </TestModeContext.Provider>
  );
}

/**
 * Hook to access test mode context
 *
 * @throws Error if used outside TestModeProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isTestMode, logBypass } = useTestMode();
 *
 *   const handleOrder = async () => {
 *     if (isTestMode) {
 *       await logBypass('create_order', 'inventory_check', {
 *         product: 'GSC 3.5g',
 *         requested: 100
 *       });
 *     }
 *     // ... rest of order logic
 *   };
 * }
 * ```
 */
export function useTestMode(): TestModeContextValue {
  const context = useContext(TestModeContext);

  if (context === undefined) {
    throw new Error('useTestMode must be used within a TestModeProvider');
  }

  return context;
}
