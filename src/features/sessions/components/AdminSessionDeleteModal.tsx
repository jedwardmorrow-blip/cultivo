import { useState } from 'react';
import { AlertTriangle, Lock, Trash2, X } from 'lucide-react';
import { deleteTrimSession } from '../services/sessions.service';
import { notificationService } from '@/services/notification.service';
import type { TrimSession } from '../types';

interface AdminSessionDeleteModalProps {
  session: TrimSession;
  onClose: () => void;
  onDelete: () => void;
}

function isAnyFinalized(session: TrimSession): string[] {
  const finalized: string[] = [];
  if (session.finalization_status_bigs === 'finalized') finalized.push('Flower');
  if (session.finalization_status_smalls === 'finalized') finalized.push('Smalls');
  if (session.finalization_status_trim === 'finalized') finalized.push('Trim');
  return finalized;
}

export function AdminSessionDeleteModal({ session, onClose, onDelete }: AdminSessionDeleteModalProps) {
  const finalizedOutputs = isAnyFinalized(session);
  const isBlocked = finalizedOutputs.length > 0;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (isBlocked) return;

    setDeleting(true);
    const { error } = await deleteTrimSession(session.id);
    setDeleting(false);

    if (error) {
      notificationService.error('Failed to delete session');
    } else {
      notificationService.success('Session deleted');
      onDelete();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-cult-near-black border border-red-600 shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-red-900/50">
          <h2 className="text-xl font-bold text-red-400 uppercase tracking-wide">Delete Session</h2>
          <button onClick={onClose} className="p-1 text-cult-light-gray hover:text-cult-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {isBlocked ? (
            <div className="p-4 bg-red-900/20 border border-red-600 rounded-lg flex items-start gap-3">
              <Lock className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-300 font-medium">Deletion Blocked</p>
                <p className="text-red-200 text-sm mt-1">
                  {finalizedOutputs.join(', ')} output has been finalized. Void the conversion before deleting.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-900/20 border border-amber-600 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-amber-300 font-medium">This action cannot be undone</p>
                <p className="text-amber-200 text-sm mt-1">
                  The session record, its consolidated package contributions, and all related data will be permanently removed.
                </p>
              </div>
            </div>
          )}

          <div className="bg-cult-dark-gray p-4 rounded-lg border border-cult-medium-gray">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-cult-light-gray">Trimmer</p>
                <p className="font-bold text-cult-white">{session.trimmer_name}</p>
              </div>
              <div>
                <p className="text-cult-light-gray">Strain</p>
                <p className="font-bold text-cult-white">{session.strain}</p>
              </div>
              <div>
                <p className="text-cult-light-gray">Date</p>
                <p className="font-bold text-cult-white">{new Date(session.session_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-cult-light-gray">Pulled Weight</p>
                <p className="font-bold text-cult-white">{session.pulled_weight}g</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleDelete}
              disabled={isBlocked || deleting}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white hover:bg-red-700 transition-all font-semibold uppercase tracking-wider text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete Session'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-cult-medium-gray text-cult-white hover:border-cult-white transition font-semibold uppercase tracking-wider text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
