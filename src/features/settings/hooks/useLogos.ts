import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logoService } from '../services';
import type { UseLogosReturn, LogoVariant, LogoSettings } from '../types';

const EMPTY_LOGOS: LogoSettings = {
  logo_dark_url: '',
  logo_light_url: '',
  logo_invoice_url: '',
  logo_label_url: '',
  logo_eye_url: '',
  logo_upload_date: ''
};

export function useLogos(): UseLogosReturn {
  const [logos, setLogos] = useState<LogoSettings>(EMPTY_LOGOS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadLogos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await logoService.getLogoSettings();
      setLogos(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading logos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogos();

    const channel = supabase
      .channel('logo-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
          filter: 'setting_key=like.logo_%'
        },
        () => {
          loadLogos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadLogos]);

  const getLogoUrl = useCallback(
    (variant: LogoVariant): string => {
      const key = `logo_${variant}_url` as keyof LogoSettings;
      return logos[key] || '';
    },
    [logos]
  );

  const uploadLogo = useCallback(async (file: File, variant: LogoVariant): Promise<string> => {
    return await logoService.uploadLogo(file, variant);
  }, []);

  const deleteLogo = useCallback(async (variant: LogoVariant): Promise<void> => {
    await logoService.deleteLogo(variant);
  }, []);

  return {
    logos,
    loading,
    error,
    getLogoUrl,
    uploadLogo,
    deleteLogo,
    reload: loadLogos
  };
}
