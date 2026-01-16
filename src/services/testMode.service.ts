import { supabase } from '@/lib/supabase';
import type { TestModeAuditEntry, TestModeStatus } from '@/contexts/TestModeContext';

/**
 * Test Mode Service
 *
 * Handles test mode configuration, audit log management, and data cleanup.
 * Provides low-level functions for test mode operations.
 *
 * @see docs/TEST-MODE.md for complete documentation
 */

export interface AuditLogFilters {
  user_id?: string;
  validation_type?: string;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
}

export interface AuditLogStats {
  by_validation: Array<{
    validation_bypassed: string;
    count: number;
  }>;
  by_user: Array<{
    user_id: string;
    count: number;
  }>;
  by_day: Array<{
    date: string;
    count: number;
  }>;
}

class TestModeService {
  /**
   * Get audit log entries with optional filtering
   */
  async getAuditLog(filters: AuditLogFilters = {}): Promise<TestModeAuditEntry[]> {
    let query = supabase
      .from('test_mode_audit_log')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.validation_type) {
      query = query.eq('validation_bypassed', filters.validation_type);
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date.toISOString());
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date.toISOString());
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch audit log:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get audit log statistics
   */
  async getAuditLogStats(days: number = 30): Promise<AuditLogStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('test_mode_audit_log')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('Failed to fetch audit log for stats:', error);
      throw error;
    }

    const entries = data || [];

    // Calculate stats
    const by_validation = this.groupByField(entries, 'validation_bypassed');
    const by_user = this.groupByField(entries, 'user_id');
    const by_day = this.groupByDay(entries);

    return {
      by_validation,
      by_user,
      by_day
    };
  }

  /**
   * Delete audit log entries older than retention period
   */
  async cleanupOldLogs(): Promise<number> {
    const { data, error } = await supabase.rpc('cleanup_old_test_mode_logs');

    if (error) {
      console.error('Failed to cleanup old logs:', error);
      throw error;
    }

    return data || 0;
  }

  /**
   * Delete all audit log entries (admin only)
   */
  async deleteAllLogs(): Promise<number> {
    const { error, count } = await supabase
      .from('test_mode_audit_log')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      console.error('Failed to delete all logs:', error);
      throw error;
    }

    return count || 0;
  }

  /**
   * Export audit log as CSV
   */
  async exportAuditLog(filters: AuditLogFilters = {}): Promise<string> {
    const entries = await this.getAuditLog(filters);

    // CSV header
    const headers = ['Timestamp', 'User ID', 'Action', 'Validation Bypassed', 'Context'];
    const rows = entries.map(entry => [
      entry.created_at,
      entry.user_id || 'N/A',
      entry.action,
      entry.validation_bypassed,
      JSON.stringify(entry.context)
    ]);

    // Build CSV
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Check if test mode is currently enabled
   */
  async isEnabled(): Promise<boolean> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'test_mode_enabled')
      .maybeSingle();

    if (error) {
      console.error('Failed to check test mode status:', error);
      return false;
    }

    return data?.setting_value === 'true';
  }

  /**
   * Get test mode configuration
   */
  async getConfig(): Promise<{ enabled: boolean; retention_days: number }> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['test_mode_enabled', 'test_mode_audit_retention_days']);

    if (error) {
      console.error('Failed to fetch test mode config:', error);
      throw error;
    }

    const config = {
      enabled: false,
      retention_days: 30
    };

    data?.forEach(setting => {
      if (setting.setting_key === 'test_mode_enabled') {
        config.enabled = setting.setting_value === 'true';
      } else if (setting.setting_key === 'test_mode_audit_retention_days') {
        config.retention_days = parseInt(setting.setting_value, 10) || 30;
      }
    });

    return config;
  }

  /**
   * Update retention days
   */
  async updateRetentionDays(days: number): Promise<void> {
    const { error } = await supabase
      .from('app_settings')
      .update({ setting_value: days.toString() })
      .eq('setting_key', 'test_mode_audit_retention_days');

    if (error) {
      console.error('Failed to update retention days:', error);
      throw error;
    }
  }

  // Helper methods

  private groupByField(
    entries: TestModeAuditEntry[],
    field: keyof TestModeAuditEntry
  ): Array<{ [key: string]: string | number }> {
    const grouped = entries.reduce((acc, entry) => {
      const key = String(entry[field] || 'unknown');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([key, count]) => ({ [field]: key, count }))
      .sort((a, b) => (b.count as number) - (a.count as number));
  }

  private groupByDay(entries: TestModeAuditEntry[]): Array<{ date: string; count: number }> {
    const grouped = entries.reduce((acc, entry) => {
      const date = entry.created_at.split('T')[0]; // Get date part only
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const testModeService = new TestModeService();
