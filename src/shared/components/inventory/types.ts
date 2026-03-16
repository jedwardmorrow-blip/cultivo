/**
 * Shared inventory types used by both the Sales Pipeline and Production Queue.
 * Originally defined in useSimplifiedInventory — now canonical here.
 */

export type HealthStatus = 'critical' | 'low' | 'warning' | 'healthy';

export interface BatchStage {
  batchNumber: string;
  category: string;
  stageName: string;
  stageSort: number;
  displayGroup: string;
  itemCount: number;
  availableQty: number;
  unit: string;
}

export interface BatchSummary {
  batchNumber: string;
  totalGrams: number;
  stages: BatchStage[];
}
