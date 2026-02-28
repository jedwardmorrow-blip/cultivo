import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Plus } from 'lucide-react';
import { useTrimSessions } from '../hooks/useTrimSessions';
import { useSessionData } from '../hooks/useSessionData';
import { undoCompletedSession } from '../services/sessions.service';
import { SessionStats } from './SessionStats';
import { TrimSessionStartForm } from './TrimSessionStartForm';
import { TrimSessionCompleteModal } from './TrimSessionCompleteModal';
import { TrimSessionCancelModal } from './TrimSessionCancelModal';
import { ActiveSessionsTable } from './ActiveSessionsTable';
import { CompletedSessionsTable } from './CompletedSessionsTable';
import type { TrimSession } from '../types';

export function TrimSessionsRefactored() {
  const { isAdmin } = useAuth();
  const { sessions, activeSessions, loading, stats, fetchSessions } = useTrimSessions();
  const { buckedPackages, availableStrains, fetchBuckedPackages } = useSessionData();

  const [showStartForm, setShowStartForm] = useState(false);
  const [completingSession, setCompletingSession] = useState<TrimSession | null>(null);
  const [cancellingSession, setCancellingSession] = useState<TrimSession | null>(null);
  const [_editingSession, setEditingSession] = useState<TrimSession | null>(null);
  const [_deletingSession, setDeletingSession] = useState<TrimSession | null>(null);

  const handleSessionStarted = () => {
    setShowStartForm(false);
    fetchSessions();
    fetchBuckedPackages();
  };

  const handleSessionCompleted = () => {
    setCompletingSession(null);
    fetchSessions();
  };

  const handleSessionCancelled = () => {
    setCancellingSession(null);
    fetchSessions();
  };

  const handleUndo = async (session: TrimSession) => {
    const { error } = await undoCompletedSession(session.id, 'trim');
    if (!error) {
      fetchSessions();
    }
  };

  if (loading) {
    return <div className="p-6">Loading trim sessions...</div>;
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Trim Sessions</h1>
          <p className="text-cult-text-secondary mt-1">Start bins and log completions</p>
        </div>
        <button
          onClick={() => setShowStartForm(!showStartForm)}
          className="flex items-center gap-2 bg-white text-cult-black px-6 py-3 rounded font-bold uppercase tracking-wider hover:bg-gray-100 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Start New Bin
        </button>
      </div>

      <SessionStats stats={stats} />

      {showStartForm && (
        <TrimSessionStartForm
          buckedPackages={buckedPackages}
          availableStrains={availableStrains}
          onSuccess={handleSessionStarted}
          onCancel={() => setShowStartForm(false)}
        />
      )}

      {cancellingSession && (
        <TrimSessionCancelModal
          session={cancellingSession}
          onSuccess={handleSessionCancelled}
          onCancel={() => setCancellingSession(null)}
        />
      )}

      {completingSession && (
        <TrimSessionCompleteModal
          session={completingSession}
          buckedPackages={buckedPackages}
          onSuccess={handleSessionCompleted}
          onCancel={() => setCompletingSession(null)}
        />
      )}

      <ActiveSessionsTable
        sessions={activeSessions}
        onComplete={(session) => setCompletingSession(session)}
        onCancel={(session) => setCancellingSession(session)}
      />

      <CompletedSessionsTable
        sessions={sessions}
        isAdmin={isAdmin}
        onEdit={(session) => setEditingSession(session)}
        onDelete={(session) => setDeletingSession(session)}
        onUndo={handleUndo}
      />
    </div>
  );
}
