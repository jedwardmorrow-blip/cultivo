import { useState, useMemo } from 'react';
import { AlertCircle, Copy, Plus, Save, Settings } from 'lucide-react';
import { useTaskSchedules, useScheduleTemplates } from '../../hooks';
import type { RoomTaskSchedule, CreateTaskScheduleInput } from '../../types';
import { getTaskTypeConfig } from '../../types';
import { ROOM_TYPE_META } from '../../constants/taskColors';
import { ROOM_TYPE_ORDER } from '../../utils/roomCalendarUtils';
import type { RoomCalendarRoom } from '../../utils/roomCalendarUtils';
import { CopyFromRoomPicker } from '../schedule-editor/CopyFromRoomPicker';
import { TemplatePicker } from '../schedule-editor/TemplatePicker';
import { ScheduleForm } from '../schedule-editor/ScheduleForm';
import { ScheduleRow } from './ScheduleRow';

interface RoomSetupPanelProps {
  rooms: RoomCalendarRoom[];
  initialRoomId?: string;
}

export function RoomSetupPanel({ rooms, initialRoomId }: RoomSetupPanelProps) {
  const { schedules, createSchedule, updateSchedule, deleteSchedule, copySchedulesFromRoom } = useTaskSchedules();
  const { templates, applyTemplate, saveAsTemplate } = useScheduleTemplates();

  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => (ROOM_TYPE_ORDER[a.room_type] ?? 9) - (ROOM_TYPE_ORDER[b.room_type] ?? 9)),
    [rooms]
  );

  const schedulesByRoom = useMemo(() => {
    const map = new Map<string, RoomTaskSchedule[]>();
    for (const s of schedules) {
      const list = map.get(s.room_id) ?? [];
      list.push(s);
      map.set(s.room_id, list);
    }
    return map;
  }, [schedules]);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialRoomId ?? null);
  const [filter, setFilter] = useState<'all' | 'configured' | 'needs-setup'>('all');

  // Editor sub-states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [showCopyPicker, setShowCopyPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [templateApplying, setTemplateApplying] = useState(false);
  const [savingAsTemplate, setSavingAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const filteredRooms = useMemo(() => {
    switch (filter) {
      case 'configured':
        return sortedRooms.filter((r) => (schedulesByRoom.get(r.id) ?? []).length > 0);
      case 'needs-setup':
        return sortedRooms.filter((r) => (schedulesByRoom.get(r.id) ?? []).length === 0);
      default:
        return sortedRooms;
    }
  }, [sortedRooms, filter, schedulesByRoom]);

  const selectedRoom = selectedRoomId ? sortedRooms.find((r) => r.id === selectedRoomId) ?? null : null;
  const selectedSchedules = selectedRoomId ? schedulesByRoom.get(selectedRoomId) ?? [] : [];
  const roomType = selectedRoom?.room_type ?? 'flower';

  const configuredCount = sortedRooms.filter((r) => (schedulesByRoom.get(r.id) ?? []).length > 0).length;
  const needsSetupCount = sortedRooms.length - configuredCount;

  function resetEditorState() {
    setEditingId(null);
    setIsNew(false);
    setShowCopyPicker(false);
    setShowTemplatePicker(false);
    setCopySuccess(null);
    setSavingAsTemplate(false);
    setTemplateName('');
  }

  function selectRoom(roomId: string) {
    resetEditorState();
    setSelectedRoomId(roomId);
  }

  return (
    <div className="flex border border-cult-dark-gray/50 rounded-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
      {/* ── Left Panel: Room List ──────────────────────── */}
      <div className="w-[280px] flex-shrink-0 bg-cult-near-black border-r border-cult-dark-gray/50 flex flex-col">
        {/* Panel header with filter tabs */}
        <div className="px-4 py-3 border-b border-cult-dark-gray/50 bg-cult-charcoal/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-cult-light-gray uppercase tracking-wider">Rooms</span>
            <span className="px-1.5 py-0.5 text-xs font-bold text-cult-medium-gray bg-cult-charcoal rounded-sm font-mono">
              {sortedRooms.length}
            </span>
          </div>
          <div className="flex gap-1">
            {([
              { key: 'all' as const, label: 'All' },
              { key: 'configured' as const, label: `Ready (${configuredCount})` },
              { key: 'needs-setup' as const, label: `Setup (${needsSetupCount})` },
            ]).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`flex-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-sm transition-all ${
                  filter === f.key
                    ? f.key === 'needs-setup' && needsSetupCount > 0
                      ? 'bg-amber-500 text-black border border-amber-500'
                      : 'bg-green-600 text-white border border-green-600'
                    : 'text-cult-medium-gray border border-cult-dark-gray/60 hover:border-cult-medium-gray hover:text-cult-light-gray'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable room list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-hide">
          {filteredRooms.map((room) => {
            const roomSchedules = schedulesByRoom.get(room.id) ?? [];
            const hasSchedules = roomSchedules.length > 0;
            const isSelected = selectedRoomId === room.id;
            const meta = ROOM_TYPE_META[room.room_type] ?? ROOM_TYPE_META.mixed;

            return (
              <button
                key={room.id}
                type="button"
                onClick={() => selectRoom(room.id)}
                className={`w-full text-left p-3 min-h-[44px] rounded-sm transition-all border ${
                  isSelected
                    ? 'bg-green-950/30 border-green-600/50'
                    : !hasSchedules
                      ? 'bg-cult-charcoal/20 border-amber-700/40 hover:border-amber-600/60 hover:bg-amber-950/10 animate-pulse-subtle'
                      : 'bg-cult-charcoal/10 border-cult-dark-gray/40 hover:border-cult-medium-gray hover:bg-cult-charcoal/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-cult-white tracking-wider">{room.room_code}</span>
                  <span
                    className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-sm"
                    style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  {hasSchedules ? (
                    <>
                      <div className="flex gap-1">
                        {Array.from(new Set(roomSchedules.map((s) => s.task_type))).slice(0, 5).map((t) => (
                          <span
                            key={t}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getTaskTypeConfig(t).color }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-cult-medium-gray font-mono">{roomSchedules.length} tasks</span>
                    </>
                  ) : (
                    <span className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider">Needs Setup</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right Panel: Schedule Detail ───────────────── */}
      <div className="flex-1 bg-cult-near-black/60 flex flex-col overflow-hidden">
        {!selectedRoom ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-cult-charcoal/30 flex items-center justify-center mb-4">
                <Settings className="w-7 h-7 text-cult-dark-gray" />
              </div>
              <p className="text-sm text-cult-medium-gray">Select a room to view & edit its schedule</p>
              {needsSetupCount > 0 && (
                <p className="text-xs text-amber-500/80 mt-2">
                  {needsSetupCount} room{needsSetupCount !== 1 ? 's' : ''} still need{needsSetupCount === 1 ? 's' : ''} configuration
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Detail header */}
            <div className="px-6 py-4 border-b border-cult-dark-gray/50 bg-cult-charcoal/15 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full ring-2 ring-black/20"
                    style={{ backgroundColor: (ROOM_TYPE_META[selectedRoom.room_type] ?? ROOM_TYPE_META.mixed).color }}
                  />
                  <span className="font-mono text-lg font-bold text-cult-white tracking-wider">{selectedRoom.room_code}</span>
                  <span
                    className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-sm"
                    style={{
                      backgroundColor: `${(ROOM_TYPE_META[selectedRoom.room_type] ?? ROOM_TYPE_META.mixed).color}20`,
                      color: (ROOM_TYPE_META[selectedRoom.room_type] ?? ROOM_TYPE_META.mixed).color,
                    }}
                  >
                    {(ROOM_TYPE_META[selectedRoom.room_type] ?? ROOM_TYPE_META.mixed).label}
                  </span>
                </div>

                {/* Action buttons */}
                {!isNew && editingId === null && !showCopyPicker && !showTemplatePicker && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTemplatePicker(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/40 border border-amber-800/40 hover:bg-amber-950/60 rounded-sm transition-colors"
                    >
                      Apply Template
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCopyPicker(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-950/40 border border-sky-800/40 hover:bg-sky-950/60 rounded-sm transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Copy from Room
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingId(null); setIsNew(true); }}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-green-400 bg-green-950/40 border border-green-800/40 hover:bg-green-950/60 rounded-sm transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Schedule
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-2 text-xs text-cult-medium-gray">
                {selectedSchedules.length} active schedule{selectedSchedules.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Scrollable schedule content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide">
              {/* Empty state for room with no schedules */}
              {selectedSchedules.length === 0 && !isNew && !showCopyPicker && !showTemplatePicker && (
                <div className="text-center py-12">
                  <div className="w-14 h-14 mx-auto rounded-full bg-amber-950/30 flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  </div>
                  <p className="text-sm text-cult-light-gray font-semibold">No schedules configured</p>
                  <p className="text-xs text-cult-medium-gray mt-1 mb-5">Apply a template, copy from another room, or create manually</p>
                  <div className="flex items-center justify-center gap-3">
                    {templates.filter((t) => t.room_type === roomType).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowTemplatePicker(true)}
                        className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/40 border border-amber-800/40 hover:bg-amber-950/60 rounded-sm transition-colors"
                      >
                        Apply Template
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCopyPicker(true)}
                      className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-950/40 border border-sky-800/40 hover:bg-sky-950/60 rounded-sm transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 inline mr-1" />
                      Copy from Room
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingId(null); setIsNew(true); }}
                      className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-green-400 bg-green-950/40 border border-green-800/40 hover:bg-green-950/60 rounded-sm transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 inline mr-1" />
                      Create Manually
                    </button>
                  </div>
                </div>
              )}

              {/* Copy from room picker */}
              {showCopyPicker && selectedRoomId && (
                <CopyFromRoomPicker
                  targetRoomId={selectedRoomId}
                  targetRoomCode={selectedRoom.room_code}
                  allRooms={sortedRooms}
                  schedulesByRoom={schedulesByRoom}
                  copying={copying}
                  copySuccess={copySuccess}
                  onCopy={async (sourceRoomId) => {
                    setCopying(true);
                    setCopySuccess(null);
                    try {
                      const count = await copySchedulesFromRoom(sourceRoomId, selectedRoomId);
                      const sourceRoom = sortedRooms.find((r) => r.id === sourceRoomId);
                      setCopySuccess(`Copied ${count} schedule${count !== 1 ? 's' : ''} from ${sourceRoom?.room_code ?? 'room'}`);
                      setTimeout(() => { setShowCopyPicker(false); setCopySuccess(null); }, 1500);
                    } catch {
                      setCopySuccess('Failed to copy schedules');
                    } finally {
                      setCopying(false);
                    }
                  }}
                  onCancel={() => { setShowCopyPicker(false); setCopySuccess(null); }}
                />
              )}

              {/* Template picker */}
              {showTemplatePicker && (
                <TemplatePicker
                  templates={templates}
                  roomType={roomType}
                  applying={templateApplying}
                  onApply={async (templateId) => {
                    if (!selectedRoomId) return;
                    setTemplateApplying(true);
                    try {
                      const todayStr = new Date().toISOString().slice(0, 10);
                      await applyTemplate(templateId, selectedRoomId, todayStr);
                      setShowTemplatePicker(false);
                    } finally {
                      setTemplateApplying(false);
                    }
                  }}
                  onCancel={() => setShowTemplatePicker(false)}
                />
              )}

              {/* Schedule cards — 2-column grid */}
              {selectedSchedules.length > 0 && !showCopyPicker && !showTemplatePicker && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {selectedSchedules.map((s) => (
                    <div key={s.id}>
                      {editingId === s.id ? (
                        <ScheduleForm
                          roomId={selectedRoomId!}
                          initial={s}
                          onSave={async (input) => {
                            await updateSchedule(s.id, input);
                            setEditingId(null);
                          }}
                          onDelete={async () => {
                            await deleteSchedule(s.id);
                            setEditingId(null);
                          }}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <ScheduleRow schedule={s} onEdit={() => { setIsNew(false); setEditingId(s.id); }} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* New schedule form */}
              {isNew && selectedRoomId && (
                <div className={selectedSchedules.length > 0 ? 'mt-4' : ''}>
                  <ScheduleForm
                    roomId={selectedRoomId}
                    onSave={async (input) => {
                      await createSchedule(input as CreateTaskScheduleInput);
                      setIsNew(false);
                    }}
                    onCancel={() => setIsNew(false)}
                  />
                </div>
              )}

              {/* Save as Template */}
              {selectedSchedules.length > 0 && !isNew && !editingId && !showCopyPicker && !showTemplatePicker && selectedRoomId && (
                <div className="border-t border-cult-dark-gray/50 pt-4 mt-5">
                  {savingAsTemplate ? (
                    <div className="space-y-2 max-w-md">
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Template name..."
                        className="w-full bg-cult-charcoal border border-cult-dark-gray text-cult-white text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-cult-accent"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!templateName.trim()}
                          onClick={async () => {
                            await saveAsTemplate(
                              templateName.trim(),
                              null,
                              roomType,
                              selectedSchedules.map((s) => ({
                                task_type: s.task_type,
                                recurrence: s.recurrence,
                                day_of_week: s.day_of_week,
                                priority: s.priority,
                                notes: s.notes,
                                scheduling_mode: s.scheduling_mode,
                                interval_days: s.interval_days,
                                phase_day_start: s.phase_day_start,
                                phase_day_end: s.phase_day_end,
                              }))
                            );
                            setSavingAsTemplate(false);
                            setTemplateName('');
                          }}
                          className="flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-green-400 bg-green-950/40 border border-green-800/40 hover:bg-green-950/60 disabled:opacity-30 rounded-sm transition-colors"
                        >
                          <Save className="w-3 h-3 inline mr-1" />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSavingAsTemplate(false); setTemplateName(''); }}
                          className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cult-medium-gray hover:text-cult-light-gray rounded-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSavingAsTemplate(true)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-medium-gray hover:text-cult-white border border-dashed border-cult-dark-gray hover:border-cult-medium-gray rounded-sm transition-colors"
                    >
                      <Save className="w-3 h-3" />
                      Save as Template
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
