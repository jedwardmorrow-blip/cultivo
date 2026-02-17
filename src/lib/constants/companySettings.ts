import { supabase } from '@/lib/supabase';

export async function getCompanySettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_key, setting_value')
    .in('category', ['company', 'branding']);

  if (error) throw error;

  const settings: Record<string, string> = {};
  data?.forEach(item => {
    settings[item.setting_key] = item.setting_value || '';
  });

  return settings;
}
