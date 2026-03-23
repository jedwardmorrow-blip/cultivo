import type { RoomSection } from '../../types';
import { SectionMultiSelect } from './SectionMultiSelect';

const TRAINING_TYPES = [
  'topping', 'fimming', 'lst', 'scrog', 'supercropping', 'other',
] as const;

export interface TrainingFormData {
  training_type: string;
  plant_count: string;
  sections_trained: string[];
}

export const INITIAL_TRAINING_DATA: TrainingFormData = {
  training_type: 'topping',
  plant_count: '',
  sections_trained: [],
};

interface Props {
  data: TrainingFormData;
  onChange: (data: TrainingFormData) => void;
  sections: RoomSection[];
}

const inputClass = 'w-full bg-cult-charcoal border border-cult-dark-gray text-cult-white text-xs py-2.5 px-3 rounded-sm focus:outline-none focus:border-cult-accent';
const selectClass = inputClass;
const labelClass = 'block text-xs text-cult-light-gray uppercase tracking-wider mb-1';

function formatLabel(val: string) {
  return val === 'lst' ? 'LST' : val === 'scrog' ? 'SCROG' : val.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TrainingFields({ data, onChange, sections }: Props) {
  function set<K extends keyof TrainingFormData>(key: K, value: TrainingFormData[K]) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Training Type</label>
          <select value={data.training_type} onChange={(e) => set('training_type', e.target.value)} className={selectClass}>
            {TRAINING_TYPES.map((t) => <option key={t} value={t}>{formatLabel(t)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Plant Count</label>
          <input
            type="number"
            min="0"
            value={data.plant_count}
            onChange={(e) => set('plant_count', e.target.value)}
            placeholder="e.g., 24"
            className={inputClass}
          />
        </div>
      </div>

      <SectionMultiSelect
        label="Sections Trained"
        sections={sections}
        selected={data.sections_trained}
        onChange={(labels) => set('sections_trained', labels)}
      />
    </div>
  );
}
