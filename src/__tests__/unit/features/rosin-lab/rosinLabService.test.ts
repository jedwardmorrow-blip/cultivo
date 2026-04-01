import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';
import { mockSupabaseSuccess, mockSupabaseError } from '../../../mocks/supabase';

// Must mock before importing service so the `db = supabase` alias picks up the mock
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import {
  getDashboardStats,
  getActivePipelineItems,
  getPipelineStageCounts,
  getHashPackages,
  getFreshFrozenPackages,
  getBatchesWithFreshFrozen,
  createWashRun,
  getActiveWashRuns,
  completeWashRun,
  createFreezeDryRun,
  completeFreezeDryRun,
  createPressRun,
  createCureSession,
  completeCureSession,
  getAnalyticsKpis,
  getStrainLeaderboard,
  getPressRunStats,
  getCureSessionStats,
} from '@/features/rosin-lab/services/rosinLabService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a chainable query mock that resolves to `resolvedValue` on await. */
function makeChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'eq', 'neq', 'lt', 'lte',
    'gte', 'in', 'not', 'order', 'limit', 'range', 'single',
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Make the chain thenable so `await chain` resolves
  (chain as any).then = (resolve: (v: unknown) => void) => Promise.resolve(resolvedValue).then(resolve);
  return chain;
}

/** Helper: configure supabase.from to return the same chain for all calls */
function mockFrom(chain: ReturnType<typeof makeChain>) {
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
}

// ---------------------------------------------------------------------------
// getDashboardStats
// ---------------------------------------------------------------------------

describe('getDashboardStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns zeroed stats when there is no data', async () => {
    // Both Promise.all batches must resolve; mock from to return empty data
    const chain1 = makeChain({ data: [], error: null });
    const chain2 = makeChain({ count: 0, error: null });
    (supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(chain1) // wash_runs (wash yields)
      .mockReturnValueOnce(chain1) // press_runs (press yields)
      .mockReturnValueOnce(chain2) // rosin_cure_sessions (overdue count)
      .mockReturnValueOnce(chain2); // wash_runs (stalled count)

    const result = await getDashboardStats();

    expect(result.avgWashYield).toBe(0);
    expect(result.avgPressYield).toBe(0);
    expect(result.totalRosin30d).toBe(0);
    expect(result.needsAttention).toBe(0);
  });

  it('calculates average wash yield correctly', async () => {
    const washData = [
      { input_grams: 1000, output_grams: 180 },
      { input_grams: 500, output_grams: 100 },
    ];
    // Expected avg: (18% + 20%) / 2 = 19%
    const washChain = makeChain({ data: washData, error: null });
    const pressChain = makeChain({ data: [], error: null });
    const countChain = makeChain({ count: 0, error: null });

    (supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(washChain)
      .mockReturnValueOnce(pressChain)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(countChain);

    const result = await getDashboardStats();

    expect(result.avgWashYield).toBeCloseTo(19);
  });

  it('sums needsAttention from overdue cures and stalled washes', async () => {
    const emptyChain = makeChain({ data: [], error: null });
    const overdueChain = makeChain({ count: 3, error: null });
    const stalledChain = makeChain({ count: 2, error: null });

    (supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(emptyChain)  // wash yields
      .mockReturnValueOnce(emptyChain)  // press yields
      .mockReturnValueOnce(overdueChain) // overdue cures
      .mockReturnValueOnce(stalledChain); // stalled washes

    const result = await getDashboardStats();

    expect(result.needsAttention).toBe(5);
  });

  it('returns zeroed stats on unexpected error', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('DB exploded');
    });

    const result = await getDashboardStats();

    expect(result).toEqual({ avgWashYield: 0, avgPressYield: 0, totalRosin30d: 0, needsAttention: 0 });
  });
});

// ---------------------------------------------------------------------------
// getActivePipelineItems
// ---------------------------------------------------------------------------

