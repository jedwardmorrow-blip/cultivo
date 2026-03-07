import type { RoomSection } from '../../types';
import { SectionMultiSelect } from './SectionMultiSelect';

const PRODUCT_TYPES = [
  'insecticide', 'fungicide', 'miticide', 'bactericide',
  'growth_regulator', 'nutrient_foliar', 'other',
] as const;

const APPLICATION_METHODS = [
  'foliar_spray', 'soil_drench', 'fogger', 'granular', 'other',
] as const;

export interface IpmSprayFormData {
  product_name: string;
  product_type: string;
  concentration: string;
  volume_applied: string;
  application_method: string;
  target_pest: string;
  tables_sprayed: string[];
  re_entry_hours: string;
  pre_harvest_days: string;
}

export const INITIAL_SPRAY_DATA: IpmSprayFormData = {
  product_name: '',
  product_type: 'insecticide',
  concentration: '',
  volume_applied: '',
  application_method: 'foliar_spray',
  target_pest: '',
  tables_sprayed: [],
  re_entry_hours: '',
  pre_harvest_days: '',
};

interface Props {
  data: IpmSprayFormData;
  onChange: (data: IpmSprayFormData) => void;
  sections: RoomSection[];
}

const inputClass = 'w-full bg-cult-charcoal border border-cult-dark-gray text-cult-white text-xs py-2.5 px-3 rounded-sm focus:outline-none focus:border-cult-accent';
const selectClass = inputClass;
const labelClass = 'block text-[10px] text-cult-light-gray uppercase tracking-wider mb-1';

function formatLabel(val: string) {
  return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function IpmSprayFields({ data, onChange, sections }: Props) {
  function set<K extends keyof IpmSprayFormData>(key: K, value: IpmSprayFormData[K]) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Product Name *</label>
        <input
          type="text"
          value={data.product_name}
          onChange={(e) => set('product_name', e.target.value)}
          placeholder="e.g., Azamax, Neem Oil"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Product Type</label>
          <select value={data.product_type} onChange={(e) => set('product_type', e.target.value)} className={selectClass}>
            {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{formatLabel(t)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Application Method</label>
          <select value={data.application_method} onChange={(e) => set('application_method', e.target.value)} className={selectClass}>
            {APPLICATION_METHODS.map((m) => <option key={m} value={m}>{formatLabel(m)}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Concentration</label>
          <input
            type="text"
            value={data.concentration}
            onChange={(e) => set('concentration', e.target.value)}
            placeholder="e.g., 2ml/gal"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Volume Applied</label>
          <input
            type="text"
            value={data.volume_applied}
            onChange={(e) => set('volume_applied', e.target.value)}
            placeholder="e.g., 5 gal"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Target Pest</label>
        <input
          type="text"
          value={data.target_pest}
          onChange={(e) => set('target_pest', e.target.value)}
          placeholder="e.g., Spider mites, Powdery mildew"
          className={inputClass}
        />
      </div>

      <SectionMultiSelect
        label="Sections Sprayed"
        sections={sections}
        selected={data.tables_sprayed}
        onChange={(labels) => set('tables_sprayed', labels)}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Re-entry Hours</label>
          <input
            type="number"
            min="0"
            value={data.re_entry_hours}
            onChange={(e) => set('re_entry_hours', e.target.value)}
            placeholder="e.g., 4"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Pre-harvest Days</label>
          <input
            type="number"
            min="0"
            value={data.pre_harvest_days}
            onChange={(e) => set('pre_harvest_days', e.target.value)}
            placeholder="e.g., 7"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
