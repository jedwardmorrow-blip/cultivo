import type { Urgency } from '../../types';

// ─── Stage Configuration ────────────────────────────────────────────────────

export interface StageConfig {
  label: string;
  short: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  barBg: string;
  barBorder: string;
  hurdles: number;
  verb: string;
  time: string;
}

export const STAGES: Record<string, StageConfig> = {
  packaged: { label: 'Packaged', short: 'Pkg', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/20', barBg: 'linear-gradient(135deg, #065f46, rgba(52,211,153,0.09))', barBorder: '#34d399', hurdles: 0, verb: 'Done', time: '' },
  bulk:     { label: 'Bulk',     short: 'Bulk', colorClass: 'text-sky-400',     bgClass: 'bg-sky-500/10',     borderClass: 'border-sky-500/20',     barBg: 'linear-gradient(135deg, #0c4a6e, rgba(56,189,248,0.09))', barBorder: '#38bdf8', hurdles: 1, verb: 'Package', time: 'same day' },
  trimming: { label: 'Trimming', short: 'Trim', colorClass: 'text-amber-400',   bgClass: 'bg-amber-500/10',   borderClass: 'border-amber-500/20',   barBg: 'linear-gradient(135deg, #78350f, rgba(251,191,36,0.09))', barBorder: '#fbbf24', hurdles: 2, verb: 'Trim → Pkg', time: '~1 day' },
  bucked:   { label: 'Bucked',   short: 'Buck', colorClass: 'text-amber-400',   bgClass: 'bg-amber-500/10',   borderClass: 'border-amber-500/20',   barBg: 'linear-gradient(135deg, #78350f, rgba(251,191,36,0.09))', barBorder: '#fbbf24', hurdles: 2, verb: 'Trim → Pkg', time: '~1-2 days' },
  binned:   { label: 'Binned',   short: 'Bin',  colorClass: 'text-orange-400',  bgClass: 'bg-orange-500/10',  borderClass: 'border-orange-500/20',  barBg: 'linear-gradient(135deg, #7c2d12, rgba(251,146,60,0.09))', barBorder: '#fb923c', hurdles: 3, verb: 'Buck → Trim → Pkg', time: '~2-3 days' },
};

export const STAGE_ORDER = ['packaged', 'bulk', 'trimming', 'bucked', 'binned'] as const;

// ─── Shared Types ───────────────────────────────────────────────────────────

export type CoverageState = 'surplus' | 'tight' | 'deficit';
export type SortKey = 'urgency' | 'demand' | 'ready' | 'coverage';

export interface Pipeline {
  packaged: { weightG: number; unitCount: number };
  bulk:     { weightG: number };
  trimming: { weightG: number };
  bucked:   { weightG: number };
  binned:   { weightG: number };
}

export interface FormatDemand {
  formatLabel: string;
  productCategory: string;
  weightPerUnitG: number;
  unitsOrdered: number;
  unitsAssigned: number;
  unitsNeeded: number;
  demandG: number;
}

export interface StrainAggregate {
  strainId: string | null;
  strainName: string;
  urgency: Urgency;
  formats: FormatDemand[];
  totalDemandG: number;
  totalOrderedG: number;
  pipeline: Pipeline;
  orderCount: number;
  earliestDelivery: string | null;
  confidence: 'none' | 'low' | 'medium' | 'high';
  conversionSessions: number;
}

export interface ShortfallInfoG {
  shortG: number;
  bulkWeightNeeded: number;
  trimWeightNeeded: number;
  buckWeightNeeded: number;
}

// Urgency rank for sorting (lower = more urgent)
export const URGENCY_RANK: Record<string, number> = {
  overdue: 0, urgent: 1, soon: 2, normal: 3, no_date: 4,
};
