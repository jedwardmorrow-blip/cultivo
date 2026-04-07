import { useState } from 'react';
import { XCircle } from 'lucide-react';
import type { PackagingSession, PackagingSessionUpdate } from '../types';
import { cancelPackagingSession } from '../services/sessions.service';
import { notificationService } from '@/services/notification.service';

interface PackagingSessionCancelModalProps {
  session: PackagingSession;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PackagingSessionCancelModal({
  session,
  onSuccess,
  onCancel
}: PackagingSessionCancelModalProps) {
  const [cancelReason, setCancelReason] = useState('');

  const handleCancel = async () => {
    const cancelNote = cancelReason.trim()
      ? `CANCELLED: ${cancelReason}${session.notes ? ' | Original notes: ' + session.notes : ''}`
      : `CANCELLED${session.notes ? ' | Original notes: ' + session.notes : ''}`;

    const { error } = await cancelPackagingSession(session.id, cancelNote);

    if (error) {
      console.error('Error cancelling session:', error);
      notificationService.error('Error cancelling session: ' + error.message);
    } else {
      onSuccess();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4"
    >
      <div
        className="bg-cult-near-black border-2 border-cult-danger shadow-xl max-w-lg w-full"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="w-8 h-8 text-cult-danger" />
            <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wide">Cancel Packaging Session</h2>
          </div>

          <div className="bg-cult-dark-gray p-4 rounded-lg mb-6 border border-cult-medium-gray">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-cult-light-gray font-medium">Packager:</p>
                <p className="font-bold text-cult-white">{session.packager_name}</p>
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
                <p className="text-cult-light-gray font-medium">Pull Weight:</p>
                <p className="font-bold text-cult-white">{session.pull_weight}g</p>
              </div>
            </div>
          </div>

          <div className="bg-cult-danger-muted border border-cult-danger rounded-lg p-4 mb-6">
            <p className="text-cult-danger text-sm font-medium mb-2">Warning: Cancelling this session will:</p>
            <ul className="text-cult-danger text-sm space-y-1 ml-4">
              <li>• Unlink all order allocations from this session</li>
              <li>• Return {session.pull_weight}g to available inventory</li>
              <li>• Reset order workflow stages appropriately</li>
              <li>• Create an audit trail entry for this cancellation</li>
            </ul>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-cult-white mb-2">Reason for Cancellation (Optional)</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white placeholder-cult-light-gray focus:outline-none focus:ring-2 focus:ring-cult-danger focus:border-cult-danger"
              rows={3}
              placeholder="e.g., Incorrect strain pulled, equipment malfunction, etc..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 bg-cult-danger text-white px-6 py-3 font-bold uppercase tracking-wider hover:bg-cult-danger/80 transition"
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
