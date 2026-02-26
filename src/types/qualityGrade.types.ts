export interface QualityGrade {
  id: string;
  code: string;
  label: string;
  sort_order: number;
  color_class: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QualityGradeHistory {
  id: string;
  entity_type: 'batch' | 'inventory_item';
  entity_id: string;
  previous_grade_id: string | null;
  new_grade_id: string | null;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

export type GradeCode = 'UNDEFINED' | 'CULT' | 'B' | 'C' | 'D';

export const GRADE_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  emerald: {
    bg: 'bg-emerald-900/25',
    text: 'text-emerald-400',
    border: 'border-emerald-700/50',
  },
  sky: {
    bg: 'bg-sky-900/25',
    text: 'text-sky-400',
    border: 'border-sky-700/50',
  },
  amber: {
    bg: 'bg-amber-900/25',
    text: 'text-amber-400',
    border: 'border-amber-700/50',
  },
  rose: {
    bg: 'bg-rose-900/25',
    text: 'text-rose-400',
    border: 'border-rose-700/50',
  },
  gray: {
    bg: 'bg-cult-medium-gray/20',
    text: 'text-cult-lighter-gray',
    border: 'border-cult-medium-gray/50',
  },
};
