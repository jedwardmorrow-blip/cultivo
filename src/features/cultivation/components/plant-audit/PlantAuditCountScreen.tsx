import { useMemo, useState } from 'react';
import { ArrowRight, Plus, ChevronDown, ChevronRight, XCircle } from 'lucide-react';
import { AuditGroupRow } from './AuditGroupRow';
import { PlantAuditOrphanModal } from './PlantAuditOrphanModal';
import type {
  PlantAuditSessionWithCounts,
  PlantAuditCount,
  PlantAuditCauseOfDeath,
  CreateOrphanPlantGroupInput,
} from '../../types';

interface PlantAuditCountScreenProps {
  session: PlantAuditSessionWithCounts;
  onRecordCount: (
    countId: string,
    physicalCount: number,
    cause?: PlantAuditCauseOfDeath,
    notes?: string,
  ) => Promise<void>;
  onMarkNotFound: (
    countId: string,
    cause: PlantAuditCauseOfDeath,
    notes?: string,
  ) => Promise<void>;
  onSkip: (countId: string, notes?: string) => Promise<void>;
  onReset: (countId: string) => Promise<void>;
  onCreateOrphan: (input: CreateOrphanPlantGroupInput) => Promise<void>;
  onMoveToReview: () => Promise<void>;
  onAbandon: () => Promise<void>;
}

interface RoomGroup {
  roomId: string;
  roomLabel: string;
  counts: PlantAuditCount[];
  tables: TableGroup[];
  unplaced: PlantAuditCount[];
}

interface TableGroup {
  tableId: string;
  tableLabel: string;
  sections: SectionGroup[];
  unsectioned: PlantAuditCount[];
}

interface SectionGroup {
  sectionId: string;
  sectionLabel: string;
  counts: PlantAuditCount[];
}

function groupCountsByRoomLayout(counts: PlantAuditCount[]): RoomGroup[] {
  const roomMap = new Map<string, RoomGroup>();

  for (const count of counts) {
    const roomId = count.grow_room_id;
    const roomLabel = count.grow_rooms
      ? `${count.grow_rooms.room_code} — ${count.grow_rooms.name}`
      : 'Unknown room';

    let room = roomMap.get(roomId);
    if (!room) {
      room = {
        roomId,
        roomLabel,
        counts: [],
        tables: [],
        unplaced: [],
      };
      roomMap.set(roomId, room);
    }
    room.counts.push(count);

    const tableId = count.plant_groups?.room_table_id ?? null;
    const sectionId = count.plant_groups?.room_section_id ?? null;

    if (!tableId) {
      room.unplaced.push(count);
      continue;
    }

    let table = room.tables.find((t) => t.tableId === tableId);
    if (!table) {
      const tableLabel =
        count.plant_groups?.room_tables?.table_name ??
        (count.plant_groups?.room_tables?.table_number != null
          ? `Table ${count.plant_groups.room_tables.table_number}`
          : 'Table');
      table = { tableId, tableLabel, sections: [], unsectioned: [] };
      room.tables.push(table);
    }

    if (!sectionId) {
      table.unsectioned.push(count);
      continue;
    }

    let section = table.sections.find((s) => s.sectionId === sectionId);
    if (!section) {
      section = {
        sectionId,
        sectionLabel: count.plant_groups?.room_sections?.section_label ?? 'Section',
        counts: [],
      };
      table.sections.push(section);
    }
    section.counts.push(count);
  }

  // Sort sections by label, tables by label
  roomMap.forEach((room) => {
    room.tables.sort((a, b) => a.tableLabel.localeCompare(b.tableLabel));
    room.tables.forEach((t) => t.sections.sort((a, b) => a.sectionLabel.localeCompare(b.sectionLabel)));
  });

  return Array.from(roomMap.values()).sort((a, b) => a.roomLabel.localeCompare(b.roomLabel));
}

function countsProgress(counts: PlantAuditCount[]) {
  const total = counts.length;
  const remaining = counts.filter((c) => c.status === 'pending').length;
  const done = total - remaining;
  return { total, done, remaining };
}

