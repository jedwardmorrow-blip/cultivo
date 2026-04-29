import { TASK_TYPE_CONFIG } from '../../types';
import type { ScheduleTemplate } from '../../hooks';

interface TemplatePickerProps {
  templates: ScheduleTemplate[];
  roomType: string;
  applying: boolean;
  onApply: (templateId: string) => void;
  onCancel: () => void;
}

export function TemplatePicker({ templates, roomType, applying, onApply, onCancel }: TemplatePickerProps) {
  // Show matching room type first, then all others
  const matchingTemplates = templates.filter((t) => t.room_type === roomType);
  const otherTemplates = templates.filter((t) => t.room_type !== roomType);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-cult-warning uppercase tracking-wider">Apply Template</p>
          <p className="text-xs text-cult-surface mt-0.5">Select a template to apply its schedules</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 text-xs text-cult-border hover:text-cult-text-muted transition-colors"
        >
          Cancel
        </button>
      </div>

      {matchingTemplates.length === 0 && otherTemplates.length === 0 ? (
        <p className="text-xs text-cult-border py-4 text-center">No templates available yet. Create schedules and save them as a template.</p>
      ) : (
        <div className="space-y-1.5">
          {[...matchingTemplates, ...otherTemplates].map((tmpl) => {
            const isMatch = tmpl.room_type === roomType;
            return (
              <button
                key={tmpl.id}
                type="button"
                disabled={applying}
                onClick={() => onApply(tmpl.id)}
                className={`w-full text-left border p-3 transition-all disabled:opacity-50 ${
                  isMatch
                    ? 'bg-cult-warning-muted border-cult-warning/30 hover:border-cult-warning/50 hover:bg-cult-warning-muted'
                    : 'bg-cult-surface-raised/30 border-cult-surface/60 hover:border-cult-border hover:bg-cult-surface-raised/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-cult-text-primary">{tmpl.name}</span>
                    {tmpl.is_default && (
                      <span className="text-[9px] text-cult-warning uppercase font-bold px-1 py-0.5 bg-cult-warning-muted border border-cult-warning/20 rounded-sm">
                        Default
                      </span>
                    )}
                    {isMatch && (
                      <span className="text-[9px] text-cult-success uppercase font-bold px-1 py-0.5 bg-cult-success-muted border border-cult-success/20 rounded-sm">
                        Match
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-cult-surface uppercase">{tmpl.room_type}</span>
                </div>
                {tmpl.description && (
                  <p className="text-[11px] text-cult-border mb-2">{tmpl.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {tmpl.schedules.map((s, i) => {
                    const cfg = TASK_TYPE_CONFIG[s.task_type] ?? TASK_TYPE_CONFIG.custom;
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-sm"
                        style={{ backgroundColor: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                        {cfg.label}
                        <span className="opacity-50">{s.recurrence === 'daily' ? 'D' : s.recurrence === 'weekly' ? 'W' : s.recurrence === 'biweekly' ? 'B' : 'M'}</span>
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {applying && (
        <p className="text-xs text-cult-warning text-center animate-pulse">Applying template...</p>
      )}
    </div>
  );
}
