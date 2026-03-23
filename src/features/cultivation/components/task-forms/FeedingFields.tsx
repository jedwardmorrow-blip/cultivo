export interface FeedingFormData {
  reservoir_id: string;
  nutrient_mix: string;
  ec_value: string;
  ph_value: string;
  volume_gallons: string;
  water_temp_f: string;
}

export const INITIAL_FEEDING_DATA: FeedingFormData = {
  reservoir_id: '',
  nutrient_mix: '',
  ec_value: '',
  ph_value: '',
  volume_gallons: '',
  water_temp_f: '',
};

interface Props {
  data: FeedingFormData;
  onChange: (data: FeedingFormData) => void;
}

const inputClass = 'w-full bg-cult-charcoal border border-cult-dark-gray text-cult-white text-xs py-2.5 px-3 rounded-sm focus:outline-none focus:border-cult-accent';
const labelClass = 'block text-xs text-cult-light-gray uppercase tracking-wider mb-1';

export function FeedingFields({ data, onChange }: Props) {
  function set<K extends keyof FeedingFormData>(key: K, value: string) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Reservoir ID</label>
          <input
            type="text"
            value={data.reservoir_id}
            onChange={(e) => set('reservoir_id', e.target.value)}
            placeholder="e.g., R1"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Nutrient Mix</label>
          <input
            type="text"
            value={data.nutrient_mix}
            onChange={(e) => set('nutrient_mix', e.target.value)}
            placeholder="e.g., Week 4 Bloom"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>EC Value</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={data.ec_value}
            onChange={(e) => set('ec_value', e.target.value)}
            placeholder="e.g., 2.4"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>pH Value</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="14"
            value={data.ph_value}
            onChange={(e) => set('ph_value', e.target.value)}
            placeholder="e.g., 6.2"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Volume (gal)</label>
          <input
            type="number"
            min="0"
            value={data.volume_gallons}
            onChange={(e) => set('volume_gallons', e.target.value)}
            placeholder="e.g., 50"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Water Temp (&deg;F)</label>
          <input
            type="number"
            min="0"
            value={data.water_temp_f}
            onChange={(e) => set('water_temp_f', e.target.value)}
            placeholder="e.g., 68"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
