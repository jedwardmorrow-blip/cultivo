import { useState } from 'react';
import { Plus, Pencil, Archive, RotateCcw, AlertTriangle, Wind } from 'lucide-react';
import { useDryRooms } from '../hooks/useDryRooms';
import type { DryRoom, CreateDryRoomInput, UpdateDryRoomInput } from '../types';

interface DryRoomFormState {
  name: string;
  room_code: string;
  capacity_lbs: string;
}

const EMPTY_FORM: DryRoomFormState = { name: '', room_code: '', capacity_lbs: '' };

function formToInput(form: DryRoomFormState): CreateDryRoomInput {
  return {
    name: form.name.trim(),
    room_code: form.room_code.trim().toUpperCase(),
    capacity_lbs: form.capacity_lbs ? parseFloat(form.capacity_lbs) : null,
  };
}

interface DryRoomFormProps {
  initial?: DryRoomFormState;
  onSubmit: (data: DryRoomFormState) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  isCreate?: boolean;
}

function DryRoomForm({ initial = EMPTY_FORM, onSubmit, onCancel, submitLabel, isCreate }: DryRoomFormProps) {
  const [form, setForm] = useState<DryRoomFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function update(field: keyof DryRoomFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Name is required'); return; }
    if (!form.room_code.trim()) { setErr('Room code is required'); return; }
    if (form.capacity_lbs && isNaN(parseFloat(form.capacity_lbs))) { setErr('Capacity must be a valid number'); return; }
    if (form.capacity_lbs && parseFloat(form.capacity_lbs) <= 0) { setErr('Capacity must be greater than 0'); return; }
    setSaving(true);
    setErr(null);
    try {
      await onSubmit(form);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {err && (
        <div className="flex items-center gap-2 rounded-md bg-red-950 border border-red-700 px-3 py-2 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-cult-light-gray mb-1">Room Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Dry Room A"
            className="w-full rounded-md bg-cult-dark-gray border border-cult-medium-gray text-cult-white text-sm px-3 py-2 focus:outline-none focus:border-cult-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-cult-light-gray mb-1">
            Room Code *{isCreate && <span className="text-cult-medium-gray ml-1">(immutable)</span>}
          </label>
          <input
            type="text"
            value={form.room_code}
            onChange={(e) => update('room_code', e.target.value)}
            placeholder="e.g. DR-A"
            disabled={!isCreate}
            className="w-full rounded-md bg-cult-dark-gray border border-cult-medium-gray text-cult-white text-sm px-3 py-2 focus:outline-none focus:border-cult-white disabled:opacity-50 disabled:cursor-not-allowed uppercase"
          />
        </div>
      </div>

      <div className="max-w-xs">
        <label className="block text-xs font-medium text-cult-light-gray mb-1">Capacity (lbs) <span className="text-cult-medium-gray">optional</span></label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={form.capacity_lbs}
          onChange={(e) => update('capacity_lbs', e.target.value)}
          placeholder="e.g. 50"
          className="w-full rounded-md bg-cult-dark-gray border border-cult-medium-gray text-cult-white text-sm px-3 py-2 focus:outline-none focus:border-cult-white"
        />
        <p className="mt-1 text-xs text-cult-medium-gray">Informational only — not enforced against session weights.</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-md bg-cult-white text-cult-black text-sm font-medium hover:bg-cult-light-gray transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-md border border-cult-medium-gray text-cult-light-gray text-sm hover:border-cult-white hover:text-cult-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

interface DryRoomRowProps {
  room: DryRoom;
  onEdit: (room: DryRoom) => void;
  onArchive: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  showArchived: boolean;
}

function DryRoomRow({ room, onEdit, onArchive, onRestore, showArchived }: DryRoomRowProps) {
  const [acting, setActing] = useState(false);

  async function handleToggle() {
    setActing(true);
    try {
      if (room.is_active) await onArchive(room.id);
      else await onRestore(room.id);
    } finally {
      setActing(false);
    }
  }

  if (!showArchived && !room.is_active) return null;

  return (
    <div className={`flex items-center justify-between rounded-md border px-4 py-3 transition-colors ${room.is_active ? 'bg-cult-dark-gray border-cult-medium-gray' : 'bg-cult-black border-cult-dark-gray opacity-60'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <Wind className="h-4 w-4 text-sky-400 flex-shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-cult-white">{room.name}</span>
            {!room.is_active && (
              <span className="text-xs text-cult-medium-gray border border-cult-medium-gray rounded px-1.5 py-0.5">Archived</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-cult-medium-gray font-mono">{room.room_code}</span>
            {room.capacity_lbs && (
              <span className="text-xs text-cult-medium-gray">Cap: {room.capacity_lbs} lbs</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {room.is_active && (
          <button
            onClick={() => onEdit(room)}
            className="p-1.5 rounded text-cult-medium-gray hover:text-cult-white hover:bg-cult-medium-gray/20 transition-colors"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={handleToggle}
          disabled={acting}
          className="p-1.5 rounded text-cult-medium-gray hover:text-cult-white hover:bg-cult-medium-gray/20 transition-colors disabled:opacity-50"
          title={room.is_active ? 'Archive' : 'Restore'}
        >
          {room.is_active ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function DryRoomsManagement() {
  const { rooms, loading, error, reload, createRoom, updateRoom, archiveRoom } = useDryRooms();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<DryRoom | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  async function handleCreate(form: DryRoomFormState) {
    await createRoom(formToInput(form));
    setShowCreateForm(false);
  }

  async function handleEdit(form: DryRoomFormState) {
    if (!editingRoom) return;
    const input: UpdateDryRoomInput = {
      name: form.name.trim(),
      capacity_lbs: form.capacity_lbs ? parseFloat(form.capacity_lbs) : null,
    };
    await updateRoom(editingRoom.id, input);
    setEditingRoom(null);
  }

  async function handleArchive(id: string) {
    await archiveRoom(id);
  }

  async function handleRestore(id: string) {
    await updateRoom(id, { is_active: true });
  }

  const activeCount = rooms.filter((r) => r.is_active).length;
  const archivedCount = rooms.filter((r) => !r.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-cult-white">Dry Rooms</h2>
          <p className="text-sm text-cult-medium-gray mt-0.5">
            {activeCount} active{archivedCount > 0 ? `, ${archivedCount} archived` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="text-xs text-cult-medium-gray hover:text-cult-white transition-colors"
            >
              {showArchived ? 'Hide archived' : 'Show archived'}
            </button>
          )}
          <button
            onClick={() => { setShowCreateForm(true); setEditingRoom(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cult-white text-cult-black text-sm font-medium hover:bg-cult-light-gray transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Dry Room
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="rounded-lg border border-cult-medium-gray bg-cult-dark-gray p-4">
          <h3 className="text-sm font-medium text-cult-white mb-4">New Dry Room</h3>
          <DryRoomForm
            isCreate
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            submitLabel="Create Room"
          />
        </div>
      )}

      {editingRoom && (
        <div className="rounded-lg border border-cult-medium-gray bg-cult-dark-gray p-4">
          <h3 className="text-sm font-medium text-cult-white mb-4">Edit — {editingRoom.name}</h3>
          <DryRoomForm
            initial={{
              name: editingRoom.name,
              room_code: editingRoom.room_code,
              capacity_lbs: editingRoom.capacity_lbs?.toString() ?? '',
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditingRoom(null)}
            submitLabel="Save Changes"
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-950 border border-red-700 px-3 py-2 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={reload} className="ml-auto text-xs underline hover:no-underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-cult-medium-gray py-8 text-center">Loading dry rooms…</div>
      ) : rooms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-cult-medium-gray p-8 text-center">
          <Wind className="h-8 w-8 text-cult-medium-gray mx-auto mb-3" />
          <p className="text-sm font-medium text-cult-white">No dry rooms yet</p>
          <p className="text-xs text-cult-medium-gray mt-1">Add a dry room to start tracking binning sessions.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <DryRoomRow
              key={room.id}
              room={room}
              onEdit={setEditingRoom}
              onArchive={handleArchive}
              onRestore={handleRestore}
              showArchived={showArchived}
            />
          ))}
        </div>
      )}
    </div>
  );
}
