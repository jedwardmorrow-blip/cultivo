import { useState } from 'react';
import { AlertTriangle, Lock, Save, X } from 'lucide-react';
import { updateTrimSession } from '../services/sessions.service';
import { notificationService } from '@/services/notification.service';
import type { TrimSession } from '../types';

interface AdminSessionEditModalProps {
  session: TrimSession;
  onClose: () => void;
  onUpdate: () => void;
}

function isAnyFinalized(session: TrimSession): string[] {
  const finalized: string[] = [];
  if (session.finalization_status_bigs === 'finalized') finalized.push('Flower');
  if (session.finalization_status_smalls === 'finalized') finalized.push('Smalls');
  if (session.finalization_status_trim === 'finalized') finalized.push('Trim');
  return finalized;
}

export function AdminSessionEditModal({ session, onClose, onUpdate }: AdminSessionEditModalProps) {
  const finalizedOutputs = isAnyFinalized(session);
  const isBlocked = finalizedOutputs.length > 0;

  const [form, setForm] = useState({
    trimmer_name: session.trimmer_name || '',
    pulled_weight: session.pulled_weight || 0,
    big_buds_grams: session.big_buds_grams ?? 0,
    small_buds_grams: session.small_buds_grams ?? 0,
    trim_grams: session.trim_grams ?? 0,
    waste_grams: session.waste_grams ?? 0,
    bucked_smalls_grams: session.bucked_smalls_grams ?? 0,
    minutes_trimmed: session.minutes_trimmed ?? 0,
    notes: session.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const totalOutput = form.big_buds_grams + form.small_buds_grams + form.trim_grams + form.waste_grams + form.bucked_smalls_grams;
  const variance = form.pulled_weight - totalOutput;
  const gramsPerHour = form.minutes_trimmed > 0
    ? ((form.big_buds_grams + form.small_buds_grams) / (form.minutes_trimmed / 60))
    : 0;

  const handleChange = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) return;

    setSaving(true);
    const { error } = await updateTrimSession(session.id, {
      trimmer_name: form.trimmer_name,
      pulled_weight: form.pulled_weight,
      big_buds_grams: form.big_buds_grams,
      small_buds_grams: form.small_buds_grams,
      trim_grams: form.trim_grams,
      waste_grams: form.waste_grams,
      bucked_smalls_grams: form.bucked_smalls_grams,
      minutes_trimmed: form.minutes_trimmed,
      notes: form.notes,
    });
    setSaving(false);

    if (error) {
      notificationService.error('Failed to update session');
    } else {
      notificationService.success('Session updated');
      onUpdate();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-cult-near-black border border-cult-medium-gray shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-cult-medium-gray">
          <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wide">Edit Session</h2>
          <button onClick={onClose} className="p-1 text-cult-light-gray hover:text-cult-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isBlocked && (
          <div className="mx-6 mt-6 p-4 bg-red-900/20 border border-red-600 rounded-lg flex items-start gap-3">
            <Lock className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-red-300 font-medium">Editing Blocked</p>
              <p className="text-red-200 text-sm mt-1">
                {finalizedOutputs.join(', ')} output has been finalized. Void the conversion before editing.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-cult-dark-gray p-4 rounded-lg border border-cult-medium-gray">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-cult-light-gray font-medium">Strain</p>
                <p className="font-bold text-cult-white">{session.strain}</p>
              </div>
              <div>
                <p className="text-cult-light-gray font-medium">Batch</p>
                <p className="font-bold text-cult-white font-mono">{session.batch_id}</p>
              </div>
              <div>
                <p className="text-cult-light-gray font-medium">Date</p>
                <p className="font-bold text-cult-white">{new Date(session.session_date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">Trimmer Name</label>
            <input
              type="text"
              value={form.trimmer_name}
              onChange={(e) => handleChange('trimmer_name', e.target.value)}
              disabled={isBlocked}
              className="w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-cult-off-white focus:outline-none focus:ring-2 focus:ring-cult-red/50 focus:border-cult-red transition-all disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-cult-white mb-1">Pulled Weight (g)</label>
              <input
                type="number"
                step="0.1"
                value={form.pulled_weight || ''}
                onChange={(e) => handleChange('pulled_weight', parseFloat(e.target.value) || 0)}
                disabled={isBlocked}
                className="w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-cult-off-white focus:outline-none focus:ring-2 focus:ring-cult-red/50 focus:border-cult-red transition-all disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-cult-white mb-1">Minutes Trimmed</label>
              <input
                type="number"
                value={form.minutes_trimmed || ''}
                onChange={(e) => handleChange('minutes_trimmed', parseInt(e.target.value) || 0)}
                disabled={isBlocked}
                className="w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-cult-off-white focus:outline-none focus:ring-2 focus:ring-cult-red/50 focus:border-cult-red transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-cult-white mb-1">Flower / Big Buds (g)</label>
              <input
                type="number"
                step="0.1"
                value={form.big_buds_grams || ''}
                onChange={(e) => handleChange('big_buds_grams', parseFloat(e.target.value) || 0)}
                disabled={isBlocked}
                className="w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-cult-off-white focus:outline-none focus:ring-2 focus:ring-cult-red/50 focus:border-cult-red transition-all disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-cult-white mb-1">Smalls (g)</label>
              <input
                type="number"
                step="0.1"
                value={form.small_buds_grams || ''}
                onChange={(e) => handleChange('small_buds_grams', parseFloat(e.target.value) || 0)}
                disabled={isBlocked}
                className="w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-cult-off-white focus:outline-none focus:ring-2 focus:ring-cult-red/50 focus:border-cult-red transition-all disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-cult-white mb-1">Trim (g)</label>
              <input
                type="number"
                step="0.1"
                value={form.trim_grams || ''}
                onChange={(e) => handleChange('trim_grams', parseFloat(e.target.value) || 0)}
                disabled={isBlocked}
                className="w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-cult-off-white focus:outline-none focus:ring-2 focus:ring-cult-red/50 focus:border-cult-red transition-all disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-cult-white mb-1">Waste (g)</label>
              <input
                type="number"
                step="0.1"
                value={form.waste_grams || ''}
                onChange={(e) => handleChange('waste_grams', parseFloat(e.target.value) || 0)}
                disabled={isBlocked}
                className="w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-cult-off-white focus:outline-none focus:ring-2 focus:ring-cult-red/50 focus:border-cult-red transition-all disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-cult-white mb-1">Bucked Smalls (g)</label>
              <input
                type="number"
                step="0.1"
                value={form.bucked_smalls_grams || ''}
                onChange={(e) => handleChange('bucked_smalls_grams', parseFloat(e.target.value) || 0)}
                disabled={isBlocked}
                className="w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-cult-off-white focus:outline-none focus:ring-2 focus:ring-cult-red/50 focus:border-cult-red transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div className="bg-cult-dark-gray p-4 rounded-lg border border-cult-medium-gray space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-cult-light-gray">Total Output</span>
              <span className="font-bold text-cult-white">{totalOutput.toFixed(1)}g</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-cult-light-gray">Variance</span>
              <span className={`font-bold ${Math.abs(variance) > 0.5 ? 'text-amber-400' : 'text-cult-white'}`}>
                {variance.toFixed(1)}g
              </span>
            </div>
            {Math.abs(variance) > 5 && (
              <div className="flex items-center gap-2 text-amber-400 text-xs mt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Large variance detected</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-cult-medium-gray pt-2 mt-2">
              <span className="text-cult-light-gray">Grams/Hour</span>
              <span className="font-bold text-cult-white">{gramsPerHour.toFixed(1)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              disabled={isBlocked}
              rows={2}
              className="w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-cult-off-white placeholder-cult-silver focus:outline-none focus:ring-2 focus:ring-cult-red/50 focus:border-cult-red transition-all disabled:opacity-50"
              placeholder="Admin notes..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isBlocked || saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all font-semibold uppercase tracking-wider text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-cult-medium-gray text-cult-white hover:border-cult-white transition font-semibold uppercase tracking-wider text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
