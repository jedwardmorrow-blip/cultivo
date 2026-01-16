import { supabase } from '@/lib/supabase';

export interface BatchInventoryConsolidated {
  batch_id: string;
  strain: string;
  packaged_units_available: number;
  bulk_grams_available: number;
  bucked_grams_available: number;
  packaged_units_total: number;
  bulk_grams_total: number;
  bucked_grams_total: number;
}

export interface BatchHierarchicalAllocation {
  batch_id: string;
  strain: string;
  product_category: 'flower' | 'smalls';
  packaged_total_units: number;
  packaged_available_units: number;
  bulk_total_grams: number;
  bulk_available_grams: number;
  bucked_total_grams: number;
  bucked_available_grams: number;
  projected_flower_from_bucked_grams?: number;
  projected_smalls_from_bucked_grams?: number;
  total_capacity_35g_units?: number;
  total_capacity_14g_units?: number;
}

export interface OrderDemandBySKU {
  sku: string;
  strain: string;
  product_name: string;
  product_type: string;
  product_category: string;
  order_count: number;
  total_units_needed: number;
  total_value: number;
  order_numbers: string;
  earliest_delivery_date: string | null;
  latest_delivery_date: string | null;
}

export interface ProjectedInventoryRequirement {
  strain: string;
  product_type: string;
  product_category: string;
  product_name: string;
  total_units_needed: number;
  packaged_units_available: number;
  units_still_needed: number;
  bulk_grams_available: number;
  grams_needed_from_bulk: number;
  bucked_grams_needed: number;
  order_count: number;
  earliest_delivery_date: string | null;
  order_numbers: string;
}

export interface BatchAllocationCalculation {
  batch_id: string;
  strain: string;
  product_category: 'flower' | 'smalls';
  allocation_path: AllocationStep[];
  total_units_available: number;
  sufficient_for_order: boolean;
}

export interface AllocationStep {
  stage: 'packaged' | 'bulk' | 'bucked';
  units_available: number;
  grams_available?: number;
  inventory_ids: string[];
}

/**
 * Batch Allocation Service
 *
 * Manages batch allocation calculations, inventory projections, and demand analysis.
 * Critical for order fulfillment and production planning.
 *
 * @module batchAllocationService
 */

