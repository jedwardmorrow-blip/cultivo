import type { Database } from '@/lib/database/database.types';

export type StaffMember = Database['public']['Tables']['staff']['Row'];

export interface StaffInput {
  id?: string;
  first_name: string;
  last_name: string | null;
  position_title: string | null;
  department: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  hourly_rate: number | null;
  pin_code: string | null;
  start_date: string | null;
  end_date: string | null;
  reports_to: string | null;
  slack_id: string | null;
  notes: string | null;
  is_active: boolean;
  updated_at?: string;
}

export type AppSetting = Database['public']['Tables']['app_settings']['Row'];
export type AppSettingInsert = Database['public']['Tables']['app_settings']['Insert'];
export type AppSettingUpdate = Database['public']['Tables']['app_settings']['Update'];

export type SettingType = 'text' | 'number' | 'boolean' | 'json';

export type SettingCategory =
  | 'general'
  | 'operations'
  | 'notifications'
  | 'branding'
  | 'routing'
  | 'storage'
  | 'test';

export interface LogoSettings {
  logo_dark_url: string;
  logo_light_url: string;
  logo_invoice_url: string;
  logo_label_url: string;
  logo_eye_url: string;
  logo_upload_date: string;
}

export type LogoVariant = 'dark' | 'light' | 'invoice' | 'label' | 'eye';

export interface OperationalSettings {
  trim_lead_time_days: number;
  packaging_lead_time_days: number;
  default_overage_percentage: number;
  notification_threshold_days: number;
}

export interface RoutingSettings {
  routing_api_provider: string;
  route_cache_days: number;
}

export interface FacilitySettings {
  facility_address: string;
  facility_city: string;
  facility_state: string;
  facility_postal_code: string;
  facility_latitude: string;
  facility_longitude: string;
}

export interface SettingsFormData extends OperationalSettings, RoutingSettings, FacilitySettings {}

export interface UseSettingsReturn {
  settings: Record<string, string>;
  loading: boolean;
  error: Error | null;
  getSetting: (key: string, defaultValue?: string) => string;
  getNumberSetting: (key: string, defaultValue?: number) => number;
  getBooleanSetting: (key: string, defaultValue?: boolean) => boolean;
  updateSetting: (key: string, value: string) => Promise<void>;
  updateSettings: (updates: Record<string, string>) => Promise<void>;
  reload: () => Promise<void>;
}

export interface MetrcCredential {
  id: string;
  state_code: string;
  api_base_url: string;
  api_key_encrypted: string;
  facility_license: string;
  is_active: boolean;
  created_at: string;
}

export interface UseLogosReturn {
  logos: LogoSettings;
  loading: boolean;
  error: Error | null;
  getLogoUrl: (variant: LogoVariant) => string;
  uploadLogo: (file: File, variant: LogoVariant) => Promise<string>;
  deleteLogo: (variant: LogoVariant) => Promise<void>;
  reload: () => Promise<void>;
}
