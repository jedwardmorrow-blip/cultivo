import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase', () => {
  const _makeChain = (_resolveWith: any) => {
    const chain: any = {};
    const methods = [
      'select', 'insert', 'update', 'delete',
      'eq', 'neq', 'gt', 'lt', 'gte', 'lte',
      'in', 'is', 'not', 'or', 'like', 'ilike',
      'order', 'limit', 'range', 'single', 'maybeSingle',
    ];
    for (const m of methods) {
      chain[m] = vi.fn(() => chain);
    }
    chain.__resolve = (data: any, error: any = null) => {
      chain.order.mockImplementation(() => ({ then: (cb: any) => cb({ data, error }) }));
      chain.not.mockResolvedValue({ data, error });
      chain.or.mockResolvedValue({ data, error });
      chain.like.mockResolvedValue({ data, error });
      chain.ilike.mockResolvedValue({ data, error });
    };
    return chain;
  };

  return {
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
    },
  };
});

import { supabase } from '@/lib/supabase';
import { batchAllocationService } from '@/features/batches/services/batchAllocation.service';
import type {
  BatchInventoryConsolidated,
  BatchHierarchicalAllocation,
} from '@/features/batches/services/batchAllocation.service';

const makeBatchInventory = (overrides: Partial<BatchInventoryConsolidated> = {}): BatchInventoryConsolidated => ({
  batch_id: '250101-BluePave',
  strain: 'Blue Pave',
  packaged_units_available: 100,
  bulk_grams_available: 500,
  bucked_grams_available: 200,
  packaged_units_total: 120,
  bulk_grams_total: 600,
  bucked_grams_total: 250,
  ...overrides,
});

const makeFlowerHierarchy = (overrides: Partial<BatchHierarchicalAllocation> = {}): BatchHierarchicalAllocation => ({
  batch_id: '250101-BluePave',
  strain: 'Blue Pave',
  product_category: 'flower',
  packaged_total_units: 120,
  packaged_available_units: 100,
  bulk_total_grams: 600,
  bulk_available_grams: 500,
  bucked_total_grams: 250,
  bucked_available_grams: 200,
  projected_flower_from_bucked_grams: 180,
  projected_smalls_from_bucked_grams: 20,
  total_capacity_35g_units: 242,
  total_capacity_14g_units: 37,
  ...overrides,
});

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

const buildChain = (data: any, error: any = null) => {
  const resolved = { data, error };
  const chain: any = {};
  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'in', 'is', 'limit', 'range'];
  for (const m of chainMethods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.order = vi.fn(() => {
    const p: any = Promise.resolve(resolved);
    Object.assign(p, chain);
    p.order = chain.order;
    return p;
  });
  chain.not = vi.fn(() => Promise.resolve(resolved));
  chain.or = vi.fn(() => Promise.resolve(resolved));
  chain.like = vi.fn(() => Promise.resolve(resolved));
  chain.ilike = vi.fn(() => Promise.resolve(resolved));
  chain.single = vi.fn(() => Promise.resolve(resolved));
  chain.maybeSingle = vi.fn(() => Promise.resolve(resolved));
  chain.then = (resolve: any, reject: any) => Promise.resolve(resolved).then(resolve, reject);
  return chain;
};

