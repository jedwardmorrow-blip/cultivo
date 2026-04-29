// Unified task completion schema per cultivation_task_completion_schema_v1.
// Marries display config (TASK_TYPE_CONFIG) with completion field schemas.
// Single source of truth for both task rendering and completion forms.

import type { TaskType } from './cultivation.types';

export type TaskCompletionField = {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  options?: string[];
  required?: boolean;
  unit?: string;
};

export type TaskLogTarget = 'daily_task_log' | 'session_log' | 'environmental_log';

export type TaskCompletionSchema = {
  fields: TaskCompletionField[];
  log_target: TaskLogTarget;
};

const DEFAULT_FIELDS: TaskCompletionField[] = [
  { key: 'duration', label: 'Duration', placeholder: '15m', type: 'text' },
  { key: 'notes', label: 'Notes', placeholder: 'Optional', type: 'textarea' },
];

export const TASK_COMPLETION_SCHEMAS: Record<TaskType, TaskCompletionSchema> = {
  batch_tank_mix: {
    fields: [
      { key: 'ec', label: 'EC Reading', placeholder: '2.4', type: 'number', unit: 'EC' },
      { key: 'ph', label: 'pH Reading', placeholder: '6.2', type: 'number', unit: 'pH' },
      { key: 'gallons', label: 'Gallons Mixed', placeholder: '50', type: 'number', unit: 'gal' },
      { key: 'duration', label: 'Duration', placeholder: '15m', type: 'text' },
    ],
    log_target: 'daily_task_log',
  },
  scouting: {
    fields: [
      { key: 'pests', label: 'Pest Pressure', placeholder: 'none', type: 'select', options: ['none', 'low', 'medium', 'high'], required: true },
      { key: 'disease', label: 'Disease Signs', placeholder: 'none', type: 'select', options: ['none', 'powdery mildew', 'botrytis', 'other'], required: true },
      { key: 'overall', label: 'Overall Health', placeholder: 'good', type: 'select', options: ['good', 'fair', 'poor'], required: true },
      { key: 'notes', label: 'Notes', placeholder: 'Observations', type: 'textarea' },
    ],
    log_target: 'daily_task_log',
  },
  ipm_spray: {
    fields: [
      { key: 'product', label: 'Product', placeholder: 'Regalia CG', type: 'text', required: true },
      { key: 'rate', label: 'Rate', placeholder: '2oz/gal', type: 'text' },
      { key: 'coverage', label: 'Coverage', placeholder: 'full canopy', type: 'select', options: ['full canopy', 'undersides', 'spot'] },
      { key: 'duration', label: 'Duration', placeholder: '20m', type: 'text' },
    ],
    log_target: 'daily_task_log',
  },
  saturation_check: {
    fields: [
      { key: 'temp_f', label: 'Temp (F)', placeholder: '78', type: 'number', unit: 'F', required: true },
      { key: 'rh_pct', label: 'RH (%)', placeholder: '55', type: 'number', unit: '%', required: true },
      { key: 'vpd_kpa', label: 'VPD (kPa)', placeholder: '1.2', type: 'number', unit: 'kPa', required: true },
      { key: 'co2_ppm', label: 'CO2 (ppm)', placeholder: '1200', type: 'number', unit: 'ppm' },
      { key: 'leaf_temp_f', label: 'Leaf Temp (F)', placeholder: '76', type: 'number', unit: 'F' },
      { key: 'light_ppfd', label: 'Light (PPFD)', placeholder: '900', type: 'number', unit: 'PPFD' },
      { key: 'observation_notes', label: 'Notes', placeholder: 'Observations', type: 'textarea' },
    ],
    log_target: 'environmental_log',
  },
  irrigation_audit: {
    fields: [
      { key: 'temp_f', label: 'Temp (F)', placeholder: '78', type: 'number', unit: 'F' },
      { key: 'rh_pct', label: 'RH (%)', placeholder: '55', type: 'number', unit: '%' },
      { key: 'vpd_kpa', label: 'VPD (kPa)', placeholder: '1.2', type: 'number', unit: 'kPa' },
      { key: 'co2_ppm', label: 'CO2 (ppm)', placeholder: '1200', type: 'number', unit: 'ppm' },
      { key: 'observation_notes', label: 'Notes', placeholder: 'Observations', type: 'textarea' },
    ],
    log_target: 'environmental_log',
  },
  defoliation: {
    fields: [
      { key: 'intensity', label: 'Intensity', placeholder: 'medium', type: 'select', options: ['light', 'medium', 'heavy'] },
      { key: 'duration', label: 'Duration', placeholder: '45m', type: 'text' },
      { key: 'notes', label: 'Notes', placeholder: 'Optional', type: 'textarea' },
    ],
    log_target: 'daily_task_log',
  },
  training: {
    fields: [
      { key: 'technique', label: 'Technique', placeholder: 'LST', type: 'select', options: ['LST', 'topping', 'SCROG', 'other'] },
      { key: 'duration', label: 'Duration', placeholder: '30m', type: 'text' },
      { key: 'notes', label: 'Notes', placeholder: 'Optional', type: 'textarea' },
    ],
    log_target: 'daily_task_log',
  },
  cleaning: {
    fields: [
      { key: 'scope', label: 'Scope', placeholder: 'full room', type: 'select', options: ['full room', 'tools only', 'floor only'] },
      { key: 'duration', label: 'Duration', placeholder: '60m', type: 'text' },
    ],
    log_target: 'daily_task_log',
  },
  maintenance: {
    fields: [
      { key: 'task_done', label: 'Task Done', placeholder: 'replaced filter', type: 'text', required: true },
      { key: 'duration', label: 'Duration', placeholder: '20m', type: 'text' },
      { key: 'notes', label: 'Notes', placeholder: 'Optional', type: 'textarea' },
    ],
    log_target: 'daily_task_log',
  },
  transplant: { fields: DEFAULT_FIELDS, log_target: 'daily_task_log' },
  harvest: { fields: DEFAULT_FIELDS, log_target: 'session_log' },
  clone_cutting: { fields: DEFAULT_FIELDS, log_target: 'session_log' },
  concentrate_mix: { fields: DEFAULT_FIELDS, log_target: 'daily_task_log' },
  custom: {
    fields: [
      { key: 'task_done', label: 'Task Done', placeholder: 'describe', type: 'text', required: true },
      { key: 'duration', label: 'Duration', placeholder: '15m', type: 'text' },
      { key: 'notes', label: 'Notes', placeholder: 'Optional', type: 'textarea' },
    ],
    log_target: 'daily_task_log',
  },
};

export function getTaskCompletionSchema(type: string): TaskCompletionSchema {
  return TASK_COMPLETION_SCHEMAS[type as TaskType] ?? TASK_COMPLETION_SCHEMAS.custom;
}
