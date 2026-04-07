import { useState, useRef, useEffect } from 'react';
import { X, Clock, Wheat, Sprout, CheckCircle2, AlertCircle, UserPlus, ChevronDown, UserX } from 'lucide-react';
import { Button } from '@/shared/components';
import { TASK_TYPE_CONFIG } from '../types';
import type { TaskType, RoomSection } from '../types';
import { useRoomSections } from '../hooks';
import { useSprayLog, useDefoliationLog, useCleaningLog, useScoutingLog, useTrainingLog, useCustomTaskLog, useBatchTankMixLog } from '../hooks';
import type { TaskCardData } from './TaskCard';
import {
  IpmSprayFields, INITIAL_SPRAY_DATA,
  DefoliationFields, INITIAL_DEFOLIATION_DATA,

  CleaningFields, INITIAL_CLEANING_DATA,
  ScoutingFields, INITIAL_SCOUTING_DATA,
  TrainingFields, INITIAL_TRAINING_DATA,
  CustomFields, INITIAL_CUSTOM_DATA,
  BatchTankMixFields, INITIAL_BATCH_TANK_MIX_DATA,
  SaturationCheckFields, INITIAL_SATURATION_CHECK_DATA,
  IrrigationAuditFields, INITIAL_IRRIGATION_AUDIT_DATA,
} from './task-forms';
import type {
  IpmSprayFormData,
  DefoliationFormData,
  CleaningFormData,
  ScoutingFormData,
  TrainingFormData,
  CustomFormData,
  BatchTankMixFormData,
  SaturationCheckFormData,
  IrrigationAuditFormData,
} from './task-forms';

const DURATION_OPTIONS = ['15min', '30min', '1hr', '2hr', '2hr+'] as const;

type AnyFormData =
  | IpmSprayFormData
  | DefoliationFormData
  | CleaningFormData
  | ScoutingFormData
  | TrainingFormData
  | CustomFormData
  | BatchTankMixFormData
  | SaturationCheckFormData
  | IrrigationAuditFormData;

interface StaffOption {
  id: string;
  first_name: string;
}

interface TaskCompletionFormProps {
  task: TaskCardData;
  roomId: string;
  staffOptions?: StaffOption[];
  onAssignWorker?: (taskId: string, staffId: string) => Promise<void>;
  onComplete: (refTable: string, refId: string, duration: string | null) => void;
  onNavigateHarvest: () => void;
  onNavigateClone: () => void;
  onClose: () => void;
}

function getInitialData(taskType: TaskType): AnyFormData | null {
  switch (taskType) {
    case 'ipm_spray': return { ...INITIAL_SPRAY_DATA };
    case 'defoliation': return { ...INITIAL_DEFOLIATION_DATA };
    // feeding_log still exists in DB for historical data; new tasks use batch_tank_mix
    case 'cleaning': return { ...INITIAL_CLEANING_DATA };
    case 'scouting': return { ...INITIAL_SCOUTING_DATA };
    case 'training': return { ...INITIAL_TRAINING_DATA };
    case 'custom': return { ...INITIAL_CUSTOM_DATA };
    case 'batch_tank_mix': return { ...INITIAL_BATCH_TANK_MIX_DATA };
    case 'saturation_check': return { ...INITIAL_SATURATION_CHECK_DATA };
    case 'irrigation_audit': return { ...INITIAL_IRRIGATION_AUDIT_DATA };
    default: return null;
  }
}

function getRefTable(taskType: TaskType): string {
  const map: Record<string, string> = {
    ipm_spray: 'ipm_spray_log',
    defoliation: 'defoliation_log',
    saturation_check: 'saturation_check_log',
    irrigation_audit: 'irrigation_audit_log',
    cleaning: 'cleaning_log',
    scouting: 'scouting_log',
    training: 'training_log',
    custom: 'custom_task_log',
    batch_tank_mix: 'batch_tank_mix_log',
  };
  return map[taskType] ?? 'custom_task_log';
}

