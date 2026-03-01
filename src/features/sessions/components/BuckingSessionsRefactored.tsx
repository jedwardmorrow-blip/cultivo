import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageSkeleton } from '@/shared/components';
import { useBuckingSessions } from '../hooks/useBuckingSessions';
import { useBuckingData } from '../hooks/useBuckingData';
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

  if (loading) {
    return <div className="p-6 max-w-[1800px] mx-auto"><PageSkeleton variant="table" /></div>;
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-cult-white">Bucking Sessions</h1>
          <p className="text-cult-text-secondary mt-1">Process binned material into bucked flower and smalls</p>
        </div>
        <button
          onClick={() => setShowStartForm(!showStartForm)}
          className="flex items-center gap-2 bg-white text-cult-black px-6 py-3 rounded font-bold uppercase tracking-wider hover:bg-cult-surface transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Start New Tote
        </button>
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
          onCancel={() => setCancellingSession(null)}
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
        onCancel={(session) => setCancellingSession(session)}
      />

      <CompletedBuckingSessionsTable sessions={sessions} onUndo={handleUndo} />
    </div>
  );
}
