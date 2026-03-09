import { supabase } from '@lib/supabase';
import type {
  ActivePipelineItem,
  AnalyticsKpis,
  BatchWithFF,
  ConsistencyBreakdownItem,
  CureSession,
  DashboardStats,
  FreezeDryRun,
  FreshFrozenPackage,
  HashPackage,
  PressRun,
  RosinLabEquipment,
  RosinPackage,
  StrainLeaderboardEntry,
  WashRun,
  WashRunInput,
  YieldTrendPoint,
} from '../types/rosin-lab.types';
import { getDateFrom } from '../utils/analyticsHelpers';

// Rosin lab tables do not exist in the DB schema yet.
// Using `any` cast so TypeScript compiles while the schema is being built.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString();

    const [washResult, pressResult] = await Promise.all([
      db
        .from('wash_runs')
        .select('input_grams, output_grams')
        .eq('status', 'completed')
        .not('output_grams', 'is', null),
      db
        .from('press_runs')
        .select('input_grams, output_grams, completed_at')
        .eq('status', 'completed')
        .not('output_grams', 'is', null),
    ]);

    let avgWashYield = 0;
    if (washResult.data && washResult.data.length > 0) {
      const rows = washResult.data as Array<{ input_grams: number; output_grams: number }>;
      const yields = rows
        .filter((r) => r.input_grams > 0)
        .map((r) => (r.output_grams / r.input_grams) * 100);
      if (yields.length > 0) {
        avgWashYield = yields.reduce((a, b) => a + b, 0) / yields.length;
      }
    }

    let avgPressYield = 0;
    let totalRosin30d = 0;
    if (pressResult.data && pressResult.data.length > 0) {
      const rows = pressResult.data as Array<{
        input_grams: number;
        output_grams: number;
        completed_at: string;
      }>;
      const recent = rows.filter((r) => r.completed_at && r.completed_at >= since);
      totalRosin30d = recent.reduce((sum, r) => sum + (r.output_grams ?? 0), 0);

      const yields = rows
        .filter((r) => r.input_grams > 0)
        .map((r) => (r.output_grams / r.input_grams) * 100);
      if (yields.length > 0) {
        avgPressYield = yields.reduce((a, b) => a + b, 0) / yields.length;
      }
    }

    const [overdueResult, stalledResult] = await Promise.all([
      db
        .from('rosin_cure_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'curing')
        .lt('expected_completion', new Date().toISOString()),
      db
        .from('wash_runs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'in_progress')
        .lt('started_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()),
    ]);

    const needsAttention = ((overdueResult.count ?? 0) as number) + ((stalledResult.count ?? 0) as number);

    return { avgWashYield, avgPressYield, totalRosin30d, needsAttention };
  } catch {
    return { avgWashYield: 0, avgPressYield: 0, totalRosin30d: 0, needsAttention: 0 };
  }
}

export async function getActivePipelineItems(): Promise<ActivePipelineItem[]> {
  try {
    const { data, error } = await db
      .from('v_rosin_pipeline_status')
      .select('*')
      .order('started_date', { ascending: false });

    if (error) return [];
    return (data ?? []) as ActivePipelineItem[];
  } catch {
    return [];
  }
}

export async function getPipelineStageCounts(): Promise<Record<string, number>> {
  try {
    const [ffRes, washRes, fdRes, pressRes, cureRes] = await Promise.all([
      db.from('fresh_frozen_packages').select('id', { count: 'exact', head: true }).eq('status', 'stored'),
      db.from('wash_runs').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
      db.from('freeze_dry_runs').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
      db.from('press_runs').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
      db.from('rosin_cure_sessions').select('id', { count: 'exact', head: true }).eq('status', 'curing'),
    ]);

    return {
      ff: (ffRes.count ?? 0) as number,
      wash: (washRes.count ?? 0) as number,
      fd: (fdRes.count ?? 0) as number,
      press: (pressRes.count ?? 0) as number,
      cure: (cureRes.count ?? 0) as number,
    };
  } catch {
    return { ff: 0, wash: 0, fd: 0, press: 0, cure: 0 };
  }
}

export async function getHashPackages(
  statusFilter?: string
): Promise<{ data: HashPackage[] | null; error: unknown }> {
  try {
    let query = db
      .from('hash_packages')
      .select(`
        *,
        wash_run:wash_runs!wash_run_id (
          id,
          batch:batch_registry!batch_id (
            batch_number
          )
        ),
        strain:strains!strain_id (
          name,
          abbreviation
        )
      `)
      .order('dried_date', { ascending: false, nullsFirst: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    return { data: data as HashPackage[] | null, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function getRosinPackages(
  destinationFilter?: string,
  statusFilter?: string
): Promise<{ data: RosinPackage[] | null; error: unknown }> {
  try {
    let query = db
      .from('rosin_packages')
      .select(`
        *,
        press_run:press_runs!press_run_id (
          id,
          batch:batch_registry!batch_id (
            batch_number
          )
        ),
        strain:strains!strain_id (
          name,
          abbreviation
        ),
        cure_session:rosin_cure_sessions!cure_session_id (
          status,
          target_consistency,
          start_date,
          target_end_date
        )
      `)
      .order('created_at', { ascending: false });

    if (destinationFilter && destinationFilter !== 'all') {
      query = query.eq('destination', destinationFilter);
    }
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    return { data: data as RosinPackage[] | null, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function getFreshFrozenPackages(
  statusFilter?: string
): Promise<{ data: FreshFrozenPackage[] | null; error: unknown }> {
  try {
    let query = db
      .from('fresh_frozen_packages')
      .select(`
        *,
        batch:batch_registry!batch_id (
          batch_number,
          harvest_date,
          strain
        ),
        strain:strains!strain_id (
          name,
          abbreviation
        )
      `)
      .order('frozen_at', { ascending: false, nullsFirst: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    return { data: data as FreshFrozenPackage[] | null, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function getBatchesWithFreshFrozen(): Promise<BatchWithFF[]> {
  try {
    const { data } = await db
      .from('fresh_frozen_packages')
      .select(`
        batch_id,
        batch:batch_registry!batch_id (
          id,
          batch_number,
          strain,
          strain_id
        )
      `)
      .eq('status', 'stored');

    if (!data) return [];
    const seen = new Set<string>();
    const unique: BatchWithFF[] = [];
    for (const row of data) {
      if (!seen.has(row.batch_id) && row.batch) {
        seen.add(row.batch_id);
        unique.push(row.batch as BatchWithFF);
      }
    }
    return unique;
  } catch {
    return [];
  }
}

export async function getFreshFrozenForBatch(batchId: string): Promise<FreshFrozenPackage[]> {
  try {
    const { data } = await db
      .from('fresh_frozen_packages')
      .select('*')
      .eq('batch_id', batchId)
      .eq('status', 'stored')
      .order('package_number');
    return (data ?? []) as FreshFrozenPackage[];
  } catch {
    return [];
  }
}

export async function createWashRun(
  washRun: Partial<WashRun>,
  inputs: { fresh_frozen_package_id: string; weight_grams: number }[]
): Promise<{ data: WashRun | null; error: unknown }> {
  try {
    const { data: run, error: runError } = await db
      .from('wash_runs')
      .insert(washRun)
      .select()
      .single();

    if (runError || !run) return { data: null, error: runError };

    const inputRows = inputs.map((i) => ({ wash_run_id: run.id, ...i }));
    const { error: inputError } = await db.from('wash_run_inputs').insert(inputRows);
    if (inputError) return { data: run as WashRun, error: inputError };

    const packageIds = inputs.map((i) => i.fresh_frozen_package_id);
    await db
      .from('fresh_frozen_packages')
      .update({ status: 'allocated' })
      .in('id', packageIds);

    return { data: run as WashRun, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function getActiveWashRuns(): Promise<WashRun[]> {
  try {
    const { data } = await db
      .from('wash_runs')
      .select(`
        *,
        batch:batch_registry!batch_id ( batch_number, strain ),
        strain:strains!strain_id ( name ),
        equipment:rosin_lab_equipment!equipment_id ( id, name ),
        inputs:wash_run_inputs (
          id,
          weight_grams,
          package:fresh_frozen_packages!fresh_frozen_package_id ( id, package_number, freezer_location )
        ),
        freeze_dry:freeze_dry_runs!wash_run_id ( id, status )
      `)
      .eq('status', 'in_progress')
      .order('wash_date', { ascending: false });
    return (data ?? []) as WashRun[];
  } catch {
    return [];
  }
}

export async function completeWashRun(
  runId: string,
  output: {
    total_output_weight_grams: number;
    waste_weight_grams: number;
    yield_percentage: number;
    micron_grades?: Record<string, number>;
  }
): Promise<{ data: WashRun | null; error: unknown }> {
  try {
    const { data, error } = await db
      .from('wash_runs')
      .update({ ...output, status: 'completed' })
      .eq('id', runId)
      .select()
      .single();
    return { data: data as WashRun | null, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function getActiveFreezeDryRuns(): Promise<FreezeDryRun[]> {
  try {
    const { data } = await db
      .from('freeze_dry_runs')
      .select(`
        *,
        wash_run:wash_runs!wash_run_id (
          id,
          batch:batch_registry!batch_id ( batch_number, strain ),
          strain:strains!strain_id ( name )
        ),
        equipment:rosin_lab_equipment!equipment_id ( id, name )
      `)
      .eq('status', 'in_progress')
      .order('start_time', { ascending: false });
    return (data ?? []) as FreezeDryRun[];
  } catch {
    return [];
  }
}

export async function getRecentCompletedFreezeDryRuns(): Promise<FreezeDryRun[]> {
  try {
    const { data } = await db
      .from('freeze_dry_runs')
      .select(`
        *,
        wash_run:wash_runs!wash_run_id (
          id,
          batch:batch_registry!batch_id ( batch_number, strain ),
          strain:strains!strain_id ( name )
        )
      `)
      .eq('status', 'completed')
      .order('end_time', { ascending: false })
      .limit(5);
    return (data ?? []) as FreezeDryRun[];
  } catch {
    return [];
  }
}

export async function createFreezeDryRun(
  washRunId: string,
  inputWeight: number,
  equipmentId?: string
): Promise<{ data: FreezeDryRun | null; error: unknown }> {
  try {
    const { data, error } = await db
      .from('freeze_dry_runs')
      .insert({
        wash_run_id: washRunId,
        input_weight_grams: inputWeight,
        equipment_id: equipmentId ?? null,
        start_time: new Date().toISOString(),
        status: 'in_progress',
      })
      .select()
      .single();
    return { data: data as FreezeDryRun | null, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function completeFreezeDryRun(
  runId: string,
  output: {
    output_weight_grams: number;
    waste_weight_grams: number;
    moisture_loss_percentage: number;
  }
): Promise<{ data: FreezeDryRun | null; error: unknown }> {
  try {
    const { data, error } = await db
      .from('freeze_dry_runs')
      .update({ ...output, end_time: new Date().toISOString(), status: 'completed' })
      .eq('id', runId)
      .select()
      .single();
    return { data: data as FreezeDryRun | null, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function getCompletedWashRuns(
  limit = 20,
  offset = 0
): Promise<{ data: WashRun[]; count: number }> {
  try {
    const { data, count } = await db
      .from('wash_runs')
      .select(
        `
        *,
        batch:batch_registry!batch_id ( batch_number, strain ),
        strain:strains!strain_id ( name ),
        freeze_dry:freeze_dry_runs!wash_run_id ( id, status )
      `,
        { count: 'exact' }
      )
      .eq('status', 'completed')
      .order('wash_date', { ascending: false })
      .range(offset, offset + limit - 1);
    return { data: (data ?? []) as WashRun[], count: (count ?? 0) as number };
  } catch {
    return { data: [], count: 0 };
  }
}

export async function getWashingMachines(): Promise<RosinLabEquipment[]> {
  try {
    const { data } = await db
      .from('rosin_lab_equipment')
      .select('id, name, equipment_type, status')
      .eq('equipment_type', 'washing_machine')
      .eq('status', 'active');
    return (data ?? []) as RosinLabEquipment[];
  } catch {
    return [];
  }
}

export async function getFreezeDryers(): Promise<RosinLabEquipment[]> {
  try {
    const { data } = await db
      .from('rosin_lab_equipment')
      .select('id, name, equipment_type, status')
      .eq('equipment_type', 'freeze_dryer')
      .eq('status', 'active');
    return (data ?? []) as RosinLabEquipment[];
  } catch {
    return [];
  }
}

export async function getWashRunInputs(washRunId: string): Promise<WashRunInput[]> {
  try {
    const { data } = await db
      .from('wash_run_inputs')
      .select(`
        *,
        package:fresh_frozen_packages!fresh_frozen_package_id ( id, package_number, freezer_location )
      `)
      .eq('wash_run_id', washRunId);
    return (data ?? []) as WashRunInput[];
  } catch {
    return [];
  }
}

export async function getHashPackagesForPressing(): Promise<HashPackage[]> {
  try {
    const { data } = await db
      .from('hash_packages')
      .select(`
        *,
        strain:strains!strain_id ( name, abbreviation ),
        wash_run:wash_runs!wash_run_id (
          id,
          batch:batch_registry!batch_id ( batch_number )
        )
      `)
      .in('status', ['available', 'partial'])
      .order('dried_date', { ascending: false, nullsFirst: false });
    return (data ?? []) as HashPackage[];
  } catch {
    return [];
  }
}

export async function createPressRun(
  pressRun: Partial<PressRun>,
  inputs: { hash_package_id: string; weight_grams: number }[]
): Promise<{ data: PressRun | null; error: unknown }> {
  try {
    const { data: run, error: runError } = await db
      .from('press_runs')
      .insert(pressRun)
      .select()
      .single();

    if (runError || !run) return { data: null, error: runError };

    const inputRows = inputs.map((i) => ({ press_run_id: run.id, ...i }));
    await db.from('press_run_inputs').insert(inputRows);

    for (const input of inputs) {
      const { data: pkg } = await db
        .from('hash_packages')
        .select('remaining_weight_grams')
        .eq('id', input.hash_package_id)
        .single();

      if (pkg) {
        const newRemaining = (pkg.remaining_weight_grams as number) - input.weight_grams;
        const newStatus = newRemaining <= 0 ? 'depleted' : 'partial';
        await db
          .from('hash_packages')
          .update({
            remaining_weight_grams: Math.max(0, newRemaining),
            status: newStatus,
          })
          .eq('id', input.hash_package_id);
      }
    }

    return { data: run as PressRun, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function getRosinPresses(): Promise<RosinLabEquipment[]> {
  try {
    const { data } = await db
      .from('rosin_lab_equipment')
      .select('id, name, equipment_type, status')
      .eq('equipment_type', 'rosin_press')
      .eq('status', 'active');
    return (data ?? []) as RosinLabEquipment[];
  } catch {
    return [];
  }
}

export async function getPressRunsForPackaging(): Promise<PressRun[]> {
  try {
    const { data } = await db
      .from('press_runs')
      .select(`
        *,
        wash_run:wash_runs!wash_run_id (
          strain_id,
          batch:batch_registry!batch_id ( batch_number ),
          strain:strains!strain_id ( name, abbreviation )
        ),
        equipment:rosin_lab_equipment!equipment_id ( name ),
        rosin_packages ( id, package_id, weight_grams, destination, status )
      `)
      .eq('status', 'completed')
      .order('press_date', { ascending: false });

    const runs = (data ?? []) as PressRun[];
    return runs.filter((run) => {
      if (run.output_weight_grams == null) return true;
      const packaged = (run.rosin_packages ?? []).reduce((sum, p) => sum + (p.weight_grams ?? 0), 0);
      return packaged < (run.output_weight_grams ?? 0) - 0.01;
    });
  } catch {
    return [];
  }
}

export async function recordPressOutput(
  runId: string,
  output: {
    output_weight_grams: number;
    waste_weight_grams: number;
    yield_percentage: number;
  }
): Promise<{ data: PressRun | null; error: unknown }> {
  try {
    const { data, error } = await db
      .from('press_runs')
      .update(output)
      .eq('id', runId)
      .select()
      .single();
    return { data: data as PressRun | null, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function createRosinPackages(
  packages: {
    press_run_id: string;
    strain_id: string;
    package_id: string;
    weight_grams: number;
    destination: string;
    status: string;
  }[]
): Promise<{ data: RosinPackage[] | null; error: unknown }> {
  try {
    const { data, error } = await db
      .from('rosin_packages')
      .insert(packages)
      .select();
    return { data: data as RosinPackage[] | null, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function createCureSession(
  session: {
    press_run_id: string;
    target_consistency: string;
    input_weight_grams: number;
    cure_temp_f?: number;
  },
  rosinPackageIds: string[]
): Promise<{ data: CureSession | null; error: unknown }> {
  try {
    const { data: cure, error } = await db
      .from('rosin_cure_sessions')
      .insert({
        ...session,
        start_time: new Date().toISOString(),
        status: 'curing',
      })
      .select()
      .single();

    if (error || !cure) return { data: null, error };

    await db
      .from('rosin_packages')
      .update({ cure_session_id: cure.id, status: 'curing' })
      .in('id', rosinPackageIds);

    return { data: cure as CureSession, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function getActiveCureSessions(): Promise<CureSession[]> {
  try {
    const { data } = await db
      .from('rosin_cure_sessions')
      .select(`
        *,
        press_run:press_runs!press_run_id (
          id,
          wash_run:wash_runs!wash_run_id (
            batch:batch_registry!batch_id ( batch_number )
          )
        ),
        rosin_packages:rosin_packages!cure_session_id (
          id,
          package_id,
          weight_grams,
          destination,
          status,
          strain:strains!strain_id ( name, abbreviation )
        )
      `)
      .eq('status', 'curing')
      .order('start_time', { ascending: false });
    return (data ?? []) as CureSession[];
  } catch {
    return [];
  }
}

export async function completeCureSession(
  sessionId: string,
  output: {
    output_weight_grams: number;
    waste_weight_grams: number;
    cure_loss_percentage: number;
    actual_consistency: string;
  }
): Promise<{ data: CureSession | null; error: unknown }> {
  try {
    const { data: cure, error } = await db
      .from('rosin_cure_sessions')
      .update({
        ...output,
        end_time: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) return { data: null, error };

    await db
      .from('rosin_packages')
      .update({ status: 'cured' })
      .eq('cure_session_id', sessionId);

    return { data: cure as CureSession, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function getRecentCompletedCures(limit = 5): Promise<CureSession[]> {
  try {
    const { data } = await db
      .from('rosin_cure_sessions')
      .select(`
        *,
        press_run:press_runs!press_run_id (
          wash_run:wash_runs!wash_run_id (
            batch:batch_registry!batch_id ( batch_number ),
            strain:strains!strain_id ( name )
          )
        )
      `)
      .eq('status', 'completed')
      .order('end_time', { ascending: false })
      .limit(limit);
    return (data ?? []) as CureSession[];
  } catch {
    return [];
  }
}

export async function getPackagingBadgeCount(): Promise<number> {
  try {
    const runs = await getPressRunsForPackaging();
    return runs.length;
  } catch {
    return 0;
  }
}

export async function getCompletedPressRuns(
  limit = 20,
  offset = 0,
  statusFilter?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ data: PressRun[]; count: number }> {
  try {
    const statuses =
      statusFilter && statusFilter !== 'all' ? [statusFilter] : ['completed', 'failed'];

    let query = db
      .from('press_runs')
      .select(
        `
        *,
        wash_run:wash_runs!wash_run_id (
          id,
          batch:batch_registry!batch_id ( batch_number ),
          strain:strains!strain_id ( name, abbreviation )
        ),
        equipment:rosin_lab_equipment!equipment_id ( name ),
        inputs:press_run_inputs (
          id,
          weight_grams,
          hash_package:hash_packages!hash_package_id (
            package_id,
            strain:strains!strain_id ( name, abbreviation )
          )
        ),
        rosin_packages ( id, package_id, weight_grams, destination, status )
      `,
        { count: 'exact' }
      )
      .in('status', statuses)
      .order('press_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (dateFrom) query = query.gte('press_date', dateFrom);
    if (dateTo) query = query.lte('press_date', dateTo);

    const { data, count } = await query;
    return { data: (data ?? []) as PressRun[], count: (count ?? 0) as number };
  } catch {
    return { data: [], count: 0 };
  }
}

export async function getCompletedCureSessions(
  limit = 20,
  offset = 0,
  statusFilter?: string,
  consistencyFilter?: string
): Promise<{ data: CureSession[]; count: number }> {
  try {
    const statuses =
      statusFilter && statusFilter !== 'all' ? [statusFilter] : ['completed', 'failed'];

    let query = db
      .from('rosin_cure_sessions')
      .select(
        `
        *,
        press_run:press_runs!press_run_id (
          id,
          press_date,
          wash_run:wash_runs!wash_run_id (
            batch:batch_registry!batch_id ( batch_number ),
            strain:strains!strain_id ( name, abbreviation )
          )
        ),
        rosin_packages:rosin_packages!cure_session_id (
          id,
          package_id,
          weight_grams,
          destination,
          status,
          strain:strains!strain_id ( name, abbreviation )
        )
      `,
        { count: 'exact' }
      )
      .in('status', statuses)
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (consistencyFilter && consistencyFilter !== 'all') {
      query = query.eq('target_consistency', consistencyFilter);
    }

    const { data, count } = await query;
    return { data: (data ?? []) as CureSession[], count: (count ?? 0) as number };
  } catch {
    return { data: [], count: 0 };
  }
}

export async function getPressRunStats(): Promise<{ count: number; avgYield: number }> {
  try {
    const { data } = await db
      .from('press_runs')
      .select('yield_percentage')
      .eq('status', 'completed')
      .not('yield_percentage', 'is', null);

    if (!data || data.length === 0) return { count: 0, avgYield: 0 };

    const rows = data as Array<{ yield_percentage: number }>;
    const avgYield = rows.reduce((sum, r) => sum + (r.yield_percentage ?? 0), 0) / rows.length;
    return { count: rows.length, avgYield };
  } catch {
    return { count: 0, avgYield: 0 };
  }
}

export async function getCureSessionStats(): Promise<{ count: number; avgCureLoss: number }> {
  try {
    const { data } = await db
      .from('rosin_cure_sessions')
      .select('cure_loss_percentage')
      .eq('status', 'completed')
      .not('cure_loss_percentage', 'is', null);

    if (!data || data.length === 0) return { count: 0, avgCureLoss: 0 };

    const rows = data as Array<{ cure_loss_percentage: number }>;
    const avgCureLoss =
      rows.reduce((sum, r) => sum + (r.cure_loss_percentage ?? 0), 0) / rows.length;
    return { count: rows.length, avgCureLoss };
  } catch {
    return { count: 0, avgCureLoss: 0 };
  }
}

export async function getAnalyticsKpis(
  dateFrom: string,
  dateTo: string
): Promise<AnalyticsKpis> {
  try {
    const [runsResult, yieldResult, outputResult, cureResult, strainResult] = await Promise.all([
      db
        .from('press_runs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('press_date', dateFrom)
        .lte('press_date', dateTo),
      db
        .from('press_runs')
        .select('yield_percentage')
        .eq('status', 'completed')
        .not('yield_percentage', 'is', null)
        .gte('press_date', dateFrom)
        .lte('press_date', dateTo),
      db
        .from('press_runs')
        .select('output_weight_grams')
        .eq('status', 'completed')
        .not('output_weight_grams', 'is', null)
        .gte('press_date', dateFrom)
        .lte('press_date', dateTo),
      db
        .from('rosin_cure_sessions')
        .select('cure_loss_percentage')
        .eq('status', 'completed')
        .not('cure_loss_percentage', 'is', null)
        .gte('start_time', dateFrom)
        .lte('start_time', dateTo),
      db
        .from('press_runs')
        .select('wash_run:wash_runs!wash_run_id ( strain_id )')
        .eq('status', 'completed')
        .gte('press_date', dateFrom)
        .lte('press_date', dateTo),
    ]);

    const totalRuns = (runsResult.count as number) || 0;

    const yieldRows = (yieldResult.data ?? []) as Array<{ yield_percentage: number }>;
    const avgYield =
      yieldRows.length > 0
        ? yieldRows.reduce((sum, r) => sum + (r.yield_percentage || 0), 0) / yieldRows.length
        : 0;

    const outputRows = (outputResult.data ?? []) as Array<{ output_weight_grams: number }>;
    const totalOutput = outputRows.reduce((sum, r) => sum + (r.output_weight_grams || 0), 0);

    const cureRows = (cureResult.data ?? []) as Array<{ cure_loss_percentage: number }>;
    const avgCureLoss =
      cureRows.length > 0
        ? cureRows.reduce((sum, r) => sum + (r.cure_loss_percentage || 0), 0) / cureRows.length
        : 0;

    const strainRows = (strainResult.data ?? []) as Array<{
      wash_run: { strain_id: string } | null;
    }>;
    const uniqueStrains = new Set(
      strainRows.map((r) => r.wash_run?.strain_id).filter(Boolean)
    );

    return { totalRuns, avgYield, totalOutput, avgCureLoss, activeStrains: uniqueStrains.size };
  } catch {
    return { totalRuns: 0, avgYield: 0, totalOutput: 0, avgCureLoss: 0, activeStrains: 0 };
  }
}

export async function getYieldTrendData(
  dateFrom: string,
  dateTo: string
): Promise<{ data: YieldTrendPoint[] | null; error: unknown }> {
  try {
    const { data, error } = await db
      .from('press_runs')
      .select(`
        id,
        press_date,
        yield_percentage,
        input_weight_grams,
        output_weight_grams,
        wash_run:wash_runs!wash_run_id (
          strain:strains!strain_id ( name )
        )
      `)
      .eq('status', 'completed')
      .not('yield_percentage', 'is', null)
      .gte('press_date', dateFrom)
      .lte('press_date', dateTo)
      .order('press_date', { ascending: true });

    if (!data) return { data: null, error };

    const points: YieldTrendPoint[] = (data as Array<{
      id: string;
      press_date: string;
      yield_percentage: number;
      input_weight_grams: number;
      output_weight_grams: number;
      wash_run: { strain: { name: string } | null } | null;
    }>).map((r) => ({
      id: r.id,
      press_date: r.press_date,
      yield_percentage: r.yield_percentage,
      input_weight_grams: r.input_weight_grams,
      output_weight_grams: r.output_weight_grams,
      strain_name: r.wash_run?.strain?.name ?? 'Unknown',
    }));

    return { data: points, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function getThroughputData(
  dateFrom: string,
  dateTo: string
): Promise<{
  data: Array<{ press_date: string; output_weight_grams: number }> | null;
  error: unknown;
}> {
  try {
    const { data, error } = await db
      .from('press_runs')
      .select('press_date, output_weight_grams')
      .eq('status', 'completed')
      .not('output_weight_grams', 'is', null)
      .gte('press_date', dateFrom)
      .lte('press_date', dateTo)
      .order('press_date', { ascending: true });

    return { data: data ?? null, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function getConsistencyBreakdown(
  dateFrom: string,
  dateTo: string
): Promise<{ data: ConsistencyBreakdownItem[]; error: unknown }> {
  try {
    const { data, error } = await db
      .from('rosin_packages')
      .select('destination, weight_grams')
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo);

    if (!data) return { data: [], error };

    const agg: Record<string, ConsistencyBreakdownItem> = {};
    for (const pkg of data as Array<{ destination: string; weight_grams: number }>) {
      const dest = pkg.destination;
      if (!agg[dest]) agg[dest] = { destination: dest, totalWeight: 0, count: 0 };
      agg[dest].totalWeight += pkg.weight_grams || 0;
      agg[dest].count += 1;
    }

    return { data: Object.values(agg), error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

export async function getStrainLeaderboard(
  timeRange: string
): Promise<{ data: StrainLeaderboardEntry[]; error: unknown }> {
  try {
    if (timeRange === 'all') {
      const { data, error } = await db
        .from('v_rosin_strain_yields')
        .select('*')
        .order('avg_yield_percentage', { ascending: false });
      return { data: (data ?? []) as StrainLeaderboardEntry[], error };
    }

    const dateFrom = getDateFrom(timeRange);
    const { data, error } = await db
      .from('press_runs')
      .select(`
        yield_percentage,
        press_date,
        wash_run:wash_runs!wash_run_id (
          strain_id,
          strain:strains!strain_id ( name, abbreviation )
        )
      `)
      .eq('status', 'completed')
      .not('yield_percentage', 'is', null)
      .gte('press_date', dateFrom);

    if (!data) return { data: [], error };

    const strainMap = new Map<string, {
      strain_id: string;
      strain_name: string;
      strain_abbreviation: string;
      yields: number[];
      last_pressed: string;
    }>();

    for (const run of data as Array<{
      yield_percentage: number;
      press_date: string;
      wash_run: {
        strain_id: string;
        strain: { name: string; abbreviation: string } | null;
      } | null;
    }>) {
      const strainId = run.wash_run?.strain_id;
      const strainName = run.wash_run?.strain?.name;
      if (!strainId || !strainName) continue;

      if (!strainMap.has(strainId)) {
        strainMap.set(strainId, {
          strain_id: strainId,
          strain_name: strainName,
          strain_abbreviation: run.wash_run?.strain?.abbreviation || '',
          yields: [],
          last_pressed: run.press_date,
        });
      }

      const entry = strainMap.get(strainId)!;
      entry.yields.push(run.yield_percentage);
      if (run.press_date > entry.last_pressed) {
        entry.last_pressed = run.press_date;
      }
    }

    const leaderboard: StrainLeaderboardEntry[] = Array.from(strainMap.values()).map((entry) => ({
      strain_id: entry.strain_id,
      strain_name: entry.strain_name,
      strain_abbreviation: entry.strain_abbreviation,
      total_runs: entry.yields.length,
      avg_yield_percentage:
        entry.yields.reduce((a, b) => a + b, 0) / entry.yields.length,
      min_yield_percentage: Math.min(...entry.yields),
      max_yield_percentage: Math.max(...entry.yields),
      last_pressed: entry.last_pressed,
    }));

    leaderboard.sort((a, b) => b.avg_yield_percentage - a.avg_yield_percentage);

    return { data: leaderboard, error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}
