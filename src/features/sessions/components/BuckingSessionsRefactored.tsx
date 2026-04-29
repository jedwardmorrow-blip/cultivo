import { useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { Button, PageSkeleton } from '@/shared/components';
import { useBuckingSessions } from '../hooks/useBuckingSessions';
import { useBuckingData } from '../hooks/useBuckingData';
import { isStaleSession } from '../utils';
import { undoCompletedSession } from '../services/sessions.service';
import { SessionStats } from './SessionStats';
import { BuckingSessionStartForm } from './BuckingSessionStartForm';
import { BuckingSessionCompleteModal } from './BuckingSessionCompleteModal';
import { BuckingSessionCancelModal } from './BuckingSessionCancelModal';
import { ActiveBuckingSessionsTable } from './ActiveBuckingSessionsTable';
import { CompletedBuckingSessionsTable } from './CompletedBuckingSessionsTable';
import type { BuckingSession } from '../types';

export function BuckingSessionsRefactored() {
  const { sessions, activeSessions, loading, stats, fetchSessions } = useBuckingSessions();
  const { binnedPackages, availableStrains, fetchBinnedPackages } = useBuckingData();

  const [showStartForm, setShowStartForm] = useState(false);
  const [completingSession, setCompletingSession] = useState<BuckingSession | null>(null);
  const [cancellingSession, setCancellingSession] = useState<BuckingSession | null>(null);
  const [cancelInitialReason, setCancelInitialReason] = useState('');

  const handleSessionStarted = () => {
    setShowStartForm(false);
    fetchSessions();
    fetchBinnedPackages();
  };

  const handleSessionCompleted = () => {
    setCompletingSession(null);
    fetchSessions();
  };

  const handleSessionCancelled = () => {
    setCancellingSession(null);
    fetchSessions();
  };

  const handleUndo = async (session: BuckingSession) => {
    const { error } = await undoCompletedSession(session.id, 'bucking');
    if (!error) {
      fetchSessions();
    }
  };

  const staleSessions = activeSessions.filter(s => isStaleSession(s.started_at));

  if (loading) {
    return <div className="p-6 max-w-[1800px] mx-auto"><PageSkeleton variant="table" /></div>;
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      {staleSessions.length > 0 && (
        <div className="mb-6 bg-cult-danger/10 border border-cult-danger/60 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-cult-danger flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-cult-danger mb-1">
                {staleSessions.length} Stuck Session{staleSessions.length > 1 ? 's' : ''} Blocking Tote Re-use
              </h3>
              <p className="text-xs text-cult-danger/80 mb-2">
                The following tote{staleSessions.length > 1 ? 's are' : ' is'} locked by sessions that have been active for more than 24 hours.
                These stuck sessions prevent inventory from being re-allocated. Use <strong>Force Close</strong> in the table below to release them.
              </p>
              <div className="flex flex-wrap gap-2">
                {staleSessions.map(s => (
                  <span key={s.id} className="text-xs font-mono bg-cult-danger/20 text-cult-danger border border-cult-danger/50 rounded px-2 py-0.5">
                    {s.binned_package_id}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-cult-text-primary">Bucking Sessions</h1>
          <p className="text-cult-text-secondary mt-1">Process binned material into bucked flower and smalls</p>
        </div>
        <Button
          onClick={() => setShowStartForm(!showStartForm)}
          icon={<Plus className="w-5 h-5" />}
        >
          Start New Tote
        </Button>
      </div>

      <SessionStats stats={stats} type="bucking" />

      {showStartForm && (
        <BuckingSessionStartForm
          binnedPackages={binnedPackages}
          availableStrains={availableStrains}
          onSuccess={handleSessionStarted}
          onCancel={() => setShowStartForm(false)}
        />
      )}

      {cancellingSession && (
        <BuckingSessionCancelModal
          session={cancellingSession}
          onSuccess={handleSessionCancelled}
          onCancel={() => { setCancellingSession(null); setCancelInitialReason(''); }}
          initialReason={cancelInitialReason}
        />
      )}

      {completingSession && (
        <BuckingSessionCompleteModal
          session={completingSession}
          onSuccess={handleSessionCompleted}
          onCancel={() => setCompletingSession(null)}
        />
      )}

      <ActiveBuckingSessionsTable
        sessions={activeSessions}
        onComplete={(session) => setCompletingSession(session)}
        onCancel={(session) => {
          setCancelInitialReason(
            isStaleSession(session.started_at)
              ? 'Ghost session — no output recorded after 24+ hours. Releasing tote for re-use.'
              : ''
          );
          setCancellingSession(session);
        }}
      />

      <CompletedBuckingSessionsTable sessions={sessions} onUndo={handleUndo} />
    </div>
  );
}
