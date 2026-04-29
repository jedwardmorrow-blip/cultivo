import { useState } from 'react';
import type { BuckingSession } from '../types';
import { cancelBuckingSession } from '../services/sessions.service';
import { notificationService } from '@/services/notification.service';

interface BuckingSessionCancelModalProps {
 session: BuckingSession;
 onSuccess: () => void;
 onCancel: () => void;
 initialReason?: string;
}

export function BuckingSessionCancelModal({
 session,
 onSuccess,
 onCancel,
 initialReason = '',
}: BuckingSessionCancelModalProps) {
 const [reason, setReason] = useState(initialReason);
 const [submitting, setSubmitting] = useState(false);

 const handleConfirm = async () => {
 setSubmitting(true);

 const cancelNote = reason ? `${session.notes || ''}\n\nCancellation reason: ${reason}`.trim() : session.notes || '';
 const { error } = await cancelBuckingSession(session.id, cancelNote);

 setSubmitting(false);

 if (error) {
 console.error('Error cancelling session:', error);
 notificationService.error('Error cancelling session: ' + error.message);
 } else {
 onSuccess();
 }
 };

 return (
 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
 <div className="glass-modal rounded-cult shadow-glass-lg max-w-md w-full border border-cult-danger/40">
 <div className="px-6 py-4 border-b border-cult-border">
 <h2 className="text-xl font-bold text-cult-text-primary uppercase tracking-wide">
 Cancel Bucking Session
 </h2>
 </div>

 <div className="p-6 space-y-4">
 <p className="text-cult-text-secondary">
 Are you sure you want to cancel this bucking session?
 </p>

 <div className="bg-cult-surface-raised p-4 rounded-cult border border-cult-border space-y-2">
 <div className="flex justify-between text-sm">
 <span className="text-cult-text-secondary">Bucker:</span>
 <span className="text-cult-text-primary font-medium">{session.bucker_name}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-cult-text-secondary">Strain:</span>
 <span className="text-cult-text-primary font-medium">{session.strain}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-cult-text-secondary">Package:</span>
 <span className="text-cult-text-primary font-medium">{session.binned_package_id}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-cult-text-secondary">Weight:</span>
 <span className="text-cult-text-primary font-medium">
 {(session.binned_weight_grams / 1000).toFixed(2)} kg
 </span>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-cult-text-primary mb-1">
 Cancellation Reason (Optional)
 </label>
 <textarea
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 rows={3}
 className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary placeholder-cult-text-muted focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
 placeholder="Why is this session being cancelled?"
 />
 </div>

 <p className="text-xs text-cult-text-muted">
 This action cannot be undone. The session will be marked as cancelled.
 </p>
 </div>

 <div className="px-6 py-4 bg-cult-surface-inset border-t border-cult-border flex gap-3 justify-end rounded-b-cult">
 <button
 onClick={onCancel}
 disabled={submitting}
 className="px-6 py-2 border border-cult-border-strong text-cult-text-primary rounded-cult hover:bg-cult-surface-raised hover:border-cult-border-strong transition disabled:opacity-50"
 >
 Keep Session
 </button>
 <button
 onClick={handleConfirm}
 disabled={submitting}
 className="px-6 py-2 bg-cult-danger text-white rounded-cult font-bold hover:bg-cult-danger/80 transition disabled:opacity-50"
 >
 {submitting ? 'Cancelling...' : 'Cancel Session'}
 </button>
 </div>
 </div>
 </div>
 );
}
