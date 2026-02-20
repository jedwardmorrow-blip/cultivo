import { useState, useEffect } from 'react';
import { Sprout, AlertTriangle } from 'lucide-react';
import { cultivationService } from '../services';
import { productsService } from '@/features/products/services';
import { isValidStrainAbbreviation } from '../utils';
import type { GrowRoom, PlantGroup, CreatePlantGroupInput } from '../types';

interface Strain {
  id: string;
  name: string;
  abbreviation: string | null;
}

interface NewPlantGroupModalProps {
  rooms: GrowRoom[];
  onCreate: (input: CreatePlantGroupInput) => Promise<PlantGroup>;
  onCancel: () => void;
}

export function NewPlantGroupModal({ rooms, onCreate, onCancel }: NewPlantGroupModalProps) {
  const [strains, setStrains] = useState<Strain[]>([]);
  const [motherGroups, setMotherGroups] = useState<PlantGroup[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [strainId, setStrainId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [plantCount, setPlantCount] = useState('');
  const [name, setName] = useState('');
  const [plantedDate, setPlantedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [motherGroupId, setMotherGroupId] = useState('');

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
        setMotherGroups(motherData);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  const selectedStrain = strains.find((s) => s.id === strainId);
  const hasAbbrev = isValidStrainAbbreviation(selectedStrain?.abbreviation);

  const activeRooms = rooms.filter((r) => r.is_active);

  const isMother = false;

  const canSave =
    strainId &&
    roomId &&
    parseInt(plantCount) > 0 &&
    hasAbbrev &&
    !saving;

  async function handleCreate() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const input: CreatePlantGroupInput = {
        strain_id: strainId,
        grow_room_id: roomId,
        plant_count: parseInt(plantCount),
        name: name.trim() || undefined,
        planted_date: plantedDate || undefined,
        notes: notes.trim() || undefined,
        is_mother: isMother,
        mother_plant_group_id: motherGroupId || undefined,
      };
      await onCreate(input);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create plant group.');
    } finally {
      setSaving(false);
    }
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
                <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Strain *</label>
                <select
                  value={strainId}
                  onChange={(e) => setStrainId(e.target.value)}
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
                  <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Plant Count *</label>
                  <input
                    type="number"
                    min="1"
                    value={plantCount}
                    onChange={(e) => setPlantCount(e.target.value)}
                    placeholder="e.g. 24"
                    className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
                  />
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

              {motherGroups.filter((m) => m.growth_stage === 'veg' || m.growth_stage === 'flower').length > 0 && (
                <div>
                  <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Source Mother (optional)</label>
                  <select
                    value={motherGroupId}
                    onChange={(e) => setMotherGroupId(e.target.value)}
                    className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
                  >
                    <option value="">— None —</option>
                    {motherGroups
                      .filter((m) => m.growth_stage === 'veg' || m.growth_stage === 'flower')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.batch_registry?.batch_number ?? m.strains?.name ?? 'Unknown'} ({m.growth_stage})
                        </option>
                      ))}
                  </select>
                </div>
              )}

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
