import { supabase } from '@/lib/supabase';
import { settingsService } from './settings.service';
import type { LogoVariant, LogoSettings } from '../types';

const LOGO_BUCKET = 'company-assets';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload PNG, JPG, SVG, or WebP images.'
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File size exceeds 5MB limit.'
    };
  }

  return { valid: true };
}

class LogoService {
  async uploadLogo(file: File, variant: LogoVariant): Promise<string> {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${variant}-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(filePath);

    const settingKey = `logo_${variant}_url`;
    await settingsService.updateSetting(settingKey, publicUrl);
    await settingsService.updateSetting('logo_upload_date', new Date().toISOString());

    return publicUrl;
  }

  async deleteLogo(variant: LogoVariant): Promise<void> {
    const settingKey = `logo_${variant}_url`;
    const logoUrl = await settingsService.getSettingValue(settingKey);

    if (logoUrl) {
      try {
        const url = new URL(logoUrl);
        const pathParts = url.pathname.split('/');
        const filePath = pathParts.slice(-2).join('/');

        await supabase.storage.from(LOGO_BUCKET).remove([filePath]);
      } catch (err) {
        console.error('Error deleting logo file:', err);
      }
    }

    await settingsService.updateSetting(settingKey, '');
  }

  async getLogoUrl(variant: LogoVariant): Promise<string> {
    const settingKey = `logo_${variant}_url`;
    return await settingsService.getSettingValue(settingKey, '');
  }

  async getLogoSettings(): Promise<LogoSettings> {
    const settings = await settingsService.getAllSettings();
    const settingsMap = settingsService.getSettingsMap(settings);

    return {
      logo_dark_url: settingsMap.logo_dark_url || '',
      logo_light_url: settingsMap.logo_light_url || '',
      logo_invoice_url: settingsMap.logo_invoice_url || '',
      logo_label_url: settingsMap.logo_label_url || '',
      logo_eye_url: settingsMap.logo_eye_url || '',
      logo_upload_date: settingsMap.logo_upload_date || ''
    };
  }
}

export const logoService = new LogoService();
