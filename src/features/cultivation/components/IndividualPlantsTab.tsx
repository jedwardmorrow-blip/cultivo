import { useEffect, useState, useRef } from 'react';
import { Plus, Upload, CircleOff, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components';
import { cultivationService } from '../services';
import type { IndividualPlant, BulkImportPlantResult } from '../types';

interface IndividualPlantsTabProps {
  plantGroupId: string;
  plantCount: number;
}

const FORMAT_RE = /^[0-9]{12}$/;

function validateStatePlantId(value: string): string | null {
  if (!value.trim()) return 'Required';
  if (!FORMAT_RE.test(value.trim())) return 'Must be exactly 12 digits (numbers only)';
  return null;
}

export function IndividualPlantsTab({ plantGroupId, plantCount }: IndividualPlantsTabProps) {
  const [plants, setPlants] = useState<IndividualPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addValue, setAddValue] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<BulkImportPlantResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cultivationService.listIndividualPlants(plantGroupId).then((data) => {
      if (!cancelled) { setPlants(data); setLoading(false); }
    }).catch((err) => {
      if (!cancelled) { setError(err.message); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [plantGroupId]);

  async function handleAdd() {
    const trimmed = addValue.trim();
    const validationError = validateStatePlantId(trimmed);
    if (validationError) { setAddError(validationError); return; }
    setAddSaving(true);
    setAddError(null);
    try {
      const plant = await cultivationService.addIndividualPlant({
        plant_group_id: plantGroupId,
        state_plant_id: trimmed,
        notes: addNotes.trim() || undefined,
      });
      setPlants((prev) => [...prev, plant].sort((a, b) => a.state_plant_id.localeCompare(b.state_plant_id)));
      setAddValue('');
      setAddNotes('');
      setShowAddForm(false);
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to add plant ID.');
    } finally {
      setAddSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    try {
      const updated = await cultivationService.deactivateIndividualPlant(id);
      setPlants((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate plant.');
    }
  }

  async function handleImport() {
    const ids = importText
      .split(/[\n,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await cultivationService.bulkImportIndividualPlants(plantGroupId, ids);
      setImportResult(result);
      if (result.imported > 0) {
        const fresh = await cultivationService.listIndividualPlants(plantGroupId);
        setPlants(fresh);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportText(ev.target?.result as string ?? '');
      setShowImport(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const activeCount = plants.filter((p) => p.is_active).length;
  const inactiveCount = plants.filter((p) => !p.is_active).length;

  if (loading) {
    return <p className="text-cult-border text-xs py-2">Loading plant IDs...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-cult-text-muted">
          <span className="text-cult-text-primary font-semibold">{activeCount}</span> active
          {inactiveCount > 0 && <span className="text-cult-border ml-1.5">/ {inactiveCount} inactive</span>}
          <span className="text-cult-border ml-1.5">· group has {plantCount} plants</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowImport(!showImport); setImportResult(null); }}
            className="flex items-center gap-1 text-xs border border-cult-border text-cult-text-muted px-2 py-1 hover:border-cult-text-muted hover:text-cult-text-primary transition-all uppercase tracking-wider"
          >
            <Upload className="w-3 h-3" />
            Import
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 text-xs border border-cult-border text-cult-text-muted px-2 py-1 hover:border-cult-text-muted hover:text-cult-text-primary transition-all uppercase tracking-wider"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-cult-danger-muted border border-cult-danger text-cult-danger text-xs p-2">
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="bg-cult-black border border-cult-border p-3 space-y-2">
          <div>
            <label className="block text-xs text-cult-text-muted uppercase tracking-wider mb-1">State Plant ID (12 digits)</label>
            <input
              type="text"
              value={addValue}
              onChange={(e) => { setAddValue(e.target.value); setAddError(null); }}
              placeholder="e.g. 202512196856"
              maxLength={12}
              className="w-full bg-cult-surface border border-cult-border text-cult-text-primary px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-cult-text-muted"
            />
            {addError && <p className="text-cult-danger text-xs mt-1">{addError}</p>}
          </div>
          <div>
            <label className="block text-xs text-cult-text-muted uppercase tracking-wider mb-1">Notes (optional)</label>
            <input
              type="text"
              value={addNotes}
              onChange={(e) => setAddNotes(e.target.value)}
              placeholder="Optional"
              className="w-full bg-cult-surface border border-cult-border text-cult-text-primary px-3 py-1.5 text-sm focus:outline-none focus:border-cult-text-muted"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleAdd}
              disabled={addSaving}
              size="xs"
              icon={addSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            >
              {addSaving ? 'Saving...' : 'Save'}
            </Button>
            <button
              onClick={() => { setShowAddForm(false); setAddValue(''); setAddError(null); }}
              className="text-xs border border-cult-border text-cult-text-muted px-3 py-1.5 uppercase tracking-wider hover:border-cult-text-muted hover:text-cult-text-primary transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showImport && (
        <div className="bg-cult-black border border-cult-border p-3 space-y-2">
          <p className="text-xs text-cult-text-muted">Paste plant IDs (one per line, or comma/space separated), or upload a CSV/TXT file.</p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={5}
            placeholder="202512196856&#10;202512196857&#10;202512196858"
            className="w-full bg-cult-surface border border-cult-border text-cult-text-primary px-3 py-2 text-xs font-mono focus:outline-none focus:border-cult-text-muted resize-y"
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={handleImport}
              disabled={importing || !importText.trim()}
              size="xs"
              icon={importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            >
              {importing ? 'Importing...' : 'Import'}
            </Button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs border border-cult-border text-cult-text-muted px-3 py-1.5 uppercase tracking-wider hover:border-cult-text-muted hover:text-cult-text-primary transition-all"
            >
              Upload File
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            <button
              onClick={() => { setShowImport(false); setImportText(''); setImportResult(null); }}
              className="text-xs text-cult-border hover:text-cult-text-primary transition-colors ml-auto"
            >
              Close
            </button>
          </div>
          {importResult && (
            <div className="space-y-1 text-xs">
              {importResult.imported > 0 && (
                <div className="flex items-center gap-1.5 text-cult-success">
                  <CheckCircle2 className="w-3 h-3" />
                  {importResult.imported} plant ID{importResult.imported !== 1 ? 's' : ''} imported
                </div>
              )}
              {importResult.skipped.length > 0 && (
                <div className="text-cult-warning">
                  {importResult.skipped.length} skipped (already exist): {importResult.skipped.slice(0, 5).join(', ')}{importResult.skipped.length > 5 ? '...' : ''}
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="text-cult-danger">
                  {importResult.errors.length} invalid: {importResult.errors.slice(0, 3).map((e) => `${e.state_plant_id} (${e.reason})`).join(', ')}{importResult.errors.length > 3 ? '...' : ''}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {plants.length === 0 ? (
        <p className="text-cult-border text-xs">No plant IDs registered yet. Add them individually or import from your old system.</p>
      ) : (
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {plants.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between px-2 py-1.5 border text-xs transition-all ${
                p.is_active
                  ? 'border-cult-border bg-cult-surface'
                  : 'border-cult-surface bg-black opacity-50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`font-mono ${p.is_active ? 'text-cult-text-primary' : 'text-cult-border line-through'}`}>
                  {p.state_plant_id}
                </span>
                {p.notes && <span className="text-cult-border truncate">{p.notes}</span>}
              </div>
              {p.is_active && (
                <button
                  onClick={() => handleDeactivate(p.id)}
                  title="Mark as removed/dead"
                  className="p-1 text-cult-border hover:text-cult-danger transition-colors flex-shrink-0"
                >
                  <CircleOff className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
