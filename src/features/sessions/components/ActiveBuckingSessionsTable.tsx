import { useState } from 'react';
import { Pause, Play, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components';
import { formatElapsedTime, isStaleSession } from '../utils';
import { pauseSession, resumeSession } from '../services/sessions.service';
import type { BuckingSession } from '../types';

interface ActiveBuckingSessionsTableProps {
  sessions: BuckingSession[];
  onComplete: (session: BuckingSession) => void;
  onCancel: (session: BuckingSession) => void;
}

export function ActiveBuckingSessionsTable({
  sessions,
  onComplete,
  onCancel,
}: ActiveBuckingSessionsTableProps) {
  const [pausingId, setPausingId] = useState<string | null>(null);

  const handleTogglePause = async (session: BuckingSession) => {
    setPausingId(session.id);
    try {
      if (session.is_paused) {
        await resumeSession(session.id, 'bucking');
      } else {
        await pauseSession(session.id, 'bucking');
      }
    } finally {
      setPausingId(null);
    }
  };

  return (
    <div className="bg-cult-near-black rounded-lg shadow border border-cult-medium-gray mb-6">
      <div className="p-4 border-b border-cult-medium-gray">
        <h2 className="text-lg font-bold text-cult-white">Active Bucking Sessions ({sessions.length})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-cult-dark-gray border-b border-cult-medium-gray">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">Bucker</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">Strain</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">Package ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">Weight (kg)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-silver uppercase tracking-wider">Time Elapsed</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-silver uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-cult-medium-gray">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <p className="text-cult-light-gray text-sm">No active bucking sessions</p>
                    <p className="text-cult-silver text-xs mt-1">Start a new tote to begin bucking</p>
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const stale = isStaleSession(session.started_at);
                  return (
                  <tr key={session.id} className={`hover:bg-cult-dark-gray/50 transition-colors ${stale ? 'bg-red-950/20' : ''}`}>
                    <td className="px-4 py-3 text-sm text-cult-white font-medium">
                      {session.bucker_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-white">
                      {session.strain}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      <span className={stale ? 'text-red-400' : 'text-cult-silver'}>
                        {session.binned_package_id}
                      </span>
                      {stale && (
                        <span className="ml-2 text-xs bg-red-600/30 text-red-400 border border-red-600/50 rounded px-1.5 py-0.5 font-bold uppercase tracking-wide">
                          Blocking Tote
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-cult-white">
                      {(session.binned_weight_grams / 1000).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-medium">
                      {session.is_paused ? (
                        <span className="text-yellow-400">PAUSED</span>
                      ) : stale ? (
                        <div className="flex flex-col items-center">
                          <span className="text-red-400 font-bold">
                            {formatElapsedTime(session.started_at!, session.total_pause_minutes)}
                          </span>
                          <span className="text-xs text-red-500 uppercase tracking-wide">Ghost Session</span>
                        </div>
                      ) : (
                        <span className="text-cult-green">
                          {formatElapsedTime(session.started_at!, session.total_pause_minutes)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleTogglePause(session)}
                          disabled={pausingId === session.id}
                          className={`p-1.5 rounded transition ${
                            session.is_paused
                              ? 'bg-cult-green/20 text-cult-green hover:bg-cult-green/30'
                              : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                          } disabled:opacity-50`}
                          title={session.is_paused ? 'Resume session' : 'Pause session'}
                        >
                          {session.is_paused ? <Play size={16} /> : <Pause size={16} />}
                        </button>
                        <Button
                          onClick={() => onComplete(session)}
                          size="sm"
                        >
                          Complete
                        </Button>
                        <button
                          onClick={() => onCancel(session)}
                          className={`px-4 py-1.5 font-bold uppercase tracking-wider transition text-sm text-white ${
                            stale ? 'bg-red-700 hover:bg-red-800 ring-1 ring-red-400' : 'bg-red-600 hover:bg-red-700'
                          }`}
                          title={stale ? 'Ghost session — cancel to unblock this tote' : 'Cancel session'}
                        >
                          {stale ? (
                            <span className="flex items-center gap-1">
                              <AlertTriangle size={14} />
                              Force Close
                            </span>
                          ) : 'Cancel'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
  );
}
