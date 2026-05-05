export interface IrrigationAuditFormData {
  current_frequency: string;
  current_duration: string;
  adjusted_frequency: string;
  adjusted_duration: string;
  emitter_flow_rate: string;
  adjustments_made: boolean;
}

export const INITIAL_IRRIGATION_AUDIT_DATA: IrrigationAuditFormData = {
  current_frequency: '',
  current_duration: '',
  adjusted_frequency: '',
  adjusted_duration: '',
  emitter_flow_rate: '',
  adjustments_made: false,
};

interface Props {
  data: IrrigationAuditFormData;
  onChange: (data: IrrigationAuditFormData) => void;
}

const inputClass = 'w-full bg-cult-surface-raised border border-cult-surface text-cult-text-primary text-xs py-2.5 px-3 rounded-sm focus:outline-none focus:border-cult-accent';
const labelClass = 'block text-xs text-cult-text-muted uppercase tracking-wider mb-1';

export function IrrigationAuditFields({ data, onChange }: Props) {
  function set<K extends keyof IrrigationAuditFormData>(key: K, value: IrrigationAuditFormData[K]) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Current Frequency</label>
          <input
            value={data.current_frequency}
            onChange={(e) => set('current_frequency', e.target.value)}
            className={inputClass}
            placeholder="e.g. every 4 hours"
          />
        </div>
        <div>
          <label className={labelClass}>Current Duration</label>
          <input
            value={data.current_duration}
            onChange={(e) => set('current_duration', e.target.value)}
            className={inputClass}
            placeholder="e.g. 3 minutes"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Adjusted Frequency</label>
          <input
            value={data.adjusted_frequency}
            onChange={(e) => set('adjusted_frequency', e.target.value)}
            className={inputClass}
            placeholder="Leave blank if no change"
          />
        </div>
        <div>
          <label className={labelClass}>Adjusted Duration</label>
          <input
            value={data.adjusted_duration}
            onChange={(e) => set('adjusted_duration', e.target.value)}
            className={inputClass}
            placeholder="Leave blank if no change"
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Emitter Flow Rate</label>
        <input
          value={data.emitter_flow_rate}
          onChange={(e) => set('emitter_flow_rate', e.target.value)}
          className={inputClass}
          placeholder="e.g. 2 GPH"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-cult-text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={data.adjustments_made}
          onChange={(e) => set('adjustments_made', e.target.checked)}
          className="rounded border-cult-surface bg-cult-surface-raised text-cult-accent focus:ring-cult-accent"
        />
        Adjustments were made
      </label>
    </div>
  );
}
