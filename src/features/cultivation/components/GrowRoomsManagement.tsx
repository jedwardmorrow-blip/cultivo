import { useState } from 'react';
import { Plus, Pencil, Archive, RotateCcw, AlertTriangle, ChevronDown, ChevronRight, Calendar, X, Layers } from 'lucide-react';
import { Button } from '@/shared/components';
import { useGrowRooms } from '../hooks/useGrowRooms';
import { useRoomSections } from '../hooks/useRoomSections';
import { LayoutBuilder } from './LayoutBuilder';
import { formatDate, daysBetween, todayIso } from '../utils/dateUtils';
import { ROOM_TYPE_BADGE } from '../constants/stageColors';
import type { GrowRoom, RoomType, RoomTable, RoomSection, CreateGrowRoomInput, UpdateGrowRoomInput } from '../types';

const ROOM_TYPE_OPTIONS: { value: RoomType; label: string }[] = [
  { value: 'clone', label: 'Clone' },
  { value: 'veg', label: 'Veg' },
  { value: 'flower', label: 'Flower' },
  { value: 'mother', label: 'Mother' },
  { value: 'mixed', label: 'Mixed' },
];

const ROOM_TYPE_COLORS = ROOM_TYPE_BADGE as Record<RoomType, string>;

interface RunDatesProps {
  section: RoomSection;
  onUpdate: (id: string, flip: string | null, harvest: string | null) => Promise<void>;
}

