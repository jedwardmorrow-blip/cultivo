import { useState } from 'react';
import { Plus, Archive, RotateCcw, AlertTriangle, Layers } from 'lucide-react';
import { Button } from '@/shared/components';
import { useRoomSections } from '../hooks/useRoomSections';
import type { RoomTable, RoomSection } from '../types';

interface LayoutBuilderProps {
  roomId: string;
}

interface AddSectionFormProps {
  tableId: string;
  onAdd: (label: string, sqft: string) => Promise<void>;
  onCancel: () => void;
}

function AddSectionForm({ onAdd, onCancel }: AddSectionFormProps) {
  const [label, setLabel] = useState('');
  const [sqft, setSqft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    const trimmed = label.trim();
    if (!trimmed) { setError('Section label is required'); return; }
    setSaving(true);
    setError(null);
    try {
      await onAdd(trimmed, sqft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add section');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2 items-start flex-wrap">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') onCancel(); }}
          placeholder="Section label (e.g. A, B, Left)"
          disabled={saving}
          autoFocus
          className="flex-1 min-w-28 bg-cult-black border border-cult-border text-cult-text-primary px-2 py-1 text-xs focus:outline-none focus:border-cult-text-muted placeholder-cult-border"
        />
        <input
          type="number"
          min="0"
          step="0.1"
          value={sqft}
          onChange={(e) => setSqft(e.target.value)}
          placeholder="sqft (opt)"
          disabled={saving}
          className="w-24 bg-cult-black border border-cult-border text-cult-text-primary px-2 py-1 text-xs focus:outline-none focus:border-cult-text-muted placeholder-cult-border"
        />
        <Button
          onClick={handleAdd}
          disabled={saving || !label.trim()}
          size="xs"
        >
          {saving ? '...' : 'Save'}
        </Button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1 text-xs uppercase tracking-wider border border-cult-border text-cult-text-muted hover:border-cult-text-muted hover:text-cult-text-primary transition-all"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-cult-danger">{error}</p>}
    </div>
  );
}

interface SectionRowProps {
  section: RoomSection;
  onArchive: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
}

