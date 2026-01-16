import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { settingsService } from '../services';
import type { UseSettingsReturn } from '../types';

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsService.getAllSettings();
      const settingsMap = settingsService.getSettingsMap(data);
      setSettings(settingsMap);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();

    const channel = supabase
      .channel('app-settings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => {
          loadSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSettings]);

  const getSetting = useCallback(
    (key: string, defaultValue: string = ''): string => {
      return settings[key] || defaultValue;
    },
    [settings]
  );

  const getNumberSetting = useCallback(
    (key: string, defaultValue: number = 0): number => {
      return settingsService.parseNumberSetting(settings[key], defaultValue);
    },
    [settings]
  );

  const getBooleanSetting = useCallback(
    (key: string, defaultValue: boolean = false): boolean => {
      return settingsService.parseBooleanSetting(settings[key], defaultValue);
    },
    [settings]
  );

  const updateSetting = useCallback(async (key: string, value: string): Promise<void> => {
    await settingsService.updateSetting(key, value);
  }, []);

  const updateSettings = useCallback(async (updates: Record<string, string>): Promise<void> => {
    await settingsService.updateSettings(updates);
  }, []);

  return {
    settings,
    loading,
    error,
    getSetting,
    getNumberSetting,
    getBooleanSetting,
    updateSetting,
    updateSettings,
    reload: loadSettings
  };
}
