import { useState, useEffect } from 'react';
import { Shield, Save, Eye, EyeOff, Wifi } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/services/notification.service';
import type { MetrcCredential } from '../types';

const STATE_URLS: Record<string, string> = {
  AZ: 'https://az.metrc.com',
  CO: 'https://co.metrc.com',
};

interface FormState {
  state_code: string;
  api_base_url: string;
  api_key: string;
  facility_license: string;
}

const DEFAULT_FORM: FormState = {
  state_code: '',
  api_base_url: '',
  api_key: '',
  facility_license: '',
};

interface TestResult {
  success: boolean;
  facilityName?: string;
  error?: string;
}

export function MetrcCredentialsSettings() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    loadCredential();
  }, []);

  async function loadCredential() {
    try {
      const { data, error } = await supabase
        .from('metrc_credentials')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const cred = data as MetrcCredential;
        setExistingId(cred.id);
        setForm({
          state_code: cred.state_code,
          api_base_url: cred.api_base_url,
          api_key: '',
          facility_license: cred.facility_license,
        });
      }
    } catch (err: any) {
      console.error('Error loading Metrc credentials:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleStateChange(stateCode: string) {
    setForm(prev => ({
      ...prev,
      state_code: stateCode,
      api_base_url: STATE_URLS[stateCode] ?? prev.api_base_url,
    }));
  }

  async function handleSave() {
    if (!form.state_code || !form.api_base_url || !form.facility_license) {
      notificationService.error('State, API Base URL, and Facility License are required.');
      return;
    }

    if (!existingId && !form.api_key) {
      notificationService.error('API key is required when creating a new credential.');
      return;
    }

    setSaving(true);
    try {
      const requestBody: Record<string, string> = {
        operation: 'save_credential',
        state_code: form.state_code,
        api_base_url: form.api_base_url,
        facility_license: form.facility_license,
      };

      if (form.api_key) {
        requestBody.api_key = form.api_key;
      }

      const { data, error } = await supabase.functions.invoke('metrc-sync', {
        body: requestBody,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Save failed');

      setExistingId(data.id);
      setForm(prev => ({ ...prev, api_key: '' }));
      notificationService.success('Metrc credentials saved.');
    } catch (err: any) {
      console.error('Error saving Metrc credentials:', err);
      notificationService.error('Failed to save Metrc credentials: ' + (err?.message ?? 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!existingId) {
      notificationService.error('Save credentials before testing the connection.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('metrc-sync', {
        body: { operation: 'verify_credentials' },
      });
      if (error) throw error;
      if (data?.success) {
        setTestResult({ success: true, facilityName: data.facility?.facilityName });
      } else {
        setTestResult({ success: false, error: data?.error ?? 'Connection failed' });
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err?.message ?? 'Unknown error' });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-cult-lighter-gray">Loading Metrc credentials...</span>
      </div>
    );
  }

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray p-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-cult-white" />
        <h2 className="text-sm font-semibold text-cult-white uppercase tracking-wider">
          Metrc API Credentials
        </h2>
      </div>

      {existingId && (
        <div className="mb-6 p-3 border border-cult-success bg-cult-success-muted flex items-center gap-2">
          <span className="text-cult-success">✓</span>
          <p className="text-cult-text-primary text-sm">Active credential on file. Enter a new API key only to rotate it.</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
              State *
            </label>
            <select
              value={form.state_code}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
            >
              <option value="">Select state...</option>
              <option value="AZ">Arizona (AZ)</option>
              <option value="CO">Colorado (CO)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
              API Base URL *
            </label>
            <input
              type="text"
              value={form.api_base_url}
              onChange={(e) => setForm(prev => ({ ...prev, api_base_url: e.target.value }))}
              className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all font-mono text-sm"
              placeholder="https://az.metrc.com"
            />
            <p className="mt-1 text-xs text-cult-lighter-gray">Auto-filled when state is selected. Editable if needed.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
            API Key {existingId ? '(leave blank to keep existing)' : '*'}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.api_key}
              onChange={(e) => setForm(prev => ({ ...prev, api_key: e.target.value }))}
              className="w-full px-4 py-3 pr-12 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all font-mono text-sm"
              placeholder={existingId ? '••••••••••••••••' : 'Enter your Metrc API key'}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cult-lighter-gray hover:text-cult-white transition-colors"
              tabIndex={-1}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
            Facility License Number *
          </label>
          <input
            type="text"
            value={form.facility_license}
            onChange={(e) => setForm(prev => ({ ...prev, facility_license: e.target.value }))}
            className="w-full px-4 py-3 bg-cult-black border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
            placeholder="e.g. 00000026DCAF76394520"
          />
        </div>
      </div>

      <div className="border-t border-cult-medium-gray mt-8 pt-6 space-y-4">
        {testResult && (
          <div className={`p-3 border flex items-start gap-2 ${
            testResult.success
              ? 'border-cult-success bg-cult-success-muted'
              : 'border-cult-danger bg-cult-danger-muted'
          }`}>
            <span className={testResult.success ? 'text-cult-success' : 'text-cult-danger'}>
              {testResult.success ? '✓' : '✗'}
            </span>
            <p className={`text-sm ${testResult.success ? 'text-cult-text-primary' : 'text-cult-text-primary'}`}>
              {testResult.success
                ? `Connected — ${testResult.facilityName ?? 'facility name unavailable'}`
                : testResult.error}
            </p>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="flex items-center gap-2 px-6 py-3 border border-cult-medium-gray text-cult-white hover:border-cult-white transition-all duration-200 font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wifi className="w-4 h-4" />
          {testing ? 'Testing...' : 'Test Connection'}
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all duration-200 font-medium uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Credentials'}
        </button>
        </div>
      </div>
    </div>
  );
}
