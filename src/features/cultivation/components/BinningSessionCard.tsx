import { CheckCircle, ExternalLink, Wind, Leaf, AlertTriangle, Loader2 } from 'lucide-react';
import { formatWeight, formatDate } from '../utils';
import { BinEntryWorkspace, CompletedBinEntries } from './BinEntryWorkspace';
import type { BinLabelContext } from '../hooks/useBinEntryLabel';
import type { BinningSession, BinningSessionStatus, BinEntry, HarvestSession } from '../types';
import {
  SESSION_STATUS_BADGE,
  STATUS_ERROR_BANNER,
  STATUS_WARN_TEXT,
  STATUS_SUCCESS_TEXT,
  STATUS_SUCCESS_BTN,
} from '../constants/stageColors';

function yieldPct(wet: number, dry: number): string {
  if (wet <= 0) return '—';
  return `${((dry / wet) * 100).toFixed(1)}%`;
}

// ─── SessionCard ───

interface SessionCardProps {
  session: BinningSession;
  onComplete: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onViewBatch?: () => void;
  listBinEntries: (id: string) => Promise<BinEntry[]>;
  addBinEntry: (input: { binning_session_id: string; bin_weight_grams: number; notes?: string }) => Promise<BinEntry>;
  removeBinEntry: (id: string) => Promise<void>;
  isManager?: boolean;
  onAddBinToCompleted?: (sessionId: string, weight: number, notes?: string) => Promise<void>;
}