describe('getActivePipelineItems', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns pipeline items from the view', async () => {
    const items = [{ stage: 'wash', run_id: 'run-1', batch_number: '250101-OG' }];
    mockFrom(makeChain({ data: items, error: null }));

    const result = await getActivePipelineItems();

    expect(supabase.from).toHaveBeenCalledWith('v_rosin_pipeline_status');
    expect(result).toHaveLength(1);
    expect(result[0].run_id).toBe('run-1');
  });

  it('returns empty array on error', async () => {
    mockFrom(makeChain({ data: null, error: { message: 'view error' } }));

    const result = await getActivePipelineItems();

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getPipelineStageCounts
// ---------------------------------------------------------------------------

describe('getPipelineStageCounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns counts for all pipeline stages', async () => {
    const countChain = (n: number) => makeChain({ count: n, error: null });

    (supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(countChain(5))  // ff
      .mockReturnValueOnce(countChain(2))  // wash
      .mockReturnValueOnce(countChain(1))  // fd
      .mockReturnValueOnce(countChain(3))  // press
      .mockReturnValueOnce(countChain(4)); // cure

    const result = await getPipelineStageCounts();

    expect(result).toEqual({ ff: 5, wash: 2, fd: 1, press: 3, cure: 4 });
  });

  it('returns zeroed counts on error', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('connection error');
    });

    const result = await getPipelineStageCounts();

    expect(result).toEqual({ ff: 0, wash: 0, fd: 0, press: 0, cure: 0 });
  });
});

// ---------------------------------------------------------------------------
// getHashPackages
// ---------------------------------------------------------------------------

describe('getHashPackages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all hash packages without status filter', async () => {
    const packages = [{ id: 'hp-1', status: 'available' }];
    mockFrom(makeChain({ data: packages, error: null }));

    const result = await getHashPackages();

    expect(supabase.from).toHaveBeenCalledWith('hash_packages');
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('applies status filter when provided', async () => {
    const chain = makeChain({ data: [], error: null }) as any;
    mockFrom(chain);

    await getHashPackages('available');

    expect(chain.eq).toHaveBeenCalledWith('status', 'available');
  });

  it('does not apply filter when statusFilter is "all"', async () => {
    const chain = makeChain({ data: [], error: null }) as any;
    mockFrom(chain);

    await getHashPackages('all');

    expect(chain.eq).not.toHaveBeenCalledWith('status', 'all');
  });

  it('returns error object on DB failure', async () => {
    const dbError = { message: 'query failed' };
    mockFrom(makeChain({ data: null, error: dbError }));

    const result = await getHashPackages();

    expect(result.error).toEqual(dbError);
  });
});

// ---------------------------------------------------------------------------
// getFreshFrozenPackages
// ---------------------------------------------------------------------------

describe('getFreshFrozenPackages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns fresh frozen packages', async () => {
    const pkgs = [{ id: 'ff-1', status: 'stored', weight_grams: 500 }];
    mockFrom(makeChain({ data: pkgs, error: null }));

    const result = await getFreshFrozenPackages();

    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('applies status filter', async () => {
    const chain = makeChain({ data: [], error: null }) as any;
    mockFrom(chain);

    await getFreshFrozenPackages('allocated');

    expect(chain.eq).toHaveBeenCalledWith('status', 'allocated');
  });
});

// ---------------------------------------------------------------------------
// getBatchesWithFreshFrozen
// ---------------------------------------------------------------------------

describe('getBatchesWithFreshFrozen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns deduplicated batches', async () => {
    const rows = [
      { batch_id: 'batch-1', batch: { id: 'batch-1', batch_number: '250101-OG', strain: 'OG Kush', strain_id: 's1' } },
      { batch_id: 'batch-1', batch: { id: 'batch-1', batch_number: '250101-OG', strain: 'OG Kush', strain_id: 's1' } }, // dup
      { batch_id: 'batch-2', batch: { id: 'batch-2', batch_number: '250102-GS', strain: 'Girl Scout', strain_id: 's2' } },
    ];
    mockFrom(makeChain({ data: rows, error: null }));

    const result = await getBatchesWithFreshFrozen();

    expect(result).toHaveLength(2);
    expect(result[0].batch_number).toBe('250101-OG');
  });

  it('returns empty array on error', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('db error');
    });

    const result = await getBatchesWithFreshFrozen();

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// createWashRun
// ---------------------------------------------------------------------------