describe('batchAllocationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchBatchInventoryConsolidated', () => {
    it('returns all batches when no strain filter is provided', async () => {
      const batches = [
        makeBatchInventory({ batch_id: '250101-BluePave', strain: 'Blue Pave' }),
        makeBatchInventory({ batch_id: '250102-Lemondary', strain: 'Lemondary' }),
      ];
      mockFrom.mockReturnValueOnce(buildChain(batches));

      const result = await batchAllocationService.fetchBatchInventoryConsolidated();

      expect(mockFrom).toHaveBeenCalledWith('batch_inventory_consolidated');
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no batches exist', async () => {
      mockFrom.mockReturnValueOnce(buildChain([]));

      const result = await batchAllocationService.fetchBatchInventoryConsolidated();

      expect(result).toEqual([]);
    });

    it('throws when database returns error', async () => {
      mockFrom.mockReturnValueOnce(buildChain(null, { message: 'DB connection failed' }));

      await expect(
        batchAllocationService.fetchBatchInventoryConsolidated()
      ).rejects.toMatchObject({ message: 'DB connection failed' });
    });
  });

  describe('getBatchesByStrain', () => {
    it('only returns batches matching the requested strain', async () => {
      const batches = [makeBatchInventory({ strain: 'Blue Pave' })];
      const chain = buildChain(batches);
      mockFrom.mockReturnValueOnce(chain);

      const result = await batchAllocationService.getBatchesByStrain('Blue Pave');

      expect(chain.eq).toHaveBeenCalledWith('strain', 'Blue Pave');
      expect(result.every(b => b.strain === 'Blue Pave')).toBe(true);
    });

    it('returns empty array when strain has no batches', async () => {
      mockFrom.mockReturnValueOnce(buildChain([]));

      const result = await batchAllocationService.getBatchesByStrain('Unknown Strain');

      expect(result).toEqual([]);
    });
  });

  describe('getInventoryIdsByBatchAndStage — ATP filtering', () => {
    it('only queries inventory with available_qty > 0', async () => {
      const inventoryItems = [{ id: 'inv-1' }, { id: 'inv-2' }];
      const chain = buildChain(inventoryItems);
      mockFrom.mockReturnValueOnce(chain);

      const ids = await batchAllocationService.getInventoryIdsByBatchAndStage(
        '250101-BluePave',
        'Blue Pave',
        'packaged',
        'flower'
      );

      expect(chain.gt).toHaveBeenCalledWith('available_qty', 0);
      expect(ids).toEqual(['inv-1', 'inv-2']);
    });

    it('filters by batch and strain for packaged flower', async () => {
      const chain = buildChain([]);
      mockFrom.mockReturnValueOnce(chain);

      await batchAllocationService.getInventoryIdsByBatchAndStage(
        '250101-BluePave',
        'Blue Pave',
        'packaged',
        'flower'
      );

      expect(mockFrom).toHaveBeenCalledWith('inventory_items');
      expect(chain.eq).toHaveBeenCalledWith('batch', '250101-BluePave');
      expect(chain.eq).toHaveBeenCalledWith('strain', 'Blue Pave');
      expect(chain.eq).toHaveBeenCalledWith('category', 'Flower - Prepack');
    });

    it('filters bulk flower to exclude Smalls in product_name', async () => {
      const chain = buildChain([]);
      mockFrom.mockReturnValueOnce(chain);

      await batchAllocationService.getInventoryIdsByBatchAndStage(
        '250101-BluePave',
        'Blue Pave',
        'bulk',
        'flower'
      );

      expect(chain.eq).toHaveBeenCalledWith('category', 'Flower - Bulk');
      expect(chain.not).toHaveBeenCalledWith('product_name', 'like', '%Smalls%');
    });

    it('filters bulk smalls to include only Smalls products', async () => {
      const chain = buildChain([]);
      mockFrom.mockReturnValueOnce(chain);

      await batchAllocationService.getInventoryIdsByBatchAndStage(
        '250101-BluePave',
        'Blue Pave',
        'bulk',
        'smalls'
      );

      expect(chain.eq).toHaveBeenCalledWith('category', 'Flower - Bulk');
      expect(chain.like).toHaveBeenCalledWith('product_name', '%Smalls%');
    });

    it('filters bucked stage by product name containing bucked (case-insensitive)', async () => {
      const chain = buildChain([]);
      mockFrom.mockReturnValueOnce(chain);

      await batchAllocationService.getInventoryIdsByBatchAndStage(
        '250101-BluePave',
        'Blue Pave',
        'bucked',
        'flower'
      );

      expect(chain.ilike).toHaveBeenCalledWith('product_name', '%bucked%');
    });

    it('returns empty array when no inventory found', async () => {
      mockFrom.mockReturnValueOnce(buildChain(null));

      const ids = await batchAllocationService.getInventoryIdsByBatchAndStage(
        '250101-BluePave',
        'Blue Pave',
        'packaged',
        'flower'
      );

      expect(ids).toEqual([]);
    });

    it('throws when inventory query fails', async () => {
      mockFrom.mockReturnValueOnce(buildChain(null, { message: 'Query failed' }));

      await expect(
        batchAllocationService.getInventoryIdsByBatchAndStage(
          '250101-BluePave',
          'Blue Pave',
          'packaged',
          'flower'
        )
      ).rejects.toMatchObject({ message: 'Query failed' });
    });
  });

  describe('calculateBatchAllocation — allocation path and ATP logic', () => {
    beforeEach(() => {
      vi.spyOn(batchAllocationService, 'getInventoryIdsByBatchAndStage').mockResolvedValue(['inv-1', 'inv-2']);
    });

    it('returns empty allocation when batch not found in hierarchy', async () => {
      vi.spyOn(batchAllocationService, 'fetchFlowerHierarchy').mockResolvedValueOnce([]);

      const result = await batchAllocationService.calculateBatchAllocation(
        '250101-BluePave', 'Blue Pave', 'flower', 10
      );

      expect(result.allocation_path).toHaveLength(0);
      expect(result.total_units_available).toBe(0);
      expect(result.sufficient_for_order).toBe(false);
    });

    it('marks sufficient_for_order true when packaged stock alone covers demand', async () => {
      vi.spyOn(batchAllocationService, 'fetchFlowerHierarchy').mockResolvedValueOnce([
        makeFlowerHierarchy({ packaged_available_units: 50 }),
      ]);

      const result = await batchAllocationService.calculateBatchAllocation(
        '250101-BluePave', 'Blue Pave', 'flower', 10
      );

      expect(result.sufficient_for_order).toBe(true);
      expect(result.allocation_path[0].stage).toBe('packaged');
      expect(result.allocation_path[0].units_available).toBe(10);
    });

    it('caps packaged units at available — never over-promises', async () => {
      vi.spyOn(batchAllocationService, 'fetchFlowerHierarchy').mockResolvedValueOnce([
        makeFlowerHierarchy({ packaged_available_units: 5, bulk_available_grams: 0, bucked_available_grams: 0 }),
      ]);

      const result = await batchAllocationService.calculateBatchAllocation(
        '250101-BluePave', 'Blue Pave', 'flower', 20
      );

      const packagedStep = result.allocation_path.find(s => s.stage === 'packaged');
      expect(packagedStep?.units_available).toBe(5);
      expect(result.sufficient_for_order).toBe(false);
    });

    it('falls through to bulk when packaged is insufficient', async () => {
      vi.spyOn(batchAllocationService, 'fetchFlowerHierarchy').mockResolvedValueOnce([
        makeFlowerHierarchy({ packaged_available_units: 2, bulk_available_grams: 350, bucked_available_grams: 0 }),
      ]);

      const result = await batchAllocationService.calculateBatchAllocation(
        '250101-BluePave', 'Blue Pave', 'flower', 10
      );

      const stages = result.allocation_path.map(s => s.stage);
      expect(stages).toContain('packaged');
      expect(stages).toContain('bulk');
    });

    it('uses 3.5g unit size for flower bulk conversion', async () => {
      vi.spyOn(batchAllocationService, 'fetchFlowerHierarchy').mockResolvedValueOnce([
        makeFlowerHierarchy({ packaged_available_units: 0, bulk_available_grams: 700, bucked_available_grams: 0 }),
      ]);

      const result = await batchAllocationService.calculateBatchAllocation(
        '250101-BluePave', 'Blue Pave', 'flower', 500
      );

      const bulkStep = result.allocation_path.find(s => s.stage === 'bulk');
      expect(bulkStep).toBeDefined();
      expect(bulkStep!.units_available).toBe(Math.floor(700 / 3.5));
    });

    it('uses 14g unit size for smalls bulk conversion', async () => {
      vi.spyOn(batchAllocationService, 'fetchSmallsHierarchy').mockResolvedValueOnce([
        makeFlowerHierarchy({ packaged_available_units: 0, bulk_available_grams: 700, bucked_available_grams: 0, product_category: 'smalls' }),
      ]);

      const result = await batchAllocationService.calculateBatchAllocation(
        '250101-BluePave', 'Blue Pave', 'smalls', 500
      );

      const bulkStep = result.allocation_path.find(s => s.stage === 'bulk');
      expect(bulkStep).toBeDefined();
      expect(bulkStep!.units_available).toBe(Math.floor(700 / 14));
    });

    it('total_units_available equals sum of all allocation step units', async () => {
      vi.spyOn(batchAllocationService, 'fetchFlowerHierarchy').mockResolvedValueOnce([
        makeFlowerHierarchy({ packaged_available_units: 5, bulk_available_grams: 35, bucked_available_grams: 0, projected_flower_from_bucked_grams: 0 }),
      ]);

      const result = await batchAllocationService.calculateBatchAllocation(
        '250101-BluePave', 'Blue Pave', 'flower', 100
      );

      const expectedTotal = result.allocation_path.reduce((sum, step) => sum + step.units_available, 0);
      expect(result.total_units_available).toBe(expectedTotal);
    });

    it('sufficient_for_order false when all stages combined cannot meet demand', async () => {
      vi.spyOn(batchAllocationService, 'fetchFlowerHierarchy').mockResolvedValueOnce([
        makeFlowerHierarchy({
          packaged_available_units: 1,
          bulk_available_grams: 3.5,
          bucked_available_grams: 0,
          projected_flower_from_bucked_grams: 0,
        }),
      ]);

      const result = await batchAllocationService.calculateBatchAllocation(
        '250101-BluePave', 'Blue Pave', 'flower', 1000
      );

      expect(result.sufficient_for_order).toBe(false);
    });

    it('preserves batch_id, strain, and product_category on result', async () => {
      vi.spyOn(batchAllocationService, 'fetchFlowerHierarchy').mockResolvedValueOnce([
        makeFlowerHierarchy(),
      ]);

      const result = await batchAllocationService.calculateBatchAllocation(
        '250101-BluePave', 'Blue Pave', 'flower', 5
      );

      expect(result.batch_id).toBe('250101-BluePave');
      expect(result.strain).toBe('Blue Pave');
      expect(result.product_category).toBe('flower');
    });
  });

  describe('getBatchesWithCapacity', () => {
    it('merges 3.5g hierarchy capacity onto consolidated inventory for flower', async () => {
      vi.spyOn(batchAllocationService, 'getBatchesByStrain').mockResolvedValueOnce([makeBatchInventory()]);
      vi.spyOn(batchAllocationService, 'fetchFlowerHierarchy').mockResolvedValueOnce([
        makeFlowerHierarchy({ total_capacity_35g_units: 242 }),
      ]);

      const result = await batchAllocationService.getBatchesWithCapacity('Blue Pave', 'flower');

      expect(result[0].total_capacity_units).toBe(242);
    });

    it('returns 0 capacity when batch has no hierarchy entry', async () => {
      vi.spyOn(batchAllocationService, 'getBatchesByStrain').mockResolvedValueOnce([
        makeBatchInventory({ batch_id: 'new-batch' }),
      ]);
      vi.spyOn(batchAllocationService, 'fetchFlowerHierarchy').mockResolvedValueOnce([]);

      const result = await batchAllocationService.getBatchesWithCapacity('Blue Pave', 'flower');

      expect(result[0].total_capacity_units).toBe(0);
    });

    it('uses 14g capacity field for smalls category', async () => {
      vi.spyOn(batchAllocationService, 'getBatchesByStrain').mockResolvedValueOnce([makeBatchInventory()]);
      vi.spyOn(batchAllocationService, 'fetchSmallsHierarchy').mockResolvedValueOnce([
        makeFlowerHierarchy({ total_capacity_14g_units: 37, product_category: 'smalls' }),
      ]);

      const result = await batchAllocationService.getBatchesWithCapacity('Blue Pave', 'smalls');

      expect(result[0].total_capacity_units).toBe(37);
    });
  });

  describe('fetchOrderDemand', () => {
    it('queries the order_demand_by_sku view', async () => {
      mockFrom.mockReturnValueOnce(buildChain([{ sku: 'BULK-BP-FLR', strain: 'Blue Pave', total_units_needed: 50 }]));

      const result = await batchAllocationService.fetchOrderDemand();

      expect(mockFrom).toHaveBeenCalledWith('order_demand_by_sku');
      expect(result).toHaveLength(1);
    });

    it('throws on database error', async () => {
      mockFrom.mockReturnValueOnce(buildChain(null, { message: 'View not found' }));

      await expect(
        batchAllocationService.fetchOrderDemand()
      ).rejects.toMatchObject({ message: 'View not found' });
    });
  });
});
