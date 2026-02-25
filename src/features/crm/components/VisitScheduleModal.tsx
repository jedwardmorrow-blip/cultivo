import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { scheduleVisit } from '../services/visits.service';
import type { VisitType } from '../types';

interface VisitScheduleModalProps {
  onClose: () => void;
  onCreated: () => void;
  prefilledCustomerId?: string;
}

interface CustomerOption {
  id: string;
  name: string;
  dispensary_code: string;
}

export function VisitScheduleModal({ onClose, onCreated, prefilledCustomerId }: VisitScheduleModalProps) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_id: prefilledCustomerId || '',
    visit_date: new Date().toISOString().split('T')[0],
    visit_type: 'check_in' as VisitType,
    visit_time_window: '',
    location_notes: '',
  });

  useEffect(() => {
    async function loadCustomers() {
      const { data } = await supabase
        .from('customers')
        .select('id, name, dispensary_code')
        .order('name');
      if (data) setCustomers(data);
    }
    loadCustomers();
  }, []);

  const handleSubmit = async () => {
    if (!form.customer_id || !form.visit_date) return;
    setSaving(true);
    await scheduleVisit({
      customer_id: form.customer_id,
      visit_date: form.visit_date,
      visit_type: form.visit_type,
      visit_time_window: form.visit_time_window.trim() || undefined,
      location_notes: form.location_notes.trim() || undefined,
    });
    setSaving(false);
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg w-full max-w-md mx-4">
        <div className="px-5 py-4 border-b border-cult-charcoal flex items-center justify-between">
          <h3 className="text-lg font-semibold text-cult-white">Schedule Visit</h3>
          <button onClick={onClose} className="text-cult-silver hover:text-cult-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-cult-silver mb-1">Account *</label>
            <select
              value={form.customer_id}
              onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-sm text-cult-white focus:outline-none focus:border-cult-lighter-gray"
            >
              <option value="">Select account...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.dispensary_code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-cult-silver mb-1">Date *</label>
              <input
                type="date"
                value={form.visit_date}
                onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
                className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-sm text-cult-white focus:outline-none focus:border-cult-lighter-gray"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-cult-silver mb-1">Type</label>
              <select
                value={form.visit_type}
                onChange={(e) => setForm({ ...form, visit_type: e.target.value as VisitType })}
                className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-sm text-cult-white focus:outline-none focus:border-cult-lighter-gray"
              >
                <option value="check_in">Check-in</option>
                <option value="sample_drop">Sample Drop</option>
                <option value="new_pitch">New Pitch</option>
                <option value="relationship">Relationship</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-cult-silver mb-1">Time Window</label>
            <input
              type="text"
              value={form.visit_time_window}
              onChange={(e) => setForm({ ...form, visit_time_window: e.target.value })}
              placeholder="e.g. Morning, 10am-12pm"
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-sm text-cult-white placeholder-cult-silver focus:outline-none focus:border-cult-lighter-gray"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-cult-silver mb-1">Location Notes</label>
            <textarea
              value={form.location_notes}
              onChange={(e) => setForm({ ...form, location_notes: e.target.value })}
              placeholder="Where to meet, parking info, etc."
              rows={2}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-sm text-cult-white placeholder-cult-silver focus:outline-none focus:border-cult-lighter-gray resize-none"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-cult-charcoal flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={!form.customer_id || !form.visit_date || saving}
            className="px-4 py-2 text-sm font-medium text-cult-black bg-cult-white rounded hover:bg-cult-off-white transition-colors disabled:opacity-50"
          >
            {saving ? 'Scheduling...' : 'Schedule Visit'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-cult-silver hover:text-cult-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