describe('createWashRun', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts wash run and inputs, marks packages as allocated', async () => {
    const washRun = { id: 'wr-1', status: 'in_progress', batch_id: 'b1', wash_date: '2026-04-01' };
    const insertRunChain = makeChain({ data: washRun, error: null }) as any;
    const insertInputsChain = makeChain({ data: null, error: null }) as any;
    const updatePkgChain = makeChain({ data: null, error: null }) as any;

    (supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(insertRunChain)   // insert wash_run
      .mockReturnValueOnce(insertInputsChain) // insert wash_run_inputs
      .mockReturnValueOnce(updatePkgChain);  // update fresh_frozen_packages

    const inputs = [{ fresh_frozen_package_id: 'pkg-1', weight_grams: 200 }];
    const result = await createWashRun({ batch_id: 'b1', wash_date: '2026-04-01' }, inputs);

    expect(result.data).toEqual(washRun);
    expect(result.error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('wash_runs');
    expect(supabase.from).toHaveBeenCalledWith('wash_run_inputs');
    expect(supabase.from).toHaveBeenCalledWith('fresh_frozen_packages');
  });

  it('returns error if wash run insert fails', async () => {
    const failChain = makeChain({ data: null, error: { message: 'insert failed' } }) as any;
    mockFrom(failChain);

    const result = await createWashRun({}, []);

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// getActiveWashRuns
// ---------------------------------------------------------------------------

describe('getActiveWashRuns', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns active wash runs', async () => {
    const runs = [{ id: 'wr-1', status: 'in_progress' }];
    mockFrom(makeChain({ data: runs, error: null }));

    const result = await getActiveWashRuns();

    expect(result).toHaveLength(1);
    expect(supabase.from).toHaveBeenCalledWith('wash_runs');
  });

  it('returns empty array on error', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error();
    });
    expect(await getActiveWashRuns()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// completeWashRun
// ---------------------------------------------------------------------------

describe('completeWashRun', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates wash run to completed status', async () => {
    const updated = { id: 'wr-1', status: 'completed', total_output_weight_grams: 180 };
    mockFrom(makeChain({ data: updated, error: null }));

    const result = await completeWashRun('wr-1', {
      total_output_weight_grams: 180,
      waste_weight_grams: 20,
      yield_percentage: 18,
    });

    expect(result.data).toEqual(updated);
    expect(result.error).toBeNull();
  });

  it('propagates DB error', async () => {
    const dbError = { message: 'update failed' };
    mockFrom(makeChain({ data: null, error: dbError }));

    const result = await completeWashRun('wr-1', {
      total_output_weight_grams: 0,
      waste_weight_grams: 0,
      yield_percentage: 0,
    });

    expect(result.error).toEqual(dbError);
  });
});

// ---------------------------------------------------------------------------
// createFreezeDryRun / completeFreezeDryRun
// ---------------------------------------------------------------------------

describe('createFreezeDryRun', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts a freeze dry run', async () => {
    const fd = { id: 'fd-1', status: 'in_progress', wash_run_id: 'wr-1' };
    mockFrom(makeChain({ data: fd, error: null }));

    const result = await createFreezeDryRun('wr-1', 200, 'equip-1');

    expect(result.data).toEqual(fd);
    expect(result.error).toBeNull();
  });
});

