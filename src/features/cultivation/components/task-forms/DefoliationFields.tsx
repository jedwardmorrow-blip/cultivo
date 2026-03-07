import type { RoomSection } from '../../types';
import { SectionMultiSelect } from './SectionMultiSelect';

const DEFOLIATION_TYPES = [
  'light', 'heavy', 'lollipop', 'top_removal', 'fan_leaf_strip',
] as const;

export interface DefoliationFormData {
  defoliation_type: string;
  sections_completed: string[];
}

export const INITIAL_DEFOLIATION_DATA: DefoliationFormData = {
  defoliation_type: 'light',
  sections_completed: [],
};

interface Props {
  data: DefoliationFormData;
  onChange: (data: DefoliationFormData) => void;
  sections: RoomSection[];
}

const selectClass = 'w-full bg-cult-charcoal border border-cult-dark-gray text-cult-white text-xs py-2.5 px-3 rounded-sm focus:outline-none focus:border-cult-accent';
const labelClass = 'block text-[10px] text-cult-light-gray uppercase tracking-wider mb-1';

function formatLabel(val: string) {
  return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DefoliationFields({ data, onChange, sections }: Props) {
  function set<K extends keyof DefoliationFormData>(key: K, value: DefoliationFormData[K]) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Defoliation Type</label>
        <select value={data.defoliation_type} onChange={(e) => set('defoliation_type', e.target.value)} className={selectClass}>
          {DEFOLIATION_TYPES.map((t) => <option key={t} value={t}>{formatLabel(t)}</option>)}
        </select>
      </div>

      <SectionMultiSelect
        label={`Sections Completed (${data.sections_completed.length} / ${sections.length})`}
        sections={sections}
        selected={data.sections_completed}
        onChange={(labels) => set('sections_completed', labels)}
      />
    </div>
  );
}
