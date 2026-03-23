import type { RoomSection } from '../../types';
import { SectionMultiSelect } from './SectionMultiSelect';

const PEST_SEVERITIES = ['none', 'low', 'medium', 'high', 'critical'] as const;
const HEALTH_RATINGS = ['excellent', 'good', 'fair', 'poor', 'critical'] as const;

export interface ScoutingFormData {
  pest_found: boolean;
  pest_type: string;
  pest_severity: string;
  disease_found: boolean;
  disease_type: string;
  nutrient_issues: string;
  overall_health: string;
  sections_scouted: string[];
}

export const INITIAL_SCOUTING_DATA: ScoutingFormData = {
  pest_found: false,
  pest_type: '',
  pest_severity: 'none',
  disease_found: false,
  disease_type: '',
  nutrient_issues: '',
  overall_health: 'good',
  sections_scouted: [],
};

interface Props {
  data: ScoutingFormData;
  onChange: (data: ScoutingFormData) => void;
  sections: RoomSection[];
}

const inputClass = 'w-full bg-cult-charcoal border border-cult-dark-gray text-cult-white text-xs py-2.5 px-3 rounded-sm focus:outline-none focus:border-cult-accent';
const selectClass = inputClass;
const labelClass = 'block text-xs text-cult-light-gray uppercase tracking-wider mb-1';

function formatLabel(val: string) {
  return val.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ScoutingFields({ data, onChange, sections }: Props) {
  function set<K extends keyof ScoutingFormData>(key: K, value: ScoutingFormData[K]) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Overall Health</label>
        <select value={data.overall_health} onChange={(e) => set('overall_health', e.target.value)} className={selectClass}>
          {HEALTH_RATINGS.map((r) => <option key={r} value={r}>{formatLabel(r)}</option>)}
        </select>
      </div>

      <div className="bg-cult-near-black border border-cult-dark-gray rounded-sm p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-cult-light-gray">Pests Found</span>
          <button
            type="button"
            onClick={() => set('pest_found', !data.pest_found)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              data.pest_found ? 'bg-red-600' : 'bg-cult-dark-gray'
            }`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              data.pest_found ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
        {data.pest_found && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className={labelClass}>Pest Type</label>
              <input
                type="text"
                value={data.pest_type}
                onChange={(e) => set('pest_type', e.target.value)}
                placeholder="e.g., Spider mites"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Severity</label>
              <select value={data.pest_severity} onChange={(e) => set('pest_severity', e.target.value)} className={selectClass}>
                {PEST_SEVERITIES.map((s) => <option key={s} value={s}>{formatLabel(s)}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="bg-cult-near-black border border-cult-dark-gray rounded-sm p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-cult-light-gray">Disease Found</span>
          <button
            type="button"
            onClick={() => set('disease_found', !data.disease_found)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              data.disease_found ? 'bg-red-600' : 'bg-cult-dark-gray'
            }`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              data.disease_found ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
        {data.disease_found && (
          <div className="pt-1">
            <label className={labelClass}>Disease Type</label>
            <input
              type="text"
              value={data.disease_type}
              onChange={(e) => set('disease_type', e.target.value)}
              placeholder="e.g., Powdery mildew"
              className={inputClass}
            />
          </div>
        )}
      </div>

      <div>
        <label className={labelClass}>Nutrient Issues</label>
        <input
          type="text"
          value={data.nutrient_issues}
          onChange={(e) => set('nutrient_issues', e.target.value)}
          placeholder="e.g., Nitrogen deficiency in lower canopy"
          className={inputClass}
        />
      </div>

      <SectionMultiSelect
        label="Sections Scouted"
        sections={sections}
        selected={data.sections_scouted}
        onChange={(labels) => set('sections_scouted', labels)}
      />
    </div>
  );
}
