import { useState } from 'react';
import { Plus, Pencil, Archive, RotateCcw, AlertTriangle } from 'lucide-react';
import { useGrowRooms } from '../hooks/useGrowRooms';
import type { GrowRoom, RoomType, CreateGrowRoomInput, UpdateGrowRoomInput } from '../types';

const ROOM_TYPE_OPTIONS: { value: RoomType; label: string }[] = [
  { value: 'clone', label: 'Clone' },
  { value: 'veg', label: 'Veg' },
  { value: 'flower', label: 'Flower' },
  { value: 'mother', label: 'Mother' },
  { value: 'mixed', label: 'Mixed' },
];

const ROOM_TYPE_COLORS: Record<RoomType, string> = {
  clone: 'bg-sky-950 border-sky-700 text-sky-400',
  veg: 'bg-green-950 border-green-700 text-green-400',
  flower: 'bg-rose-950 border-rose-700 text-rose-400',
  mother: 'bg-amber-950 border-amber-700 text-amber-400',
  mixed: 'bg-cult-black border-cult-medium-gray text-cult-light-gray',
};

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
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="bg-white text-cult-black px-5 py-2 text-sm font-bold uppercase tracking-wider hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Room'}
        </button>
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

  return (
    <div className={`border p-4 ${room.is_active ? typeCls : 'border-cult-medium-gray text-cult-medium-gray bg-cult-near-black opacity-60'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
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
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
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
          <h1 className="text-4xl font-bold text-cult-white uppercase tracking-wide">Grow Rooms</h1>
          <p className="text-cult-light-gray mt-2">Configure grow rooms for plant group assignments</p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setEditingRoom(null); }}
          className="flex items-center gap-2 bg-white text-cult-black px-6 py-3 font-bold uppercase tracking-wider hover:bg-gray-100 transition-all shadow-lg text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Room
        </button>
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
