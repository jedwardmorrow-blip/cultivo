import { useState } from 'react';
import { CheckCircle, XCircle, Edit, Trash2, Package, Clock, Undo2 } from 'lucide-react';
import type { TrimSession } from '../types';

function getConversionStatus(session: TrimSession): 'none' | 'pending' | 'converted' {
  const conversions = (session as any).pending_conversions;
  if (!conversions || conversions.length === 0) return 'none';

  const hasConverted = conversions.some((c: any) => c.status === 'converted');
  if (hasConverted) return 'converted';

  return 'pending';
}

interface CompletedSessionsTableProps {
  sessions: TrimSession[];
  isAdmin: boolean;
  onEdit: (session: TrimSession) => void;
  onDelete: (session: TrimSession) => void;
  onUndo?: (session: TrimSession) => Promise<void>;
}

export function CompletedSessionsTable({
  sessions,
  isAdmin,
  onEdit,
  onDelete,
  onUndo
}: CompletedSessionsTableProps) {
  const [undoingSessionId, setUndoingSessionId] = useState<string | null>(null);
  const [recentlyUndoneId, setRecentlyUndoneId] = useState<string | null>(null);

  const handleUndo = async (session: TrimSession) => {
    if (!onUndo || undoingSessionId) return;

    setUndoingSessionId(session.id);
    try {
      await onUndo(session);
      setRecentlyUndoneId(session.id);
      setTimeout(() => setRecentlyUndoneId(null), 3000);
    } catch (error) {
      console.error('Undo failed:', error);
    } finally {
      setUndoingSessionId(null);
    }
  };
  return (
    <div className="bg-cult-near-black rounded-lg shadow border border-cult-medium-gray">
      <div className="p-4 border-b border-cult-medium-gray">
        <h2 className="text-lg font-bold text-cult-white">Completed Sessions</h2>
        <p className="text-xs text-cult-light-gray mt-1">Showing last 50 sessions (excludes cancelled sessions)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-cult-dark-gray border-b border-cult-medium-gray">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">Trimmer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">Strain</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">Conversion</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider">Pulled (g)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider">Flower (g)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider">Smalls (g)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider">Trim (g)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider">Minutes</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider">g/hr</th>
              {isAdmin && <th className="px-4 py-3 text-center text-xs font-medium text-cult-silver uppercase tracking-wider">Admin</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-medium-gray">
            {sessions.map((session) => {
              const conversionStatus = getConversionStatus(session);
              return (
              <tr key={session.id} className="hover:bg-cult-dark-gray/50 transition-colors">
                <td className="px-4 py-3 text-sm text-cult-white">{new Date(session.session_date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm font-medium text-cult-white">{session.trimmer_name}</td>
                <td className="px-4 py-3 text-sm text-cult-white">{session.strain}</td>
                <td className="px-4 py-3 text-sm">
                  {session.session_status === 'cancelled' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-900/30 text-red-400 border border-red-600">
                      <XCircle className="w-3 h-3" />
                      Cancelled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-900/30 text-green-400 border border-green-600">
                      <CheckCircle className="w-3 h-3" />
                      Completed
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {conversionStatus === 'converted' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-600">
                      <Package className="w-3 h-3" />
                      Converted
                    </span>
                  ) : conversionStatus === 'pending' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-900/30 text-amber-400 border border-amber-600">
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  ) : (
                    <span className="text-xs text-cult-light-gray">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-right text-cult-white">{session.pulled_weight.toFixed(1)}</td>
                <td className="px-4 py-3 text-sm text-right font-medium text-green-500">{session.big_buds_grams != null ? session.big_buds_grams.toFixed(1) : '-'}</td>
                <td className="px-4 py-3 text-sm text-right text-yellow-500">{session.small_buds_grams != null ? session.small_buds_grams.toFixed(1) : '-'}</td>
                <td className="px-4 py-3 text-sm text-right text-cult-light-gray">{session.trim_grams != null ? session.trim_grams.toFixed(1) : '-'}</td>
                <td className="px-4 py-3 text-sm text-right text-cult-white">{session.minutes_trimmed != null ? session.minutes_trimmed.toFixed(0) : '-'}</td>
                <td className="px-4 py-3 text-sm text-right font-medium text-cult-white">{session.grams_per_hour != null ? session.grams_per_hour.toFixed(1) : '-'}</td>
                {isAdmin && (
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      {onUndo && (
                        <button
                          onClick={() => handleUndo(session)}
                          disabled={undoingSessionId === session.id || recentlyUndoneId === session.id}
                          className={`p-1.5 rounded transition ${
                            recentlyUndoneId === session.id
                              ? 'bg-green-900/30 border border-green-600 text-green-400'
                              : undoingSessionId === session.id
                              ? 'opacity-50 cursor-not-allowed border border-blue-600 text-blue-500'
                              : 'hover:bg-blue-900/30 border border-blue-600 text-blue-500'
                          }`}
                          title={
                            recentlyUndoneId === session.id
                              ? 'Restored to Active'
                              : undoingSessionId === session.id
                              ? 'Undoing...'
                              : 'Undo Completion - Restore to Active'
                          }
                        >
                          <Undo2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(session)}
                        className="p-1.5 hover:bg-amber-900/30 border border-amber-600 text-amber-500 rounded transition"
                        title="Edit Session"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(session)}
                        className="p-1.5 hover:bg-red-900/30 border border-red-600 text-red-500 rounded transition"
                        title="Delete Session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-cult-text-muted mx-auto mb-3" />
          <p className="text-cult-light-gray">No completed sessions yet</p>
        </div>
      )}
    </div>
  );
}
