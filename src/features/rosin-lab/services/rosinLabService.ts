import { supabase } from '@lib/supabase';
import type {
  ActivePipelineItem,
  BatchWithFF,
  CureSession,
  DashboardStats,
  FreezeDryRun,
  FreshFrozenPackage,
  HashPackage,
  PressRun,
  RosinLabEquipment,
  RosinPackage,
  WashRun,
  WashRunInput,
} from '../types/rosin-lab.types';

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