describe('completeFreezeDryRun', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates freeze dry run to completed', async () => {
    const updated = { id: 'fd-1', status: 'completed', output_weight_grams: 150 };
    mockFrom(makeChain({ data: updated, error: null }));

    const result = await completeFreezeDryRun('fd-1', {
      output_weight_grams: 150,
      waste_weight_grams: 10,
      moisture_loss_percentage: 25,
    });

    expect(result.data?.status).toBe('completed');
    expect(result.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createPressRun
// ---------------------------------------------------------------------------

describe('createPressRun', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts press run, inputs, and updates hash package weights', async () => {
    const pressRun = { id: 'pr-1', status: 'in_progress', press_date: '2026-04-01' };
    const hashPkg = { remaining_weight_grams: 100 };

    const runChain = makeChain({ data: pressRun, error: null });
    const inputsChain = makeChain({ data: null, error: null });
    const pkgReadChain = makeChain({ data: hashPkg, error: null });
    const pkgUpdateChain = makeChain({ data: null, error: null });

    (supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(runChain)      // insert press_run
      .mockReturnValueOnce(inputsChain)   // insert press_run_inputs (supabase directly)
      .mockReturnValueOnce(pkgReadChain)  // select hash_packages remaining
      .mockReturnValueOnce(pkgUpdateChain); // update hash_packages status

    const inputs = [{ hash_package_id: 'hp-1', weight_grams: 60 }];
    const result = await createPressRun({ press_date: '2026-04-01' }, inputs);

    expect(result.data).toEqual(pressRun);
    expect(result.error).toBeNull();
  });

  it('marks hash package as depleted when fully consumed', async () => {
    const pressRun = { id: 'pr-1', status: 'in_progress' };
    const hashPkg = { remaining_weight_grams: 50 };

    const runChain = makeChain({ data: pressRun, error: null });
    const inputsChain = makeChain({ data: null, error: null });
    const pkgReadChain = makeChain({ data: hashPkg, error: null });
    const pkgUpdateChain = makeChain({ data: null, error: null }) as any;

    (supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(runChain)
      .mockReturnValueOnce(inputsChain)
      .mockReturnValueOnce(pkgReadChain)
      .mockReturnValueOnce(pkgUpdateChain);

    await createPressRun({}, [{ hash_package_id: 'hp-1', weight_grams: 50 }]);

    expect(pkgUpdateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'depleted', remaining_weight_grams: 0 })
    );
  });

  it('marks hash package as partial when partially consumed', async () => {
    const pressRun = { id: 'pr-1', status: 'in_progress' };
    const hashPkg = { remaining_weight_grams: 100 };

    const runChain = makeChain({ data: pressRun, error: null });
    const inputsChain = makeChain({ data: null, error: null });
    const pkgReadChain = makeChain({ data: hashPkg, error: null });
    const pkgUpdateChain = makeChain({ data: null, error: null }) as any;

    (supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(runChain)
      .mockReturnValueOnce(inputsChain)
      .mockReturnValueOnce(pkgReadChain)
      .mockReturnValueOnce(pkgUpdateChain);

    await createPressRun({}, [{ hash_package_id: 'hp-1', weight_grams: 40 }]);

    expect(pkgUpdateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'partial', remaining_weight_grams: 60 })
    );
  });
});

// ---------------------------------------------------------------------------
// createCureSession
// ---------------------------------------------------------------------------

describe('createCureSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts cure session and links rosin packages', async () => {
    const cure = { id: 'cs-1', status: 'curing', target_consistency: 'badder' };

    const cureInsertChain = makeChain({ data: cure, error: null });
    const pkgUpdateChain = makeChain({ data: null, error: null });

    (supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(cureInsertChain)
      .mockReturnValueOnce(pkgUpdateChain);

    const result = await createCureSession(
      { press_run_id: 'pr-1', target_consistency: 'badder', input_weight_grams: 100 },
      ['rp-1', 'rp-2']
    );

    expect(result.data).toEqual(cure);
    expect(result.error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('rosin_cure_sessions');
    expect(supabase.from).toHaveBeenCalledWith('rosin_packages');
  });

  it('returns error if cure session insert fails', async () => {
    const dbError = { message: 'insert failed' };
    mockFrom(makeChain({ data: null, error: dbError }));

    const result = await createCureSession(
      { press_run_id: 'pr-1', target_consistency: 'badder', input_weight_grams: 100 },
      []
    );

    expect(result.data).toBeNull();
    expect(result.error).toEqual(dbError);
  });
});

// ---------------------------------------------------------------------------
// completeCureSession
// ---------------------------------------------------------------------------

