const CLEANING_TYPES = [
  'floor', 'tables', 'walls', 'equipment', 'full_room', 'drains', 'other',
] as const;

export interface CleaningFormData {
  cleaning_type: string;
}

export const INITIAL_CLEANING_DATA: CleaningFormData = {
  cleaning_type: 'floor',
};

interface Props {
  data: CleaningFormData;
  onChange: (data: CleaningFormData) => void;
}

const selectClass = 'w-full bg-cult-surface-raised border border-cult-surface text-cult-text-primary text-xs py-2.5 px-3 rounded-sm focus:outline-none focus:border-cult-accent';
const labelClass = 'block text-xs text-cult-text-muted uppercase tracking-wider mb-1';

function formatLabel(val: string) {
  return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CleaningFields({ data, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Cleaning Type</label>
        <select
          value={data.cleaning_type}
          onChange={(e) => onChange({ ...data, cleaning_type: e.target.value })}
          className={selectClass}
        >
          {CLEANING_TYPES.map((t) => <option key={t} value={t}>{formatLabel(t)}</option>)}
        </select>
      </div>
    </div>
  );
}
