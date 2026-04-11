import { useEffect, useState } from 'react';
import { Plus, AlertTriangle, Sprout } from 'lucide-react';
import { productsService } from '@/features/products/services';
import { isValidStrainAbbreviation } from '../../utils';
import type { GrowthStage, CreateOrphanPlantGroupInput } from '../../types';

interface Strain {
  id: string;
  name: string;
  abbreviation: string | null;
}

interface PlantAuditOrphanModalProps {
  auditSessionId: string;
  growRoomId: string;
  growRoomLabel: string;
  onCreate: (input: CreateOrphanPlantGroupInput) => Promise<void>;
  onCancel: () => void;
}

const STAGE_OPTIONS: { value: GrowthStage; label: string }[] = [
  { value: 'clone', label: 'Clone' },
  { value: 'veg', label: 'Veg' },
  { value: 'flower', label: 'Flower' },
];

/**
 * PlantAuditOrphanModal — dedicated "I found plants that aren't in the system"
 * flow used during the audit walk. Creates a plant_group + an audit count row
 * marked `is_orphan=true`. The group is created with its true count directly,
 * so on apply the RPC treats the line as pure audit evidence (no-op).
 *
 * Intentionally narrower than NewPlantGroupModal (no mother cut sessions,
 * no custom name, no planted date) — this is a rapid walk-time capture.
 */
export function PlantAuditOrphanModal({
  auditSessionId,
  growRoomId,
  growRoomLabel,
  onCreate,
  onCancel,
}: PlantAuditOrphanModalProps) {
  const [strains, setStrains] = useState<Strain[]>([]);
  const [loadingStrains, setLoadingStrains] = useState(true);

  const [strainId, setStrainId] = useState('');
  const [plantCount, setPlantCount] = useState('');
  const [stage, setStage] = useState<GrowthStage>('veg');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await productsService.fetchStrains();
        setStrains(data as Strain[]);
      } finally {
        setLoadingStrains(false);
      }
    }
    load();
  }, []);

  const selectedStrain = strains.find((s) => s.id === strainId);
  const hasAbbrev = isValidStrainAbbreviation(selectedStrain?.abbreviation);
  const count = parseInt(plantCount);
  const validCount = !isNaN(count) && count > 0;
  const canSave = strainId && validCount && hasAbbrev && !saving;

  async function handleCreate() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        audit_session_id: auditSessionId,
        grow_room_id: growRoomId,
        strain_id: strainId,
        plant_count: count,
        growth_stage: stage,
        notes: notes.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create orphan group');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal rounded-cult shadow-glass-lg max-w-lg w-full max-h-[90vh] overflow-y-auto border border-white/[0.10]">
        <div className="sticky top-0 glass-modal border-b border-white/[0.08] px-6 py-4 rounded-t-cult">
          <div className="flex items-center gap-3">
            <Sprout className="w-5 h-5 text-cult-accent" />
            <div>
              <h2 className="text-xl font-bold text-cult-text-primary uppercase tracking-wide">
                Orphan Plant Group
              </h2>
              <p className="text-xs text-cult-text-secondary mt-0.5">
                Found in {growRoomLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-cult-danger/10 border border-cult-danger/40 text-cult-danger text-sm p-3 rounded-cult">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-white/[0.05] border border-white/[0.08] rounded-cult p-3 text-xs text-cult-text-secondary">
            This creates a new plant group with the physical count you saw on the floor and
            links it to the audit as evidence. No inventory change happens on apply — the
            group is already correct.
          </div>

          {loadingStrains ? (
            <p className="text-cult-text-secondary text-sm">Loading strains…</p>
          ) : (
            <>
              <div>
                <label className="block text-xs text-cult-text-secondary uppercase tracking-wider mb-1">
                  Strain *
                </label>
                <select
                  value={strainId}
                  onChange={(e) => setStrainId(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
                >
                  <option value="">— Select strain —</option>
                  {strains.map((s) => {
                    const validAbbrev = isValidStrainAbbreviation(s.abbreviation);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {!validAbbrev ? ' (no abbreviation)' : ''}
                      </option>
                    );
                  })}
                </select>
                {selectedStrain && !hasAbbrev && (
                  <p className="text-cult-warning text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    This strain has no 3-letter abbreviation. Harvest will be blocked.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-cult-text-secondary uppercase tracking-wider mb-1">
                    Plant Count *
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={plantCount}
                    onChange={(e) => setPlantCount(e.target.value)}
                    placeholder="0"
                    className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
                  />
                </div>
                <div>
                  <label className="block text-xs text-cult-text-secondary uppercase tracking-wider mb-1">
                    Stage *
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as GrowthStage)}
                    className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
                  >
                    {STAGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-cult-text-secondary uppercase tracking-wider mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Where were they? Any context…"
                  className="glass-input w-full px-3 py-2 rounded-cult text-cult-text-primary placeholder-cult-text-muted focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 justify-end px-6 pb-6 border-t border-white/[0.08] pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-5 py-2 rounded-xl border border-white/[0.15] text-cult-text-primary hover:bg-white/[0.06] hover:border-white/[0.25] transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canSave}
            className="px-5 py-2 rounded-xl bg-cult-accent text-cult-opaque-black font-bold flex items-center gap-2 hover:bg-cult-accent-hover transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Creating…' : 'Create Orphan Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
