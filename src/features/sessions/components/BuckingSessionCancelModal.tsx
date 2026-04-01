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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-cult-near-black rounded-lg shadow-2xl max-w-md w-full border-2 border-red-500">
        <div className="px-6 py-4 border-b border-cult-medium-gray">
          <h2 className="text-xl font-bold text-cult-white uppercase tracking-wide">
            Cancel Bucking Session
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-cult-silver">
            Are you sure you want to cancel this bucking session?
          </p>

          <div className="bg-cult-dark-gray p-4 rounded-lg border border-cult-medium-gray space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-cult-silver">Bucker:</span>
              <span className="text-cult-white font-medium">{session.bucker_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-cult-silver">Strain:</span>
              <span className="text-cult-white font-medium">{session.strain}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-cult-silver">Package:</span>
              <span className="text-cult-white font-medium">{session.binned_package_id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-cult-silver">Weight:</span>
              <span className="text-cult-white font-medium">
                {(session.binned_weight_grams / 1000).toFixed(2)} kg
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-cult-white mb-1">
              Cancellation Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white focus:ring-2 focus:ring-red-500"
              placeholder="Why is this session being cancelled?"
            />
          </div>

          <p className="text-xs text-cult-silver">
            This action cannot be undone. The session will be marked as cancelled.
          </p>
        </div>

        <div className="px-6 py-4 bg-cult-dark-gray border-t border-cult-medium-gray flex gap-3 justify-end rounded-b-lg">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-6 py-2 bg-cult-near-black text-cult-white rounded hover:bg-cult-medium-gray transition disabled:opacity-50"
          >
            Keep Session
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="px-6 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition disabled:opacity-50"
          >
            {submitting ? 'Cancelling...' : 'Cancel Session'}
          </button>
        </div>
      </div>
    </div>
  );
}
