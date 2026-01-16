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
