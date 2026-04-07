import { useState, useCallback, useMemo } from 'react';
import { ClipboardCheck, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import { BaseModal } from '@/shared/components/BaseModal';
import { useAuditPeriodSummary } from '../hooks/useAuditPeriodSummary';
import { useAuth } from '@/lib/auth';
import { todayIso } from '@/shared/utils/format';
import type { InventoryAuditInsert } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuditWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  submitAudit: (record: InventoryAuditInsert) => Promise<unknown>;
  lastAuditEndDate: string | null;
}

type Step = 1 | 2 | 3 | 4 | 5;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatG(g: number | null): string {
  if (g == null) return '—';
  return `${g.toLocaleString('en-US', { maximumFractionDigits: 1 })} g`;
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-cult-charcoal/40 last:border-b-0 ${highlight ? 'font-semibold' : ''}`}>
      <span className={`text-[12px] ${highlight ? 'text-cult-white' : 'text-cult-lighter-gray'}`}>{label}</span>
      <span className={`text-[12px] tabular-nums ${highlight ? 'text-cult-white' : 'text-cult-text-primary'}`}>{value}</span>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepSelectPeriod({
  periodStart,
  periodEnd,
  onChange,
}: {
  periodStart: string;
  periodEnd: string;
  onChange: (start: string, end: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-cult-lighter-gray">
        Select the compliance audit period. The system auto-suggests a 30-day window ending today,
        starting from the last completed audit.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] text-cult-text-muted uppercase tracking-wider mb-1.5">
            Period Start
          </label>
          <input
            type="date"
            value={periodStart}
            onChange={e => onChange(e.target.value, periodEnd)}
            className="w-full bg-cult-charcoal border border-cult-medium-gray text-cult-white px-3 py-2 text-[13px] focus:outline-none focus:border-cult-accent rounded"
          />
        </div>
        <div>
          <label className="block text-[11px] text-cult-text-muted uppercase tracking-wider mb-1.5">
            Period End
          </label>
          <input
            type="date"
            value={periodEnd}
            onChange={e => onChange(periodStart, e.target.value)}
            className="w-full bg-cult-charcoal border border-cult-medium-gray text-cult-white px-3 py-2 text-[13px] focus:outline-none focus:border-cult-accent rounded"
          />
        </div>
      </div>
    </div>
  );
}

function StepReviewBalances({
  loading,
  error,
  summary,
}: {
  loading: boolean;
  error: string | null;
  summary: ReturnType<typeof useAuditPeriodSummary>['summary'];
}) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="h-9 bg-cult-charcoal rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-cult-danger-muted border border-cult-danger/40 rounded">
        <AlertTriangle className="w-5 h-5 text-cult-danger flex-shrink-0" />
        <div>
          <div className="text-[13px] text-cult-danger/80 font-medium">Failed to load period summary</div>
          <div className="text-[12px] text-cult-danger mt-0.5">{error}</div>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-1">
      <p className="text-[11px] text-cult-text-muted uppercase tracking-wider mb-3">
        Auto-calculated balances — read only
      </p>
      <div className="bg-cult-charcoal/40 rounded p-3">
        <SummaryRow label="Beginning Inventory" value={formatG(summary.beginning_inventory_g)} />
        <SummaryRow label="+ Acquisitions" value={formatG(summary.acquisitions_g)} />
        <SummaryRow label="+ Harvests" value={formatG(summary.harvests_g)} />
        <SummaryRow label="− Sales" value={formatG(summary.sales_g)} />
        <SummaryRow label="− Transfers Out" value={formatG(summary.transfers_g)} />
        <SummaryRow label="− Testing Submissions" value={formatG(summary.testing_submissions_g)} />
        <SummaryRow label="− Disposals" value={formatG(summary.disposals_g)} />
        <SummaryRow
          label="Calculated Ending Balance"
          value={formatG(summary.calculated_ending_balance_g)}
          highlight
        />
      </div>
    </div>
  );
}

function StepPhysicalCount({
  physicalCount,
  onChange,
}: {
  physicalCount: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-cult-lighter-gray">
        Enter the physical ending inventory count you performed at the end of the audit period.
      </p>
      <div>
        <label className="block text-[11px] text-cult-text-muted uppercase tracking-wider mb-1.5">
          Physical Ending Inventory (grams)
        </label>
        <input
          type="number"
          min="0"
          step="0.1"
          value={physicalCount}
          onChange={e => onChange(e.target.value)}
          placeholder="e.g. 45230.5"
          className="w-full bg-cult-charcoal border border-cult-medium-gray text-cult-white px-3 py-2.5 text-[15px] focus:outline-none focus:border-cult-accent rounded"
          autoFocus
        />
        <p className="text-[11px] text-cult-text-muted mt-1.5">
          This is the total weight of all cannabis inventory on hand as physically counted.
        </p>
      </div>
    </div>
  );
}

function StepVarianceReview({
  calculatedBalance,
  physicalCount,
  varianceExplanation,
  correctiveAction,
  onExplanationChange,
  onCorrectiveActionChange,
}: {
  calculatedBalance: number | null;
  physicalCount: number;
  varianceExplanation: string;
  correctiveAction: string;
  onExplanationChange: (v: string) => void;
  onCorrectiveActionChange: (v: string) => void;
}) {
  const variance = physicalCount - (calculatedBalance ?? 0);
  const hasVariance = Math.abs(variance) > 0.001;
  const isShortage = variance < 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-cult-charcoal/40 rounded p-3 text-center">
          <div className="text-[10px] text-cult-text-muted uppercase tracking-wider mb-1">Calculated</div>
          <div className="text-[16px] font-semibold text-cult-white tabular-nums">
            {formatG(calculatedBalance)}
          </div>
        </div>
        <div className="bg-cult-charcoal/40 rounded p-3 text-center">
          <div className="text-[10px] text-cult-text-muted uppercase tracking-wider mb-1">Physical</div>
          <div className="text-[16px] font-semibold text-cult-white tabular-nums">
            {formatG(physicalCount)}
          </div>
        </div>
        <div className={`rounded p-3 text-center ${hasVariance ? (isShortage ? 'bg-cult-danger-muted' : 'bg-cult-warning-muted') : 'bg-cult-success-muted'}`}>
          <div className="text-[10px] text-cult-text-muted uppercase tracking-wider mb-1">Variance</div>
          <div className={`text-[16px] font-semibold tabular-nums ${hasVariance ? (isShortage ? 'text-cult-danger' : 'text-cult-warning') : 'text-cult-success'}`}>
            {variance >= 0 ? '+' : ''}{formatG(variance)}
          </div>
        </div>
      </div>

      {!hasVariance && (
        <div className="flex items-center gap-3 p-3 bg-cult-success-muted border border-emerald-500/30 rounded">
          <CheckCircle className="w-4 h-4 text-cult-success flex-shrink-0" />
          <span className="text-[13px] text-cult-success/80">
            Physical count matches calculated balance. No variance to explain.
          </span>
        </div>
      )}

      {hasVariance && (
        <>
          <div className="flex items-start gap-3 p-3 bg-cult-warning-muted border border-cult-warning/30 rounded">
            <AlertTriangle className="w-4 h-4 text-cult-warning flex-shrink-0 mt-0.5" />
            <span className="text-[12px] text-cult-warning/80">
              Variance detected. This audit will be flagged for compliance review.
              Explanation and corrective action are required.
            </span>
          </div>

          <div>
            <label className="block text-[11px] text-cult-text-muted uppercase tracking-wider mb-1.5">
              Variance Explanation <span className="text-cult-danger">*</span>
            </label>
            <textarea
              value={varianceExplanation}
              onChange={e => onExplanationChange(e.target.value)}
              rows={3}
              placeholder="Explain the cause of the inventory variance..."
              className="w-full bg-cult-charcoal border border-cult-medium-gray text-cult-white px-3 py-2 text-[13px] focus:outline-none focus:border-cult-accent rounded resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] text-cult-text-muted uppercase tracking-wider mb-1.5">
              Corrective Action <span className="text-cult-danger">*</span>
            </label>
            <textarea
              value={correctiveAction}
              onChange={e => onCorrectiveActionChange(e.target.value)}
              rows={3}
              placeholder="Describe steps taken or planned to prevent future variance..."
              className="w-full bg-cult-charcoal border border-cult-medium-gray text-cult-white px-3 py-2 text-[13px] focus:outline-none focus:border-cult-accent rounded resize-none"
            />
          </div>
        </>
      )}
    </div>
  );
}

function StepConfirm({
  periodStart,
  periodEnd,
  physicalCount,
  variance,
  hasVariance,
  submitting,
  error,
}: {
  periodStart: string;
  periodEnd: string;
  physicalCount: number;
  variance: number;
  hasVariance: boolean;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-cult-charcoal/40 rounded p-4 space-y-2">
        <SummaryRow label="Audit Period" value={`${periodStart} — ${periodEnd}`} />
        <SummaryRow label="Physical Inventory" value={formatG(physicalCount)} />
        <SummaryRow
          label="Variance"
          value={`${variance >= 0 ? '+' : ''}${formatG(variance)}`}
          highlight={hasVariance}
        />
        <SummaryRow
          label="Audit Status"
          value={hasVariance ? 'FLAGGED' : 'COMPLETED'}
          highlight
        />
      </div>

      {hasVariance && (
        <div className="flex items-start gap-3 p-3 bg-cult-warning-muted border border-cult-warning/30 rounded">
          <AlertTriangle className="w-4 h-4 text-cult-warning flex-shrink-0 mt-0.5" />
          <span className="text-[12px] text-cult-warning/80">
            This audit will be saved with status <strong>FLAGGED</strong> due to inventory variance.
            It will remain visible to admin/manager roles for compliance review.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-3 bg-cult-danger-muted border border-cult-danger/30 rounded">
          <AlertTriangle className="w-4 h-4 text-cult-danger flex-shrink-0 mt-0.5" />
          <span className="text-[12px] text-cult-danger/80">{error}</span>
        </div>
      )}

      {submitting && (
        <div className="text-center text-[13px] text-cult-lighter-gray animate-pulse">
          Saving audit record...
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const STEP_LABELS: Record<Step, string> = {
  1: 'Select Period',
  2: 'Review Balances',
  3: 'Physical Count',
  4: 'Variance Review',
  5: 'Confirm & Submit',
};

export function AuditWorkflowModal({
  isOpen,
  onClose,
  onSubmitted,
  submitAudit,
  lastAuditEndDate,
}: AuditWorkflowModalProps) {
  const { profile } = useAuth();
  const today = todayIso();

  // Auto-suggest: period starts from day after last audit end, ends today
  const defaultStart = lastAuditEndDate
    ? new Date(new Date(lastAuditEndDate).getTime() + 86_400_000).toISOString().slice(0, 10)
    : new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  const [step, setStep] = useState<Step>(1);
  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [physicalCountStr, setPhysicalCountStr] = useState('');
  const [varianceExplanation, setVarianceExplanation] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { summary, loading: summaryLoading, error: summaryError } = useAuditPeriodSummary(
    step >= 2 ? periodStart : null,
    step >= 2 ? periodEnd : null
  );

  const physicalCount = parseFloat(physicalCountStr) || 0;
  const calculatedBalance = summary?.calculated_ending_balance_g ?? null;
  const variance = physicalCount - (calculatedBalance ?? 0);
  const hasVariance = physicalCountStr !== '' && Math.abs(variance) > 0.001;

  const isDirty = physicalCountStr !== '' || varianceExplanation !== '' || correctiveAction !== '';

  const canAdvance = useMemo(() => {
    switch (step) {
      case 1: return periodStart <= periodEnd && periodStart !== '' && periodEnd !== '';
      case 2: return !summaryLoading && !summaryError;
      case 3: return physicalCountStr !== '' && physicalCount >= 0;
      case 4: return !hasVariance || (varianceExplanation.trim() !== '' && correctiveAction.trim() !== '');
      case 5: return true;
    }
  }, [step, periodStart, periodEnd, summaryLoading, summaryError, physicalCountStr, physicalCount, hasVariance, varianceExplanation, correctiveAction]);

  const handleNext = useCallback(() => {
    if (step < 5) setStep((s) => (s + 1) as Step);
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }, [step]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const auditStatus = hasVariance ? 'flagged' : 'completed';

      const record: InventoryAuditInsert = {
        period_start: periodStart,
        period_end: periodEnd,
        auditor_id: profile?.id ?? null,
        beginning_inventory_g: summary?.beginning_inventory_g ?? null,
        acquisitions_g: summary?.acquisitions_g ?? null,
        harvests_g: summary?.harvests_g ?? null,
        sales_g: summary?.sales_g ?? null,
        transfers_g: summary?.transfers_g ?? null,
        testing_submissions_g: summary?.testing_submissions_g ?? null,
        disposals_g: summary?.disposals_g ?? null,
        calculated_ending_balance_g: calculatedBalance,
        physical_ending_inventory_g: physicalCount,
        variance_g: variance,
        variance_explanation: hasVariance ? varianceExplanation : null,
        corrective_action: hasVariance ? correctiveAction : null,
        status: auditStatus,
      };

      await submitAudit(record);
      onSubmitted();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save audit record');
    } finally {
      setSubmitting(false);
    }
  }, [
    hasVariance, periodStart, periodEnd, profile, summary,
    calculatedBalance, physicalCount, variance,
    varianceExplanation, correctiveAction, submitAudit, onSubmitted, onClose,
  ]);

  const handlePeriodChange = useCallback((start: string, end: string) => {
    setPeriodStart(start);
    setPeriodEnd(end);
  }, []);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="30-Day Compliance Audit"
      icon={<ClipboardCheck className="w-5 h-5" />}
      maxWidth="xl"
      isDirty={isDirty}
      closeOnEscape
    >
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {([1, 2, 3, 4, 5] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-1 flex-shrink-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              s === step
                ? 'bg-cult-accent/20 text-cult-accent border border-cult-accent/40'
                : s < step
                ? 'bg-cult-success-muted text-cult-success border border-cult-success/30'
                : 'bg-cult-charcoal text-cult-text-muted border border-cult-medium-gray/40'
            }`}>
              <span className="font-bold">{s}</span>
              <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
            </div>
            {s < 5 && <ChevronRight className="w-3 h-3 text-cult-text-muted flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[240px]">
        {step === 1 && (
          <StepSelectPeriod
            periodStart={periodStart}
            periodEnd={periodEnd}
            onChange={handlePeriodChange}
          />
        )}
        {step === 2 && (
          <StepReviewBalances
            loading={summaryLoading}
            error={summaryError}
            summary={summary}
          />
        )}
        {step === 3 && (
          <StepPhysicalCount
            physicalCount={physicalCountStr}
            onChange={setPhysicalCountStr}
          />
        )}
        {step === 4 && (
          <StepVarianceReview
            calculatedBalance={calculatedBalance}
            physicalCount={physicalCount}
            varianceExplanation={varianceExplanation}
            correctiveAction={correctiveAction}
            onExplanationChange={setVarianceExplanation}
            onCorrectiveActionChange={setCorrectiveAction}
          />
        )}
        {step === 5 && (
          <StepConfirm
            periodStart={periodStart}
            periodEnd={periodEnd}
            physicalCount={physicalCount}
            variance={variance}
            hasVariance={hasVariance}
            submitting={submitting}
            error={submitError}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-cult-medium-gray">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2 text-[13px] border border-cult-medium-gray text-cult-white rounded hover:bg-cult-charcoal disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {step < 5 ? (
          <button
            onClick={handleNext}
            disabled={!canAdvance}
            className="flex items-center gap-2 px-5 py-2 text-[13px] bg-cult-accent text-cult-black font-semibold rounded hover:bg-cult-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 text-[13px] bg-cult-success text-white font-semibold rounded hover:bg-cult-success/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            {submitting ? 'Saving...' : 'Submit Audit'}
          </button>
        )}
      </div>
    </BaseModal>
  );
}
