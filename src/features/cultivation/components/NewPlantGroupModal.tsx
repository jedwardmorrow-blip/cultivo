import { useState, useEffect } from 'react';
import { Sprout, AlertTriangle, Plus, Trash2, Scissors } from 'lucide-react';
import { cultivationService } from '../services';
import { productsService } from '@/features/products/services';
import { isValidStrainAbbreviation } from '../utils';
import type { GrowRoom, PlantGroup, CreatePlantGroupInput, PlantSourceType } from '../types';

interface Strain {
  id: string;
  name: string;
  abbreviation: string | null;
}

interface CutSessionRow {
  id: string;
  motherGroupId: string;
  cutCount: string;
}

interface NewPlantGroupModalProps {
  rooms: GrowRoom[];
  onCreate: (input: CreatePlantGroupInput) => Promise<PlantGroup>;
  onCancel: () => void;
}

function genRowId() {
  return Math.random().toString(36).slice(2);
}

export function NewPlantGroupModal({ rooms, onCreate, onCancel }: NewPlantGroupModalProps) {
  const [strains, setStrains] = useState<Strain[]>([]);
  const [allMotherGroups, setAllMotherGroups] = useState<PlantGroup[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [sourceType, setSourceType] = useState<PlantSourceType>('clone');
  const [strainId, setStrainId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [seedPlantCount, setSeedPlantCount] = useState('');
  const [name, setName] = useState('');
  const [plantedDate, setPlantedDate] = useState('');
  const [notes, setNotes] = useState('');

  const [cutSessions, setCutSessions] = useState<CutSessionRow[]>([
    { id: genRowId(), motherGroupId: '', cutCount: '' },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [strainData, motherData] = await Promise.all([
          productsService.fetchStrains(),
          cultivationService.listMotherGroups(),
        ]);
        setStrains(strainData as Strain[]);
        setAllMotherGroups(motherData);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  const selectedStrain = strains.find((s) => s.id === strainId);
  const hasAbbrev = isValidStrainAbbreviation(selectedStrain?.abbreviation);

  const activeRooms = rooms.filter((r) => r.is_active);

  const strainFilteredMothers = allMotherGroups.filter(
    (m) => strainId && m.strain_id === strainId
  );

  function handleStrainChange(newStrainId: string) {
    setStrainId(newStrainId);
    setCutSessions([{ id: genRowId(), motherGroupId: '', cutCount: '' }]);
  }

  function updateCutSession(rowId: string, field: keyof Omit<CutSessionRow, 'id'>, value: string) {
    setCutSessions((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  }

  function addCutSession() {
    setCutSessions((prev) => [...prev, { id: genRowId(), motherGroupId: '', cutCount: '' }]);
  }

  function removeCutSession(rowId: string) {
    setCutSessions((prev) => prev.filter((row) => row.id !== rowId));
  }

  const derivedCloneCount = cutSessions.reduce((sum, cs) => {
    const n = parseInt(cs.cutCount);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  const effectivePlantCount = sourceType === 'clone' ? derivedCloneCount : parseInt(seedPlantCount);

  const cloneValidation = sourceType === 'clone' ? (() => {
    if (cutSessions.length === 0) return 'At least one cut session is required';
    for (const cs of cutSessions) {
      if (!cs.motherGroupId) return 'All cut sessions must have a mother selected';
      if (!cs.cutCount || parseInt(cs.cutCount) < 1) return 'All cut sessions must have a valid cut count';
    }
    const usedMothers = cutSessions.map((cs) => cs.motherGroupId);
    const uniqueMothers = new Set(usedMothers);
    if (uniqueMothers.size !== usedMothers.length) return 'Each mother can only appear once per group';
    return null;
  })() : null;

  const canSave =
    strainId &&
    roomId &&
    effectivePlantCount > 0 &&
    hasAbbrev &&
    cloneValidation === null &&
    !saving;

  async function handleCreate() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const input: CreatePlantGroupInput = {
        strain_id: strainId,
        grow_room_id: roomId,
        plant_count: effectivePlantCount,
        name: name.trim() || undefined,
        planted_date: plantedDate || undefined,
        notes: notes.trim() || undefined,
        is_mother: false,
        source_type: sourceType,
      };

      if (sourceType === 'clone' && cutSessions.length > 0) {
        input.cut_sessions = cutSessions.map((cs) => ({
          mother_plant_group_id: cs.motherGroupId,
          cut_count: parseInt(cs.cutCount),
        }));
      }

      await onCreate(input);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create plant group.');
    } finally {
      setSaving(false);
    }
  }

  function getMotherLabel(m: PlantGroup) {
    const activePlant = m.individual_plants?.find((p) => p.is_active);
    const plantId = activePlant?.state_plant_id;
    const batchNum = m.batch_registry?.batch_number;
    const strainName = m.strains?.name ?? 'Unknown';
    const stage = m.growth_stage;
    if (plantId) return `${plantId} — ${strainName} (${stage})`;
    if (batchNum) return `${batchNum} — ${strainName} (${stage})`;
    return `${strainName} (${stage})`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-cult-near-black border border-cult-medium-gray w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <Sprout className="w-5 h-5 text-cult-light-gray" />
            <h3 className="text-lg font-bold text-cult-white uppercase tracking-wider">New Plant Group</h3>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-sm p-3 mb-4">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {loadingData ? (
            <p className="text-cult-medium-gray text-sm">Loading data...</p>
          ) : (
            <div className="space-y-4">

              <div>
                <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-2">Source Type *</label>
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => setSourceType('clone')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider border transition-all ${
                      sourceType === 'clone'
                        ? 'bg-white text-cult-black border-white'
                        : 'bg-transparent text-cult-medium-gray border-cult-medium-gray hover:border-cult-lighter-gray hover:text-cult-light-gray'
                    }`}
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    Clone
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType('seed')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider border-t border-b border-r transition-all ${
                      sourceType === 'seed'
                        ? 'bg-white text-cult-black border-white'
                        : 'bg-transparent text-cult-medium-gray border-cult-medium-gray hover:border-cult-lighter-gray hover:text-cult-light-gray'
                    }`}
                  >
                    <Sprout className="w-3.5 h-3.5" />
                    Seed
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Strain *</label>
                <select
                  value={strainId}
                  onChange={(e) => handleStrainChange(e.target.value)}
                  className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
                >
                  <option value="">— Select strain —</option>
                  {strains.map((s) => {
                    const validAbbrev = isValidStrainAbbreviation(s.abbreviation);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name}{!validAbbrev ? ' (no abbreviation)' : ''}
                      </option>
                    );
                  })}
                </select>
                {selectedStrain && !hasAbbrev && (
                  <p className="text-amber-400 text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    This strain has no 3-letter abbreviation. Harvest will be blocked.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Grow Room *</label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
                >
                  <option value="">— Select room —</option>
                  {activeRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.room_code} — {r.name} ({r.room_type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">
                    Plant Count {sourceType === 'clone' ? '(from cuts)' : '*'}
                  </label>
                  {sourceType === 'clone' ? (
                    <div className="w-full bg-cult-black border border-cult-dark-gray text-cult-white px-3 py-2 text-sm flex items-center justify-between">
                      <span className={derivedCloneCount > 0 ? 'text-cult-white font-semibold' : 'text-cult-dark-gray'}>
                        {derivedCloneCount > 0 ? derivedCloneCount : '—'}
                      </span>
                      {derivedCloneCount > 0 && (
                        <span className="text-xs text-cult-medium-gray">auto</span>
                      )}
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      value={seedPlantCount}
                      onChange={(e) => setSeedPlantCount(e.target.value)}
                      placeholder="e.g. 24"
                      className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Planted Date</label>
                  <input
                    type="date"
                    value={plantedDate}
                    onChange={(e) => setPlantedDate(e.target.value)}
                    className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
                  />
                </div>
              </div>

              {sourceType === 'clone' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-cult-light-gray uppercase tracking-wider">
                      Cut Sessions *
                    </label>
                    {strainId && strainFilteredMothers.length === 0 && (
                      <span className="text-xs text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        No mothers for this strain
                      </span>
                    )}
                  </div>

                  {cutSessions.map((row, idx) => (
                    <div key={row.id} className="border border-cult-dark-gray p-3 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-cult-medium-gray uppercase tracking-wider">
                          Cut {idx + 1}
                        </span>
                        {cutSessions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCutSession(row.id)}
                            className="text-cult-medium-gray hover:text-red-400 transition-colors"
                            title="Remove cut session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs text-cult-light-gray mb-1">Mother *</label>
                        <select
                          value={row.motherGroupId}
                          onChange={(e) => updateCutSession(row.id, 'motherGroupId', e.target.value)}
                          disabled={!strainId}
                          className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-1.5 text-sm focus:outline-none focus:border-cult-lighter-gray disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <option value="">— Select mother —</option>
                          {strainFilteredMothers.map((m) => (
                            <option
                              key={m.id}
                              value={m.id}
                              disabled={cutSessions.some(
                                (cs) => cs.id !== row.id && cs.motherGroupId === m.id
                              )}
                            >
                              {getMotherLabel(m)}
                            </option>
                          ))}
                        </select>
                        {!strainId && (
                          <p className="text-xs text-cult-dark-gray mt-0.5">Select a strain first</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs text-cult-light-gray mb-1">Cut Count *</label>
                        <input
                          type="number"
                          min="1"
                          value={row.cutCount}
                          onChange={(e) => updateCutSession(row.id, 'cutCount', e.target.value)}
                          placeholder="e.g. 25"
                          className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-1.5 text-sm focus:outline-none focus:border-cult-lighter-gray"
                        />
                      </div>
                    </div>
                  ))}

                  {cloneValidation && cutSessions.some((cs) => cs.motherGroupId) && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {cloneValidation}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={addCutSession}
                    disabled={!strainId || strainFilteredMothers.length <= cutSessions.length}
                    className="flex items-center gap-1.5 text-xs text-cult-light-gray hover:text-cult-white border border-dashed border-cult-dark-gray hover:border-cult-medium-gray px-3 py-2 w-full justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add cuts from new mother
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Group Name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Custom label"
                  className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
                />
              </div>

              <div>
                <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
                />
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-not-allowed opacity-50" title="New groups start at clone stage. Designate as mother after advancing to Veg.">
                  <input
                    type="checkbox"
                    checked={false}
                    disabled
                    className="w-4 h-4 accent-white"
                  />
                  <span className="text-sm text-cult-medium-gray">Mark as mother plant group</span>
                </label>
                <p className="text-xs text-cult-dark-gray">New groups start at clone stage. Designate as mother after advancing to Veg.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={handleCreate}
            disabled={!canSave}
            className="flex items-center gap-2 bg-white text-cult-black px-5 py-2 text-sm font-bold uppercase tracking-wider hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sprout className="w-4 h-4" />
            {saving ? 'Creating...' : 'Create Group'}
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-2 text-sm font-bold uppercase tracking-wider border border-cult-medium-gray text-cult-light-gray hover:border-cult-lighter-gray hover:text-cult-white transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
