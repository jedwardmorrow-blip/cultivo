import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Plus } from 'lucide-react';
import { usePackagingSessions } from '../hooks/usePackagingSessions';
import { usePackagingData } from '../hooks/usePackagingData';
import { undoCompletedSession } from '../services/sessions.service';
import { SessionStats } from './SessionStats';
import { PackagingSessionStartForm } from './PackagingSessionStartForm';
import { PackagingSessionCompleteModal } from './PackagingSessionCompleteModal';
import { PackagingSessionCancelModal } from './PackagingSessionCancelModal';
import { ActivePackagingSessionsTable } from './ActivePackagingSessionsTable';
import { CompletedPackagingSessionsTable } from './CompletedPackagingSessionsTable';
import type { PackagingSession } from '../types';

export function PackagingSessionsRefactored() {
  const { isAdmin } = useAuth();
  const { sessions, activeSessions, loading, stats, fetchSessions } = usePackagingSessions();
  const { inventoryPackages, availableStrains, fetchInventoryPackages } = usePackagingData();

  const [showStartForm, setShowStartForm] = useState(false);
  const [completingSession, setCompletingSession] = useState<PackagingSession | null>(null);
  const [cancellingSession, setCancellingSession] = useState<PackagingSession | null>(null);
  const [_editingSession, setEditingSession] = useState<PackagingSession | null>(null);
  const [_deletingSession, setDeletingSession] = useState<PackagingSession | null>(null);

  const handleSessionStarted = () => {
    setShowStartForm(false);
    fetchSessions();
    fetchInventoryPackages();
  };

  const handleSessionCompleted = () => {
    setCompletingSession(null);
    fetchSessions();
  };

  const handleSessionCancelled = () => {
    setCancellingSession(null);
    fetchSessions();
  };

  const handleUndo = async (session: PackagingSession) => {
    const { error } = await undoCompletedSession(session.id, 'packaging');
    if (!error) {
      fetchSessions();
    }
  };

  if (loading) {
    return <div className="p-6">Loading packaging sessions...</div>;
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Packaging Sessions</h1>
          <p className="text-gray-300 mt-1">Start packages and log completions</p>
        </div>
        <button
          onClick={() => setShowStartForm(!showStartForm)}
          className="flex items-center gap-2 bg-white text-cult-black px-6 py-3 rounded font-bold uppercase tracking-wider hover:bg-gray-100 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Start New Package
        </button>
      </div>

      <SessionStats stats={stats} type="packaging" />

      {showStartForm && (
        <PackagingSessionStartForm
          inventoryPackages={inventoryPackages}
          availableStrains={availableStrains}
          onSuccess={handleSessionStarted}
          onCancel={() => setShowStartForm(false)}
        />
      )}

      {cancellingSession && (
        <PackagingSessionCancelModal
          session={cancellingSession}
          onSuccess={handleSessionCancelled}
          onCancel={() => setCancellingSession(null)}
        />
      )}

      {completingSession && (
        <PackagingSessionCompleteModal
          session={completingSession}
          onSuccess={handleSessionCompleted}
          onCancel={() => setCompletingSession(null)}
        />
      )}

      <ActivePackagingSessionsTable
        sessions={activeSessions}
        onComplete={(session) => setCompletingSession(session)}
        onCancel={(session) => setCancellingSession(session)}
      />

      <CompletedPackagingSessionsTable
        sessions={sessions}
        isAdmin={isAdmin}
        onEdit={(session) => setEditingSession(session)}
        onDelete={(session) => setDeletingSession(session)}
        onUndo={handleUndo}
      />
    </div>
  );
}
