import { useQualityGrades } from '@/hooks/useQualityGrades';
import { GRADE_COLOR_MAP } from '@/types';

interface QualityGradeSelectorProps {
  value: string | null;
  onChange: (gradeId: string | null) => void;
  label?: string;
}

export function QualityGradeSelector({
  value,
  onChange,
  label = 'Quality Grade (optional)',
}: QualityGradeSelectorProps) {
  const { assignableGrades, loading } = useQualityGrades();

  if (loading) return null;

  const isSkipped = value === null;

  return (
    <div>
      <label className="block text-sm font-medium text-cult-white mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded border transition-all ${
            isSkipped
              ? 'bg-cult-medium-gray/30 text-cult-white border-cult-silver'
              : 'bg-transparent text-cult-lighter-gray border-cult-medium-gray hover:border-cult-silver'
          }`}
        >
          Skip
        </button>
        {assignableGrades.map((g) => {
          const colors = GRADE_COLOR_MAP[g.color_class] || GRADE_COLOR_MAP.gray;
          const isSelected = g.id === value;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onChange(g.id)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded border transition-all ${
                isSelected
                  ? `${colors.bg} ${colors.text} ${colors.border} ring-1 ring-current`
                  : `bg-transparent text-cult-lighter-gray border-cult-medium-gray hover:${colors.border} hover:${colors.text}`
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
