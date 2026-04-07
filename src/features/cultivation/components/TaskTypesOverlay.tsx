import { useState } from 'react';
import {
  X,
  Plus,
  Scissors,
  Droplets,
  Search,
  SprayCan,
  Sparkles,
  Wheat,
  Sprout,
  Wrench,
  GitBranch,
  ArrowRightLeft,
  Clock,
  Skull,
  Beaker,
  Settings,
  Pencil,
  Lock,
  Save,
} from 'lucide-react';
import { useTaskTypeSettings } from '../hooks';
import { TASK_TYPE_CONFIG } from '../types';
import type { TaskType } from '../types';

/* ─── Constants (shared with DailyTaskBoard) ─── */

const TASK_TYPE_DESCRIPTIONS: Partial<Record<TaskType, string>> = {
  ipm_spray: 'Apply integrated pest management sprays and treatments to prevent or control pests and diseases.',
  defoliation: 'Remove excess fan leaves to improve light penetration and airflow through the canopy.',
  transplant: 'Move plants from smaller containers to larger ones as they outgrow their current pots.',
  cleaning: 'Sanitize surfaces, floors, and equipment. Remove debris and dead plant material.',
  harvest: 'Cut, hang, and process mature plants at peak trichome development.',
  batch_tank_mix: 'Mix nutrient solution in batch tanks. Record EC/PPM, pH, volume, and products used.',
  saturation_check: 'Check runoff EC/pH and substrate moisture levels to verify nutrient uptake.',
  irrigation_audit: 'Confirm and adjust automated watering timers, emitter flow rates, and schedules.',
  scouting: 'Inspect plants for pests, disease, nutrient deficiencies, and overall plant health.',
  training: 'Apply low-stress or high-stress training techniques to shape plant structure.',
  clone_cutting: 'Take cuttings from mother plants for propagation. Dip, place in trays, label.',
  maintenance: 'Routine equipment maintenance, HVAC checks, and infrastructure repairs.',
  concentrate_mix: 'Mix concentrated nutrient stock solutions for automated dosing systems.',
  custom: 'General-purpose task for activities that do not fit standard categories.',
};

const TASK_TYPE_FIELDS: Partial<Record<TaskType, string[]>> = {
  ipm_spray: ['Product', 'Method', 'Target Pest', 'Re-entry Hours'],
  defoliation: ['Type', 'Sections', 'Progress'],
  transplant: ['From Size', 'To Size', 'Count'],
  cleaning: ['Type', 'Notes'],
  harvest: ['Wet Weight', 'Plant Count', 'Waste'],
  batch_tank_mix: ['EC/PPM', 'pH', 'Volume (gal)', 'Products'],
  saturation_check: ['Runoff EC', 'Runoff pH', 'Moisture %', 'Sections'],
  irrigation_audit: ['Timer Settings', 'Flow Rate', 'Adjustments'],
  scouting: ['Pests', 'Disease', 'Nutrient Issues', 'Health Rating'],
  training: ['Type', 'Plant Count', 'Sections'],
  clone_cutting: ['Mother ID', 'Cut Count', 'Tray'],
  maintenance: ['Equipment', 'Issue', 'Resolution'],
  concentrate_mix: ['Product', 'Concentration', 'Volume'],
  custom: ['Task Name', 'Description'],
};

export const ICON_MAP: Record<string, typeof Scissors> = {
  SprayCan,
  Scissors,
  ArrowRightLeft,
  Sparkles,
  Wheat,
  Droplets,
  Search,
  GitBranch,
  Sprout,
  Wrench,
  Beaker,
  Settings,
  Clock,
  Skull,
};

const AVAILABLE_ICONS = ['SprayCan', 'Scissors', 'ArrowRightLeft', 'Sparkles', 'Wheat', 'Droplets', 'Search', 'GitBranch', 'Sprout', 'Wrench', 'Beaker', 'Settings', 'Clock', 'Skull'] as const;
const PRESET_COLORS = ['#0EA5E9', '#10B981', '#8B5CF6', '#6B7280', '#F43F5E', '#3B82F6', '#F59E0B', '#06B6D4', '#EC4899', '#14B8A6', '#78716C', '#6366F1', '#A6A6A6', '#EF4444', '#D97706'];

/* ─── TaskTypesOverlay ─── */

interface TaskTypesOverlayProps {
  onClose: () => void;
  /** When true, renders inline without fixed overlay/backdrop */
  inline?: boolean;
}

