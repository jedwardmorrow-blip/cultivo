import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import type { AnnotationCategory, AnnotationSeverity, CreateAnnotationInput } from '../types';

const CATEGORIES: { value: AnnotationCategory; label: string }[] = [
  { value: 'observation', label: 'Observation' },
  { value: 'concern', label: 'Concern' },
  { value: 'decision', label: 'Decision' },
  { value: 'action_taken', label: 'Action Taken' },
  { value: 'note', label: 'Note' },
];

const SEVERITIES: { value: AnnotationSeverity; label: string; cls: string }[] = [
  { value: 'info', label: 'Info', cls: 'text-cult-text-muted' },
  { value: 'warning', label: 'Warning', cls: 'text-cult-warning' },
  { value: 'critical', label: 'Critical', cls: 'text-cult-danger' },
];

interface AnnotationInputProps {
  date: string;
  rooms: { id: string; name: string }[];
  onSubmit: (input: CreateAnnotationInput) => Promise<void>;
}

export function AnnotationInput({ date, rooms, onSubmit }: AnnotationInputProps) {
  const [category, setCategory] = useState<AnnotationCategory>('observation');
  const [severity, setSeverity] = useState<AnnotationSeverity>('info');
  const [roomId, setRoomId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && !saving;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const input: CreateAnnotationInput = {
        room_id: roomId || rooms[0]?.id || '',
        category,
        title: title.trim(),
        annotation_date: date,
        ...(body.trim() && { body: body.trim() }),
        ...(category === 'concern' && { severity }),
      };
      await onSubmit(input);
      setTitle('');
      setBody('');
      setCategory('observation');
      setSeverity('info');
      setRoomId('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add annotation');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-cult-border bg-cult-surface-raised p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-cult-text-muted mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as AnnotationCategory)}
            className="w-full rounded-md bg-cult-surface border border-cult-border text-cult-text-primary text-sm px-3 py-2 focus:outline-none focus:border-cult-text-secondary"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-cult-text-muted mb-1">Room (optional)</label>
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full rounded-md bg-cult-surface border border-cult-border text-cult-text-primary text-sm px-3 py-2 focus:outline-none focus:border-cult-text-secondary"
          >
            <option value="">All / General</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {category === 'concern' && (
          <div>
            <label className="block text-xs font-medium text-cult-text-muted mb-1">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as AnnotationSeverity)}
              className="w-full rounded-md bg-cult-surface border border-cult-border text-cult-text-primary text-sm px-3 py-2 focus:outline-none focus:border-cult-text-secondary"
            >
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-cult-text-muted mb-1">Note</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief summary..."
          className="w-full rounded-md bg-cult-surface border border-cult-border text-cult-text-primary text-sm px-3 py-2 focus:outline-none focus:border-cult-text-secondary placeholder:text-cult-text-faint"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-cult-text-muted mb-1">Details (optional)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Additional context..."
          rows={2}
          className="w-full rounded-md bg-cult-surface border border-cult-border text-cult-text-primary text-sm px-3 py-2 focus:outline-none focus:border-cult-text-secondary placeholder:text-cult-text-faint resize-none"
        />
      </div>

      {error && (
        <p className="text-xs text-cult-danger">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-cult bg-cult-accent text-cult-white hover:bg-cult-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Add Annotation
      </button>
    </div>
  );
}
