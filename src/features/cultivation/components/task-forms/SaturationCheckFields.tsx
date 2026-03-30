export interface SaturationCheckFormData {
  runoff_ec: string;
  runoff_ph: string;
  moisture_pct: string;
  sections_checked: string[];
}

export const INITIAL_SATURATION_CHECK_DATA: SaturationCheckFormData = {
  runoff_ec: '',
  runoff_ph: '',
  moisture_pct: '',
  sections_checked: [],
};

interface Props {
  data: SaturationCheckFormData;
  onChange: (data: SaturationCheckFormData) => void;
}

const inputClass = 'w-full bg-cult-charcoal border border-cult-dark-gray text-cult-white text-xs py-2.5 px-3 rounded-sm focus:outline-none focus:border-cult-accent';
const labelClass = 'block text-xs text-cult-light-gray uppercase tracking-wider mb-1';

function set<K extends keyof SaturationCheckFormData>(
  data: SaturationCheckFormData,
  onChange: (d: SaturationCheckFormData) => void,
  key: K,
  value: SaturationCheckFormData[K],
) {
  onChange({ ...data, [key]: value });
}

export function SaturationCheckFields({ data, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={labelClass}>Runoff EC</label>
          <input
            type="number"
            step="0.1"
            value={data.runoff_ec}
            onChange={(e) => set(data, onChange, 'runoff_ec', e.target.value)}
            className={inputClass}
            placeholder="e.g. 2.4"
          />
        </div>
        <div>
          <label className={labelClass}>Runoff pH</label>
          <input
            type="number"
            step="0.1"
            value={data.runoff_ph}
            onChange={(e) => set(data, onChange, 'runoff_ph', e.target.value)}
            className={inputClass}
            placeholder="e.g. 6.2"
          />
        </div>
        <div>
          <label className={labelClass}>Moisture %</label>
          <input
            type="number"
            step="1"
            value={data.moisture_pct}
            onChange={(e) => set(data, onChange, 'moisture_pct', e.target.value)}
            className={inputClass}
            placeholder="e.g. 45"
          />
        </div>
      </div>
    </div>
  );
}
