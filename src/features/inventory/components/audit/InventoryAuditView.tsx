import { useEffect } from 'react';
import { useAudit } from '../../hooks/useAudit';
import { AuditHub } from './AuditHub';
import { AuditInitiateModal } from './AuditInitiateModal';
import { AuditCountingView } from './AuditCountingView';
import { AuditReviewApply } from './AuditReviewApply';
import { useState } from 'react';

/**
 * Single-mount orchestrator for the inventory audit workflow.
 * Screens: hub → (modal) → counting → review/apply
 * All driven by internal state, no route changes.
 */
export function InventoryAuditView() {
  const audit = useAudit();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    audit.reloadSessions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleResume(sessionId: string) {
    audit.loadSession(sessionId);
  }

  async function handleStartAudit(selectedStages: string[], notes?: string) {
    await audit.startAudit({ selected_stages: selectedStages, notes });
    setModalOpen(false);
  }

  function handleBackToHub() {
    audit.clearActiveSession();
    audit.reloadSessions();
  }

  // Screen routing
  if (audit.screen === 'counting' && audit.activeSession) {
    return (
      <AuditCountingView
        session={audit.activeSession}
        actionLoading={audit.actionLoading}
        error={audit.error}
        onBack={handleBackToHub}
        onRecordCount={audit.recordCount}
        onMarkNotFound={(lineId) => audit.markNotFound(lineId)}
        onResetLine={audit.resetLine}
        onCreateOrphan={audit.createOrphanLine}
        onDeleteOrphan={audit.deleteOrphanLine}
        onMoveToReview={audit.moveToReview}
      />
    );
  }

  if (audit.screen === 'review' && audit.activeSession) {
    return (
      <AuditReviewApply
        session={audit.activeSession}
        actionLoading={audit.actionLoading}
        error={audit.error}
        onBack={() => audit.setScreen('counting')}
        onApply={audit.applyAudit}
        onAbandon={audit.abandonAudit}
        onBackToHub={handleBackToHub}
      />
    );
  }

  // Default: hub
  return (
    <>
      <AuditHub
        sessions={audit.sessions}
        loading={audit.loading}
        error={audit.error}
        onStartNew={() => { audit.loadLockedStages(); setModalOpen(true); }}
        onResume={handleResume}
      />
      <AuditInitiateModal
        open={modalOpen}
        loading={audit.actionLoading}
        lockedStages={audit.lockedStages}
        onClose={() => setModalOpen(false)}
        onStart={handleStartAudit}
      />
    </>
  );
}
