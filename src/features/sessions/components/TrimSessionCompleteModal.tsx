import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatElapsedTime } from '../utils';
import type { TrimSession, TrimCompleteForm, InventoryItem } from '../types';
import { completeTrimSession } from '../services/sessions.service';
import { notificationService } from '@/services/notification.service';
import { Button, QualityGradeSelector } from '@/shared/components';
import { SourceLabelReprintPrompt } from './SourceLabelReprintPrompt';

interface TrimSessionCompleteModalProps {
  session: TrimSession;
  buckedPackages: InventoryItem[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function TrimSessionCompleteModal({
  session,
  buckedPackages,
  onSuccess,
  onCancel
}: TrimSessionCompleteModalProps) {
  const [formData, setFormData] = useState<TrimCompleteForm>({
    big_buds_grams: 0,
    small_buds_grams: 0,
    trim_grams: 0,
    waste_grams: 0,
    bucked_smalls_grams: 0,
    bucked_smalls_inventory_id: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [showReprintPrompt, setShowReprintPrompt] = useState(false);
  const [consolidatedPackages, setConsolidatedPackages] = useState<{flower?: string, smalls?: string, trim?: string}>({});

  const totalOutput = formData.big_buds_grams + formData.small_buds_grams + formData.trim_grams + formData.waste_grams + formData.bucked_smalls_grams;
  const variance = session.pulled_weight - totalOutput;

  // Calculate remaining weight on source bag after trim session
  const remainingSourceWeight = (session.pulled_weight || 0) - totalOutput;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || sessionCompleted) return;
    setIsSubmitting(true);

    const { error } = await completeTrimSession(session.id, {
      ...formData,
      bucked_smalls_inventory_id: formData.bucked_smalls_inventory_id || null,
      session_status: 'completed'
    });

    if (error) {
      console.error('Error completing session:', error);
      notificationService.error('Error completing session: ' + error.message);
      setIsSubmitting(false);
    } else {
      setSessionCompleted(true);
      await fetchConsolidatedPackageIds();

      // If source bag has remaining weight (didn't use full pull), show reprint prompt
      if (remainingSourceWeight > 1) {
        setShowReprintPrompt(true);
      } else {
        setTimeout(() => {
          onSuccess();
          setConsolidatedPackages({});
        }, 5000);
      }
    }
  };

  const fetchConsolidatedPackageIds = async () => {
    const { data, error } = await supabase
      .from('consolidated_package_sources')
      .select(`
        consolidated_package_id,
        consolidated_packages (
          package_id,
          product_type
        )
      `)
      .eq('session_id', session.id);

    if (error) {
      console.error('Error fetching consolidated packages:', error);
    } else if (data) {
      const packages: {flower?: string, smalls?: string, trim?: string} = {};
      data.forEach((source: any) => {
        const pkg = source.consolidated_packages;
        if (pkg) {
          if (pkg.product_type === 'Flower') packages.flower = pkg.package_id;
          else if (pkg.product_type === 'Smalls') packages.smalls = pkg.package_id;
          else if (pkg.product_type === 'Trim') packages.trim = pkg.package_id;
        }
      });
      setConsolidatedPackages(packages);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
      e.preventDefault();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        className="glass-modal rounded-cult shadow-glass-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-cult-white uppercase tracking-wide">Complete Trim Session</h2>

          <div className="bg-white/[0.06] p-4 rounded-cult mb-6 border border-white/[0.10]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-cult-light-gray font-medium">Trimmer:</p>
                <p className="font-bold text-cult-white">{session.trimmer_name}</p>
              </div>
              <div>
                <p className="text-cult-light-gray font-medium">Strain:</p>
                <p className="font-bold text-cult-white">{session.strain}</p>
              </div>
              <div>
                <p className="text-cult-light-gray font-medium">Pulled Weight:</p>
                <p className="font-bold text-cult-white">{session.pulled_weight}g</p>
              </div>
              <div>
                <p className="text-cult-light-gray font-medium">Time Elapsed:</p>
                <p className="font-bold text-cult-white">{formatElapsedTime(session.started_at)}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cult-white mb-1">Big Buds / Flower (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.big_buds_grams || ''}
                  onChange={(e) => setFormData({ ...formData, big_buds_grams: parseFloat(e.target.value) || 0 })}
                  className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cult-white mb-1">Small Buds (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.small_buds_grams || ''}
                  onChange={(e) => setFormData({ ...formData, small_buds_grams: parseFloat(e.target.value) || 0 })}
                  className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cult-white mb-1">Trim (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.trim_grams || ''}
                  onChange={(e) => setFormData({ ...formData, trim_grams: parseFloat(e.target.value) || 0 })}
                  className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cult-white mb-1">Waste (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.waste_grams || ''}
                  onChange={(e) => setFormData({ ...formData, waste_grams: parseFloat(e.target.value) || 0 })}
                  className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cult-white mb-1">Bucked Smalls (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.bucked_smalls_grams || ''}
                  onChange={(e) => setFormData({ ...formData, bucked_smalls_grams: parseFloat(e.target.value) || 0 })}
                  className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
                  placeholder="Untrimmed smalls"
                />
                <p className="text-xs text-cult-light-gray mt-1">Smalls set aside for machine trimming</p>
              </div>
            </div>

            <div className="bg-white/[0.06] p-3 rounded-cult border border-white/[0.10]">
              <p className="text-sm text-cult-light-gray font-medium">Total Output:</p>
              <p className="text-xl font-bold text-cult-white">{totalOutput.toFixed(1)}g</p>
              <p className="text-sm text-cult-light-gray font-medium mt-1">
                Variance: {variance.toFixed(1)}g
              </p>
            </div>

            <div className="border-t border-cult-medium-gray pt-4">
              <div className="bg-cult-info-muted border border-cult-info rounded-lg p-4 mb-4">
                <p className="text-cult-info text-sm font-medium mb-2">Auto-Consolidation Notice:</p>
                <p className="text-cult-info/80 text-sm">
                  Package IDs will be automatically generated when you complete this session.
                  All outputs will be consolidated in the "Holding" room for EOD Dutchie conversion.
                </p>
              </div>

              {formData.bucked_smalls_grams > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-cult-white mb-1">
                    Bucked Smalls Inventory ID ({formData.bucked_smalls_grams.toFixed(1)}g)
                  </label>
                  <select
                    value={formData.bucked_smalls_inventory_id}
                    onChange={(e) => setFormData({ ...formData, bucked_smalls_inventory_id: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
                  >
                    <option value="">Select bucked smalls inventory...</option>
                    {buckedPackages
                      .filter(pkg => pkg.product_name.toLowerCase().includes('smalls'))
                      .map(pkg => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.product_name} - {pkg.strain} ({pkg.quantity_grams}g)
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-cult-light-gray mt-1">Where untrimmed smalls will be stored</p>
                </div>
              )}

              {Object.keys(consolidatedPackages).length > 0 && (
                <div className="bg-cult-success-muted border border-cult-success rounded-lg p-4 mb-4">
                  <p className="text-cult-success text-sm font-bold mb-2">Generated Package IDs:</p>
                  <div className="space-y-1">
                    {consolidatedPackages.flower && (
                      <p className="text-cult-success/80 text-sm">Bulk Flower: <span className="font-mono font-bold">{consolidatedPackages.flower}</span></p>
                    )}
                    {consolidatedPackages.smalls && (
                      <p className="text-cult-success/80 text-sm">Bulk Smalls: <span className="font-mono font-bold">{consolidatedPackages.smalls}</span></p>
                    )}
                    {consolidatedPackages.trim && (
                      <p className="text-cult-success/80 text-sm">Bulk Trim: <span className="font-mono font-bold">{consolidatedPackages.trim}</span></p>
                    )}
                  </div>
                  <p className="text-cult-success text-xs mt-2">All packages are in "Holding" room</p>
                </div>
              )}
            </div>

            <QualityGradeSelector
              value={formData.quality_grade_id ?? null}
              onChange={(gradeId) => setFormData({ ...formData, quality_grade_id: gradeId })}
            />

            <div>
              <label className="block text-sm font-medium text-cult-white mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary placeholder-cult-text-muted focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
                rows={2}
                placeholder="Any additional notes..."
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" size="sm" disabled={isSubmitting || sessionCompleted}>
                {isSubmitting ? 'Completing...' : 'Complete Session'}
              </Button>
              <button
                type="button"
                onClick={onCancel}
                className="border border-cult-medium-gray text-cult-white px-6 py-2 font-semibold uppercase tracking-wider hover:border-cult-white transition"
              >
                Cancel
              </button>
            </div>
          </form>

          {sessionCompleted && showReprintPrompt && (
            <SourceLabelReprintPrompt
              sourcePackageId={session.package_id}
              originalWeight={session.pulled_weight || 0}
              pullWeight={totalOutput}
              strain={session.strain || ''}
              batchNumber={session.batch_id || ''}
              batchId={session.batch_registry_id || ''}
              category=""
              onDone={() => {
                onSuccess();
                setConsolidatedPackages({});
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
