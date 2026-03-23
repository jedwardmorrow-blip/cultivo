import { useState } from 'react';
import { XCircle } from 'lucide-react';
import type { TrimSession, TrimSessionUpdate } from '../types';
import { cancelTrimSession } from '../services/sessions.service';
import { notificationService } from '@/services/notification.service';

interface TrimSessionCancelModalProps {
  session: TrimSession;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TrimSessionCancelModal({
  session,
  onSuccess,
  onCancel
}: TrimSessionCancelModalProps) {
  const [cancelReason, setCancelReason] = useState('');

  const handleCancel = async () => {
    const cancelNote = cancelReason.trim()
      ? `CANCELLED: ${cancelReason}${session.notes ? ' | Original notes: ' + session.notes : ''}`
      : `CANCELLED${session.notes ? ' | Original notes: ' + session.notes : ''}`;

    const { error } = await cancelTrimSession(session.id, cancelNote);

    if (error) {
      console.error('Error cancelling session:', error);
      notificationService.error('Error cancelling session: ' + (error as Error).message);
    } else {
      onSuccess();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4"
    >
      <div
        className="bg-cult-near-black border-2 border-red-600 shadow-xl max-w-lg w-full"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
            <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wide">Cancel Trim Session</h2>
          </div>

          <div className="bg-cult-dark-gray p-4 rounded-lg mb-6 border border-cult-medium-gray">
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
                <p className="text-cult-light-gray font-medium">Package ID:</p>
                <p className="font-bold text-cult-white">{session.package_id}</p>
              </div>
              <div>
                <p className="text-cult-light-gray font-medium">Pulled Weight:</p>
                <p className="font-bold text-cult-white">{session.pulled_weight}g</p>
              </div>
            </div>
          </div>

          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm font-medium mb-2">Warning: Cancelling this session will:</p>
            <ul className="text-red-300 text-sm space-y-1 ml-4">
              <li>• Unlink all order allocations from this session</li>
              <li>• Return {session.pulled_weight}g to available inventory</li>
              <li>• Reset order workflow stages to "Allocated"</li>
              <li>• Create an audit trail entry for this cancellation</li>
            </ul>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-cult-white mb-2">Reason for Cancellation (Optional)</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 bg-cult-black border border-cult-charcoal rounded-cult text-cult-off-white placeholder-cult-silver focus:outline-none focus:ring-2 focus:ring-cult-red focus:border-cult-red transition-all duration-300"
              rows={3}
              placeholder="e.g., Incorrect strain pulled, equipment malfunction, etc..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 bg-red-600 text-white px-6 py-3 font-bold uppercase tracking-wider hover:bg-red-700 transition"
            >
              Confirm Cancellation
            </button>
            <button
              onClick={onCancel}
              className="flex-1 border border-cult-medium-gray text-cult-white px-6 py-3 font-semibold uppercase tracking-wider hover:border-cult-white transition"
            >
              Keep Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