describe('completeCureSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates cure session and marks packages as cured', async () => {
    const updatedCure = { id: 'cs-1', status: 'completed' };
    const cureUpdateChain = makeChain({ data: updatedCure, error: null });
    const pkgUpdateChain = makeChain({ data: null, error: null });

    (supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(cureUpdateChain)
      .mockReturnValueOnce(pkgUpdateChain);

    const result = await completeCureSession('cs-1', {
      output_weight_grams: 90,
      waste_weight_grams: 5,
      cure_loss_percentage: 5,
      actual_consistency: 'badder',
    });

    expect(result.data?.status).toBe('completed');
    expect(result.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getPressRunStats / getCureSessionStats
// ---------------------------------------------------------------------------

describe('getPressRunStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calculates average press yield', async () => {
    const rows = [{ yield_percentage: 20 }, { yield_percentage: 30 }];
    mockFrom(makeChain({ data: rows, error: null }));

    const result = await getPressRunStats();

    expect(result.count).toBe(2);
    expect(result.avgYield).toBe(25);
  });

  it('returns zero stats when no completed press runs', async () => {
    mockFrom(makeChain({ data: [], error: null }));

    const result = await getPressRunStats();

    expect(result).toEqual({ count: 0, avgYield: 0 });
  });
});

describe('getCureSessionStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calculates average cure loss', async () => {
    const rows = [{ cure_loss_percentage: 10 }, { cure_loss_percentage: 20 }];
    mockFrom(makeChain({ data: rows, error: null }));

    const result = await getCureSessionStats();

    expect(result.count).toBe(2);
    expect(result.avgCureLoss).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// getAnalyticsKpis
// ---------------------------------------------------------------------------

describe('getAnalyticsKpis', () => {
  beforeEach(() => vi.clearAllMocks());

  it('aggregates all KPI data for a date range', async () => {
    const countChain = makeChain({ count: 10, error: null });
    const yieldChain = makeChain({ data: [{ yield_percentage: 20 }, { yield_percentage: 30 }], error: null });
    const outputChain = makeChain({ data: [{ output_weight_grams: 50 }, { output_weight_grams: 100 }], error: null });
    const cureChain = makeChain({ data: [{ cure_loss_percentage: 5 }], error: null });
    const strainChain = makeChain({
      data: [
        { wash_run: { strain_id: 'strain-1' } },
        { wash_run: { strain_id: 'strain-2' } },
        { wash_run: { strain_id: 'strain-1' } }, // dup
      ],
      error: null,
    });

    (supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(yieldChain)
      .mockReturnValueOnce(outputChain)
      .mockReturnValueOnce(cureChain)
      .mockReturnValueOnce(strainChain);

    const result = await getAnalyticsKpis('2026-01-01', '2026-04-01');

    expect(result.totalRuns).toBe(10);
    expect(result.avgYield).toBe(25);
    expect(result.totalOutput).toBe(150);
    expect(result.avgCureLoss).toBe(5);
    expect(result.activeStrains).toBe(2); // deduplicated
  });

  it('returns zeroed KPIs on error', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('network error');
    });

    const result = await getAnalyticsKpis('2026-01-01', '2026-04-01');

    expect(result).toEqual({ totalRuns: 0, avgYield: 0, totalOutput: 0, avgCureLoss: 0, activeStrains: 0 });
  });
});

// ---------------------------------------------------------------------------
// getStrainLeaderboard
// ---------------------------------------------------------------------------

describe('getStrainLeaderboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches from view when timeRange is "all"', async () => {
    const entries = [{ strain_id: 's1', avg_yield_percentage: 22 }];
    mockFrom(makeChain({ data: entries, error: null }));

    const result = await getStrainLeaderboard('all');

    expect(supabase.from).toHaveBeenCalledWith('v_rosin_strain_yields');
    expect(result.data).toHaveLength(1);
  });

  it('aggregates runs by strain for a time range', async () => {
    const runs = [
      { yield_percentage: 20, press_date: '2026-03-01', wash_run: { strain_id: 's1', strain: { name: 'OG Kush', abbreviation: 'OG' } } },
      { yield_percentage: 30, press_date: '2026-03-15', wash_run: { strain_id: 's1', strain: { name: 'OG Kush', abbreviation: 'OG' } } },
      { yield_percentage: 25, press_date: '2026-03-10', wash_run: { strain_id: 's2', strain: { name: 'GSC', abbreviation: 'GS' } } },
    ];
    mockFrom(makeChain({ data: runs, error: null }));

    const result = await getStrainLeaderboard('30d');

    expect(result.data).toHaveLength(2);
    const og = result.data!.find((e) => e.strain_id === 's1')!;
    expect(og.total_runs).toBe(2);
    expect(og.avg_yield_percentage).toBe(25);
    expect(og.min_yield_percentage).toBe(20);
    expect(og.max_yield_percentage).toBe(30);
    expect(og.last_pressed).toBe('2026-03-15');
  });

  it('returns empty array when no runs in range', async () => {
    mockFrom(makeChain({ data: [], error: null }));

    const result = await getStrainLeaderboard('7d');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });
});
