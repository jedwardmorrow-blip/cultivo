import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useQualityGrades } from '@/hooks/useQualityGrades';
import { GRADE_COLOR_MAP } from '@/types';

interface QualityGradeBadgeProps {
  gradeId: string | null | undefined;
  editable?: boolean;
  onGradeChange?: (gradeId: string | null) => void;
  size?: 'sm' | 'md';
}

export function QualityGradeBadge({
  gradeId,
  editable = false,
  onGradeChange,
  size = 'sm',
}: QualityGradeBadgeProps) {
  const { assignableGrades, getGradeById, loading } = useQualityGrades();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const grade = getGradeById(gradeId);
  const colorClass = grade?.color_class || 'gray';
  const colors = GRADE_COLOR_MAP[colorClass] || GRADE_COLOR_MAP.gray;
  const label = grade?.label || 'Ungraded';

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (loading) {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs bg-cult-medium-gray/20 text-cult-lighter-gray animate-pulse">
        ...
      </span>
    );
  }

  const sizeClasses = size === 'md'
    ? 'px-2.5 py-1 text-xs'
    : 'px-1.5 py-0.5 text-xs';

  const badge = (
    <span
      className={`inline-flex items-center gap-1 rounded font-semibold uppercase tracking-wider border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses} ${
        editable ? 'cursor-pointer hover:brightness-125 transition-all' : ''
      }`}
    >
      {label}
    </span>
  );

  if (!editable) return badge;

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="focus:outline-none"
      >
        {badge}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-1 left-0 bg-cult-near-black border border-cult-medium-gray rounded-lg shadow-xl p-2 min-w-[140px] animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs text-cult-lighter-gray uppercase tracking-wider px-1 mb-1.5">
            Set Grade
          </div>
          <div className="space-y-0.5">
            {assignableGrades.map((g) => {
              const gColors = GRADE_COLOR_MAP[g.color_class] || GRADE_COLOR_MAP.gray;
              const isSelected = g.id === gradeId;
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    onGradeChange?.(g.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    isSelected
                      ? `${gColors.bg} ${gColors.text} ring-1 ring-current`
                      : `text-cult-silver hover:${gColors.bg} hover:${gColors.text}`
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${gColors.bg} ${gColors.border} border`} />
                  {g.label}
                </button>
              );
            })}
          </div>
          {gradeId && (
            <>
              <div className="border-t border-cult-medium-gray/50 mt-1.5 pt-1.5">
                <button
                  onClick={() => {
                    onGradeChange?.(null);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-cult-lighter-gray hover:text-cult-white hover:bg-cult-dark-gray transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear Grade
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