function SectionRow({ section, onArchive, onRestore }: SectionRowProps) {
  const [acting, setActing] = useState(false);

  async function handleArchive() {
    setActing(true);
    try { await onArchive(section.id); } finally { setActing(false); }
  }
  async function handleRestore() {
    setActing(true);
    try { await onRestore(section.id); } finally { setActing(false); }
  }

  return (
    <div className={`flex items-center justify-between gap-2 py-1 px-2 text-xs border-b border-cult-surface last:border-0 ${section.is_active ? '' : 'opacity-50'}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`font-mono font-bold ${section.is_active ? 'text-cult-text-muted' : 'text-cult-border'}`}>
          {section.section_label}
        </span>
        {section.section_sqft && (
          <span className="text-cult-border">{section.section_sqft} sqft</span>
        )}
        {!section.is_active && <span className="text-cult-border italic">archived</span>}
      </div>
      {section.is_active ? (
        <button onClick={handleArchive} disabled={acting} title="Archive section" className="p-0.5 text-cult-border hover:text-cult-danger transition-colors disabled:opacity-40">
          <Archive className="w-3 h-3" />
        </button>
      ) : (
        <button onClick={handleRestore} disabled={acting} title="Restore section" className="p-0.5 text-cult-border hover:text-cult-success transition-colors disabled:opacity-40">
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

interface TableBlockProps {
  table: RoomTable;
  showArchived: boolean;
  onArchiveTable: (id: string) => Promise<void>;
  onRestoreTable: (id: string) => Promise<void>;
  onAddSection: (tableId: string, label: string, sqft: string) => Promise<void>;
  onArchiveSection: (id: string) => Promise<void>;
  onRestoreSection: (id: string) => Promise<void>;
}

function TableBlock({
  table,
  showArchived,
  onArchiveTable,
  onRestoreTable,
  onAddSection,
  onArchiveSection,
  onRestoreSection,
}: TableBlockProps) {
  const [acting, setActing] = useState(false);
  const [addingSection, setAddingSection] = useState(false);

  const visibleSections = showArchived
    ? table.sections
    : table.sections.filter((s) => s.is_active);

  async function handleArchiveTable() {
    setActing(true);
    try { await onArchiveTable(table.id); } finally { setActing(false); }
  }
  async function handleRestoreTable() {
    setActing(true);
    try { await onRestoreTable(table.id); } finally { setActing(false); }
  }

  return (
    <div className={`border ${table.is_active ? 'border-cult-border' : 'border-cult-surface'} bg-cult-surface ${!table.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs font-bold font-mono ${table.is_active ? 'text-cult-text-primary' : 'text-cult-border'}`}>
            Table {table.table_number}
          </span>
          {table.table_name && (
            <span className="text-xs text-cult-text-muted truncate">— {table.table_name}</span>
          )}
          {table.total_sqft && (
            <span className="text-xs text-cult-border">{table.total_sqft} sqft</span>
          )}
          {!table.is_active && <span className="text-xs text-cult-border italic">archived</span>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {table.is_active && (
            <>
              <button
                onClick={() => setAddingSection((v) => !v)}
                title="Add section"
                className="p-1 text-cult-border hover:text-cult-text-primary transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleArchiveTable}
                disabled={acting}
                title="Archive table"
                className="p-1 text-cult-border hover:text-cult-danger transition-colors disabled:opacity-40"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {!table.is_active && (
            <button
              onClick={handleRestoreTable}
              disabled={acting}
              title="Restore table"
              className="p-1 text-cult-border hover:text-cult-success transition-colors disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {(visibleSections.length > 0 || addingSection) && (
        <div className="border-t border-cult-surface px-3 py-1">
          {visibleSections.map((s) => (
            <SectionRow
              key={s.id}
              section={s}
              onArchive={onArchiveSection}
              onRestore={onRestoreSection}
            />
          ))}
          {addingSection && table.is_active && (
            <AddSectionForm
              tableId={table.id}
              onAdd={async (label, sqft) => {
                await onAddSection(table.id, label, sqft);
                setAddingSection(false);
              }}
              onCancel={() => setAddingSection(false)}
            />
          )}
        </div>
      )}

      {visibleSections.length === 0 && !addingSection && table.is_active && (
        <div className="border-t border-cult-surface px-3 py-2">
          <button
            onClick={() => setAddingSection(true)}
            className="text-xs text-cult-border hover:text-cult-text-muted italic transition-colors"
          >
            + Add first section
          </button>
        </div>
      )}
    </div>
  );
}

interface AddTableFormProps {
  existingNumbers: number[];
  growRoomId: string;
  onAdd: (num: number, name: string, sqft: string) => Promise<void>;
}

function AddTableForm({ existingNumbers, onAdd }: AddTableFormProps) {
  const [num, setNum] = useState('');
  const [name, setName] = useState('');
  const [sqft, setSqft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    const n = parseInt(num);
    if (!num || isNaN(n) || n < 1) { setError('Table number must be a positive integer'); return; }
    if (existingNumbers.includes(n)) { setError(`Table ${n} already exists in this room`); return; }
    setSaving(true);
    setError(null);
    try {
      await onAdd(n, name, sqft);
      setNum('');
      setName('');
      setSqft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add table');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-cult-border uppercase tracking-wider">Add Table</p>
      <div className="flex gap-2 items-start flex-wrap">
        <input
          type="number"
          min="1"
          step="1"
          value={num}
          onChange={(e) => { setNum(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="# *"
          disabled={saving}
          className="w-16 bg-cult-black border border-cult-border text-cult-text-primary px-2 py-1.5 text-xs focus:outline-none focus:border-cult-text-muted placeholder-cult-border"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (optional)"
          disabled={saving}
          className="flex-1 min-w-28 bg-cult-black border border-cult-border text-cult-text-primary px-2 py-1.5 text-xs focus:outline-none focus:border-cult-text-muted placeholder-cult-border"
        />
        <input
          type="number"
          min="0"
          step="0.1"
          value={sqft}
          onChange={(e) => setSqft(e.target.value)}
          placeholder="sqft (opt)"
          disabled={saving}
          className="w-24 bg-cult-black border border-cult-border text-cult-text-primary px-2 py-1.5 text-xs focus:outline-none focus:border-cult-text-muted placeholder-cult-border"
        />
        <Button
          onClick={handleAdd}
          disabled={saving || !num}
          size="xs"
        >
          {saving ? '...' : 'Add Table'}
        </Button>
      </div>
      {error && (
        <div className="flex items-center gap-1 text-xs text-cult-danger">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

export function LayoutBuilder({ roomId }: LayoutBuilderProps) {
  const [showArchived, setShowArchived] = useState(false);
  const {
    tables,
    loading,
    error,
    createTable,
    archiveTable,
    updateTable,
    createSection,
    archiveSection,
    updateSection,
  } = useRoomSections(roomId, { includeArchived: showArchived });

  const allTableNumbers = tables.map((t) => t.table_number);
  const hasArchivedItems =
    tables.some((t) => !t.is_active) ||
    tables.some((t) => t.sections.some((s) => !s.is_active));

  if (loading) {
    return <p className="text-xs text-cult-border py-2">Loading layout...</p>;
  }

  if (error) {
    return <p className="text-xs text-cult-danger py-2">{error}</p>;
  }

  const visibleTables = tables.filter((t) => showArchived || t.is_active);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cult-text-muted" />
          <span className="text-xs text-cult-text-muted uppercase tracking-wider font-semibold">Room Layout</span>
        </div>
        {hasArchivedItems && (
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="text-xs text-cult-border hover:text-cult-text-muted transition-colors"
          >
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {visibleTables.map((table) => (
          <TableBlock
            key={table.id}
            table={table}
            showArchived={showArchived}
            onArchiveTable={archiveTable}
            onRestoreTable={async (id) => { await updateTable(id, { is_active: true }); }}
            onAddSection={async (tableId, label, sqft) => {
              await createSection({
                room_table_id: tableId,
                section_label: label,
                section_sqft: sqft ? parseFloat(sqft) : null,
              });
            }}
            onArchiveSection={archiveSection}
            onRestoreSection={async (id) => {
              await updateSection(id, { is_active: true });
            }}
          />
        ))}

        {visibleTables.length === 0 && (
          <p className="text-xs text-cult-border italic py-1">
            No tables configured yet. Add a table below.
          </p>
        )}
      </div>

      <div className="border-t border-cult-surface pt-3">
        <AddTableForm
          existingNumbers={allTableNumbers}
          growRoomId={roomId}
          onAdd={async (num, name, sqft) => {
            await createTable({
              grow_room_id: roomId,
              table_number: num,
              table_name: name || null,
              total_sqft: sqft ? parseFloat(sqft) : null,
            });
          }}
        />
      </div>
    </div>
  );
}
