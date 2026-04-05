import { useState, useMemo } from 'react';
import { X, Check, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { TASK_TYPE_CONFIG } from '../../types';
import type { ScheduleTemplate } from '../../hooks';
import type { GrowRoom } from '../../types';

interface BulkTemplateApplyModalProps {
  templates: ScheduleTemplate[];
  rooms: GrowRoom[];
  onApply: (templateId: string, roomIds: string[], startDate: string) => Promise<{ appliedRoomCount: number; scheduleCount: number }>;
  onClose: () => void;
}

/**
 * Multi-room template application modal (CUL-344 / R-3).
 * Andrew picks one template + many rooms → one task per schedule per room.
 */
export function BulkTemplateApplyModal({ templates, rooms, onApply, onClose }: BulkTemplateApplyModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  // Room-type compatibility: highlight rooms that match the template's room_type
  const roomMatches = useMemo(() => {
    if (!selectedTemplate) return new Set<string>();
    return new Set(rooms.filter((r) => r.room_type === selectedTemplate.room_type).map((r) => r.id));
  }, [rooms, selectedTemplate]);

  const activeRooms = useMemo(() => rooms.filter((r) => r.is_active), [rooms]);

  function toggleRoom(roomId: string) {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }

  function selectAllMatching() {
    setSelectedRoomIds(new Set(activeRooms.filter((r) => roomMatches.has(r.id)).map((r) => r.id)));
  }

  function clearSelection() {
    setSelectedRoomIds(new Set());
  }

  async function handleApply() {
    if (!selectedTemplateId || selectedRoomIds.size === 0) return;
    setApplying(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await onApply(selectedTemplateId, [...selectedRoomIds], startDate);
      setSuccess(
        `Applied "${selectedTemplate?.name}" to ${result.appliedRoomCount} room${result.appliedRoomCount !== 1 ? 's' : ''} — ${result.scheduleCount} schedule${result.scheduleCount !== 1 ? 's' : ''} created`,
      );
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply template');
    } finally {
      setApplying(false);
    }
  }

  const canApply = !!selectedTemplateId && selectedRoomIds.size > 0 && !applying && !!startDate;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-cult-near-black border-2 border-cult-light-gray shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b-2 border-cult-medium-gray bg-cult-black flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-base font-semibold text-cult-white uppercase tracking-wide">
                  Bulk Apply Template
                </h2>
                <p className="text-[11px] text-cult-light-gray mt-0.5">
                  Apply one template to multiple rooms at once
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-cult-light-gray hover:text-cult-white transition-colors rounded-sm hover:bg-cult-charcoal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body: split left (template pick) / right (rooms) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-x divide-cult-medium-gray/40">
          {/* ── Template selection ─────────────────────────────── */}
          <div className="overflow-y-auto p-4">
            <div className="text-[10px] text-cult-text-muted uppercase tracking-wider font-semibold mb-2">
              Step 1 — Select Template
            </div>
            {templates.length === 0 ? (
              <div className="text-[12px] text-cult-text-faint text-center py-6">
                No templates yet. Create one in the Template Manager.
              </div>
            ) : (
              <div className="space-y-1.5">
                {templates.map((tmpl) => {
                  const isSelected = tmpl.id === selectedTemplateId;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={`w-full text-left p-2.5 border transition-all ${
                        isSelected
                          ? 'bg-amber-950/30 border-amber-600/60'
                          : 'bg-cult-charcoal/30 border-cult-dark-gray/60 hover:border-cult-medium-gray'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[12px] font-semibold text-cult-white truncate">{tmpl.name}</span>
                          {tmpl.is_default && (
                            <span className="text-[9px] text-amber-400 uppercase font-bold px-1 py-0.5 bg-amber-950/50 border border-amber-800/30 rounded-sm">Default</span>
                          )}
                        </div>
                        <span className="text-[9px] text-cult-text-muted uppercase">{tmpl.room_type}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tmpl.schedules.slice(0, 6).map((s, i) => {
                          const cfg = TASK_TYPE_CONFIG[s.task_type] ?? TASK_TYPE_CONFIG.custom;
                          return (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-1 py-0.5 text-[9px] rounded-sm"
                              style={{ backgroundColor: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
                            >
                              {cfg.label}
                            </span>
                          );
                        })}
                        {tmpl.schedules.length > 6 && (
                          <span className="text-[9px] text-cult-text-faint">+{tmpl.schedules.length - 6}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Room selection ─────────────────────────────── */}
          <div className="overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-cult-text-muted uppercase tracking-wider font-semibold">
                Step 2 — Select Rooms
              </div>
              <div className="flex items-center gap-2">
                {selectedTemplate && roomMatches.size > 0 && (
                  <button
                    onClick={selectAllMatching}
                    className="text-[10px] text-amber-400 hover:text-amber-300"
                  >
                    Select all matching
                  </button>
                )}
                {selectedRoomIds.size > 0 && (
                  <button
                    onClick={clearSelection}
                    className="text-[10px] text-cult-text-muted hover:text-cult-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {!selectedTemplate ? (
              <div className="text-[12px] text-cult-text-faint text-center py-6">
                Select a template first.
              </div>
            ) : activeRooms.length === 0 ? (
              <div className="text-[12px] text-cult-text-faint text-center py-6">
                No active rooms.
              </div>
            ) : (
              <div className="space-y-1">
                {activeRooms.map((room) => {
                  const isSelected = selectedRoomIds.has(room.id);
                  const isMatch = roomMatches.has(room.id);
                  return (
                    <button
                      key={room.id}
                      onClick={() => toggleRoom(room.id)}
                      className={`w-full text-left p-2 border flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-emerald-950/30 border-emerald-600/60'
                          : 'bg-cult-charcoal/30 border-cult-dark-gray/60 hover:border-cult-medium-gray'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-cult-medium-gray'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-cult-black" />}
                        </div>
                        <span className="text-[12px] font-medium text-cult-white truncate">{room.room_code}</span>
                        <span className="text-[10px] text-cult-text-muted truncate">{room.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isMatch && (
                          <span className="text-[9px] text-emerald-400 uppercase font-bold px-1 py-0.5 bg-emerald-950/40 border border-emerald-800/30 rounded-sm">
                            Match
                          </span>
                        )}
                        <span className="text-[9px] text-cult-text-muted uppercase">{room.room_type}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer: start date + apply */}
        <div className="p-4 border-t-2 border-cult-medium-gray bg-cult-black flex-shrink-0 space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-900/20 border border-red-500/30 rounded">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[11px] text-red-300">{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-2 bg-emerald-900/20 border border-emerald-500/30 rounded">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] text-emerald-300">{success}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-cult-text-muted uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-cult-charcoal border border-cult-medium-gray text-cult-white text-[11px] px-2 py-1 rounded focus:outline-none focus:border-cult-accent"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-cult-text-muted">
                {selectedRoomIds.size} room{selectedRoomIds.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={handleApply}
                disabled={!canApply}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold bg-amber-600 text-cult-black rounded hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                {applying ? 'Applying...' : 'Apply to Rooms'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
