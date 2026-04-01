import { useState, useMemo } from 'react';
import {
  X, Plus, Trash2, Save, Edit3, ChevronDown, ChevronRight, Copy, Check,
  Clock, Wrench, Scissors, SprayCan, Droplets, Search, Sparkles, Wheat,
  Sprout, GitBranch, ArrowRightLeft, Beaker,
} from 'lucide-react';
import { useScheduleTemplates } from '../hooks/useScheduleTemplates';
import type { ScheduleTemplate, TemplateScheduleItem, CreateTemplateInput } from '../hooks/useScheduleTemplates';
import { TASK_TYPE_CONFIG } from '../types';
import type { TaskType, SchedulingMode } from '../types';

// ═══════════════════════════════════════════════════════════════
// Template Manager — view, edit, create, and delete room schedule
// templates. Accessible from the Room Setup panel.
// ═══════════════════════════════════════════════════════════════

const ROOM_TYPES = ['flower', 'veg', 'mother', 'clone', 'mixed'] as const;

const TASK_TYPES: TaskType[] = [
  'batch_tank_mix', 'saturation_check', 'irrigation_audit', 'ipm_spray',
  'defoliation', 'scouting', 'cleaning', 'training', 'transplant',
  'harvest', 'clone_cutting', 'concentrate_mix', 'maintenance', 'custom',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface TemplateManagerProps {
  onClose: () => void;
  /** When true, renders inline — hides the X close button */
  inline?: boolean;
}

export function TemplateManager({ onClose, inline = false }: TemplateManagerProps) {
  const { templates, loading, updateTemplate, deleteTemplate, createTemplate, refetch } = useScheduleTemplates();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const templatesByType = useMemo(() => {
    const map = new Map<string, ScheduleTemplate[]>();
    for (const t of templates) {
      const list = map.get(t.room_type) ?? [];
      list.push(t);
      map.set(t.room_type, list);
    }
    return map;
  }, [templates]);

  if (loading) {
    return (
      <div className="p-6 text-center text-cult-medium-gray text-sm animate-pulse">Loading templates...</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-cult-white uppercase tracking-wider">Manage Templates</h2>
          <p className="text-xs text-cult-medium-gray mt-0.5">{templates.length} template{templates.length !== 1 ? 's' : ''} saved</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setCreatingNew(true); setEditingTemplateId(null); setExpandedId(null); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-green-400 bg-green-950/40 border border-green-800/40 hover:bg-green-950/60 rounded-sm transition-colors"
          >
            <Plus className="w-3 h-3" /> New Template
          </button>
          {!inline && (
            <button
              onClick={onClose}
              className="p-2 text-cult-medium-gray hover:text-cult-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Create new template form */}
      {creatingNew && (
        <TemplateEditor
          onSave={async (input) => {
            await createTemplate(input);
            setCreatingNew(false);
          }}
          onCancel={() => setCreatingNew(false)}
        />
      )}

      {/* Template list by room type */}
      {templates.length === 0 && !creatingNew ? (
        <div className="py-8 text-center border border-dashed border-cult-dark-gray/40 rounded">
          <p className="text-sm text-cult-medium-gray">No templates yet</p>
          <p className="text-xs text-cult-dark-gray mt-1">Create templates to quickly apply standard schedules to rooms.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from(templatesByType.entries())
            .sort((a, b) => {
              const order: Record<string, number> = { flower: 0, veg: 1, mother: 2, clone: 3, mixed: 4 };
              return (order[a[0]] ?? 9) - (order[b[0]] ?? 9);
            })
            .map(([roomType, typeTemplates]) => (
              <div key={roomType}>
                <div className="text-[10px] font-bold text-cult-dark-gray uppercase tracking-widest mb-1 px-1">{roomType}</div>
                {typeTemplates.map((tmpl) => {
                  const isExpanded = expandedId === tmpl.id;
                  const isEditing = editingTemplateId === tmpl.id;

                  return (
                    <div key={tmpl.id} className="border border-cult-dark-gray/40 rounded-sm mb-1.5 overflow-hidden">
                      {/* Template header row */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : tmpl.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-cult-charcoal/30 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-cult-medium-gray" /> : <ChevronRight className="w-3.5 h-3.5 text-cult-medium-gray" />}
                          <span className="text-xs font-bold text-cult-white truncate">{tmpl.name}</span>
                          {tmpl.is_default && (
                            <span className="text-[9px] text-amber-400 uppercase font-bold px-1 py-0.5 bg-amber-950/50 border border-amber-800/30 rounded-sm flex-shrink-0">
                              Default
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-cult-dark-gray flex-shrink-0 ml-2">{tmpl.schedules.length} schedules</span>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && !isEditing && (
                        <div className="border-t border-cult-dark-gray/30 px-3 py-3 bg-cult-charcoal/10">
                          {tmpl.description && (
                            <p className="text-xs text-cult-medium-gray mb-3">{tmpl.description}</p>
                          )}

                          {/* Schedule items */}
                          <div className="space-y-1.5 mb-3">
                            {tmpl.schedules.map((s, i) => (
                              <ScheduleItemRow key={i} item={s} />
                            ))}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 pt-2 border-t border-cult-dark-gray/20">
                            <button
                              onClick={() => setEditingTemplateId(tmpl.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-sky-400 bg-sky-950/30 border border-sky-800/30 hover:bg-sky-950/50 rounded-sm transition-colors"
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm(`Delete "${tmpl.name}"? This cannot be undone.`)) {
                                  await deleteTemplate(tmpl.id);
                                  setExpandedId(null);
                                }
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-400 bg-red-950/20 border border-red-800/20 hover:bg-red-950/40 rounded-sm transition-colors"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                            <button
                              onClick={async () => {
                                await updateTemplate(tmpl.id, { is_default: !tmpl.is_default });
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-400 bg-amber-950/20 border border-amber-800/20 hover:bg-amber-950/40 rounded-sm transition-colors ml-auto"
                            >
                              {tmpl.is_default ? 'Remove Default' : 'Set Default'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Inline edit form */}
                      {isExpanded && isEditing && (
                        <div className="border-t border-cult-dark-gray/30 bg-cult-charcoal/10">
                          <TemplateEditor
                            existing={tmpl}
                            onSave={async (input) => {
                              await updateTemplate(tmpl.id, input);
                              setEditingTemplateId(null);
                            }}
                            onCancel={() => setEditingTemplateId(null)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ═══ Schedule item display row ═══
function ScheduleItemRow({ item }: { item: TemplateScheduleItem }) {
  const config = TASK_TYPE_CONFIG[item.task_type] ?? TASK_TYPE_CONFIG.custom;
  const isPhaseDay = item.scheduling_mode === 'phase_day';

  let frequency = '';
  if (isPhaseDay) {
    const start = item.phase_day_start ?? 1;
    const end = item.phase_day_end;
    if (start === end) frequency = `Day ${start} only`;
    else if (item.interval_days) {
      const range = end ? `days ${start}–${end}` : `day ${start}+`;
      frequency = `Every ${item.interval_days}d, ${range}`;
    } else {
      frequency = end ? `Daily, days ${start}–${end}` : `Daily from day ${start}`;
    }
  } else {
    if (item.interval_days && item.recurrence === 'daily') frequency = `Every ${item.interval_days} days`;
    else if (item.recurrence === 'daily') frequency = 'Every day';
    else if (item.day_of_week && item.day_of_week.length > 0) {
      frequency = item.day_of_week.map((d) => DAY_NAMES[d]?.slice(0, 2)).join(', ');
    } else {
      frequency = item.recurrence.charAt(0).toUpperCase() + item.recurrence.slice(1);
    }
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-cult-near-black/50 rounded-sm">
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: config.color }}
      />
      <span className="text-xs font-semibold text-cult-white flex-shrink-0">{config.label}</span>
      <span className="text-[10px] text-cult-medium-gray">{frequency}</span>
      {isPhaseDay && (
        <span className="text-[9px] text-violet-400 bg-violet-950/40 px-1 rounded font-semibold">Phase</span>
      )}
      <span className={`text-[9px] ml-auto uppercase font-semibold ${
        item.priority === 'high' ? 'text-amber-400' : item.priority === 'low' ? 'text-cult-dark-gray' : 'text-cult-medium-gray'
      }`}>
        {item.priority}
      </span>
    </div>
  );
}

// ═══ Template editor — used for both create and edit ═══
interface TemplateEditorProps {
  existing?: ScheduleTemplate;
  onSave: (input: CreateTemplateInput) => Promise<void>;
  onCancel: () => void;
}

function TemplateEditor({ existing, onSave, onCancel }: TemplateEditorProps) {
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [roomType, setRoomType] = useState(existing?.room_type ?? 'flower');
  const [schedules, setSchedules] = useState<TemplateScheduleItem[]>(existing?.schedules ?? []);
  const [saving, setSaving] = useState(false);
  const [addingSchedule, setAddingSchedule] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description || null, room_type: roomType, schedules });
    } finally {
      setSaving(false);
    }
  };

  const removeSchedule = (index: number) => {
    setSchedules((prev) => prev.filter((_, i) => i !== index));
  };

  const updateScheduleItem = (index: number, updates: Partial<TemplateScheduleItem>) => {
    setSchedules((prev) => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const inputClass = 'w-full bg-cult-charcoal/60 border border-cult-dark-gray/40 rounded px-2.5 py-1.5 text-sm text-cult-white focus:outline-none focus:border-violet-500/50';
  const labelClass = 'text-[10px] font-semibold text-cult-medium-gray uppercase tracking-wider mb-1';

  return (
    <div className="p-4 space-y-4">
      {/* Name + Room Type */}
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <div className={labelClass}>Template Name</div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Flower Standard"
            className={inputClass}
          />
        </div>
        <div>
          <div className={labelClass}>Room Type</div>
          <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className={inputClass}>
            {ROOM_TYPES.map((rt) => (
              <option key={rt} value={rt}>{rt.charAt(0).toUpperCase() + rt.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <div className={labelClass}>Description (optional)</div>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this schedule set"
          className={inputClass}
        />
      </div>

      {/* Schedule items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className={labelClass}>Schedule Items ({schedules.length})</div>
          <button
            onClick={() => setAddingSchedule(true)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-green-400 hover:bg-green-950/30 rounded transition-colors"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {schedules.length === 0 && !addingSchedule ? (
          <p className="text-xs text-cult-dark-gray py-3 text-center border border-dashed border-cult-dark-gray/30 rounded">No schedules — add some below</p>
        ) : (
          <div className="space-y-1.5">
            {schedules.map((s, i) => (
              <ScheduleItemEditor
                key={i}
                item={s}
                onChange={(updates) => updateScheduleItem(i, updates)}
                onRemove={() => removeSchedule(i)}
              />
            ))}
          </div>
        )}

        {/* Add new schedule item inline */}
        {addingSchedule && (
          <div className="mt-2 border border-green-800/30 rounded-sm bg-green-950/10 p-3">
            <NewScheduleItemForm
              onAdd={(item) => {
                setSchedules((prev) => [...prev, item]);
                setAddingSchedule(false);
              }}
              onCancel={() => setAddingSchedule(false)}
            />
          </div>
        )}
      </div>

      {/* Save / Cancel */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-cult-dark-gray/30">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-cult-medium-gray hover:text-cult-white transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded transition-colors disabled:opacity-40"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : existing ? 'Update Template' : 'Create Template'}
        </button>
      </div>
    </div>
  );
}

// ═══ Schedule item inline editor ═══
function ScheduleItemEditor({
  item,
  onChange,
  onRemove,
}: {
  item: TemplateScheduleItem;
  onChange: (updates: Partial<TemplateScheduleItem>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = TASK_TYPE_CONFIG[item.task_type] ?? TASK_TYPE_CONFIG.custom;
  const isPhaseDay = item.scheduling_mode === 'phase_day';

  const selectClass = 'bg-cult-charcoal/60 border border-cult-dark-gray/40 rounded px-2 py-1 text-xs text-cult-white focus:outline-none focus:border-violet-500/50';
  const numClass = 'bg-cult-charcoal/60 border border-cult-dark-gray/40 rounded px-2 py-1 text-xs text-cult-white text-center w-16 focus:outline-none focus:border-violet-500/50';

  return (
    <div className="border border-cult-dark-gray/30 rounded-sm bg-cult-near-black/50 overflow-hidden">
      {/* Summary row */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button onClick={() => setExpanded(!expanded)} className="text-cult-medium-gray hover:text-cult-white transition-colors">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
        <span className="text-xs font-semibold text-cult-white">{config.label}</span>
        {isPhaseDay && <span className="text-[9px] text-violet-400 bg-violet-950/40 px-1 rounded">Phase</span>}
        <span className="text-[10px] text-cult-dark-gray ml-auto mr-1">{item.priority}</span>
        <button onClick={onRemove} className="text-red-400/50 hover:text-red-400 transition-colors p-0.5">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-cult-dark-gray/20 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] text-cult-dark-gray">Task Type</label>
              <select
                value={item.task_type}
                onChange={(e) => onChange({ task_type: e.target.value as TaskType })}
                className={selectClass + ' w-full'}
              >
                {TASK_TYPES.map((tt) => (
                  <option key={tt} value={tt}>{TASK_TYPE_CONFIG[tt]?.label ?? tt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-cult-dark-gray">Mode</label>
              <select
                value={item.scheduling_mode ?? 'calendar'}
                onChange={(e) => onChange({ scheduling_mode: e.target.value as SchedulingMode })}
                className={selectClass + ' w-full'}
              >
                <option value="calendar">Calendar</option>
                <option value="phase_day">Phase Day</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-cult-dark-gray">Priority</label>
              <select
                value={item.priority}
                onChange={(e) => onChange({ priority: e.target.value as 'low' | 'medium' | 'high' })}
                className={selectClass + ' w-full'}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {isPhaseDay ? (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] text-cult-dark-gray">Start Day</label>
                <input
                  type="number" min={1}
                  value={item.phase_day_start ?? ''}
                  onChange={(e) => onChange({ phase_day_start: parseInt(e.target.value) || undefined })}
                  className={numClass + ' w-full'}
                  placeholder="1"
                />
              </div>
              <div>
                <label className="text-[9px] text-cult-dark-gray">End Day</label>
                <input
                  type="number" min={1}
                  value={item.phase_day_end ?? ''}
                  onChange={(e) => onChange({ phase_day_end: parseInt(e.target.value) || undefined })}
                  className={numClass + ' w-full'}
                  placeholder="—"
                />
              </div>
              <div>
                <label className="text-[9px] text-cult-dark-gray">Every N days</label>
                <input
                  type="number" min={1}
                  value={item.interval_days ?? ''}
                  onChange={(e) => onChange({ interval_days: parseInt(e.target.value) || undefined })}
                  className={numClass + ' w-full'}
                  placeholder="—"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-cult-dark-gray">Recurrence</label>
                <select
                  value={item.recurrence}
                  onChange={(e) => onChange({ recurrence: e.target.value as TemplateScheduleItem['recurrence'] })}
                  className={selectClass + ' w-full'}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {(item.recurrence === 'weekly' || item.recurrence === 'biweekly') && (
                <div>
                  <label className="text-[9px] text-cult-dark-gray">Days</label>
                  <div className="flex gap-0.5 mt-0.5">
                    {DAY_NAMES.map((d, di) => (
                      <button
                        key={di}
                        onClick={() => {
                          const current = item.day_of_week ?? [];
                          const next = current.includes(di) ? current.filter((x) => x !== di) : [...current, di].sort();
                          onChange({ day_of_week: next });
                        }}
                        className={`w-6 h-6 text-[9px] font-bold rounded transition-colors ${
                          (item.day_of_week ?? []).includes(di)
                            ? 'bg-violet-600 text-white'
                            : 'bg-cult-charcoal text-cult-dark-gray hover:text-cult-medium-gray'
                        }`}
                      >
                        {d.charAt(0)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[9px] text-cult-dark-gray">Notes</label>
            <input
              type="text"
              value={item.notes ?? ''}
              onChange={(e) => onChange({ notes: e.target.value || undefined })}
              placeholder="Optional notes"
              className={selectClass + ' w-full'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ New schedule item form (for adding to a template) ═══
function NewScheduleItemForm({
  onAdd,
  onCancel,
}: {
  onAdd: (item: TemplateScheduleItem) => void;
  onCancel: () => void;
}) {
  const [taskType, setTaskType] = useState<TaskType>('batch_tank_mix');
  const [mode, setMode] = useState<SchedulingMode>('phase_day');
  const [recurrence, setRecurrence] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('daily');
  const [dayOfWeek, setDayOfWeek] = useState<number[]>([]);
  const [intervalDays, setIntervalDays] = useState('');
  const [phaseDayStart, setPhaseDayStart] = useState('');
  const [phaseDayEnd, setPhaseDayEnd] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [notes, setNotes] = useState('');

  const selectClass = 'bg-cult-charcoal/60 border border-cult-dark-gray/40 rounded px-2 py-1.5 text-xs text-cult-white focus:outline-none focus:border-violet-500/50';

  const handleAdd = () => {
    const item: TemplateScheduleItem = {
      task_type: taskType,
      recurrence: mode === 'phase_day' ? 'daily' : recurrence,
      priority,
      scheduling_mode: mode,
    };
    if (mode === 'phase_day') {
      if (phaseDayStart) item.phase_day_start = parseInt(phaseDayStart);
      if (phaseDayEnd) item.phase_day_end = parseInt(phaseDayEnd);
      if (intervalDays) item.interval_days = parseInt(intervalDays);
    } else {
      if (dayOfWeek.length > 0) item.day_of_week = dayOfWeek;
    }
    if (notes) item.notes = notes;
    onAdd(item);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[9px] text-cult-dark-gray font-semibold uppercase">Task Type</label>
          <select value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)} className={selectClass + ' w-full'}>
            {TASK_TYPES.map((tt) => (
              <option key={tt} value={tt}>{TASK_TYPE_CONFIG[tt]?.label ?? tt}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[9px] text-cult-dark-gray font-semibold uppercase">Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as SchedulingMode)} className={selectClass + ' w-full'}>
            <option value="calendar">Calendar</option>
            <option value="phase_day">Phase Day</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] text-cult-dark-gray font-semibold uppercase">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')} className={selectClass + ' w-full'}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {mode === 'phase_day' ? (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[9px] text-cult-dark-gray font-semibold uppercase">Start Day</label>
            <input type="number" min={1} value={phaseDayStart} onChange={(e) => setPhaseDayStart(e.target.value)} className={selectClass + ' w-full'} placeholder="1" />
          </div>
          <div>
            <label className="text-[9px] text-cult-dark-gray font-semibold uppercase">End Day</label>
            <input type="number" min={1} value={phaseDayEnd} onChange={(e) => setPhaseDayEnd(e.target.value)} className={selectClass + ' w-full'} placeholder="—" />
          </div>
          <div>
            <label className="text-[9px] text-cult-dark-gray font-semibold uppercase">Every N days</label>
            <input type="number" min={1} value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} className={selectClass + ' w-full'} placeholder="—" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-cult-dark-gray font-semibold uppercase">Recurrence</label>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as typeof recurrence)} className={selectClass + ' w-full'}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          {(recurrence === 'weekly' || recurrence === 'biweekly') && (
            <div>
              <label className="text-[9px] text-cult-dark-gray font-semibold uppercase">Days</label>
              <div className="flex gap-0.5 mt-1 mb-1 flex-wrap">
                {([
                  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
                  { label: 'Weekends', days: [0, 6] },
                  { label: 'Daily', days: [0, 1, 2, 3, 4, 5, 6] },
                  { label: 'MWF', days: [1, 3, 5] },
                ] as const).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDayOfWeek([...preset.days])}
                    className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider bg-cult-charcoal/50 border border-cult-dark-gray/50 text-cult-medium-gray hover:border-cult-medium-gray hover:text-cult-white transition-colors rounded-sm"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-0.5 mt-1">
                {DAY_NAMES.map((d, di) => (
                  <button
                    key={di}
                    onClick={() => setDayOfWeek((prev) => prev.includes(di) ? prev.filter((x) => x !== di) : [...prev, di].sort())}
                    className={`w-6 h-6 text-[9px] font-bold rounded transition-colors ${
                      dayOfWeek.includes(di) ? 'bg-violet-600 text-white' : 'bg-cult-charcoal text-cult-dark-gray'
                    }`}
                  >
                    {d.charAt(0)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 justify-end">
        <button onClick={onCancel} className="px-2.5 py-1.5 text-xs text-cult-medium-gray hover:text-cult-white transition-colors">Cancel</button>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
        >
          <Check className="w-3 h-3" /> Add Schedule
        </button>
      </div>
    </div>
  );
}
