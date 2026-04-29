import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Plus } from 'lucide-react';
import { Button, PageSkeleton } from '@/shared/components';
import { useTrimSessions } from '../hooks/useTrimSessions';
import { useSessionData } from '../hooks/useSessionData';
import { undoCompletedSession } from '../services/sessions.service';
import { SessionStats } from './SessionStats';
import { TrimSessionStartForm } from './TrimSessionStartForm';
import { TrimSessionCompleteModal } from './TrimSessionCompleteModal';
import { TrimSessionCancelModal } from './TrimSessionCancelModal';
import { AdminSessionEditModal } from './AdminSessionEditModal';
import { AdminSessionDeleteModal } from './AdminSessionDeleteModal';
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
  const [editingSession, setEditingSession] = useState<TrimSession | null>(null);
  const [deletingSession, setDeletingSession] = useState<TrimSession | null>(null);

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
    return <div className="p-6 max-w-[1800px] mx-auto"><PageSkeleton variant="table" /></div>;
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-cult-text-primary">Trim Sessions</h1>
          <p className="text-cult-text-secondary mt-1">Start bins and log completions</p>
        </div>
        <Button
          onClick={() => setShowStartForm(!showStartForm)}
          icon={<Plus className="w-5 h-5" />}
        >
          Start New Bin
        </Button>
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

      {editingSession && (
        <AdminSessionEditModal
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onUpdate={fetchSessions}
        />
      )}

      {deletingSession && (
        <AdminSessionDeleteModal
          session={deletingSession}
          onClose={() => setDeletingSession(null)}
          onDelete={fetchSessions}
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