function RunDates({ section, onUpdate }: RunDatesProps) {
  const [editingFlip, setEditingFlip] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState(false);
  const [flipVal, setFlipVal] = useState(section.flip_date ?? '');
  const [harvestVal, setHarvestVal] = useState(section.projected_harvest_date ?? '');
  const [saving, setSaving] = useState(false);

  const today = todayIso();

  const flipDate = section.flip_date;
  const harvestDate = section.projected_harvest_date;

  const dayOfRun = flipDate ? daysBetween(flipDate, today) + 1 : null;
  const runLength = (flipDate && harvestDate) ? daysBetween(flipDate, harvestDate) : null;
  const daysToHarvest = harvestDate ? daysBetween(today, harvestDate) : null;

  async function saveFlip(val: string) {
    setSaving(true);
    try {
      await onUpdate(section.id, val || null, section.projected_harvest_date);
    } finally {
      setSaving(false);
      setEditingFlip(false);
    }
  }

  async function saveHarvest(val: string) {
    setSaving(true);
    try {
      await onUpdate(section.id, section.flip_date, val || null);
    } finally {
      setSaving(false);
      setEditingHarvest(false);
    }
  }

  function countdownColor(): string {
    if (daysToHarvest === null) return 'text-cult-medium-gray';
    if (daysToHarvest < 0) return 'text-red-400';
    if (daysToHarvest <= 7) return 'text-amber-400';
    return 'text-cult-light-gray';
  }

  function countdownText(): string {
    if (daysToHarvest === null) return '';
    if (daysToHarvest === 0) return 'harvest today';
    if (daysToHarvest < 0) return `${Math.abs(daysToHarvest)} day${Math.abs(daysToHarvest) !== 1 ? 's' : ''} overdue`;
    return `in ${daysToHarvest} day${daysToHarvest !== 1 ? 's' : ''}`;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-cult-medium-gray uppercase tracking-wider w-20 flex-shrink-0">Flip</span>
        {editingFlip ? (
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={flipVal}
              onChange={(e) => setFlipVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveFlip(flipVal);
                if (e.key === 'Escape') setEditingFlip(false);
              }}
              autoFocus
              disabled={saving}
              className="bg-cult-black border border-rose-700 text-cult-white px-2 py-0.5 text-xs focus:outline-none focus:border-rose-500"
            />
            <button
              onClick={() => saveFlip(flipVal)}
              disabled={saving}
              className="text-xs text-rose-400 hover:text-rose-300 px-1 disabled:opacity-40"
            >
              {saving ? '...' : 'Save'}
            </button>
            <button onClick={() => setEditingFlip(false)} className="text-xs text-cult-medium-gray hover:text-cult-light-gray px-1">Cancel</button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setFlipVal(flipDate ?? ''); setEditingFlip(true); }}
              className="flex items-center gap-1 text-xs text-cult-light-gray hover:text-cult-white transition-colors"
            >
              <Calendar className="w-3 h-3 opacity-60" />
              {flipDate ? formatDate(flipDate) : <span className="text-cult-medium-gray italic">Set flip date</span>}
            </button>
            {flipDate && (
              <button
                onClick={() => onUpdate(section.id, null, section.projected_harvest_date)}
                className="text-cult-medium-gray hover:text-red-400 transition-colors"
                title="Clear flip date"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            {dayOfRun !== null && (
              <span className="text-xs font-bold text-rose-400 border border-rose-800 px-1.5 py-0.5 bg-rose-950">
                Day {dayOfRun}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-cult-medium-gray uppercase tracking-wider w-20 flex-shrink-0">Harvest</span>
        {editingHarvest ? (
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={harvestVal}
              onChange={(e) => setHarvestVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveHarvest(harvestVal);
                if (e.key === 'Escape') setEditingHarvest(false);
              }}
              autoFocus
              disabled={saving}
              className="bg-cult-black border border-rose-700 text-cult-white px-2 py-0.5 text-xs focus:outline-none focus:border-rose-500"
            />
            <button
              onClick={() => saveHarvest(harvestVal)}
              disabled={saving}
              className="text-xs text-rose-400 hover:text-rose-300 px-1 disabled:opacity-40"
            >
              {saving ? '...' : 'Save'}
            </button>
            <button onClick={() => setEditingHarvest(false)} className="text-xs text-cult-medium-gray hover:text-cult-light-gray px-1">Cancel</button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => { setHarvestVal(harvestDate ?? ''); setEditingHarvest(true); }}
              className="flex items-center gap-1 text-xs text-cult-light-gray hover:text-cult-white transition-colors"
            >
              <Calendar className="w-3 h-3 opacity-60" />
              {harvestDate ? formatDate(harvestDate) : <span className="text-cult-medium-gray italic">Set harvest date</span>}
            </button>
            {harvestDate && (
              <button
                onClick={() => onUpdate(section.id, section.flip_date, null)}
                className="text-cult-medium-gray hover:text-red-400 transition-colors"
                title="Clear harvest date"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            {runLength !== null && (
              <span className="text-xs text-cult-medium-gray">{runLength}-day run</span>
            )}
            {countdownText() && (
              <span className={`text-xs font-medium ${countdownColor()}`}>{countdownText()}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface FlowerSectionPanelProps {
  roomId: string;
}

function FlowerSectionPanel({ roomId }: FlowerSectionPanelProps) {
  const { tables, loading, error, hasSections, updateSection } = useRoomSections(roomId);

  async function handleUpdate(sectionId: string, flip: string | null, harvest: string | null) {
    await updateSection(sectionId, {
      flip_date: flip,
      projected_harvest_date: harvest,
    });
  }

  if (loading) {
    return <p className="text-xs text-cult-medium-gray px-1 py-2">Loading sections...</p>;
  }

  if (error) {
    return <p className="text-xs text-red-400 px-1 py-2">{error}</p>;
  }

  if (!hasSections) {
    return (
      <p className="text-xs text-cult-medium-gray italic px-1 py-2">
        No sections configured. Add tables and sections in the room layout settings.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {tables.map((table: RoomTable) => (
        <div key={table.id}>
          <p className="text-xs text-cult-medium-gray uppercase tracking-wider mb-2">
            Table {table.table_number}{table.table_name ? ` — ${table.table_name}` : ''}
          </p>
          <div className="space-y-3">
            {table.sections.map((section: RoomSection) => (
              <div key={section.id} className="border border-rose-900 bg-rose-950/20 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-rose-300 font-mono">Section {section.section_label}</span>
                  {section.section_sqft && (
                    <span className="text-xs text-cult-medium-gray">{section.section_sqft} sqft</span>
                  )}
                </div>
                <RunDates section={section} onUpdate={handleUpdate} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface RoomFormState {
  name: string;
  room_code: string;
  room_type: RoomType;
  capacity_plants: string;
}

const EMPTY_FORM: RoomFormState = { name: '', room_code: '', room_type: 'veg', capacity_plants: '' };

interface RoomFormProps {
  initial?: RoomFormState;
  isEdit?: boolean;
  onSave: (data: CreateGrowRoomInput | UpdateGrowRoomInput) => Promise<void>;
  onCancel: () => void;
}

function RoomForm({ initial = EMPTY_FORM, isEdit = false, onSave, onCancel }: RoomFormProps) {
  const [form, setForm] = useState<RoomFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = form.name.trim() && (isEdit || form.room_code.trim()) && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const payload: CreateGrowRoomInput | UpdateGrowRoomInput = {
        name: form.name.trim(),
        room_type: form.room_type,
        capacity_plants: form.capacity_plants ? parseInt(form.capacity_plants) : null,
      };
      if (!isEdit) {
        (payload as CreateGrowRoomInput).room_code = form.room_code.toUpperCase().trim();
      }
      await onSave(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save room.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray p-5 space-y-4">
      {error && (
        <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-sm p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Room Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Veg Room A"
            className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
          />
        </div>

        <div>
          <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">
            Room Code {!isEdit && '*'}
          </label>
          <input
            type="text"
            value={form.room_code}
            onChange={(e) => setForm({ ...form, room_code: e.target.value.toUpperCase() })}
            placeholder="e.g. VEG-A"
            readOnly={isEdit}
            className={`w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {isEdit && <p className="text-cult-medium-gray text-xs mt-1">Room code cannot be changed after creation.</p>}
        </div>

        <div>
          <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Room Type *</label>
          <select
            value={form.room_type}
            onChange={(e) => setForm({ ...form, room_type: e.target.value as RoomType })}
            className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
          >
            {ROOM_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Capacity (plants)</label>
          <input
            type="number"
            min="1"
            value={form.capacity_plants}
            onChange={(e) => setForm({ ...form, capacity_plants: e.target.value })}
            placeholder="Optional"
            className="w-full bg-cult-black border border-cult-medium-gray text-cult-white px-3 py-2 text-sm focus:outline-none focus:border-cult-lighter-gray"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={!canSave}
          size="sm"
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Room'}
        </Button>
        <button
          onClick={onCancel}
          className="px-5 py-2 text-sm font-bold uppercase tracking-wider border border-cult-medium-gray text-cult-light-gray hover:border-cult-lighter-gray hover:text-cult-white transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface RoomCardProps {
  room: GrowRoom;
  onEdit: (r: GrowRoom) => void;
  onArchive: (r: GrowRoom) => void;
  onRestore: (r: GrowRoom) => void;
}

function RoomCard({ room, onEdit, onArchive, onRestore }: RoomCardProps) {
  const typeCls = ROOM_TYPE_COLORS[room.room_type] ?? ROOM_TYPE_COLORS.mixed;
  const isFlower = room.room_type === 'flower';
  const [expanded, setExpanded] = useState(false);
  const [layoutExpanded, setLayoutExpanded] = useState(false);

  return (
    <div className={`border ${room.is_active ? typeCls : 'border-cult-medium-gray text-cult-medium-gray bg-cult-near-black opacity-60'}`}>
      <div
        className={`p-4 ${isFlower && room.is_active ? 'cursor-pointer select-none' : ''}`}
        onClick={isFlower && room.is_active ? () => setExpanded((v) => !v) : undefined}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold">{room.room_code}</span>
              <span className={`text-xs border px-1.5 py-0.5 uppercase tracking-wider ${typeCls}`}>
                {room.room_type}
              </span>
              {!room.is_active && (
                <span className="text-xs border border-cult-medium-gray px-1.5 py-0.5 uppercase tracking-wider text-cult-medium-gray">
                  Archived
                </span>
              )}
            </div>
            <span className="text-cult-white text-sm font-semibold truncate">{room.name}</span>
            {room.capacity_plants && (
              <span className="text-xs opacity-70">{room.capacity_plants} plant capacity</span>
            )}
            {isFlower && room.is_active && (
              <div className="flex items-center gap-1 mt-1">
                {expanded
                  ? <ChevronDown className="w-3 h-3 text-rose-400" />
                  : <ChevronRight className="w-3 h-3 text-rose-400" />
                }
                <span className="text-xs text-rose-400 uppercase tracking-wider">
                  {expanded ? 'Hide sections' : 'View sections & run dates'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {room.is_active && (
              <>
                <button
                  onClick={() => onEdit(room)}
                  className="p-1.5 text-cult-medium-gray hover:text-cult-white transition-colors"
                  title="Edit room"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onArchive(room)}
                  className="p-1.5 text-cult-medium-gray hover:text-red-400 transition-colors"
                  title="Archive room"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {!room.is_active && (
              <button
                onClick={() => onRestore(room)}
                className="p-1.5 text-cult-medium-gray hover:text-green-400 transition-colors"
                title="Restore room"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isFlower && room.is_active && expanded && (
        <div className="border-t border-rose-900 px-4 pb-4 pt-3">
          <p className="text-xs text-rose-400 uppercase tracking-wider mb-3 font-semibold">Section Run Dates</p>
          <FlowerSectionPanel roomId={room.id} />
        </div>
      )}

      {room.is_active && (
        <div className="border-t border-cult-dark-gray">
          <button
            onClick={() => setLayoutExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-cult-medium-gray hover:text-cult-light-gray transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              <span className="uppercase tracking-wider">Configure Layout</span>
            </div>
            {layoutExpanded
              ? <ChevronDown className="w-3 h-3" />
              : <ChevronRight className="w-3 h-3" />
            }
          </button>
          {layoutExpanded && (
            <div className="border-t border-cult-dark-gray px-4 pb-4 pt-3">
              <LayoutBuilder roomId={room.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GrowRoomsManagement() {
  const { rooms, loading, error, createRoom, updateRoom, archiveRoom } = useGrowRooms();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<GrowRoom | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const activeRooms = rooms.filter((r) => r.is_active);
  const archivedRooms = rooms.filter((r) => !r.is_active);

  if (loading) {
    return <div className="p-6 text-cult-light-gray">Loading grow rooms...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cult-white uppercase tracking-wide">Grow Rooms</h1>
          <p className="text-cult-light-gray mt-2">Configure grow rooms for plant group assignments</p>
        </div>
        <Button
          onClick={() => { setShowAddForm(!showAddForm); setEditingRoom(null); }}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Room
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-950 border border-red-700 text-red-300 text-sm p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {showAddForm && !editingRoom && (
        <RoomForm
          onSave={async (data) => { await createRoom(data as CreateGrowRoomInput); setShowAddForm(false); }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingRoom && (
        <RoomForm
          isEdit
          initial={{
            name: editingRoom.name,
            room_code: editingRoom.room_code,
            room_type: editingRoom.room_type,
            capacity_plants: editingRoom.capacity_plants ? String(editingRoom.capacity_plants) : '',
          }}
          onSave={async (data) => { await updateRoom(editingRoom.id, data); setEditingRoom(null); }}
          onCancel={() => setEditingRoom(null)}
        />
      )}

      {activeRooms.length === 0 && !showAddForm ? (
        <div className="bg-cult-near-black border border-cult-medium-gray p-8 text-center">
          <p className="text-cult-medium-gray text-sm uppercase tracking-wider">No active grow rooms — add one to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onEdit={(r) => { setEditingRoom(r); setShowAddForm(false); }}
              onArchive={(r) => archiveRoom(r.id)}
              onRestore={(r) => updateRoom(r.id, { is_active: true })}
            />
          ))}
        </div>
      )}

      {archivedRooms.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-xs text-cult-medium-gray hover:text-cult-light-gray uppercase tracking-wider transition-colors"
          >
            {showArchived ? 'Hide' : 'Show'} {archivedRooms.length} archived room{archivedRooms.length !== 1 ? 's' : ''}
          </button>
          {showArchived && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              {archivedRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onEdit={(r) => setEditingRoom(r)}
                  onArchive={(r) => archiveRoom(r.id)}
                  onRestore={(r) => updateRoom(r.id, { is_active: true })}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