export function PlantAuditCountScreen({
  session,
  onRecordCount,
  onMarkNotFound,
  onSkip,
  onReset,
  onCreateOrphan,
  onMoveToReview,
  onAbandon,
}: PlantAuditCountScreenProps) {
  const [collapsedRooms, setCollapsedRooms] = useState<Set<string>>(new Set());
  const [orphanModalRoom, setOrphanModalRoom] = useState<{ id: string; label: string } | null>(
    null,
  );
  const [advancing, setAdvancing] = useState(false);

  const rooms = useMemo(() => groupCountsByRoomLayout(session.counts), [session.counts]);
  const totalProgress = useMemo(() => countsProgress(session.counts), [session.counts]);
  const canAdvance = totalProgress.remaining === 0 && totalProgress.total > 0 && !advancing;

  function toggleRoom(roomId: string) {
    setCollapsedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }

  async function handleAdvance() {
    if (!canAdvance) return;
    setAdvancing(true);
    try {
      await onMoveToReview();
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header bar — audit context + global progress + advance button */}
      <div className="bg-cult-surface rounded-cult p-4 border border-cult-border sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs text-cult-text-secondary uppercase tracking-wider">
              Audit
            </div>
            <div className="text-lg font-bold text-cult-text-primary">
              {session.audit_number}
            </div>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center justify-between text-xs text-cult-text-secondary mb-1">
              <span>Progress</span>
              <span>
                {totalProgress.done} / {totalProgress.total}
              </span>
            </div>
            <div className="h-2 bg-cult-surface-inset rounded-full overflow-hidden border border-cult-border-faint">
              <div
                className="h-full bg-cult-accent transition-all"
                style={{
                  width: `${
                    totalProgress.total === 0
                      ? 0
                      : (totalProgress.done / totalProgress.total) * 100
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onAbandon}
              className="px-4 py-2 rounded border border-cult-border text-cult-text-muted hover:bg-cult-surface-subtle hover:text-cult-danger hover:border-cult-danger/40 transition-colors flex items-center gap-1.5 font-mono uppercase tracking-[0.16em] text-[11px]"
            >
              <XCircle className="w-3.5 h-3.5" />
              Abandon
            </button>
            <button
              type="button"
              onClick={handleAdvance}
              disabled={!canAdvance}
              className="px-4 py-2 rounded border border-cult-accent text-cult-accent flex items-center gap-1.5 hover:bg-cult-accent hover:text-cult-opaque-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-mono uppercase tracking-[0.16em] text-[11px]"
            >
              Review
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Per-room panels */}
      {rooms.length === 0 ? (
        <div className="bg-cult-surface rounded-cult p-8 border border-cult-border text-center">
          <p className="text-cult-text-secondary">
            No plant groups in scope. Add orphan groups below if you find plants on the floor.
          </p>
        </div>
      ) : (
        rooms.map((room) => {
          const progress = countsProgress(room.counts);
          const collapsed = collapsedRooms.has(room.roomId);
          return (
            <div
              key={room.roomId}
              className="bg-cult-surface rounded-cult border border-cult-border overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-cult-border-subtle bg-cult-surface-inset flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => toggleRoom(room.roomId)}
                  className="flex items-center gap-2 text-left flex-1 min-w-0"
                >
                  {collapsed ? (
                    <ChevronRight className="w-4 h-4 text-cult-text-secondary flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-cult-text-secondary flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-cult-text-primary uppercase tracking-wider truncate">
                      {room.roomLabel}
                    </div>
                    <div className="text-xs text-cult-text-secondary">
                      {progress.done} / {progress.total} counted
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setOrphanModalRoom({ id: room.roomId, label: room.roomLabel })
                  }
                  className="px-3 py-1.5 rounded border border-cult-border bg-cult-surface-raised text-xs text-cult-text-primary hover:bg-cult-surface-overlay transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3" />
                  Orphan
                </button>
              </div>

              {!collapsed && (
                <div className="p-4 space-y-4">
                  {room.tables.map((table) => (
                    <div key={table.tableId} className="space-y-2">
                      <div className="text-xs text-cult-text-secondary uppercase tracking-wider font-semibold">
                        {table.tableLabel}
                      </div>
                      {table.sections.map((section) => (
                        <div
                          key={section.sectionId}
                          className="pl-3 border-l-2 border-cult-border-subtle space-y-2"
                        >
                          <div className="text-xs text-cult-text-muted uppercase tracking-wider">
                            Section {section.sectionLabel}
                          </div>
                          {section.counts.map((count) => (
                            <AuditGroupRow
                              key={count.id}
                              count={count}
                              onRecord={(p, cause, notes) =>
                                onRecordCount(count.id, p, cause, notes)
                              }
                              onMarkNotFound={(cause, notes) =>
                                onMarkNotFound(count.id, cause, notes)
                              }
                              onSkip={(notes) => onSkip(count.id, notes)}
                              onReset={() => onReset(count.id)}
                            />
                          ))}
                        </div>
                      ))}
                      {table.unsectioned.length > 0 && (
                        <div className="pl-3 border-l-2 border-cult-border-subtle space-y-2">
                          <div className="text-xs text-cult-text-muted uppercase tracking-wider">
                            Unsectioned
                          </div>
                          {table.unsectioned.map((count) => (
                            <AuditGroupRow
                              key={count.id}
                              count={count}
                              onRecord={(p, cause, notes) =>
                                onRecordCount(count.id, p, cause, notes)
                              }
                              onMarkNotFound={(cause, notes) =>
                                onMarkNotFound(count.id, cause, notes)
                              }
                              onSkip={(notes) => onSkip(count.id, notes)}
                              onReset={() => onReset(count.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {room.unplaced.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-cult-text-secondary uppercase tracking-wider font-semibold">
                        Unplaced (no table/section)
                      </div>
                      {room.unplaced.map((count) => (
                        <AuditGroupRow
                          key={count.id}
                          count={count}
                          onRecord={(p, cause, notes) =>
                            onRecordCount(count.id, p, cause, notes)
                          }
                          onMarkNotFound={(cause, notes) =>
                            onMarkNotFound(count.id, cause, notes)
                          }
                          onSkip={(notes) => onSkip(count.id, notes)}
                          onReset={() => onReset(count.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {orphanModalRoom && (
        <PlantAuditOrphanModal
          auditSessionId={session.id}
          growRoomId={orphanModalRoom.id}
          growRoomLabel={orphanModalRoom.label}
          onCreate={async (input) => {
            await onCreateOrphan(input);
            setOrphanModalRoom(null);
          }}
          onCancel={() => setOrphanModalRoom(null)}
        />
      )}
    </div>
  );
}
