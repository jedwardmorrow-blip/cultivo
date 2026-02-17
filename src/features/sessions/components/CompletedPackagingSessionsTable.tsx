import { useState } from 'react';
import { CheckCircle, XCircle, Edit, Trash2, Package, Clock, Undo2 } from 'lucide-react';
import type { PackagingSession } from '../types';

function getConversionStatus(session: PackagingSession): 'none' | 'pending' | 'converted' {
  const conversions = (session as any).pending_conversions;
  if (!conversions || conversions.length === 0) return 'none';

  const hasConverted = conversions.some((c: any) => c.status === 'converted');
  if (hasConverted) return 'converted';

  return 'pending';
}

interface CompletedPackagingSessionsTableProps {
  sessions: PackagingSession[];
  isAdmin: boolean;
  onEdit: (session: PackagingSession) => void;
  onDelete: (session: PackagingSession) => void;
  onUndo?: (session: PackagingSession) => Promise<void>;
}

export function CompletedPackagingSessionsTable({
  sessions,
  isAdmin,
  onEdit,
  onDelete,
  onUndo
}: CompletedPackagingSessionsTableProps) {
  const [undoingSessionId, setUndoingSessionId] = useState<string | null>(null);
  const [recentlyUndoneId, setRecentlyUndoneId] = useState<string | null>(null);

  const handleUndo = async (session: PackagingSession) => {
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
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray uppercase">Packager</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray uppercase">Strain</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-light-gray uppercase">Conversion</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-light-gray uppercase">3.5g</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-light-gray uppercase">14g</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-light-gray uppercase">454g</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-light-gray uppercase">Minutes</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-light-gray uppercase">Units/hr</th>
              {isAdmin && <th className="px-4 py-3 text-center text-xs font-medium text-cult-light-gray uppercase">Admin</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-medium-gray">
            {sessions.map((session) => {
              const conversionStatus = getConversionStatus(session);
              return (
              <tr key={session.id} className="hover:bg-cult-dark-gray">
                <td className="px-4 py-3 text-sm text-cult-white">{new Date(session.session_date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm font-medium text-cult-white">{session.packager_name}</td>
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
                <td className="px-4 py-3 text-sm text-right text-cult-white">{session.units_3_5g || 0}</td>
                <td className="px-4 py-3 text-sm text-right text-cult-white">{session.units_14g || 0}</td>
                <td className="px-4 py-3 text-sm text-right text-cult-white">{session.units_454g || 0}</td>
                <td className="px-4 py-3 text-sm text-right text-cult-white">{session.minutes_packaged?.toFixed(0) || '-'}</td>
                <td className="px-4 py-3 text-sm text-right font-medium text-cult-white">{session.units_per_hour?.toFixed(1) || '-'}</td>
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
          <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-cult-light-gray">No completed sessions yet</p>
        </div>
      )}
    </div>
  );
}
