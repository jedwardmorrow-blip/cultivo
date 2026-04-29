import { useNavigate } from 'react-router-dom';
import { Plus, AlertTriangle, Scale, Clock } from 'lucide-react';
import { useBinningSessions } from '../hooks/useBinningSessions';
import { useBinningSessionState, TAB_LABELS } from '../hooks/useBinningSessionState';
import { useAuth } from '@/lib/auth';
import { NewBinningForm } from './NewBinningForm';
import { SessionCard, PendingHarvestRow } from './BinningSessionCard';
import type { TabKey } from '../hooks/useBinningSessionState';
import type { BinningSession } from '../types';

export function BinningSessionsView() {
  const navigate = useNavigate();
  const { isManager } = useAuth();

  const {
    sessions, unbinnedHarvests, loading, error, reload,
    createSession, completeSession, cancelSession,
    listBinEntries, addBinEntry, removeBinEntry, addBinToCompleted,
  } = useBinningSessions();

  const {
    state, setActiveTab, showNewForm, hideNewForm, handleFormSuccess, handleStartBinning,
  } = useBinningSessionState(createSession, reload);

  const sessionsByTab: Record<Exclude<TabKey, 'pending'>, BinningSession[]> = {
    active: sessions.filter((s) => s.session_status === 'active'),
    completed: sessions.filter((s) => s.session_status === 'completed'),
    cancelled: sessions.filter((s) => s.session_status === 'cancelled'),
  };

  const tabCounts: Record<TabKey, number> = {
    pending: unbinnedHarvests.length,
    active: sessionsByTab.active.length,
    completed: sessionsByTab.completed.length,
    cancelled: sessionsByTab.cancelled.length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-cult-text-primary">Drying</h2>
          <p className="text-sm text-cult-border mt-0.5">Record dry weights after the drying process. Add bin entries, then complete to create inventory.</p>
        </div>
        <button
          onClick={showNewForm}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cult-accent text-cult-opaque-black text-sm font-medium hover:bg-cult-text-muted transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Session
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-cult-danger-muted border border-cult-danger px-3 py-2 text-sm text-cult-danger">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={reload} className="ml-auto text-xs underline hover:no-underline">Retry</button>
        </div>
      )}

      {state.showNewForm && (
        <NewBinningForm
          unbinnedHarvests={unbinnedHarvests}
          onSuccess={handleFormSuccess}
          onCancel={hideNewForm}
        />
      )}

      <div className="flex border-b border-cult-border">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              state.activeTab === tab
                ? 'border-cult-accent text-cult-text-primary'
                : 'border-transparent text-cult-border hover:text-cult-text-primary'
            }`}
          >
            {TAB_LABELS[tab]}
            {tabCounts[tab] > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                state.activeTab === tab ? 'bg-cult-accent text-cult-opaque-black' : 'bg-cult-surface text-cult-text-muted'
              }`}>
                {tabCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-cult-border py-10 text-center">Loading sessions...</div>
      ) : (
        <>
          {state.activeTab === 'pending' && (
            <div className="space-y-2">
              {unbinnedHarvests.length === 0 ? (
                <div className="rounded-lg border border-dashed border-cult-border p-8 text-center">
                  <Scale className="h-8 w-8 text-cult-border mx-auto mb-3" />
                  <p className="text-sm font-medium text-cult-text-primary">No harvests awaiting binning</p>
                  <p className="text-xs text-cult-border mt-1">Completed harvest sessions will appear here once they have no binning record.</p>
                </div>
              ) : (
                unbinnedHarvests.map((harvest) => (
                  <PendingHarvestRow
                    key={harvest.id}
                    harvest={harvest}
                    onStartBinning={handleStartBinning}
                    startingId={state.startingId}
                    rowError={state.startError}
                  />
                ))
              )}
            </div>
          )}

          {state.activeTab !== 'pending' && (
            <div className="space-y-3">
              {sessionsByTab[state.activeTab].length === 0 ? (
                <div className="rounded-lg border border-dashed border-cult-border p-8 text-center">
                  <Clock className="h-8 w-8 text-cult-border mx-auto mb-3" />
                  <p className="text-sm font-medium text-cult-text-primary">
                    No {TAB_LABELS[state.activeTab].toLowerCase()} sessions
                  </p>
                </div>
              ) : (
                sessionsByTab[state.activeTab].map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onComplete={async (id) => { await completeSession(id); }}
                    onCancel={async (id) => { await cancelSession(id); }}
                    onViewBatch={() => navigate('/batches')}
                    listBinEntries={listBinEntries}
                    addBinEntry={addBinEntry}
                    removeBinEntry={removeBinEntry}
                    isManager={isManager}
                    onAddBinToCompleted={async (sessionId, weight, notes) => {
                      await addBinToCompleted(sessionId, weight, notes);
                    }}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