export const batchAllocationService = {
  /**
   * Fetches consolidated inventory by batch
   *
   * @param strain - Optional strain filter
   * @returns Promise<BatchInventoryConsolidated[]> - Inventory totals per batch
   * @description Returns packaged/bulk/bucked totals by batch
   */
  async fetchBatchInventoryConsolidated(strain?: string): Promise<BatchInventoryConsolidated[]> {
    let query = supabase
      .from('batch_inventory_consolidated')
      .select('*')
      .order('batch_id');

    if (strain) {
      query = query.eq('strain', strain);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as BatchInventoryConsolidated[]) || [];
  },

  async fetchFlowerHierarchy(batchId?: string, strain?: string): Promise<BatchHierarchicalAllocation[]> {
    let query = supabase
      .from('batch_hierarchical_allocation_flower')
      .select('*')
      .order('batch_id');

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    if (strain) {
      query = query.eq('strain', strain);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as BatchHierarchicalAllocation[]) || [];
  },

  async fetchSmallsHierarchy(batchId?: string, strain?: string): Promise<BatchHierarchicalAllocation[]> {
    let query = supabase
      .from('batch_hierarchical_allocation_smalls')
      .select('*')
      .order('batch_id');

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    if (strain) {
      query = query.eq('strain', strain);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as BatchHierarchicalAllocation[]) || [];
  },

  async fetchOrderDemand(): Promise<OrderDemandBySKU[]> {
    const { data, error } = await supabase
      .from('order_demand_by_sku')
      .select('*')
      .order('strain')
      .order('product_name');

    if (error) throw error;
    return (data as OrderDemandBySKU[]) || [];
  },

  async fetchOrderDemandByStrain(strain: string): Promise<OrderDemandBySKU[]> {
    const { data, error } = await supabase
      .from('order_demand_by_sku')
      .select('*')
      .eq('strain', strain)
      .order('product_name');

    if (error) throw error;
    return (data as OrderDemandBySKU[]) || [];
  },

  async fetchProjectedInventoryRequirements(): Promise<ProjectedInventoryRequirement[]> {
    const { data, error } = await supabase
      .from('projected_inventory_requirements')
      .select('*')
      .order('strain')
      .order('product_name');

    if (error) throw error;
    return (data as ProjectedInventoryRequirement[]) || [];
  },

  async fetchProjectedInventoryRequirementsByStrain(strain: string): Promise<ProjectedInventoryRequirement[]> {
    const { data, error } = await supabase
      .from('projected_inventory_requirements')
      .select('*')
      .eq('strain', strain)
      .order('product_name');

    if (error) throw error;
    return (data as ProjectedInventoryRequirement[]) || [];
  },

  async calculateBatchAllocation(
    batchId: string,
    strain: string,
    productCategory: 'flower' | 'smalls',
    requiredUnits: number
  ): Promise<BatchAllocationCalculation> {
    const hierarchy = productCategory === 'flower'
      ? await this.fetchFlowerHierarchy(batchId, strain)
      : await this.fetchSmallsHierarchy(batchId, strain);

    if (hierarchy.length === 0) {
      return {
        batch_id: batchId,
        strain,
        product_category: productCategory,
        allocation_path: [],
        total_units_available: 0,
        sufficient_for_order: false
      };
    }

    const batch = hierarchy[0];
    const allocationPath: AllocationStep[] = [];
    let remainingUnits = requiredUnits;

    const packagedInventoryIds = await this.getInventoryIdsByBatchAndStage(
      batchId,
      strain,
      'packaged',
      productCategory
    );
    if (batch.packaged_available_units > 0 && remainingUnits > 0) {
      const unitsFromPackaged = Math.min(remainingUnits, batch.packaged_available_units);
      allocationPath.push({
        stage: 'packaged',
        units_available: unitsFromPackaged,
        inventory_ids: packagedInventoryIds
      });
      remainingUnits -= unitsFromPackaged;
    }

    if (remainingUnits > 0 && batch.bulk_available_grams > 0) {
      const unitSize = productCategory === 'flower' ? 3.5 : 14;
      const unitsFromBulk = Math.floor(batch.bulk_available_grams / unitSize);
      const bulkInventoryIds = await this.getInventoryIdsByBatchAndStage(
        batchId,
        strain,
        'bulk',
        productCategory
      );

      if (unitsFromBulk > 0) {
        allocationPath.push({
          stage: 'bulk',
          units_available: Math.min(remainingUnits, unitsFromBulk),
          grams_available: batch.bulk_available_grams,
          inventory_ids: bulkInventoryIds
        });
        remainingUnits -= Math.min(remainingUnits, unitsFromBulk);
      }
    }

    if (remainingUnits > 0 && batch.bucked_available_grams > 0) {
      const projectedGrams = productCategory === 'flower'
        ? batch.projected_flower_from_bucked_grams || 0
        : batch.projected_smalls_from_bucked_grams || 0;

      const unitSize = productCategory === 'flower' ? 3.5 : 14;
      const unitsFromBucked = Math.floor(projectedGrams / unitSize);
      const buckedInventoryIds = await this.getInventoryIdsByBatchAndStage(
        batchId,
        strain,
        'bucked',
        productCategory
      );

      if (unitsFromBucked > 0) {
        allocationPath.push({
          stage: 'bucked',
          units_available: Math.min(remainingUnits, unitsFromBucked),
          grams_available: batch.bucked_available_grams,
          inventory_ids: buckedInventoryIds
        });
        remainingUnits -= Math.min(remainingUnits, unitsFromBucked);
      }
    }

    const totalUnitsAvailable = allocationPath.reduce((sum, step) => sum + step.units_available, 0);

    return {
      batch_id: batchId,
      strain,
      product_category: productCategory,
      allocation_path: allocationPath,
      total_units_available: totalUnitsAvailable,
      sufficient_for_order: totalUnitsAvailable >= requiredUnits
    };
  },

  async getInventoryIdsByBatchAndStage(
    batchId: string,
    strain: string,
    stage: 'packaged' | 'bulk' | 'bucked',
    productCategory: 'flower' | 'smalls'
  ): Promise<string[]> {
    let query = supabase
      .from('inventory_items')
      .select('id')
      .eq('batch', batchId)
      .eq('strain', strain)
      .gt('available_qty', 0);

    if (stage === 'packaged') {
      query = query.eq('category', 'Flower - Prepack');
      if (productCategory === 'flower') {
        query = query.or('sku.like.%-0003,product_name.like.%3.5g%');
      } else {
        query = query.or('sku.like.%-0002,product_name.like.%14g%');
      }
    } else if (stage === 'bulk') {
      query = query.eq('category', 'Flower - Bulk');
      if (productCategory === 'smalls') {
        query = query.like('product_name', '%Smalls%');
      } else {
        query = query.not('product_name', 'like', '%Smalls%');
      }
    } else if (stage === 'bucked') {
      query = query.ilike('product_name', '%bucked%');
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => item.id);
  },

  async getBatchesByStrain(strain: string): Promise<BatchInventoryConsolidated[]> {
    const { data, error } = await supabase
      .from('batch_inventory_consolidated')
      .select('*')
      .eq('strain', strain)
      .order('batch_id');

    if (error) throw error;
    return (data as BatchInventoryConsolidated[]) || [];
  },

  async getBatchesWithCapacity(
    strain: string,
    productCategory: 'flower' | 'smalls'
  ): Promise<Array<BatchInventoryConsolidated & { total_capacity_units: number }>> {
    const consolidated = await this.getBatchesByStrain(strain);
    const hierarchy = productCategory === 'flower'
      ? await this.fetchFlowerHierarchy(undefined, strain)
      : await this.fetchSmallsHierarchy(undefined, strain);

    const hierarchyMap = new Map(
      hierarchy.map(h => [h.batch_id, h])
    );

    return consolidated.map(batch => ({
      ...batch,
      total_capacity_units: productCategory === 'flower'
        ? hierarchyMap.get(batch.batch_id)?.total_capacity_35g_units || 0
        : hierarchyMap.get(batch.batch_id)?.total_capacity_14g_units || 0
    }));
  }
};