export function TaskTypesOverlay({ onClose, inline = false }: TaskTypesOverlayProps) {
  const { settings, loading, createTaskType, updateTaskType, deleteTaskType } = useTaskTypeSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const types = settings.length > 0
    ? settings
    : (Object.entries(TASK_TYPE_CONFIG) as [TaskType, typeof TASK_TYPE_CONFIG[TaskType]][]).map(([key, config], i) => ({
        id: key,
        task_key: key,
        label: config.label,
        description: TASK_TYPE_DESCRIPTIONS[key] ?? '',
        color: config.color,
        icon: config.icon,
        fields: TASK_TYPE_FIELDS[key] ?? [],
        is_enabled: true,
        sort_order: i * 10 + 10,
        is_builtin: true,
        created_at: '',
        updated_at: '',
      }));

  const panel = (
    <div className={`${inline ? 'w-full' : 'relative w-full max-w-4xl'} bg-cult-near-black border border-cult-dark-gray rounded-lg shadow-2xl flex flex-col ${inline ? '' : 'max-h-[85vh]'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-cult-dark-gray/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-cult-accent" />
          <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">
            Manage Task Types
          </h3>
          {!loading && (
            <span className="text-xs text-cult-medium-gray">
              {types.filter((t) => t.is_enabled).length} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setEditingId(null); setShowAdd(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-cult-success hover:bg-cult-success/90 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Type
          </button>
          {!inline && (
            <button type="button" onClick={onClose} className="p-2 hover:bg-cult-charcoal rounded transition-colors">
              <X className="w-4 h-4 text-cult-medium-gray" />
            </button>
          )}
        </div>
      </div>

      {/* Body — scrollable */}
      <div className="overflow-y-auto flex-1 p-5">
        {loading ? (
          <div className="text-sm text-cult-medium-gray py-8 text-center">Loading task types...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {types.map((tt) => {
              const Icon = ICON_MAP[tt.icon] ?? Wrench;
              return (
                <button
                  key={tt.id}
                  type="button"
                  onClick={() => { setShowAdd(false); setEditingId(tt.id); }}
                  className={`text-left bg-cult-near-black border p-4 space-y-3 transition-all hover:border-cult-accent/50 ${
                    !tt.is_enabled ? 'opacity-40 border-cult-dark-gray/50' : editingId === tt.id ? 'border-cult-accent ring-1 ring-cult-accent/30' : 'border-cult-dark-gray'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${tt.color}20` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: tt.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-cult-white uppercase tracking-wider block truncate">{tt.label}</span>
                      {!tt.is_enabled && <span className="text-[10px] text-cult-warning uppercase">Disabled</span>}
                    </div>
                    {tt.is_builtin
                      ? <Lock className="w-3 h-3 text-cult-dark-gray flex-shrink-0" title="Built-in type — cannot be deleted" />
                      : <Pencil className="w-3 h-3 text-cult-dark-gray flex-shrink-0" />
                    }
                  </div>
                  <p className="text-xs text-cult-light-gray leading-relaxed line-clamp-2">
                    {tt.description}
                  </p>
                  {tt.fields.length > 0 && (
                    <div className="pt-2 border-t border-cult-dark-gray/50">
                      <span className="text-xs text-cult-medium-gray uppercase tracking-wider">Fields</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tt.fields.map((f) => (
                          <span key={f} className="px-1.5 py-0.5 text-xs bg-cult-charcoal text-cult-light-gray rounded-sm">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit modal (stacks on top) */}
      {editingId && (() => {
        const tt = types.find((t) => t.id === editingId);
        if (!tt) return null;
        return (
          <TaskTypeEditorModal
            key={editingId}
            taskType={tt}
            onSave={async (updates) => {
              await updateTaskType(tt.id, updates);
              setEditingId(null);
            }}
            onDelete={!tt.is_builtin ? async () => {
              await deleteTaskType(tt.id);
              setEditingId(null);
            } : undefined}
            onClose={() => setEditingId(null)}
          />
        );
      })()}

      {/* Add new task type modal */}
      {showAdd && (
        <TaskTypeEditorModal
          taskType={null}
          onSave={async (input) => {
            const key = (input.label ?? 'custom')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_')
              .replace(/^_|_$/g, '');
            await createTaskType({
              task_key: `custom_${key}`,
              label: input.label ?? 'New Task Type',
              description: input.description,
              color: input.color,
              icon: input.icon,
              fields: input.fields,
            });
            setShowAdd(false);
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );

  if (inline) {
    return panel;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {panel}
    </div>
  );
}

/* ── Task Type Editor Modal ─────────────────────────────── */
interface TaskTypeEditorModalProps {
  taskType: {
    task_key: string;
    label: string;
    description: string;
    color: string;
    icon: string;
    fields: string[];
    is_enabled: boolean;
    is_builtin: boolean;
  } | null;
  onSave: (updates: { label?: string; description?: string; color?: string; icon?: string; fields?: string[]; is_enabled?: boolean }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

function TaskTypeEditorModal({ taskType, onSave, onDelete, onClose }: TaskTypeEditorModalProps) {
  const isNew = !taskType;
  const [label, setLabel] = useState(taskType?.label ?? '');
  const [description, setDescription] = useState(taskType?.description ?? '');
  const [color, setColor] = useState(taskType?.color ?? '#A6A6A6');
  const [icon, setIcon] = useState(taskType?.icon ?? 'Wrench');
  const [fieldsStr, setFieldsStr] = useState((taskType?.fields ?? []).join(', '));
  const [enabled, setEnabled] = useState(taskType?.is_enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const fields = fieldsStr.split(',').map((f) => f.trim()).filter(Boolean);
      await onSave({ label, description, color, icon, fields, is_enabled: enabled });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setSaving(true);
    try {
      await onDelete();
    } finally {
      setSaving(false);
    }
  }

  const PreviewIcon = ICON_MAP[icon] ?? Wrench;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative w-full max-w-lg bg-cult-near-black border border-cult-dark-gray rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
              <PreviewIcon className="w-5 h-5" style={{ color }} />
            </div>
            <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">
              {isNew ? 'New Task Type' : `Edit — ${taskType.label}`}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-cult-charcoal rounded transition-colors">
            <X className="w-4 h-4 text-cult-medium-gray" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Built-in banner */}
          {taskType?.is_builtin && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cult-warning-muted border border-cult-warning/30 text-xs text-cult-warning">
              <Lock className="w-3 h-3" /> Built-in type — cannot be deleted
            </div>
          )}
          {/* Label */}
          <div>
            <label className="block text-xs text-cult-medium-gray uppercase tracking-wider mb-1">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 bg-cult-charcoal border border-cult-dark-gray text-cult-white text-sm rounded-sm focus:border-cult-accent focus:outline-none"
              placeholder="e.g. Foliar Spray"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs text-cult-medium-gray uppercase tracking-wider mb-1">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-sm border-2 transition-all ${color === c ? 'border-cult-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-cult-medium-gray uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-cult-charcoal border border-cult-dark-gray text-cult-white text-sm rounded-sm focus:border-cult-accent focus:outline-none resize-none"
              placeholder="What does this task type involve?"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-xs text-cult-medium-gray uppercase tracking-wider mb-1">Icon</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {AVAILABLE_ICONS.map((iconName) => {
                const Ic = ICON_MAP[iconName] ?? Wrench;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={`w-8 h-8 flex items-center justify-center rounded-sm border transition-all ${
                      icon === iconName ? 'border-cult-accent bg-cult-charcoal' : 'border-transparent hover:bg-cult-charcoal/50'
                    }`}
                    title={iconName}
                  >
                    <Ic className="w-4 h-4" style={{ color: icon === iconName ? color : '#666' }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fields */}
          <div>
            <label className="block text-xs text-cult-medium-gray uppercase tracking-wider mb-1">
              Completion Fields <span className="text-cult-dark-gray">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={fieldsStr}
              onChange={(e) => setFieldsStr(e.target.value)}
              className="w-full px-3 py-2 bg-cult-charcoal border border-cult-dark-gray text-cult-white text-sm rounded-sm focus:border-cult-accent focus:outline-none"
              placeholder="e.g. Product, Method, Duration"
            />
          </div>

          {/* Enable toggle */}
          {!isNew && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="accent-green-500"
              />
              <span className="text-xs text-cult-light-gray">Enabled</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-cult-dark-gray/50 bg-cult-near-black">
          <div>
            {onDelete && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-cult-danger hover:text-cult-danger transition-colors"
              >
                Delete
              </button>
            )}
            {onDelete && confirmDelete && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-cult-danger">Confirm?</span>
                <button type="button" onClick={handleDelete} className="px-2 py-1 text-xs bg-cult-danger hover:bg-cult-danger/90 text-white rounded-sm transition-colors" disabled={saving}>
                  Yes
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-xs text-cult-medium-gray hover:text-cult-white transition-colors">
                  No
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-cult-medium-gray hover:text-cult-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !label.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-cult-success hover:bg-cult-success/90 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : isNew ? 'Create' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
