export interface CustomFormData {
  task_name: string;
  description: string;
}

export const INITIAL_CUSTOM_DATA: CustomFormData = {
  task_name: '',
  description: '',
};

interface Props {
  data: CustomFormData;
  onChange: (data: CustomFormData) => void;
}

const inputClass = 'w-full bg-cult-surface-raised border border-cult-surface text-cult-text-primary text-xs py-2.5 px-3 rounded-sm focus:outline-none focus:border-cult-accent';
const labelClass = 'block text-xs text-cult-text-muted uppercase tracking-wider mb-1';

export function CustomFields({ data, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Task Name *</label>
        <input
          type="text"
          value={data.task_name}
          onChange={(e) => onChange({ ...data, task_name: e.target.value })}
          placeholder="What was done?"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          rows={3}
          placeholder="Additional details..."
          className={`${inputClass} resize-none`}
        />
      </div>
    </div>
  );
}
