import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button } from '@/shared/components';
import { formatElapsedTime } from '../utils';
import { pauseSession, resumeSession } from '../services/sessions.service';
import type { PackagingSession } from '../types';

interface ActivePackagingSessionsTableProps {
  sessions: PackagingSession[];
  onComplete: (session: PackagingSession) => void;
  onCancel: (session: PackagingSession) => void;
}

export function ActivePackagingSessionsTable({ sessions, onComplete, onCancel }: ActivePackagingSessionsTableProps) {
  const [pausingId, setPausingId] = useState<string | null>(null);

  const handleTogglePause = async (session: PackagingSession) => {
    setPausingId(session.id);
    try {
      if (session.is_paused) {
        await resumeSession(session.id, 'packaging');
      } else {
        await pauseSession(session.id, 'packaging');
      }
    } finally {
      setPausingId(null);
    }
  };

  return (
    <div className="bg-cult-surface rounded-lg shadow border border-cult-border mb-6">
      <div className="p-4 border-b border-cult-border">
        <h2 className="text-lg font-bold text-cult-text-primary">Active Packaging Sessions</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-cult-surface border-b border-cult-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-secondary uppercase tracking-wider">Packager</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-secondary uppercase tracking-wider">Strain</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-secondary uppercase tracking-wider">Package ID</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-cult-text-secondary uppercase tracking-wider">Pull (g)</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-cult-text-secondary uppercase tracking-wider">Elapsed</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-cult-text-secondary uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cult-border">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-cult-text-muted text-sm">No active packaging sessions</p>
                  <p className="text-cult-text-secondary text-xs mt-1">Start a new package to begin packaging</p>
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="hover:bg-cult-surface/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-cult-text-primary">{session.packager_name}</td>
                  <td className="px-4 py-3 text-sm text-cult-text-primary">{session.strain}</td>
                  <td className="px-4 py-3 text-sm text-cult-text-muted">{session.package_id}</td>
                  <td className="px-4 py-3 text-sm text-right text-cult-text-primary">{session.pull_weight != null ? session.pull_weight.toFixed(1) : '-'}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium">
                    {session.is_paused ? (
                      <span className="text-cult-warning">PAUSED</span>
                    ) : (
                      <span className="text-cult-green">
                        {formatElapsedTime(session.started_at!, session.total_pause_minutes)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleTogglePause(session)}
                        disabled={pausingId === session.id}
                        className={`p-1.5 rounded transition ${
                          session.is_paused
                            ? 'bg-cult-green/20 text-cult-green hover:bg-cult-green/30'
                            : 'bg-cult-warning/20 text-cult-warning hover:bg-cult-warning/30'
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
                        className="bg-cult-danger text-white px-4 py-1.5 font-bold uppercase tracking-wider hover:bg-cult-danger/80 transition text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
