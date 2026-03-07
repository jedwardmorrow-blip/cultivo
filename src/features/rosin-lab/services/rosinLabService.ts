import { supabase } from '@lib/supabase';
import type { ActivePipelineItem, DashboardStats, FreshFrozenPackage } from '../types/rosin-lab.types';

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
