import { useState } from 'react';
import { ChevronDown, ChevronUp, Undo2 } from 'lucide-react';
import type { BuckingSession } from '../types';

interface CompletedBuckingSessionsTableProps {
  sessions: BuckingSession[];
  onUndo?: (session: BuckingSession) => Promise<void>;
}

export function CompletedBuckingSessionsTable({
  sessions,
  onUndo
}: CompletedBuckingSessionsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [undoingSessionId, setUndoingSessionId] = useState<string | null>(null);
  const [recentlyUndoneId, setRecentlyUndoneId] = useState<string | null>(null);

  const handleUndo = async (session: BuckingSession, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const filteredSessions = sessions.filter(session =>
    session.strain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.bucker_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.binned_package_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-cult-near-black rounded-lg shadow border border-cult-medium-gray">
      <div className="p-4 border-b border-cult-medium-gray flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-cult-white">Completed Bucking Sessions ({filteredSessions.length})</h2>
          <p className="text-xs text-cult-light-gray mt-1">Showing last 50 sessions (excludes cancelled sessions)</p>
        </div>
        <input
          type="text"
          placeholder="Search by strain, bucker, or package ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 bg-cult-dark-gray border border-cult-medium-gray rounded text-cult-white placeholder-cult-silver focus:ring-2 focus:ring-cult-green w-80"
        />
      </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cult-dark-gray border-b border-cult-medium-gray">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">
                  Bucker
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">
                  Strain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">
                  Package
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">
                  Input (kg)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">
                  Flower (kg)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">
                  Smalls (kg)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">
                  kg/hr
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-cult-silver uppercase tracking-wider">
                  Details
                </th>
                {onUndo && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-cult-silver uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-cult-medium-gray">
              {filteredSessions.map((session) => (
                <>
                  <tr
                    key={session.id}
                    className="hover:bg-cult-dark-gray/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
                  >
                    <td className="px-4 py-3 text-sm text-cult-white">
                      {new Date(session.session_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-white font-medium">
                      {session.bucker_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-white">
                      {session.strain}
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-silver font-mono">
                      {session.binned_package_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-white">
                      {(session.binned_weight_grams / 1000).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-white">
                      {(session.bucked_flower_grams / 1000).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-white">
                      {(session.bucked_smalls_grams / 1000).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-white">
                      {session.kg_per_hour ? session.kg_per_hour.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {session.session_status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-900/30 text-green-400 border border-green-600">
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-900/30 text-red-400 border border-red-600">
                          Cancelled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {expandedId === session.id ? (
                        <ChevronUp className="w-5 h-5 text-cult-silver mx-auto" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-cult-silver mx-auto" />
                      )}
                    </td>
                    {onUndo && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => handleUndo(session, e)}
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
                      </td>
                    )}
                  </tr>
                  {expandedId === session.id && (
                    <tr className="bg-cult-dark-gray">
                      <td colSpan={onUndo ? 11 : 10} className="px-4 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-cult-silver">Waste:</span>
                            <span className="text-cult-white ml-2 font-medium">
                              {(session.waste_grams / 1000).toFixed(2)} kg
                            </span>
                          </div>
                          <div>
                            <span className="text-cult-silver">Variance:</span>
                            <span className={`ml-2 font-medium ${Math.abs(session.variance_grams) > 100 ? 'text-yellow-500' : 'text-cult-white'}`}>
                              {session.variance_grams >= 0 ? '+' : ''}{(session.variance_grams / 1000).toFixed(2)} kg
                            </span>
                          </div>
                          <div>
                            <span className="text-cult-silver">Duration:</span>
                            <span className="text-cult-white ml-2 font-medium">
                              {session.minutes_bucked ? `${Math.floor(session.minutes_bucked / 60)}h ${Math.floor(session.minutes_bucked % 60)}m` : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-cult-silver">Batch:</span>
                            <span className="text-cult-white ml-2 font-medium">{session.batch_id}</span>
                          </div>
                          {session.notes && (
                            <div className="col-span-2 md:col-span-4">
                              <span className="text-cult-silver">Notes:</span>
                              <p className="text-cult-white mt-1">{session.notes}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filteredSessions.length === 0 && (
                <tr>
                  <td colSpan={onUndo ? 11 : 10} className="px-4 py-8 text-center text-cult-silver">
                    {searchTerm ? 'No sessions match your search.' : 'No completed bucking sessions yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
  );
}

