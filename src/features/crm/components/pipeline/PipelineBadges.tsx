import type { HealthStatus, GradeCode } from '../../hooks/useSalesPipeline';
import { HEALTH_STYLES, GRADE_STYLES } from './pipelineConstants';

interface HealthBadgeProps {
  status: HealthStatus;
}

export function HealthBadge({ status }: HealthBadgeProps) {
  const s = HEALTH_STYLES[status];
  return (
    <span className={`inline-flex items-center text-[9px] font-bold rounded-full px-1.5 py-[1px] whitespace-nowrap border ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
}

interface GradeBadgeProps {
  grade: GradeCode;
}

export function GradeBadge({ grade }: GradeBadgeProps) {
  const s = GRADE_STYLES[grade];
  return (
    <span className={`inline-flex items-center text-[9px] font-bold rounded-full px-1.5 py-[1px] whitespace-nowrap border ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
}