export function TaskCompletionForm({
  task, roomId, staffOptions, onAssignWorker, onComplete, onNavigateHarvest, onNavigateClone, onClose,
}: TaskCompletionFormProps) {
  const [formData, setFormData] = useState<AnyFormData | null>(() => {
    const initial = getInitialData(task.task_type);
    // Pre-populate recipe overrides from task_config (set in TaskDetailDrawer)
    if (initial && task.task_type === 'batch_tank_mix' && task.task_config?.recipe_overrides) {
      (initial as BatchTankMixFormData).recipe_overrides = task.task_config.recipe_overrides as Record<string, number>;
    }
    return initial;
  });
  const [duration, setDuration] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [assignedStaffId, setAssignedStaffId] = useState<string | null>(task.assigned_to ?? null);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const staffDropdownRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const { allSections } = useRoomSections(roomId);
  const { insertSprayLog } = useSprayLog();
  const { insertDefoliationLog } = useDefoliationLog();
  const { insertCleaningLog } = useCleaningLog();
  const { insertScoutingLog } = useScoutingLog();
  const { insertTrainingLog } = useTrainingLog();
  const { insertCustomTaskLog } = useCustomTaskLog();
  const { insertBatchTankMixLog } = useBatchTankMixLog();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close staff dropdown on outside click
  useEffect(() => {
    if (!showStaffDropdown) return;
    function handleClick(e: MouseEvent) {
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(e.target as Node)) {
        setShowStaffDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showStaffDropdown]);

  const selectedStaff = staffOptions?.find((s) => s.id === assignedStaffId) ?? null;

  async function handleAssign(staffId: string | null) {
    setShowStaffDropdown(false);
    if (!onAssignWorker) return;
    if (staffId === assignedStaffId) return;
    setAssigning(true);
    try {
      if (staffId) {
        await onAssignWorker(task.id, staffId);
      }
      setAssignedStaffId(staffId);
    } finally {
      setAssigning(false);
    }
  }

  const config = TASK_TYPE_CONFIG[task.task_type] ?? TASK_TYPE_CONFIG.custom;
  const isRouter = task.task_type === 'harvest' || task.task_type === 'clone_cutting';

  function validate(): boolean {
    if (task.task_type === 'ipm_spray') {
      const d = formData as IpmSprayFormData;
      if (!d.product_name.trim()) { setError('Product name is required'); return false; }
    }
    if (task.task_type === 'custom') {
      const d = formData as CustomFormData;
      if (!d.task_name.trim()) { setError('Task name is required'); return false; }
    }
    if (task.task_type === 'batch_tank_mix') {
      const d = formData as BatchTankMixFormData;
      if (!d.gallons || parseFloat(d.gallons) <= 0) { setError('Gallons is required'); return false; }
      if (!d.ph_value || isNaN(parseFloat(d.ph_value))) { setError('pH reading is required'); return false; }
      if (d.reading_mode === 'ec') {
        if (!d.ec_value || isNaN(parseFloat(d.ec_value))) { setError('EC reading is required'); return false; }
      } else {
        if (!d.ppm_value || isNaN(parseFloat(d.ppm_value))) { setError('PPM reading is required'); return false; }
      }
    }
    return true;
  }

  async function handleSubmit() {
    setError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      let refId: string;
      const refTable = getRefTable(task.task_type);

      switch (task.task_type) {
        case 'ipm_spray': {
          const d = formData as IpmSprayFormData;
          const result = await insertSprayLog({
            room_id: roomId,
            task_instance_id: task.id,
            product_name: d.product_name,
            product_type: d.product_type,
            application_method: d.application_method,
            concentration: d.concentration || null,
            volume_applied: d.volume_applied || null,
            target_pest: d.target_pest || null,
            tables_sprayed: d.tables_sprayed.length > 0 ? d.tables_sprayed : null,
            re_entry_hours: d.re_entry_hours ? Number(d.re_entry_hours) : null,
            pre_harvest_days: d.pre_harvest_days ? Number(d.pre_harvest_days) : null,
            notes: notes || null,
          });
          refId = result.id;
          break;
        }
        case 'defoliation': {
          const d = formData as DefoliationFormData;
          const result = await insertDefoliationLog({
            room_id: roomId,
            task_instance_id: task.id,
            defoliation_type: d.defoliation_type,
            sections_completed: d.sections_completed.length > 0 ? d.sections_completed : null,
            sections_total: allSections.map((s: RoomSection) => s.section_label),
            notes: notes || null,
          });
          refId = result.id;
          break;
        }
        case 'saturation_check':
        case 'irrigation_audit': {
          // These new task types use custom_task_log until dedicated log tables are created
          const result = await insertCustomTaskLog({
            room_id: roomId,
            task_instance_id: task.id,
            task_name: TASK_TYPE_CONFIG[task.task_type]?.label ?? task.task_type,
            description: notes || null,
            notes: notes || null,
          });
          refId = result.id;
          break;
        }
        case 'cleaning': {
          const d = formData as CleaningFormData;
          const result = await insertCleaningLog({
            room_id: roomId,
            task_instance_id: task.id,
            cleaning_type: d.cleaning_type,
            notes: notes || null,
          });
          refId = result.id;
          break;
        }
        case 'scouting': {
          const d = formData as ScoutingFormData;
          const result = await insertScoutingLog({
            room_id: roomId,
            task_instance_id: task.id,
            pest_found: d.pest_found,
            pest_type: d.pest_found ? (d.pest_type || null) : null,
            pest_severity: d.pest_severity,
            disease_found: d.disease_found,
            disease_type: d.disease_found ? (d.disease_type || null) : null,
            nutrient_issues: d.nutrient_issues || null,
            overall_health: d.overall_health,
            sections_scouted: d.sections_scouted.length > 0 ? d.sections_scouted : null,
            notes: notes || null,
          });
          refId = result.id;
          break;
        }
        case 'training': {
          const d = formData as TrainingFormData;
          const result = await insertTrainingLog({
            room_id: roomId,
            task_instance_id: task.id,
            training_type: d.training_type,
            plant_count: d.plant_count ? Number(d.plant_count) : null,
            sections_trained: d.sections_trained.length > 0 ? d.sections_trained : null,
            notes: notes || null,
          });
          refId = result.id;
          break;
        }
        case 'custom': {
          const d = formData as CustomFormData;
          const result = await insertCustomTaskLog({
            room_id: roomId,
            task_instance_id: task.id,
            task_name: d.task_name,
            description: d.description || null,
            notes: notes || null,
          });
          refId = result.id;
          break;
        }
        case 'batch_tank_mix': {
          const d = formData as BatchTankMixFormData;
          // Build the recipe snapshot with any overrides applied
          const prescribedProducts = d._recipe_snapshot.map((entry) => ({
            product_id: entry.product_id,
            product_name: entry.product_name,
            ml_per_gal: d.recipe_overrides[entry.product_id] ?? entry.ml_per_gal,
            ml_per_gal_max: entry.ml_per_gal_max ?? null,
            mixing_order: entry.mixing_order,
          }));
          const result = await insertBatchTankMixLog({
            room_id: roomId,
            task_instance_id: task.id,
            feed_program_id: d._program_id || null,
            program_week_id: d._program_week_id || null,
            status: 'completed',
            stage: d._phase || null,
            week_number: d._week_number || null,
            prescribed_products: prescribedProducts,
            prescribed_ec: d._target_ec,
            prescribed_ppm: d.ppm_scale === '700' ? d._target_ppm_700 : d._target_ppm_500,
            prescribed_ph_min: d._target_ph_min,
            prescribed_ph_max: d._target_ph_max,
            actual_gallons: d.gallons ? Number(d.gallons) : null,
            actual_ec: d.reading_mode === 'ec' && d.ec_value ? Number(d.ec_value) : null,
            actual_ppm: d.reading_mode === 'ppm' && d.ppm_value ? Number(d.ppm_value) : null,
            ppm_scale: d.reading_mode === 'ppm' ? d.ppm_scale : null,
            actual_ph: d.ph_value ? Number(d.ph_value) : null,
            completed_at: new Date().toISOString(),
            completion_notes: notes || null,
          });
          refId = result.id;
          break;
        }
        default:
          return;
      }

      onComplete(refTable, refId, duration);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const formContent = (
    <div className="space-y-4">
      <FormHeader task={task} config={config} onClose={onClose} />

      {/* ── Assigned Worker Picker ──────────────────────────── */}
      {staffOptions && staffOptions.length > 0 && !isRouter && (
        <div className="relative" ref={staffDropdownRef}>
          <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1.5 font-semibold">
            Assigned To
          </label>
          <button
            type="button"
            onClick={() => setShowStaffDropdown(!showStaffDropdown)}
            disabled={assigning}
            className={`w-full flex items-center justify-between gap-2 px-3 py-3 min-h-[44px] text-xs border rounded-sm transition-colors ${
              selectedStaff
                ? 'bg-cult-charcoal border-cult-medium-gray text-cult-white'
                : 'bg-cult-charcoal/60 border-cult-warning/30 text-cult-warning'
            } hover:border-cult-light-gray disabled:opacity-50`}
          >
            <div className="flex items-center gap-2">
              {selectedStaff ? (
                <>
                  <span className="w-5 h-5 rounded-full bg-cult-near-black flex items-center justify-center text-xs font-bold text-cult-white flex-shrink-0">
                    {selectedStaff.first_name.charAt(0)}
                  </span>
                  <span className="font-medium">{selectedStaff.first_name}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="font-medium">{assigning ? 'Assigning...' : 'Unassigned — tap to assign'}</span>
                </>
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-cult-medium-gray transition-transform ${showStaffDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showStaffDropdown && (
            <div className="absolute z-20 mt-1 w-full bg-cult-near-black border border-cult-medium-gray rounded-sm shadow-xl max-h-48 overflow-y-auto">
              {selectedStaff && (
                <button
                  type="button"
                  onClick={() => handleAssign(null)}
                  className="w-full flex items-center gap-2 px-3 py-3 min-h-[44px] text-xs text-cult-warning hover:bg-cult-warning-muted transition-colors border-b border-cult-dark-gray/50"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Unassign
                </button>
              )}
              {staffOptions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleAssign(s.id)}
                  className={`w-full flex items-center gap-2 px-3 py-3 min-h-[44px] text-xs transition-colors ${
                    s.id === assignedStaffId
                      ? 'bg-cult-charcoal text-cult-white font-semibold'
                      : 'text-cult-light-gray hover:bg-cult-charcoal/60 hover:text-cult-white'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-cult-charcoal flex items-center justify-center text-xs font-bold text-cult-white flex-shrink-0">
                    {s.first_name.charAt(0)}
                  </span>
                  {s.first_name}
                  {s.id === assignedStaffId && (
                    <span className="ml-auto text-xs text-cult-medium-gray uppercase">Current</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isRouter ? (
        <RouterCard
          task={task}
          config={config}
          onNavigateHarvest={onNavigateHarvest}
          onNavigateClone={onNavigateClone}
          onClose={onClose}
        />
      ) : (
        <>
          <div className="max-h-[50vh] overflow-y-auto space-y-3 px-0.5 -mx-0.5">
            {task.task_type === 'ipm_spray' && formData && (
              <IpmSprayFields data={formData as IpmSprayFormData} onChange={setFormData} sections={allSections} />
            )}
            {task.task_type === 'defoliation' && formData && (
              <DefoliationFields data={formData as DefoliationFormData} onChange={setFormData} sections={allSections} />
            )}
            {task.task_type === 'saturation_check' && formData && (
              <SaturationCheckFields data={formData as SaturationCheckFormData} onChange={setFormData} />
            )}
            {task.task_type === 'irrigation_audit' && formData && (
              <IrrigationAuditFields data={formData as IrrigationAuditFormData} onChange={setFormData} />
            )}
            {task.task_type === 'cleaning' && formData && (
              <CleaningFields data={formData as CleaningFormData} onChange={setFormData} />
            )}
            {task.task_type === 'scouting' && formData && (
              <ScoutingFields data={formData as ScoutingFormData} onChange={setFormData} sections={allSections} />
            )}
            {task.task_type === 'training' && formData && (
              <TrainingFields data={formData as TrainingFormData} onChange={setFormData} sections={allSections} />
            )}
            {task.task_type === 'custom' && formData && (
              <CustomFields data={formData as CustomFormData} onChange={setFormData} />
            )}
            {task.task_type === 'batch_tank_mix' && formData && (
              <BatchTankMixFields data={formData as BatchTankMixFormData} onChange={setFormData} roomId={roomId} />
            )}
          </div>

          <FormFooter
            duration={duration}
            setDuration={setDuration}
            notes={notes}
            setNotes={setNotes}
            saving={saving}
            error={error}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div
        ref={backdropRef}
        className="fixed inset-0 z-50 flex items-end bg-black/60"
        onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      >
        <div className="w-full bg-cult-surface-overlay border-t border-cult-medium-gray rounded-t-xl p-5 max-h-[90vh] overflow-y-auto animate-slide-in">
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="bg-cult-surface-overlay border border-cult-medium-gray w-full max-w-md p-5 max-h-[85vh] overflow-y-auto animate-fade-in">
        {formContent}
      </div>
    </div>
  );
}

function FormHeader({ task, config, onClose }: {
  task: TaskCardData;
  config: { label: string; color: string };
  onClose: () => void;
}) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1.5">
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-sm"
          style={{ backgroundColor: `${config.color}20`, color: config.color }}
        >
          {config.label}
        </span>
        <div className="flex items-center gap-3 text-xs text-cult-light-gray">
          <span className="font-mono font-bold text-cult-white">{task.room_name}</span>
          {task.assigned_to_name && (
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-cult-charcoal flex items-center justify-center text-xs font-bold text-cult-white">
                {task.assigned_to_name.charAt(0)}
              </span>
              {task.assigned_to_name}
            </span>
          )}
          <span className="flex items-center gap-1 text-cult-medium-gray">
            <Clock className="w-3 h-3" />
            {timeStr}
          </span>
        </div>
      </div>
      <button type="button" onClick={onClose} className="p-2.5 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-cult-medium-gray hover:text-cult-light-gray active:bg-cult-charcoal/40 rounded-lg transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function RouterCard({ task, config, onNavigateHarvest, onNavigateClone, onClose }: {
  task: TaskCardData;
  config: { label: string; color: string };
  onNavigateHarvest: () => void;
  onNavigateClone: () => void;
  onClose: () => void;
}) {
  const isHarvest = task.task_type === 'harvest';
  const Icon = isHarvest ? Wheat : Sprout;
  const actionLabel = isHarvest ? 'Start Harvest' : 'Start Clone Session';

  function handleNavigate() {
    onClose();
    if (isHarvest) onNavigateHarvest();
    else onNavigateClone();
  }

  return (
    <div className="bg-cult-near-black border border-cult-dark-gray rounded-sm p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color: config.color }} />
        </div>
        <div>
          <p className="text-sm text-cult-white font-medium">
            {isHarvest ? 'Harvest Workflow' : 'Clone Cutting Flow'}
          </p>
          <p className="text-xs text-cult-medium-gray mt-0.5">
            {isHarvest
              ? 'This task uses the dedicated harvest workflow with room selection, weight recording, and batch creation.'
              : 'This task uses the clone cutting flow with mother selection, cut counts, and tray assignment.'}
          </p>
        </div>
      </div>
      <Button onClick={handleNavigate} className="w-full">
        {actionLabel}
      </Button>
    </div>
  );
}

function FormFooter({ duration, setDuration, notes, setNotes, saving, error, onSubmit }: {
  duration: string | null;
  setDuration: (d: string | null) => void;
  notes: string;
  setNotes: (n: string) => void;
  saving: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3 pt-2 border-t border-cult-dark-gray">
      <div>
        <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1.5">Duration</label>
        <div className="flex flex-wrap gap-1.5">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setDuration(duration === opt ? null : opt)}
              className={`px-3 py-2.5 min-h-[44px] text-xs rounded-sm border transition-colors flex items-center ${
                duration === opt
                  ? 'bg-cult-accent/20 border-cult-accent text-cult-accent'
                  : 'bg-cult-charcoal border-cult-dark-gray text-cult-light-gray hover:border-cult-medium-gray'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-cult-charcoal border border-cult-dark-gray text-cult-white text-xs py-2.5 px-3 rounded-sm resize-none focus:outline-none focus:border-cult-accent"
          placeholder="Optional notes..."
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-cult-danger bg-cult-danger-muted border border-cult-danger/30 rounded-sm px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button onClick={onSubmit} disabled={saving} className="w-full" icon={CheckCircle2}>
        {saving ? 'Saving...' : 'Complete Task'}
      </Button>
    </div>
  );
}
