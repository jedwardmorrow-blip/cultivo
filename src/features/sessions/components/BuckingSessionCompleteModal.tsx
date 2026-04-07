import { useState } from 'react';
import { formatElapsedTime } from '../utils';
import type { BuckingSession, BuckingCompleteForm } from '../types';
import { completeBuckingSession } from '../services/sessions.service';
import { notificationService } from '@/services/notification.service';
import { QualityGradeSelector } from '@/shared/components';

interface BuckingSessionCompleteModalProps {
  session: BuckingSession;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BuckingSessionCompleteModal({
  session,
  onSuccess,
  onCancel
}: BuckingSessionCompleteModalProps) {
  const [formData, setFormData] = useState<BuckingCompleteForm>({
    bucked_flower_grams: 0,
    bucked_smalls_grams: 0,
    waste_grams: 0,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const totalOutput = formData.bucked_flower_grams + formData.bucked_smalls_grams + formData.waste_grams;
  const variance = session.binned_weight_grams - totalOutput;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await completeBuckingSession(session.id, {
      bucked_flower_grams: formData.bucked_flower_grams,
      bucked_smalls_grams: formData.bucked_smalls_grams,
      waste_grams: formData.waste_grams,
      variance_grams: variance,
      notes: formData.notes || session.notes,
      session_status: 'completed',
      completed_at: new Date().toISOString()
    });

    setSubmitting(false);

    if (error) {
      console.error('Error completing session:', error);
      notificationService.error('Error completing session: ' + error.message);
    } else {
      onSuccess();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
      e.preventDefault();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-cult-near-black rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-cult-green">
        <div className="sticky top-0 bg-cult-near-black border-b border-cult-medium-gray px-6 py-4">
          <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wide">
            Complete Bucking Session
          </h2>
          <p className="text-cult-silver text-sm mt-1">
            {session.strain} - {session.binned_package_id}
          </p>
        </div>

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-6 space-y-4">
          <div className="bg-cult-dark-gray p-4 rounded-lg border border-cult-medium-gray">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-cult-silver">Bucker:</span>
                <span className="text-cult-white ml-2 font-medium">{session.bucker_name}</span>
              </div>
              <div>
                <span className="text-cult-silver">Time Elapsed:</span>
                <span className="text-cult-white ml-2 font-medium">
                  {formatElapsedTime(session.started_at)}
                </span>
              </div>
              <div>
                <span className="text-cult-silver">Binned Weight:</span>
                <span className="text-cult-white ml-2 font-medium">
                  {(session.binned_weight_grams / 1000).toFixed(2)} kg
                </span>
              </div>
              <div>
                <span className="text-cult-silver">Batch:</span>
                <span className="text-cult-white ml-2 font-medium">{session.batch_id}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-cult-white uppercase tracking-wide">
              Record Outputs
            </h3>

            <div>
              <label className="block text-sm font-medium text-cult-white mb-1">
                Bucked Flower (g)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.bucked_flower_grams || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bucked_flower_grams: parseFloat(e.target.value) || 0 }))}
                min="0"
                placeholder="0"
                className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green"
              />
              <p className="text-xs text-cult-silver mt-1">
                {(formData.bucked_flower_grams / 1000).toFixed(2)} kg
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-cult-white mb-1">
                Bucked Smalls (g)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.bucked_smalls_grams || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bucked_smalls_grams: parseFloat(e.target.value) || 0 }))}
                min="0"
                placeholder="0"
                className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green"
              />
              <p className="text-xs text-cult-silver mt-1">
                {(formData.bucked_smalls_grams / 1000).toFixed(2)} kg
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-cult-white mb-1">
                Waste (g)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.waste_grams || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, waste_grams: parseFloat(e.target.value) || 0 }))}
                min="0"
                placeholder="0"
                className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green"
              />
              <p className="text-xs text-cult-silver mt-1">
                {(formData.waste_grams / 1000).toFixed(2)} kg
              </p>
            </div>

            <div className="bg-cult-dark-gray p-4 rounded-lg border border-cult-medium-gray">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-cult-silver">Total Output:</span>
                <span className="text-cult-white font-medium">
                  {(totalOutput / 1000).toFixed(2)} kg
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-cult-silver">Variance:</span>
                <span className={`font-medium ${Math.abs(variance) > 100 ? 'text-cult-warning' : 'text-cult-white'}`}>
                  {variance >= 0 ? '+' : ''}{(variance / 1000).toFixed(2)} kg
                  {Math.abs(variance) > 100 && ' ⚠️'}
                </span>
              </div>
              {Math.abs(variance) > 100 && (
                <p className="text-xs text-cult-warning mt-2">
                  Large variance detected. Please verify weights.
                </p>
              )}
            </div>

            <QualityGradeSelector
              value={formData.quality_grade_id ?? null}
              onChange={(gradeId) => setFormData(prev => ({ ...prev, quality_grade_id: gradeId }))}
            />

            <div>
              <label className="block text-sm font-medium text-cult-white mb-1">Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-cult-green"
                placeholder="Any additional observations..."
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-cult-medium-gray">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-6 py-2 bg-cult-dark-gray text-white rounded hover:bg-cult-medium-gray transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-cult-green text-cult-black rounded font-bold hover:bg-cult-green-bright transition disabled:opacity-50"
            >
              {submitting ? 'Completing...' : 'Complete Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
