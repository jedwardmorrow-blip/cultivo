import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Settings as SettingsIcon, Save, RotateCcw, Package, Users, Box, Leaf, Layers, Building2, Shield, Truck, Car, Navigation, Palette, Warehouse, Wind } from 'lucide-react';
import { ProductsManagement, StagesManagement, ProductTypesManagement, StrainsManagement, BrandingManagement } from '../../products';
import { UserManagement } from './UserManagement';
import { CustomersManagement } from '../../customers/components/CustomersManagement';
import { AdminTrimSessionManagement } from '../../sessions/components/AdminTrimSessionManagement';
import { DriversManagement } from './DriversManagement';
import { StaffManagement } from './StaffManagement';
import { VehiclesManagement } from './VehiclesManagement';
import { RouteTestingTool } from './RouteTestingTool';
import { BatchManagement } from '../../batches';
import { GrowRoomsManagement, DryRoomsManagement } from '../../cultivation';
import type { AppSetting, SettingsFormData } from '../types';

export function Settings() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SettingsFormData>({
    trim_lead_time_days: 2,
    packaging_lead_time_days: 1,
    default_overage_percentage: 10,
    notification_threshold_days: 7,
    routing_api_key: '',
    routing_api_provider: 'openrouteservice',
    route_cache_days: 30,
    facility_address: '3303 South 40th Street',
    facility_city: 'Phoenix',
    facility_state: 'AZ',
    facility_postal_code: '85040',
    facility_latitude: '33.417454',
    facility_longitude: '-111.994514',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; hasPermissions: boolean; message: string } | null>(null);

  useEffect(() => {
    loadSettings();
    checkDatabaseConnection();
  }, []);

  async function checkDatabaseConnection() {
    try {
      const { error } = await supabase
        .from('app_settings')
        .select('id')
        .limit(1);

      if (error) {
        setDbStatus({
          connected: false,
          hasPermissions: false,
          message: `Database connection error: ${error.message}`
        });
        return;
      }

      const testKey = `test_${Date.now()}`;
      const { error: insertError } = await supabase
        .from('app_settings')
        .insert({
          setting_key: testKey,
          setting_value: 'test',
          setting_type: 'text',
          category: 'test',
          description: 'Test entry'
        });

      if (insertError) {
        setDbStatus({
          connected: true,
          hasPermissions: false,
          message: `No write permissions: ${insertError.message}`
        });

        await supabase
          .from('app_settings')
          .delete()
          .eq('setting_key', testKey);

        return;
      }

      await supabase
        .from('app_settings')
        .delete()
        .eq('setting_key', testKey);

      setDbStatus({
        connected: true,
        hasPermissions: true,
        message: 'Database connection and permissions verified'
      });
    } catch (error: any) {
      setDbStatus({
        connected: false,
        hasPermissions: false,
        message: `Connection test failed: ${error?.message || 'Unknown error'}`
      });
    }
  }

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*');

      if (error) throw error;

      if (data) {
        const settingsMap: Record<string, string> = {};
        data.forEach((setting: AppSetting) => {
          settingsMap[setting.setting_key] = setting.setting_value;
        });

        setSettings({
          trim_lead_time_days: Number(settingsMap.trim_lead_time_days || 2),
          packaging_lead_time_days: Number(settingsMap.packaging_lead_time_days || 1),
          default_overage_percentage: Number(settingsMap.default_overage_percentage || 10),
          notification_threshold_days: Number(settingsMap.notification_threshold_days || 7),
          routing_api_key: settingsMap.routing_api_key || '',
          routing_api_provider: settingsMap.routing_api_provider || 'openrouteservice',
          route_cache_days: Number(settingsMap.route_cache_days || 30),
          facility_address: settingsMap.facility_address || '3303 South 40th Street',
          facility_city: settingsMap.facility_city || 'Phoenix',
          facility_state: settingsMap.facility_state || 'AZ',
          facility_postal_code: settingsMap.facility_postal_code || '85040',
          facility_latitude: settingsMap.facility_latitude || '33.417454',
          facility_longitude: settingsMap.facility_longitude || '-111.994514',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const updates = [
        { key: 'trim_lead_time_days', value: settings.trim_lead_time_days.toString() },
        { key: 'packaging_lead_time_days', value: settings.packaging_lead_time_days.toString() },
        { key: 'default_overage_percentage', value: settings.default_overage_percentage.toString() },
        { key: 'notification_threshold_days', value: settings.notification_threshold_days.toString() },
        { key: 'routing_api_key', value: settings.routing_api_key },
        { key: 'routing_api_provider', value: settings.routing_api_provider },
        { key: 'route_cache_days', value: settings.route_cache_days.toString() },
        { key: 'facility_address', value: settings.facility_address },
        { key: 'facility_city', value: settings.facility_city },
        { key: 'facility_state', value: settings.facility_state },
        { key: 'facility_postal_code', value: settings.facility_postal_code },
        { key: 'facility_latitude', value: settings.facility_latitude },
        { key: 'facility_longitude', value: settings.facility_longitude },
      ];

      for (const update of updates) {
        const { data: existing, error: selectError } = await supabase
          .from('app_settings')
          .select('id')
          .eq('setting_key', update.key)
          .maybeSingle();

        if (selectError) {
          console.error(`Error checking setting ${update.key}:`, selectError);
          throw new Error(`Database error checking setting '${update.key}': ${selectError.message}`);
        }

        if (existing) {
          const { error } = await supabase
            .from('app_settings')
            .update({
              setting_value: update.value,
              updated_at: new Date().toISOString(),
            })
            .eq('setting_key', update.key);

          if (error) {
            console.error(`Error updating setting ${update.key}:`, error);
            throw new Error(`Failed to update '${update.key}': ${error.message}`);
          }
        } else {
          const category = update.key.startsWith('routing') || update.key.startsWith('route') || update.key.startsWith('facility')
            ? 'routing'
            : update.key.startsWith('notification')
            ? 'notifications'
            : 'operations';

          const { error } = await supabase
            .from('app_settings')
            .insert({
              setting_key: update.key,
              setting_value: update.value,
              setting_type: 'text',
              category: category,
              description: '',
            });

          if (error) {
            console.error(`Error inserting setting ${update.key}:`, error);
            throw new Error(`Failed to create '${update.key}': ${error.message}`);
          }
        }
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      const errorMessage = error?.message || 'Failed to save settings';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const confirmed = window.confirm('Are you sure you want to reset all settings to their default values?');
    if (!confirmed) return;

    setSettings({
      trim_lead_time_days: 2,
      packaging_lead_time_days: 1,
      default_overage_percentage: 10,
      notification_threshold_days: 7,
      routing_api_key: '',
      routing_api_provider: 'openrouteservice',
      route_cache_days: 30,
      facility_address: '3303 South 40th Street',
      facility_city: 'Phoenix',
      facility_state: 'AZ',
      facility_postal_code: '85040',
    });

    await handleSave();
  }

  function handleChange(key: keyof SettingsFormData, value: number) {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cult-lighter-gray">Loading settings...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'branding', label: 'Branding', icon: Palette },
{ id: 'batches', label: 'Batch Management', icon: Package },
    { id: 'routing', label: 'Routing', icon: Navigation },
    { id: 'customers', label: 'Customers', icon: Building2 },
    { id: 'drivers', label: 'Drivers', icon: Truck },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'stages', label: 'Stages', icon: Layers },
    { id: 'types', label: 'Product Types', icon: Box },
    { id: 'strains', label: 'Strains', icon: Leaf },
    { id: 'grow-rooms', label: 'Grow Rooms', icon: Warehouse },
    { id: 'dry-rooms', label: 'Dry Rooms', icon: Wind },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'users', label: 'Users', icon: Users },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Controls', icon: Shield }] : []),
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">Settings</h1>
        <p className="text-cult-light-gray mt-2">Configure application settings and manage resources</p>
      </div>

      {dbStatus && !dbStatus.hasPermissions && (
        <div className="mb-6 p-4 border border-red-700 bg-red-900/20">
          <div className="flex items-start gap-3">
            <span className="text-red-400 text-xl">⚠️</span>
            <div>
              <p className="text-red-100 font-medium">Database Permission Issue</p>
              <p className="text-red-200 text-sm mt-1">{dbStatus.message}</p>
              <p className="text-red-300 text-xs mt-2">
                Please ensure database migrations have been applied and RLS policies are configured correctly.
              </p>
            </div>
          </div>
        </div>
      )}

      {dbStatus && dbStatus.hasPermissions && (
        <div className="mb-6 p-3 border border-green-700 bg-green-900/20">
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <p className="text-green-100 text-sm">{dbStatus.message}</p>
          </div>
        </div>
      )}

      <div className="mb-6 flex gap-2 border-b border-cult-medium-gray flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 uppercase tracking-wider ${
                activeTab === tab.id
                  ? 'bg-cult-white text-cult-black'
                  : 'bg-transparent text-cult-white hover:bg-cult-white hover:text-cult-black'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'general' && (
        <>
          {message && (
            <div
              className={`mb-6 p-4 border ${
                message.type === 'success'
                  ? 'bg-green-900 border-green-700 text-green-100'
                  : 'bg-red-900 border-red-700 text-red-100'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="bg-cult-near-black border border-cult-medium-gray p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon className="w-6 h-6 text-cult-white" />
            <h2 className="text-sm font-semibold text-cult-white uppercase tracking-wider">
              Operations Configuration
            </h2>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  Trim Lead Time (Days Before Delivery)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={settings.trim_lead_time_days}
                  onChange={(e) => handleChange('trim_lead_time_days', Number(e.target.value))}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                />
                <p className="mt-2 text-xs text-cult-lighter-gray">
                  Number of days before the delivery date that trim work must be completed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  Packaging Lead Time (Days Before Delivery)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={settings.packaging_lead_time_days}
                  onChange={(e) => handleChange('packaging_lead_time_days', Number(e.target.value))}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                />
                <p className="mt-2 text-xs text-cult-lighter-gray">
                  Number of days before the delivery date that packaging work must be completed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  Default Overage Percentage
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.default_overage_percentage}
                  onChange={(e) => handleChange('default_overage_percentage', Number(e.target.value))}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                />
                <p className="mt-2 text-xs text-cult-lighter-gray">
                  Extra percentage to add to weight calculations (e.g., 10 for 10% overage)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  Notification Threshold (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.notification_threshold_days}
                  onChange={(e) => handleChange('notification_threshold_days', Number(e.target.value))}
                  className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                />
                <p className="mt-2 text-xs text-cult-lighter-gray">
                  Days in advance to send notifications for upcoming deadlines
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-cult-medium-gray pt-6 flex items-center justify-between">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 border border-cult-medium-gray text-cult-white hover:border-cult-white transition-all duration-200 font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all duration-200 font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

          <div className="mt-8 bg-cult-near-black border border-cult-medium-gray p-6">
            <h3 className="text-sm font-semibold text-cult-white mb-4 uppercase tracking-wider">
              How Lead Times Work
            </h3>
            <div className="space-y-3 text-sm text-cult-light-gray">
              <p>
                <span className="text-cult-white font-medium">Trim Lead Time:</span> This setting determines
                when trim work needs to be completed before a delivery. For example, if set to 2 days and an
                order is scheduled for delivery on Friday, the trim work should be completed by Wednesday.
              </p>
              <p>
                <span className="text-cult-white font-medium">Packaging Lead Time:</span> This setting
                determines when packaging needs to be completed before delivery. For example, if set to 1 day
                and an order is scheduled for delivery on Friday, packaging should be completed by Thursday.
              </p>
              <p>
                <span className="text-cult-white font-medium">Overage Percentage:</span> Extra material to
                account for waste, quality control, and variance. Applied to all weight calculations to ensure
                sufficient inventory.
              </p>
            </div>
          </div>
        </>
      )}

      {activeTab === 'routing' && (
        <>
          {message && (
            <div
              className={`mb-6 p-4 border ${
                message.type === 'success'
                  ? 'bg-green-900 border-green-700 text-green-100'
                  : 'bg-red-900 border-red-700 text-red-100'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="bg-cult-near-black border border-cult-medium-gray p-8">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Navigation className="w-6 h-6 text-cult-white" />
                <h2 className="text-sm font-semibold text-cult-white uppercase tracking-wider">
                  Routing & Directions Configuration
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                    OpenRouteService API Key *
                  </label>
                  <input
                    type="password"
                    value={settings.routing_api_key}
                    onChange={(e) => setSettings({ ...settings, routing_api_key: e.target.value })}
                    className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                    placeholder="Enter your API key"
                  />
                  <p className="mt-2 text-xs text-cult-lighter-gray">
                    Get a free API key at <a href="https://openrouteservice.org/dev/#/signup" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">openrouteservice.org</a> (2,000 requests/day free)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                      API Provider
                    </label>
                    <select
                      value={settings.routing_api_provider}
                      onChange={(e) => setSettings({ ...settings, routing_api_provider: e.target.value })}
                      className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                    >
                      <option value="openrouteservice">OpenRouteService</option>
                    </select>
                    <p className="mt-2 text-xs text-cult-lighter-gray">
                      Routing service to use for calculating directions
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                      Route Cache Duration (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={settings.route_cache_days}
                      onChange={(e) => setSettings({ ...settings, route_cache_days: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                    />
                    <p className="mt-2 text-xs text-cult-lighter-gray">
                      Days before cached routes expire and need refresh
                    </p>
                  </div>
                </div>

                <div className="border-t border-cult-medium-gray pt-6">
                  <h3 className="text-sm font-semibold text-cult-white mb-4 uppercase tracking-wider">
                    Facility Location
                  </h3>
                  <p className="text-sm text-cult-light-gray mb-4">
                    This address is used as the origin point for all delivery routes
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={settings.facility_address}
                        onChange={(e) => setSettings({ ...settings, facility_address: e.target.value })}
                        className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                          City
                        </label>
                        <input
                          type="text"
                          value={settings.facility_city}
                          onChange={(e) => setSettings({ ...settings, facility_city: e.target.value })}
                          className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                          State
                        </label>
                        <input
                          type="text"
                          value={settings.facility_state}
                          onChange={(e) => setSettings({ ...settings, facility_state: e.target.value })}
                          className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                          ZIP Code
                        </label>
                        <input
                          type="text"
                          value={settings.facility_postal_code}
                          onChange={(e) => setSettings({ ...settings, facility_postal_code: e.target.value })}
                          className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                          Latitude
                        </label>
                        <input
                          type="text"
                          value={settings.facility_latitude}
                          onChange={(e) => setSettings({ ...settings, facility_latitude: e.target.value })}
                          className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all font-mono"
                          placeholder="33.417454"
                        />
                        <p className="mt-1 text-xs text-cult-lighter-gray">
                          Geographic latitude coordinate
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                          Longitude
                        </label>
                        <input
                          type="text"
                          value={settings.facility_longitude}
                          onChange={(e) => setSettings({ ...settings, facility_longitude: e.target.value })}
                          className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all font-mono"
                          placeholder="-111.994514"
                        />
                        <p className="mt-1 text-xs text-cult-lighter-gray">
                          Geographic longitude coordinate (negative for west)
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-cult-black border border-cult-medium-gray">
                      <p className="text-xs text-cult-light-gray">
                        <strong>Note:</strong> Coordinates are automatically used for route calculations.
                        If you change the address above, you may want to geocode it to get updated coordinates,
                        or manually enter the latitude and longitude values.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-cult-medium-gray pt-6 flex items-center justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all duration-200 font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Routing Settings'}
              </button>
            </div>
          </div>

          <div className="mt-8">
            <RouteTestingTool />
          </div>

          <div className="mt-8 bg-cult-near-black border border-cult-medium-gray p-6">
            <h3 className="text-sm font-semibold text-cult-white mb-4 uppercase tracking-wider">
              How Routing Works
            </h3>
            <div className="space-y-3 text-sm text-cult-light-gray">
              <p>
                <span className="text-cult-white font-medium">Route Caching:</span> Once a route is calculated between two locations, it's stored in the database for fast reuse. Routes are automatically recalculated when they exceed the cache duration.
              </p>
              <p>
                <span className="text-cult-white font-medium">API Usage:</span> With the free tier (2,000 requests/day), you'll use approximately 5-10 API calls per week for new customers and address changes. All existing routes are loaded from cache.
              </p>
              <p>
                <span className="text-cult-white font-medium">Geocoding:</span> Customer addresses are automatically geocoded (converted to GPS coordinates) when saved. This enables instant route calculations without additional API calls.
              </p>
              <p>
                <span className="text-cult-white font-medium">Multi-Stop Routes:</span> When planning deliveries with multiple stops, cached route segments are combined automatically for zero API cost.
              </p>
            </div>
          </div>
        </>
      )}

      {activeTab === 'branding' && <BrandingManagement />}

      {activeTab === 'batches' && <BatchManagement />}

      {activeTab === 'customers' && <CustomersManagement />}

      {activeTab === 'drivers' && <DriversManagement />}

      {activeTab === 'vehicles' && <VehiclesManagement />}

      {activeTab === 'stages' && <StagesManagement />}

      {activeTab === 'staff' && <StaffManagement />}

      {activeTab === 'types' && <ProductTypesManagement />}

      {activeTab === 'strains' && <StrainsManagement />}

      {activeTab === 'grow-rooms' && <GrowRoomsManagement />}

      {activeTab === 'dry-rooms' && <DryRoomsManagement />}

      {activeTab === 'products' && <ProductsManagement />}

      {activeTab === 'users' && <UserManagement />}

      {activeTab === 'admin' && isAdmin && <AdminTrimSessionManagement />}
    </div>
  );
}
