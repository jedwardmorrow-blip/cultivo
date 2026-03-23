import type { RoomSection } from '../../types';

interface SectionMultiSelectProps {
  label: string;
  sections: RoomSection[];
  selected: string[];
  onChange: (labels: string[]) => void;
}

export function SectionMultiSelect({ label, sections, selected, onChange }: SectionMultiSelectProps) {
  function toggle(sectionLabel: string) {
    if (selected.includes(sectionLabel)) {
      onChange(selected.filter((s) => s !== sectionLabel));
    } else {
      onChange([...selected, sectionLabel]);
    }
  }

  function toggleAll() {
    if (selected.length === sections.length) {
      onChange([]);
    } else {
      onChange(sections.map((s) => s.section_label));
    }
  }

  if (sections.length === 0) {
    return (
      <div>
        <label className="block text-xs text-cult-light-gray uppercase tracking-wider mb-1">{label}</label>
        <p className="text-xs text-cult-medium-gray">No sections configured for this room</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-cult-light-gray uppercase tracking-wider">{label}</label>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-cult-accent hover:text-cult-accent-hover transition-colors"
        >
          {selected.length === sections.length ? 'Clear all' : 'Select all'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sections.map((s) => {
          const isActive = selected.includes(s.section_label);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.section_label)}
              className={`px-2.5 py-1.5 text-xs font-mono rounded-sm border transition-colors ${
                isActive
                  ? 'bg-cult-accent/20 border-cult-accent text-cult-accent'
                  : 'bg-cult-charcoal border-cult-dark-gray text-cult-light-gray hover:border-cult-medium-gray'
              }`}
            >
              {s.section_label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
