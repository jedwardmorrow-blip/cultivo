import { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Plus, Pencil, Trash2, FlaskConical, X, Check } from 'lucide-react';
import { useBatchChemicalAdditives } from '../hooks/useBatchChemicalAdditives';
import type { BatchChemicalAdditive, BatchChemicalAdditiveInsert, ChemicalAdditiveType } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BatchChemicalAdditiveFormProps {
  batchId: string;
}

type FormMode = 'add' | 'edit';

interface AdditiveFormState {
  additive_type: ChemicalAdditiveType;
  product_name: string;
  active_ingredient: string;
  application_date: string;
  rate_applied: string;
  application_method: string;
  applicator: string;
  epa_reg_number: string;
  phi_days: string;
  notes: string;
}

const EMPTY_FORM: AdditiveFormState = {
  additive_type: 'pesticide',
  product_name: '',
  active_ingredient: '',
  application_date: '',
  rate_applied: '',
  application_method: '',
  applicator: '',
  epa_reg_number: '',
  phi_days: '',
  notes: '',
};

const TYPE_LABELS: Record<ChemicalAdditiveType, string> = {
  pesticide: 'Pesticide',
  herbicide: 'Herbicide',
  fertilizer: 'Fertilizer',
  other: 'Other',
};

const TYPE_COLORS: Record<ChemicalAdditiveType, string> = {
  pesticide: 'bg-cult-danger-muted text-cult-danger border-cult-danger/30',
  herbicide: 'bg-cult-warning-muted text-cult-warning border-cult-warning/30',
  fertilizer: 'bg-cult-success-muted text-cult-success border-cult-success/30',
  other: 'bg-cult-charcoal text-cult-text-muted border-cult-medium-gray/40',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ─── Inline additive form ────────────────────────────────────────────────────

function AdditiveFormFields({
  form,
  onChange,
  onSubmit,
  onCancel,
  saving,
  error,
  mode,
}: {
  form: AdditiveFormState;
  onChange: (field: keyof AdditiveFormState, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  mode: FormMode;
}) {
  const field = (
    key: keyof AdditiveFormState,
    label: string,
    type: string = 'text',
    required = false
  ) => (
    <div>
      <label className="block text-[10px] text-cult-text-muted uppercase tracking-wider mb-1">
        {label}{required && <span className="text-cult-danger ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={e => onChange(key, e.target.value)}
        className="w-full bg-cult-charcoal border border-cult-medium-gray text-cult-white px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-cult-accent rounded"
      />
    </div>
  );

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-cult-text-muted uppercase tracking-wider mb-1">
            Type <span className="text-cult-danger">*</span>
          </label>
          <select
            value={form.additive_type}
            onChange={e => onChange('additive_type', e.target.value)}
            className="w-full bg-cult-charcoal border border-cult-medium-gray text-cult-white px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-cult-accent rounded"
          >
            {(Object.keys(TYPE_LABELS) as ChemicalAdditiveType[]).map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        {field('product_name', 'Product Name', 'text', true)}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {field('active_ingredient', 'Active Ingredient')}
        {field('application_date', 'Application Date', 'date', true)}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {field('rate_applied', 'Rate Applied (e.g. 2 oz/gal)')}
        {field('application_method', 'Application Method')}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {field('applicator', 'Applicator')}
        {field('epa_reg_number', 'EPA Reg #')}
        {field('phi_days', 'PHI Days', 'number')}
      </div>

      {field('notes', 'Notes')}

      {error && (
        <div className="text-[12px] text-cult-danger flex items-center gap-1.5">
          <X className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSubmit}
          disabled={saving || !form.product_name.trim() || !form.application_date}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-cult-accent text-cult-black font-semibold rounded hover:bg-cult-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : mode === 'add' ? 'Add Record' : 'Save Changes'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] border border-cult-medium-gray text-cult-white rounded hover:bg-cult-charcoal transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Row display ──────────────────────────────────────────────────────────────

function AdditiveRow({
  additive,
  onEdit,
  onDelete,
}: {
  additive: BatchChemicalAdditive;
  onEdit: (additive: BatchChemicalAdditive) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex items-start gap-3 py-3 border-b border-cult-charcoal/40 last:border-b-0">
      <span className={`text-[10px] px-2 py-0.5 rounded border flex-shrink-0 mt-0.5 font-medium ${TYPE_COLORS[additive.additive_type]}`}>
        {TYPE_LABELS[additive.additive_type]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-cult-white font-medium">{additive.product_name}</div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-0.5 text-[11px] text-cult-text-muted">
          <span>Applied: {formatDate(additive.application_date)}</span>
          {additive.active_ingredient && <span>AI: {additive.active_ingredient}</span>}
          {additive.applicator && <span>By: {additive.applicator}</span>}
          {additive.rate_applied && <span>Rate: {additive.rate_applied}</span>}
          {additive.phi_days != null && <span>PHI: {additive.phi_days}d</span>}
          {additive.epa_reg_number && <span>EPA: {additive.epa_reg_number}</span>}
          {additive.ipm_log_id && (
            <span className="text-cult-info">Linked from IPM log</span>
          )}
        </div>
        {additive.notes && (
          <div className="mt-1 text-[11px] text-cult-lighter-gray">{additive.notes}</div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(additive)}
          className="p-1.5 text-cult-text-muted hover:text-cult-white hover:bg-cult-charcoal rounded transition-colors"
          title="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1.5 text-cult-text-muted hover:text-cult-danger hover:bg-cult-danger-muted rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(additive.id)}
              className="px-2 py-1 text-[10px] bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 text-[10px] border border-cult-medium-gray text-cult-white rounded hover:bg-cult-charcoal"
            >
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function BatchChemicalAdditiveForm({ batchId }: BatchChemicalAdditiveFormProps) {
  const { additives, loading, error, add, update, remove } = useBatchChemicalAdditives(batchId);

  const [expanded, setExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<AdditiveFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleFieldChange = useCallback((field: keyof AdditiveFormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAdd = useCallback(async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload: Omit<BatchChemicalAdditiveInsert, 'batch_id'> = {
        additive_type: formState.additive_type,
        product_name: formState.product_name.trim(),
        active_ingredient: formState.active_ingredient.trim() || null,
        application_date: formState.application_date,
        rate_applied: formState.rate_applied.trim() || null,
        application_method: formState.application_method.trim() || null,
        applicator: formState.applicator.trim() || null,
        epa_reg_number: formState.epa_reg_number.trim() || null,
        phi_days: formState.phi_days ? parseInt(formState.phi_days, 10) : null,
        notes: formState.notes.trim() || null,
      };
      await add(payload);
      setFormState(EMPTY_FORM);
      setShowAddForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [formState, add]);

  const handleEdit = useCallback((additive: BatchChemicalAdditive) => {
    setFormState({
      additive_type: additive.additive_type,
      product_name: additive.product_name,
      active_ingredient: additive.active_ingredient ?? '',
      application_date: additive.application_date,
      rate_applied: additive.rate_applied ?? '',
      application_method: additive.application_method ?? '',
      applicator: additive.applicator ?? '',
      epa_reg_number: additive.epa_reg_number ?? '',
      phi_days: additive.phi_days?.toString() ?? '',
      notes: additive.notes ?? '',
    });
    setEditingId(additive.id);
    setShowAddForm(false);
    setExpanded(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId) return;
    setSaving(true);
    setFormError(null);
    try {
      await update(editingId, {
        additive_type: formState.additive_type,
        product_name: formState.product_name.trim(),
        active_ingredient: formState.active_ingredient.trim() || null,
        application_date: formState.application_date,
        rate_applied: formState.rate_applied.trim() || null,
        application_method: formState.application_method.trim() || null,
        applicator: formState.applicator.trim() || null,
        epa_reg_number: formState.epa_reg_number.trim() || null,
        phi_days: formState.phi_days ? parseInt(formState.phi_days, 10) : null,
        notes: formState.notes.trim() || null,
      });
      setEditingId(null);
      setFormState(EMPTY_FORM);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [editingId, formState, update]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await remove(id);
    } catch (err) {
      console.error('[BatchChemicalAdditiveForm] delete error:', err);
    }
  }, [remove]);

  const handleCancelForm = useCallback(() => {
    setShowAddForm(false);
    setEditingId(null);
    setFormState(EMPTY_FORM);
    setFormError(null);
  }, []);

  return (
    <div className="border border-cult-dark-gray rounded">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-cult-charcoal/30 transition-colors rounded"
      >
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-cult-text-muted" />
          <span className="text-[13px] font-medium text-cult-white">Chemical Additives</span>
          {additives.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-cult-charcoal border border-cult-medium-gray/40 rounded text-cult-text-muted">
              {additives.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-cult-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-cult-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Error */}
          {error && (
            <div className="text-[12px] text-cult-warning flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" />
              {error} — table may not be deployed yet (CUL-359)
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="animate-pulse space-y-2">
              {[1, 2].map(i => <div key={i} className="h-14 bg-cult-charcoal rounded" />)}
            </div>
          )}

          {/* Additive list */}
          {!loading && !error && (
            <>
              {additives.length === 0 && !showAddForm ? (
                <p className="text-[12px] text-cult-text-muted py-2">
                  No chemical additive records for this batch.
                </p>
              ) : (
                <div>
                  {additives.map(additive => (
                    editingId === additive.id ? (
                      <div key={additive.id} className="py-2">
                        <AdditiveFormFields
                          form={formState}
                          onChange={handleFieldChange}
                          onSubmit={handleSaveEdit}
                          onCancel={handleCancelForm}
                          saving={saving}
                          error={formError}
                          mode="edit"
                        />
                      </div>
                    ) : (
                      <AdditiveRow
                        key={additive.id}
                        additive={additive}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    )
                  ))}
                </div>
              )}

              {showAddForm && !editingId && (
                <AdditiveFormFields
                  form={formState}
                  onChange={handleFieldChange}
                  onSubmit={handleAdd}
                  onCancel={handleCancelForm}
                  saving={saving}
                  error={formError}
                  mode="add"
                />
              )}

              {!showAddForm && !editingId && (
                <button
                  onClick={() => { setShowAddForm(true); setFormError(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] border border-cult-medium-gray text-cult-lighter-gray rounded hover:bg-cult-charcoal hover:text-cult-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Chemical Additive
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
