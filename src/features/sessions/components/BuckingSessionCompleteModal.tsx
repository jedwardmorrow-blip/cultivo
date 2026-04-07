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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal rounded-cult shadow-glass-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-cult-success/30">
        <div className="sticky top-0 glass-modal border-b border-white/[0.08] px-6 py-4 rounded-t-cult">
          <h2 className="text-2xl font-bold text-cult-text-primary uppercase tracking-wide">
            Complete Bucking Session
          </h2>
          <p className="text-cult-text-secondary text-sm mt-1">
            {session.strain} - {session.binned_package_id}
          </p>
        </div>

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-6 space-y-4">
          <div className="bg-white/[0.06] p-4 rounded-cult border border-white/[0.10]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-cult-text-secondary">Bucker:</span>
                <span className="text-cult-text-primary ml-2 font-medium">{session.bucker_name}</span>
              </div>
              <div>
                <span className="text-cult-text-secondary">Time Elapsed:</span>
                <span className="text-cult-text-primary ml-2 font-medium">
                  {formatElapsedTime(session.started_at)}
                </span>
              </div>
              <div>
                <span className="text-cult-text-secondary">Binned Weight:</span>
                <span className="text-cult-text-primary ml-2 font-medium">
                  {(session.binned_weight_grams / 1000).toFixed(2)} kg
                </span>
              </div>
              <div>
                <span className="text-cult-text-secondary">Batch:</span>
                <span className="text-cult-text-primary ml-2 font-medium">{session.batch_id}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-cult-text-primary uppercase tracking-wide">
              Record Outputs
            </h3>

            <div>
              <label className="block text-sm font-medium text-cult-text-primary mb-1">
                Bucked Flower (g)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.bucked_flower_grams || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bucked_flower_grams: parseFloat(e.target.value) || 0 }))}
                min="0"
                placeholder="0"
                className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
              />
              <p className="text-xs text-cult-text-secondary mt-1">
                {(formData.bucked_flower_grams / 1000).toFixed(2)} kg
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-cult-text-primary mb-1">
                Bucked Smalls (g)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.bucked_smalls_grams || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bucked_smalls_grams: parseFloat(e.target.value) || 0 }))}
                min="0"
                placeholder="0"
                className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
              />
              <p className="text-xs text-cult-text-secondary mt-1">
                {(formData.bucked_smalls_grams / 1000).toFixed(2)} kg
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-cult-text-primary mb-1">
                Waste (g)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.waste_grams || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, waste_grams: parseFloat(e.target.value) || 0 }))}
                min="0"
                placeholder="0"
                className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
              />
              <p className="text-xs text-cult-text-secondary mt-1">
                {(formData.waste_grams / 1000).toFixed(2)} kg
              </p>
            </div>

            <div className="bg-white/[0.06] p-4 rounded-cult border border-white/[0.10]">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-cult-text-secondary">Total Output:</span>
                <span className="text-cult-text-primary font-medium">
                  {(totalOutput / 1000).toFixed(2)} kg
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-cult-text-secondary">Variance:</span>
                <span className={`font-medium ${Math.abs(variance) > 100 ? 'text-cult-warning' : 'text-cult-text-primary'}`}>
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
              <label className="block text-sm font-medium text-cult-text-primary mb-1">Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary placeholder-cult-text-muted focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
                placeholder="Any additional observations..."
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-6 py-2 border border-white/[0.15] text-cult-text-primary rounded-cult hover:bg-white/[0.06] hover:border-white/[0.25] transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-cult-success text-cult-opaque-black rounded-cult font-bold hover:bg-cult-success-bright transition disabled:opacity-50"
            >
              {submitting ? 'Completing...' : 'Complete Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
