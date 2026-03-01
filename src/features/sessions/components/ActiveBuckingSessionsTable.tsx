import { CheckCircle, XCircle } from 'lucide-react';
import { formatElapsedTime } from '../utils';
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
                sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-cult-dark-gray/50 transition-colors">
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
                    <td className="px-4 py-3 text-sm text-center font-medium text-cult-green">
                      {formatElapsedTime(session.started_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onComplete(session)}
                          className="bg-white text-black px-4 py-1.5 font-bold uppercase tracking-wider hover:bg-cult-surface-raised transition-all duration-300 text-sm"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => onCancel(session)}
                          className="bg-red-600 text-white px-4 py-1.5 font-bold uppercase tracking-wider hover:bg-red-700 transition text-sm"
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