export function SessionCard({ session, onComplete, onCancel, onViewBatch, listBinEntries, addBinEntry, removeBinEntry, isManager, onAddBinToCompleted }: SessionCardProps) {
  const strainName = session.harvest_sessions?.plant_groups?.strains?.name ?? 'Unknown Strain';
  const wetWeight = session.harvest_sessions?.adjusted_weight_grams ?? session.harvest_sessions?.wet_weight_grams ?? null;
  const batchNumber = session.batch_registry?.batch_number ?? '--';
  const dryRoomName = session.dry_rooms?.name ?? '--';
  const dryRoomCode = session.dry_rooms?.room_code ?? '';

  const harvestDate = session.harvest_sessions?.harvest_date
    ? formatDate(session.harvest_sessions.harvest_date)
    : '--';

  const labelContext: BinLabelContext | null = strainName !== 'Unknown Strain'
    ? { strain: strainName, batchNumber: batchNumber, harvestDate }
    : null;

  const statusColor: Record<BinningSessionStatus, string> = {
    active: SESSION_STATUS_BADGE.active,
    completed: SESSION_STATUS_BADGE.completed,
    cancelled: SESSION_STATUS_BADGE.cancelled,
  };

  return (
    <div className="rounded-lg border border-cult-border bg-cult-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-cult-text-primary">{strainName}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${statusColor[session.session_status]}`}>
              {session.session_status.charAt(0).toUpperCase() + session.session_status.slice(1)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-cult-border flex-wrap">
            <span>Batch: <span className="font-mono text-cult-text-muted">{batchNumber}</span></span>
            <span>Harvest: {harvestDate}</span>
            <span>Bin date: {formatDate(session.bin_date)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-md bg-cult-black border border-cult-surface px-3 py-2">
          <div className="text-xs text-cult-border mb-0.5">Dry Room</div>
          <div className="text-sm font-medium text-cult-text-primary">{dryRoomName}</div>
          <div className="text-xs text-cult-border font-mono">{dryRoomCode}</div>
        </div>

        {session.session_status !== 'active' && session.dry_weight_grams > 0 && (
          <div className="rounded-md bg-cult-black border border-cult-surface px-3 py-2">
            <div className="text-xs text-cult-border mb-0.5">Dry Weight</div>
            <div className="text-sm font-semibold text-cult-text-primary">{formatWeight(session.dry_weight_grams)}</div>
            <div className="text-xs text-cult-border">{session.dry_weight_grams.toLocaleString()} g</div>
          </div>
        )}

        {session.session_status !== 'active' && wetWeight !== null && session.dry_weight_grams > 0 && (
          <div className="rounded-md bg-cult-black border border-cult-surface px-3 py-2">
            <div className="text-xs text-cult-border mb-0.5">Yield</div>
            <div className={`text-sm font-semibold ${STATUS_SUCCESS_TEXT}`}>{yieldPct(wetWeight, session.dry_weight_grams)}</div>
            <div className="text-xs text-cult-border">of {formatWeight(wetWeight)} wet</div>
          </div>
        )}

        {session.session_status === 'completed' && session.water_loss_grams != null && session.water_loss_grams > 0 && (
          <div className="rounded-md bg-cult-black border border-cult-surface px-3 py-2">
            <div className="text-xs text-cult-border mb-0.5">Water Loss</div>
            <div className={`text-sm font-semibold ${STATUS_WARN_TEXT}`}>{formatWeight(session.water_loss_grams)}</div>
          </div>
        )}
      </div>

      {session.notes && (
        <p className="text-xs text-cult-border italic">{session.notes}</p>
      )}

      {session.session_status === 'active' && (
        <BinEntryWorkspace
          sessionId={session.id}
          listBinEntries={listBinEntries}
          addBinEntry={addBinEntry}
          removeBinEntry={removeBinEntry}
          onComplete={() => onComplete(session.id)}
          onCancel={() => onCancel(session.id)}
          wetWeight={wetWeight}
          labelContext={labelContext}
        />
      )}

      {session.session_status === 'completed' && (
        <CompletedBinEntries
          sessionId={session.id}
          listBinEntries={listBinEntries}
          canAddMissing={!!isManager && !!onAddBinToCompleted}
          onAddBin={onAddBinToCompleted ?? (async () => {})}
        />
      )}

      {session.session_status === 'completed' && session.completed_at && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-cult-border flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-cult-stage-clone" />
            Completed {formatDate(session.completed_at.slice(0, 10))}
          </div>
          {onViewBatch && batchNumber !== '--' && (
            <button
              onClick={onViewBatch}
              className={`flex items-center gap-1 text-xs px-2 py-0.5 font-mono ${STATUS_SUCCESS_BTN}`}
            >
              {batchNumber}
              <ExternalLink className="h-3 w-3 opacity-70" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PendingHarvestRow ───

interface PendingHarvestRowProps {
  harvest: HarvestSession;
  onStartBinning: (harvest: HarvestSession, dryRoomId?: string) => Promise<void>;
  startingId: string | null;
  rowError: string | null;
}

export function PendingHarvestRow({ harvest, onStartBinning, startingId, rowError }: PendingHarvestRowProps) {
  const strainName = harvest.plant_groups?.strains?.name ?? 'Unknown Strain';
  const batchNumber = harvest.batch_registry?.batch_number ?? '--';
  const flowerEntries = harvest.harvest_weight_entries?.filter(e => e.destination === 'flower') ?? [];
  const wetWeight = flowerEntries.reduce((s, e) => s + Number(e.weight_grams), 0) || (harvest.adjusted_weight_grams ?? harvest.wet_weight_grams);
  const primaryDryRoomCode = flowerEntries.map(e => e.dry_rooms?.room_code).find(Boolean);
  const primaryDryRoomId = flowerEntries.map(e => e.location_id).find(Boolean);
  const dryRoomLabel = primaryDryRoomCode ? `Room ${primaryDryRoomCode}` : null;
  const isStarting = startingId === harvest.id;
  const missingRequirements = !harvest.batch_registry_id || !primaryDryRoomId;

  return (
    <div className="rounded-md border border-cult-border bg-cult-surface px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Leaf className={`h-3.5 w-3.5 flex-shrink-0 ${STATUS_SUCCESS_TEXT}`} />
            <span className="text-sm font-medium text-cult-text-primary">{strainName}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-cult-border flex-wrap">
            <span>Batch: <span className="font-mono text-cult-text-muted">{batchNumber}</span></span>
            <span>Harvested: {formatDate(harvest.harvest_date)}</span>
            <span>Wet: {formatWeight(wetWeight)}</span>
            {harvest.adjusted_weight_grams && <span className={STATUS_WARN_TEXT}>(adjusted)</span>}
            {dryRoomLabel && <span>Dry room: <span className="text-cult-text-muted">{dryRoomLabel}</span></span>}
          </div>
        </div>
        <button
          onClick={() => onStartBinning(harvest, primaryDryRoomId || undefined)}
          disabled={isStarting || missingRequirements}
          className="flex items-center gap-1.5 flex-shrink-0 text-xs px-3 py-1.5 rounded-md bg-cult-accent text-cult-opaque-black font-medium hover:bg-cult-text-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isStarting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Wind className="h-3.5 w-3.5" />
              Start Binning
            </>
          )}
        </button>
      </div>
      {rowError && startingId === harvest.id && (
        <div className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs ${STATUS_ERROR_BANNER}`}>
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{rowError}</span>
        </div>
      )}
      {missingRequirements && (
        <div className={`flex items-center gap-2 text-xs ${STATUS_WARN_TEXT}`}>
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          {!harvest.batch_registry_id ? 'No batch linked.' : 'No dry room assigned.'} Complete the harvest first.
        </div>
      )}
    </div>
  );
}
