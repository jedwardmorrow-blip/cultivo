export { getCompanySettings } from './companySettings';

export const DEFAULT_LICENSE_NUMBER = '00000078DCBK00628996';
export const DEFAULT_LICENSE_NAME = 'Kind Meds Inc';
export const DEFAULT_COMPANY_NAME = 'Cult Cannabis Cultivation';
export const DEFAULT_BRAND_NAME = 'CULT Cannabis';
export const DEFAULT_ENTITY_NAME = 'Syn-Ag Inc.';
export const DEFAULT_COMPANY_ADDRESS = '3303 South 40th Street';
export const DEFAULT_COMPANY_CITY = 'Phoenix';
export const DEFAULT_COMPANY_STATE = 'AZ';
export const DEFAULT_COMPANY_POSTAL_CODE = '85040';

export const ORDER_STATUSES = {
  SUBMITTED: 'submitted',
  ACCEPTED: 'accepted',
  PROCESSING: 'processing',
  READY_FOR_DELIVERY: 'ready_for_delivery',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const WORKFLOW_STAGES = {
  ALLOCATED: 'allocated',
  IN_TRIMMING: 'in_trimming',
  TRIMMED: 'trimmed',
  IN_PACKAGING: 'in_packaging',
  PACKAGED: 'packaged',
  LABELED: 'labeled',
  COA_ATTACHED: 'coa_attached',
  READY_FOR_DELIVERY: 'ready_for_delivery',
} as const;

export const ALLOCATION_STATUSES = {
  RESERVED: 'reserved',
  CONFIRMED: 'confirmed',
  RELEASED: 'released',
  CONSUMED: 'consumed',
} as const;

export const AVAILABLE_TRIMMERS = [
  'Laura', 'Sam', 'Viana', 'Roxy', 'Justin', 'Greg', 'Andrew', 'Leo'
] as const;

export const AVAILABLE_PACKAGERS = [
  'Laura', 'Sam', 'Viana', 'Roxy', 'Justin', 'Greg', 'Andrew', 'Leo', 'Mike', 'Josie'
] as const;
