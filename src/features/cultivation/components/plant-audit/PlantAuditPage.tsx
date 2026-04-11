import { useState } from 'react';
import { usePlantAudit, useGrowRooms } from '../../hooks';
import { notificationService } from '@/services/notification.service';
import { PlantAuditHub } from './PlantAuditHub';
import { PlantAuditSetupModal } from './PlantAuditSetupModal';
import { PlantAuditCountScreen } from './PlantAuditCountScreen';
import { PlantAuditReviewScreen } from './PlantAuditReviewScreen';
import type {
  PlantAuditCauseOfDeath,
  CreateOrphanPlantGroupInput,
  StartPlantAuditInput,
} from '../../types';

type Mode = 'hub' | 'counting' | 'review';

/**
 * PlantAuditPage — route root for /cultivation-plant-audit.
 *
 * State machine:
 *   hub → counting (after start or resume in_progress)
 *   hub → review (after resume a session already in review)
 *   counting → review (after moveToReview)
 *   review → counting (back)
 *   review → hub (after apply or abandon)
 */
export function PlantAuditPage() {
  const audit = usePlantAudit({ initialStatus: 'all' });
  const { activeRooms } = useGrowRooms();

  const [mode, setMode] = useState<Mode>('hub');
  const [showSetup, setShowSetup] = useState(false);

  async function handleStart(input: StartPlantAuditInput) {
    try {
      await audit.startSession(input);
      setShowSetup(false);
      setMode('counting');
      notificationService.success('Plant audit started');
    } catch (err) {
      notificationService.error(
        err instanceof Error ? err.message : 'Failed to start audit',
      );
      throw err;
    }
  }

  async function handleResume(sessionId: string) {
    try {
      const session = await audit.loadSession(sessionId);
      setMode(session.status === 'review' ? 'review' : 'counting');
    } catch (err) {
      notificationService.error(
        err instanceof Error ? err.message : 'Failed to load audit',
      );
    }
  }

  async function handleRecordCount(
    countId: string,
    physicalCount: number,
    cause?: PlantAuditCauseOfDeath,
    notes?: string,
  ) {
    try {
      await audit.recordCount(countId, {
        physical_count: physicalCount,
        cause_of_death: cause ?? null,
        notes: notes ?? null,
      });
    } catch (err) {
      notificationService.error(
        err instanceof Error ? err.message : 'Failed to record count',
      );
      throw err;
    }
  }

  async function handleMarkNotFound(
    countId: string,
    cause: PlantAuditCauseOfDeath,
    notes?: string,
  ) {
    try {
      await audit.markNotFound(countId, { cause_of_death: cause, notes: notes ?? null });
    } catch (err) {
      notificationService.error(
        err instanceof Error ? err.message : 'Failed to mark not found',
      );
      throw err;
    }
  }

  async function handleSkip(countId: string, notes?: string) {
    try {
      await audit.markSkipped(countId, notes);
    } catch (err) {
      notificationService.error(
        err instanceof Error ? err.message : 'Failed to skip',
      );
      throw err;
    }
  }

  async function handleReset(countId: string) {
    try {
      await audit.resetCount(countId);
    } catch (err) {
      notificationService.error(
        err instanceof Error ? err.message : 'Failed to reset',
      );
      throw err;
    }
  }

  async function handleCreateOrphan(input: CreateOrphanPlantGroupInput) {
    try {
      await audit.createOrphan(input);
      notificationService.success('Orphan plant group created');
    } catch (err) {
      notificationService.error(
        err instanceof Error ? err.message : 'Failed to create orphan',
      );
      throw err;
    }
  }

  async function handleMoveToReview() {
    if (!audit.activeSession) return;
    try {
      await audit.moveToReview(audit.activeSession.id);
      setMode('review');
    } catch (err) {
      notificationService.error(
        err instanceof Error ? err.message : 'Failed to advance to review',
      );
    }
  }

  async function handleApply() {
    if (!audit.activeSession) {
      throw new Error('No active session');
    }
    const summary = await audit.apply(audit.activeSession.id);
    notificationService.success(
      `Audit applied — ${summary.total_deaths_logged} deaths logged, ${summary.total_plants_added} plants added`,
    );
    audit.clearActiveSession();
    setMode('hub');
    return summary;
  }

  async function handleAbandon() {
    if (!audit.activeSession) return;
    try {
      await audit.abandon(audit.activeSession.id, 'Abandoned from UI');
      notificationService.info('Audit abandoned');
      audit.clearActiveSession();
      setMode('hub');
    } catch (err) {
      notificationService.error(
        err instanceof Error ? err.message : 'Failed to abandon',
      );
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {mode === 'hub' && (
        <PlantAuditHub
          sessions={audit.sessions}
          loading={audit.loading}
          error={audit.error}
          onStartNew={() => setShowSetup(true)}
          onResume={handleResume}
        />
      )}

      {mode === 'counting' && audit.activeSession && (
        <PlantAuditCountScreen
          session={audit.activeSession}
          onRecordCount={handleRecordCount}
          onMarkNotFound={handleMarkNotFound}
          onSkip={handleSkip}
          onReset={handleReset}
          onCreateOrphan={handleCreateOrphan}
          onMoveToReview={handleMoveToReview}
          onAbandon={handleAbandon}
        />
      )}

      {mode === 'review' && audit.activeSession && (
        <PlantAuditReviewScreen
          session={audit.activeSession}
          onBack={() => setMode('counting')}
          onApply={handleApply}
          onAbandon={handleAbandon}
        />
      )}

      {showSetup && (
        <PlantAuditSetupModal
          rooms={activeRooms}
          onStart={handleStart}
          onCancel={() => setShowSetup(false)}
        />
      )}
    </div>
  );
}
