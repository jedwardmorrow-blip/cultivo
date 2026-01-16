import { supabase } from '@/lib/supabase';
import type { AppSetting, AppSettingInsert, AppSettingUpdate } from '../types';

/**
 * Settings Service
 *
 * Manages application settings stored in the app_settings table.
 * Settings are organized by category (company, routing, invoicing, etc.)
 *
 * @module settingsService
 */

class SettingsService {
  /**
   * Fetches all application settings
   *
   * @returns Promise<AppSetting[]> - All settings ordered by category and key
   */
  async getAllSettings(): Promise<AppSetting[]> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .order('category, setting_key');

    if (error) {
      throw new Error(`Failed to fetch settings: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Fetches settings for a specific category
   *
   * @param category - Setting category (e.g., 'company', 'routing')
   * @returns Promise<AppSetting[]> - Settings for the category
   */
  async getSettingsByCategory(category: string): Promise<AppSetting[]> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('category', category)
      .order('setting_key');

    if (error) {
      throw new Error(`Failed to fetch settings for category ${category}: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Fetches a single setting by key
   *
   * @param key - Setting key
   * @returns Promise<AppSetting | null> - Setting or null if not found
   */
  async getSetting(key: string): Promise<AppSetting | null> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('setting_key', key)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch setting ${key}: ${error.message}`);
    }

    return data;
  }

  async getSettingValue(key: string, defaultValue: string = ''): Promise<string> {
    const setting = await this.getSetting(key);
    return setting?.setting_value || defaultValue;
  }

  async updateSetting(key: string, value: string): Promise<void> {
    const existing = await this.getSetting(key);

    if (existing) {
      const { error } = await supabase
        .from('app_settings')
        .update({
          setting_value: value,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', key);

      if (error) {
        throw new Error(`Failed to update setting ${key}: ${error.message}`);
      }
    } else {
      const { error } = await supabase
        .from('app_settings')
        .insert({
          setting_key: key,
          setting_value: value,
          setting_type: 'text',
          category: 'general'
        });

      if (error) {
        throw new Error(`Failed to create setting ${key}: ${error.message}`);
      }
    }
  }

  async updateSettings(updates: Record<string, string>): Promise<void> {
    const promises = Object.entries(updates).map(([key, value]) =>
      this.updateSetting(key, value)
    );

    await Promise.all(promises);
  }

  async createSetting(data: AppSettingInsert): Promise<AppSetting> {
    const { data: created, error } = await supabase
      .from('app_settings')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create setting: ${error.message}`);
    }

    return created;
  }

  async deleteSetting(key: string): Promise<void> {
    const { error } = await supabase
      .from('app_settings')
      .delete()
      .eq('setting_key', key);

    if (error) {
      throw new Error(`Failed to delete setting ${key}: ${error.message}`);
    }
  }

  getSettingsMap(settings: AppSetting[]): Record<string, string> {
    const map: Record<string, string> = {};
    settings.forEach(setting => {
      map[setting.setting_key] = setting.setting_value;
    });
    return map;
  }

  parseNumberSetting(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  parseBooleanSetting(value: string | undefined, defaultValue: boolean): boolean {
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }

  // Driver Management
  async getDrivers() {
    const { data, error } = await supabase
      .from('delivery_drivers')
      .select('*')
      .order('last_name', { ascending: true });

    if (error) throw new Error(`Failed to fetch drivers: ${error.message}`);
    return data || [];
  }

  async createDriver(driver: any) {
    const { data, error } = await supabase
      .from('delivery_drivers')
      .insert(driver)
      .select()
      .single();

    if (error) throw new Error(`Failed to create driver: ${error.message}`);
    return data;
  }

  async updateDriver(id: string, updates: any) {
    const { error } = await supabase
      .from('delivery_drivers')
      .update(updates)
      .eq('id', id);

    if (error) throw new Error(`Failed to update driver: ${error.message}`);
  }

  async deleteDriver(id: string) {
    const { error } = await supabase
      .from('delivery_drivers')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete driver: ${error.message}`);
  }

  // Vehicle Management
  async getVehicles() {
    const { data, error } = await supabase
      .from('delivery_vehicles')
      .select('*')
      .order('license_plate', { ascending: true });

    if (error) throw new Error(`Failed to fetch vehicles: ${error.message}`);
    return data || [];
  }

  async createVehicle(vehicle: any) {
    const { data, error } = await supabase
      .from('delivery_vehicles')
      .insert(vehicle)
      .select()
      .single();

    if (error) throw new Error(`Failed to create vehicle: ${error.message}`);
    return data;
  }

  async updateVehicle(id: string, updates: any) {
    const { error } = await supabase
      .from('delivery_vehicles')
      .update(updates)
      .eq('id', id);

    if (error) throw new Error(`Failed to update vehicle: ${error.message}`);
  }

  async deleteVehicle(id: string) {
    const { error } = await supabase
      .from('delivery_vehicles')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete vehicle: ${error.message}`);
  }

  // User Management
  async getUsers() {
    const { data, error } = await supabase
      .rpc('get_all_user_profiles');

    if (error) throw new Error(`Failed to fetch users: ${error.message}`);
    return data || [];
  }

  async updateUserRole(userId: string, role: string) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw new Error(`Failed to update user role: ${error.message}`);
  }
}

export const settingsService = new SettingsService();
