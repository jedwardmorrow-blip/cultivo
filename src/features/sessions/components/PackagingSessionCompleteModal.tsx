import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { completePackagingSession } from '../services/sessions.service';
import { formatElapsedTime } from '../utils';
import type { PackagingSession, PackagingCompleteForm } from '../types';
import { notificationService } from '@/services/notification.service';
import { Button, QualityGradeSelector } from '@/shared/components';
import { SourceLabelReprintPrompt } from './SourceLabelReprintPrompt';

interface PackagingSessionCompleteModalProps {
 session: PackagingSession;
 onSuccess: () => void;
 onCancel: () => void;
}

export function PackagingSessionCompleteModal({
 session,
 onSuccess,
 onCancel
}: PackagingSessionCompleteModalProps) {
 const [formData, setFormData] = useState<PackagingCompleteForm>({
 ending_weight: 0,
 units_3_5g: 0,
 units_14g: 0,
 units_454g: 0,
 trim_grams: 0,
 waste_grams: 0,
 notes: ''
 });
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [sessionCompleted, setSessionCompleted] = useState(false);
 const [showReprintPrompt, setShowReprintPrompt] = useState(false);
 const [consolidatedPackages, setConsolidatedPackages] = useState<{[key: string]: string}>({});

 const totalOutput = formData.ending_weight +
 (formData.units_3_5g * 3.5) +
 (formData.units_14g * 14) +
 (formData.units_454g * 454) +
 formData.trim_grams +
 formData.waste_grams;
 const variance = session.pull_weight - totalOutput;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (isSubmitting || sessionCompleted) return;
 setIsSubmitting(true);

 const { error } = await completePackagingSession(session.id, {
 ...formData,
 session_status: 'completed'
 });

 if (error) {
 console.error('Error completing session:', error);
 notificationService.error('Error completing session: ' + error.message);
 setIsSubmitting(false);
 } else {
 setSessionCompleted(true);
 await fetchConsolidatedPackageIds();

 // If there's remaining weight, show reprint prompt instead of auto-closing
 if (formData.ending_weight > 0) {
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
 const packages: {[key: string]: string} = {};
 data.forEach((source: any) => {
 const pkg = source.consolidated_packages;
 if (pkg) {
 packages[pkg.product_type] = pkg.package_id;
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
 className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
 >
 <div
 className="glass-modal rounded-cult shadow-glass-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
 >
 <div className="p-6">
 <h2 className="text-2xl font-bold mb-4 text-cult-text-primary uppercase tracking-wide">Complete Packaging Session</h2>

 <div className="bg-cult-surface-raised p-4 rounded-cult mb-6 border border-cult-border">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
 <div>
 <p className="text-cult-text-secondary font-medium">Packager:</p>
 <p className="font-bold text-cult-text-primary">{session.packager_name}</p>
 </div>
 <div>
 <p className="text-cult-text-secondary font-medium">Strain:</p>
 <p className="font-bold text-cult-text-primary">{session.strain}</p>
 </div>
 <div>
 <p className="text-cult-text-secondary font-medium">Package ID:</p>
 <p className="font-bold text-cult-text-primary">{session.package_id}</p>
 </div>
 <div>
 <p className="text-cult-text-secondary font-medium">Pull Weight:</p>
 <p className="font-bold text-cult-text-primary">{session.pull_weight}g</p>
 </div>
 <div>
 <p className="text-cult-text-secondary font-medium">Time Elapsed:</p>
 <p className="font-bold text-cult-text-primary">{formatElapsedTime(session.started_at)}</p>
 </div>
 </div>
 </div>

 <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-cult-text-primary mb-1">Ending Weight (g)</label>
 <input
 type="number"
 step="0.1"
 value={formData.ending_weight || ''}
 onChange={(e) => setFormData({ ...formData, ending_weight: parseFloat(e.target.value) || 0 })}
 className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
 placeholder="0"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-cult-text-primary mb-1">3.5g Units</label>
 <input
 type="number"
 value={formData.units_3_5g || ''}
 onChange={(e) => setFormData({ ...formData, units_3_5g: parseInt(e.target.value) || 0 })}
 className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-cult-text-primary mb-1">14g Units</label>
 <input
 type="number"
 value={formData.units_14g || ''}
 onChange={(e) => setFormData({ ...formData, units_14g: parseInt(e.target.value) || 0 })}
 className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-cult-text-primary mb-1">454g Units (1 lb)</label>
 <input
 type="number"
 value={formData.units_454g || ''}
 onChange={(e) => setFormData({ ...formData, units_454g: parseInt(e.target.value) || 0 })}
 className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-cult-text-primary mb-1">Trim (g)</label>
 <input
 type="number"
 step="0.1"
 value={formData.trim_grams || ''}
 onChange={(e) => setFormData({ ...formData, trim_grams: parseFloat(e.target.value) || 0 })}
 className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-cult-text-primary mb-1">Waste (g)</label>
 <input
 type="number"
 step="0.1"
 value={formData.waste_grams || ''}
 onChange={(e) => setFormData({ ...formData, waste_grams: parseFloat(e.target.value) || 0 })}
 className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
 />
 </div>
 </div>

 <div className="bg-cult-surface-raised p-3 rounded-cult border border-cult-border">
 <p className="text-sm text-cult-text-secondary font-medium">Total Output:</p>
 <p className="text-xl font-bold text-cult-text-primary">{totalOutput.toFixed(1)}g</p>
 <p className="text-sm text-cult-text-secondary font-medium mt-1">
 Variance: {variance.toFixed(1)}g
 </p>
 </div>

 <div className="border-t border-cult-border pt-4">
 <div className="bg-cult-info-muted border border-cult-info rounded-cult p-4 mb-4">
 <p className="text-cult-info text-sm font-medium mb-2">Auto-Consolidation Notice:</p>
 <p className="text-cult-info/80 text-sm">
 Package IDs will be automatically generated when you complete this session.
 All outputs will be consolidated in the"Holding" room for EOD Dutchie conversion.
 </p>
 </div>

 {Object.keys(consolidatedPackages).length > 0 && (
 <div className="bg-cult-success-muted border border-cult-success rounded-cult p-4 mb-4">
 <p className="text-cult-success text-sm font-bold mb-2">Generated Package IDs:</p>
 <div className="space-y-1">
 {consolidatedPackages['3.5g'] && (
 <p className="text-cult-success/80 text-sm">3.5g Units: <span className="font-mono font-bold">{consolidatedPackages['3.5g']}</span></p>
 )}
 {consolidatedPackages['14g'] && (
 <p className="text-cult-success/80 text-sm">14g Units: <span className="font-mono font-bold">{consolidatedPackages['14g']}</span></p>
 )}
 {consolidatedPackages['454g'] && (
 <p className="text-cult-success/80 text-sm">454g Units: <span className="font-mono font-bold">{consolidatedPackages['454g']}</span></p>
 )}
 </div>
 <p className="text-cult-success text-xs mt-2">All packages are in"Holding" room</p>
 </div>
 )}
 </div>

 <QualityGradeSelector
 value={formData.quality_grade_id ?? null}
 onChange={(gradeId) => setFormData({ ...formData, quality_grade_id: gradeId })}
 />

 <div>
 <label className="block text-sm font-medium text-cult-text-primary mb-1">Notes</label>
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
 className="border border-cult-border-strong text-cult-text-primary px-6 py-2 rounded-cult font-semibold uppercase tracking-wider hover:bg-cult-surface-raised hover:border-cult-border-strong transition"
 >
 Cancel
 </button>
 </div>
 </form>

 {sessionCompleted && showReprintPrompt && (
 <SourceLabelReprintPrompt
 sourcePackageId={session.package_id}
 originalWeight={session.pull_weight}
 pullWeight={session.pull_weight - formData.ending_weight}
 strain={session.strain}
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
