import { useState } from 'react';
import { ChevronRight, X, Copy, Plus, Save, Check, AlertCircle } from 'lucide-react';
import { useScheduleTemplates } from '../../hooks';
import type { RoomTaskSchedule, CreateTaskScheduleInput } from '../../types';
import type { RoomCalendarRoom } from '../../utils/roomCalendarUtils';
import { CopyFromRoomPicker } from './CopyFromRoomPicker';
import { TemplatePicker } from './TemplatePicker';
import { ScheduleForm } from './ScheduleForm';
import { ScheduleRow } from '../room-setup/ScheduleRow';

export interface ScheduleEditorDrawerProps {
  roomId: string;
  roomCode: string;
  schedules: RoomTaskSchedule[];
  onClose: () => void;
  onCreate: (input: CreateTaskScheduleInput) => Promise<RoomTaskSchedule>;
  onUpdate: (id: string, input: Partial<RoomTaskSchedule>) => Promise<RoomTaskSchedule>;
  onDelete: (id: string) => Promise<void>;
  onCopyFromRoom: (sourceRoomId: string, targetRoomId: string) => Promise<number>;
  allRooms: RoomCalendarRoom[];
  schedulesByRoom: Map<string, RoomTaskSchedule[]>;
}

export function ScheduleEditorDrawer({ roomId, roomCode, schedules, onClose, onCreate, onUpdate, onDelete, onCopyFromRoom, allRooms, schedulesByRoom }: ScheduleEditorDrawerProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<'template' | 'copy' | 'manual' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [copying, setCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const roomType = allRooms.find((r) => r.id === roomId)?.room_type ?? 'flower';
  const { templates, applyTemplate, saveAsTemplate } = useScheduleTemplates();
  const [templateApplying, setTemplateApplying] = useState(false);
  const [savingAsTemplate, setSavingAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  function goStep1() {
    setStep(1);
    setMode(null);
    setEditingId(null);
    setCopySuccess(null);
  }

  function startMode(m: 'template' | 'copy' | 'manual' | 'edit', id?: string) {
    setMode(m);
    setEditingId(id ?? null);
    setStep(2);
  }

  const modeLabel =
    mode === 'template' ? 'Template' :
    mode === 'copy' ? 'Copy Schedules' :
    mode === 'manual' ? 'New Schedule' :
    mode === 'edit' ? 'Edit Schedule' : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative ml-auto bg-cult-near-black border-l border-cult-dark-gray w-full max-w-md h-full flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cult-dark-gray flex-shrink-0 bg-cult-charcoal/20">
          <div>
            <span className="text-xs text-cult-medium-gray uppercase tracking-wider">Room Schedule</span>
            <h3 className="text-base font-bold text-cult-white font-mono mt-0.5">{roomCode}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2.5 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-cult-charcoal active:bg-cult-charcoal/60 rounded-lg transition-colors">
            <X className="w-4 h-4 text-cult-medium-gray" />
          </button>
        </div>

        {/* Breadcrumb step indicator */}
        <div className="px-5 py-2.5 border-b border-cult-dark-gray/50 flex items-center gap-1.5 flex-shrink-0 bg-cult-charcoal/10">
          {step === 1 ? (
            <div className="flex items-center gap-1.5 text-xs text-cult-white">
              <span className="w-4 h-4 rounded-full border border-cult-accent bg-cult-accent/20 text-cult-accent flex items-center justify-center text-[9px] font-bold leading-none">1</span>
              <span>Schedules</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={goStep1}
              className="flex items-center gap-1.5 text-xs text-cult-medium-gray hover:text-cult-white transition-colors"
            >
              <span className="w-4 h-4 rounded-full border border-cult-medium-gray flex items-center justify-center text-[9px] font-bold leading-none">1</span>
              <span>Schedules</span>
            </button>
          )}
          <ChevronRight className="w-3 h-3 text-cult-dark-gray flex-shrink-0" />
          <div className={`flex items-center gap-1.5 text-xs ${step === 2 ? 'text-cult-white' : 'text-cult-medium-gray'}`}>
            <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold leading-none ${step === 2 ? 'border-cult-accent bg-cult-accent/20 text-cult-accent' : 'border-cult-medium-gray'}`}>2</span>
            <span>{modeLabel}</span>
          </div>
          {mode !== 'manual' && mode !== 'edit' && (
            <>
              <ChevronRight className="w-3 h-3 text-cult-dark-gray flex-shrink-0" />
              <div className={`flex items-center gap-1.5 text-xs ${step === 3 ? 'text-cult-success' : 'text-cult-dark-gray'}`}>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold leading-none ${step === 3 ? 'border-cult-success bg-cult-success-muted text-cult-success' : 'border-cult-dark-gray'}`}>3</span>
                <span>Done</span>
              </div>
            </>
          )}
        </div>

        {/* Action buttons — Step 1 only */}
        {step === 1 && (
          <div className="px-5 py-2.5 border-b border-cult-dark-gray/50 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-cult-medium-gray uppercase tracking-wider">
              {schedules.length} active schedule{schedules.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => startMode('template')}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-cult-warning bg-cult-warning-muted border border-cult-warning/40 hover:bg-cult-warning-muted/80 rounded-sm transition-colors"
              >
                Template
              </button>
              <button
                type="button"
                onClick={() => startMode('copy')}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-cult-info bg-cult-info-muted border border-cult-info/40 hover:bg-cult-info-muted/80 rounded-sm transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
              <button
                type="button"
                onClick={() => startMode('manual')}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-cult-success bg-cult-success-muted border border-cult-success/40 hover:bg-cult-success-muted/80 rounded-sm transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

          {/* Step 1: Schedule list */}
          {step === 1 && (
            <>
              {schedules.length === 0 && (
                <div className="text-center py-10">
                  <div className="w-12 h-12 mx-auto rounded-full bg-cult-charcoal/40 flex items-center justify-center mb-3">
                    <AlertCircle className="w-5 h-5 text-cult-dark-gray" />
                  </div>
                  <p className="text-sm text-cult-medium-gray">No schedules configured</p>
                  <p className="text-xs text-cult-dark-gray mt-1">Apply a template, copy from another room, or create manually</p>
                  <div className="mt-4 flex flex-col items-center gap-2">
                    {templates.filter((t) => t.room_type === roomType).length > 0 && (
                      <button
                        type="button"
                        onClick={() => startMode('template')}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-cult-warning bg-cult-warning-muted border border-cult-warning/40 hover:bg-cult-warning-muted/80 rounded-sm transition-colors w-52"
                      >
                        Apply Template
                      </button>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startMode('copy')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cult-info bg-cult-info-muted border border-cult-info/40 hover:bg-cult-info-muted/80 rounded-sm transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy from Room
                      </button>
                      <button
                        type="button"
                        onClick={() => startMode('manual')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cult-success bg-cult-success-muted border border-cult-success/40 hover:bg-cult-success-muted/80 rounded-sm transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Manually
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {schedules.map((s) => (
                <ScheduleRow key={s.id} schedule={s} onEdit={() => startMode('edit', s.id)} />
              ))}

              {/* Save as Template */}
              {schedules.length > 0 && (
                <div className="border-t border-cult-dark-gray/50 pt-3 mt-4">
                  {savingAsTemplate ? (
                    <div className="space-y-2">
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
                              schedules.map((s) => ({
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
                          className="flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cult-success bg-cult-success-muted border border-cult-success/40 hover:bg-cult-success-muted/80 disabled:opacity-30 rounded-sm transition-colors"
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
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cult-medium-gray hover:text-cult-white border border-dashed border-cult-dark-gray hover:border-cult-medium-gray rounded-sm transition-colors"
                    >
                      <Save className="w-3 h-3" />
                      Save as Template
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Step 2: Configure */}
          {step === 2 && mode === 'template' && (
            <TemplatePicker
              templates={templates}
              roomType={roomType}
              applying={templateApplying}
              onApply={async (templateId) => {
                setTemplateApplying(true);
                try {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  await applyTemplate(templateId, roomId, todayStr);
                  setStep(3);
                } finally {
                  setTemplateApplying(false);
                }
              }}
              onCancel={goStep1}
            />
          )}

          {step === 2 && mode === 'copy' && (
            <CopyFromRoomPicker
              targetRoomId={roomId}
              targetRoomCode={roomCode}
              allRooms={allRooms}
              schedulesByRoom={schedulesByRoom}
              copying={copying}
              copySuccess={copySuccess}
              onCopy={async (sourceRoomId) => {
                setCopying(true);
                setCopySuccess(null);
                try {
                  const count = await onCopyFromRoom(sourceRoomId, roomId);
                  const sourceRoom = allRooms.find((r) => r.id === sourceRoomId);
                  setCopySuccess(`Copied ${count} schedule${count !== 1 ? 's' : ''} from ${sourceRoom?.room_code ?? 'room'}`);
                  setStep(3);
                  setTimeout(goStep1, 1500);
                } catch {
                  setCopySuccess('Failed to copy schedules');
                } finally {
                  setCopying(false);
                }
              }}
              onCancel={goStep1}
            />
          )}

          {step === 2 && (mode === 'manual' || mode === 'edit') && (
            <ScheduleForm
              roomId={roomId}
              initial={mode === 'edit' ? schedules.find((s) => s.id === editingId) : undefined}
              onSave={async (input) => {
                if (mode === 'manual') {
                  await onCreate(input as CreateTaskScheduleInput);
                } else if (mode === 'edit' && editingId) {
                  await onUpdate(editingId, input);
                }
                goStep1();
              }}
              onDelete={mode === 'edit' && editingId ? async () => {
                await onDelete(editingId);
                goStep1();
              } : undefined}
              onCancel={goStep1}
            />
          )}

          {/* Step 3: Done */}
          {step === 3 && mode === 'template' && (
            <div className="text-center py-10">
              <div className="w-12 h-12 mx-auto rounded-full bg-cult-success-muted flex items-center justify-center mb-3">
                <Check className="w-6 h-6 text-cult-success" />
              </div>
              <p className="text-sm font-semibold text-cult-success">Template applied</p>
              <p className="text-xs text-cult-medium-gray mt-1">Schedules have been added to {roomCode}</p>
              <button
                type="button"
                onClick={goStep1}
                className="mt-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cult-white bg-cult-charcoal border border-cult-medium-gray hover:bg-cult-charcoal/80 rounded-sm transition-colors"
              >
                Back to Schedules
              </button>
            </div>
          )}

          {step === 3 && mode === 'copy' && copySuccess && (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto rounded-full bg-cult-success-muted flex items-center justify-center mb-3">
                <Check className="w-6 h-6 text-cult-success" />
              </div>
              <p className="text-sm font-semibold text-cult-success">{copySuccess}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
