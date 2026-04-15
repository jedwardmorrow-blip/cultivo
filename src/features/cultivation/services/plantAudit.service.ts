import { supabase } from '@/lib/supabase';
import type {
  PlantAuditSession,
  PlantAuditSessionWithCounts,
  PlantAuditCount,
  PlantAuditCountStatus,
  PlantAuditSummary,
  StartPlantAuditInput,
  RecordPlantAuditCountInput,
  CreateOrphanPlantGroupInput,
  PlantGroup,
} from '../types';

function throwError(error: { message: string } | null, context: string): never {
  throw new Error(error?.message ?? `Unknown error in ${context}`);
}

const SESSION_SELECT = `
  id, audit_number, status, room_scope, initiated_by, started_at,
  completed_at, review_started_at, applied_at, applied_by, abandoned_at,
  notes, summary, created_at, updated_at
`;

const COUNT_SELECT = `
  id, audit_session_id, plant_group_id, grow_room_id, strain_id,
  strain_name_snapshot, db_count_snapshot, physical_count, variance,
  status, counted_by, counted_at, cause_of_death, missing_plant_ids,
  notes, is_orphan, mortality_log_id, created_at, updated_at,
  plant_groups (
    id, plant_count, growth_stage,
    room_table_id, room_section_id,
    strains (name, abbreviation),
    room_tables (table_number, table_name),
    room_sections (section_label)
  ),
  strains (name, abbreviation),
  grow_rooms (name, room_code)
`;

export const plantAuditService = {
  async listPlantAuditSessions(opts?: {
    status?: 'active' | 'all' | PlantAuditSession['status'];
  }): Promise<PlantAuditSession[]> {
    let query = supabase
      .from('plant_audit_sessions')
      .select(SESSION_SELECT)
      .order('started_at', { ascending: false })
      .limit(50);

    if (opts?.status === 'active') {
      query = query.in('status', ['in_progress', 'review']);
    } else if (opts?.status && opts.status !== 'all') {
      query = query.eq('status', opts.status);
    }

    const { data, error } = await query;
    if (error) throwError(error, 'listPlantAuditSessions');
    return (data ?? []) as unknown as PlantAuditSession[];
  },

  async getPlantAuditSession(id: string): Promise<PlantAuditSessionWithCounts> {
    const { data: session, error: sessErr } = await supabase
      .from('plant_audit_sessions')
      .select(SESSION_SELECT)
      .eq('id', id)
      .single();
    if (sessErr) throwError(sessErr, 'getPlantAuditSession:session');

    const { data: counts, error: countErr } = await supabase
      .from('plant_audit_counts')
      .select(COUNT_SELECT)
      .eq('audit_session_id', id)
      .order('created_at', { ascending: true });
    if (countErr) throwError(countErr, 'getPlantAuditSession:counts');

    return {
      ...(session as unknown as PlantAuditSession),
      counts: (counts ?? []) as unknown as PlantAuditCount[],
    };
  },

  /**
   * Starts a plant audit session and pre-seeds one count row per active plant
   * group inside the scoped rooms. Pre-seeding makes Sunday's baseline reset
   * workflow tractable: auditors see every group the system thinks exists and
   * walk the room confirming or correcting each one.
   */
  async startPlantAuditSession(
    input: StartPlantAuditInput,
  ): Promise<PlantAuditSessionWithCounts> {
    const { data: { user } } = await supabase.auth.getUser();

    // Generate the audit number up front — the DB function handles concurrency.
    const { data: numberResult, error: numberErr } = await supabase.rpc(
      'fn_generate_plant_audit_number',
    );
    if (numberErr) throwError(numberErr, 'startPlantAuditSession:generateNumber');
    const auditNumber = numberResult as string;

    const { data: sessionRow, error: sessErr } = await supabase
      .from('plant_audit_sessions')
      .insert({
        audit_number: auditNumber,
        room_scope: input.room_scope.length > 0 ? input.room_scope : null,
        initiated_by: user?.id ?? null,
        notes: input.notes ?? null,
        status: 'in_progress',
      })
      .select(SESSION_SELECT)
      .single();
    if (sessErr) throwError(sessErr, 'startPlantAuditSession:insertSession');
    const session = sessionRow as unknown as PlantAuditSession;

    // Pre-seed counts from current plant group state. Scope to the selected
    // rooms; if none selected, scope across all rooms (full facility audit).
    let groupsQuery = supabase
      .from('plant_groups')
      .select('id, grow_room_id, strain_id, plant_count, strains (name)')
      .not('growth_stage', 'eq', 'harvested');
    if (input.room_scope.length > 0) {
      groupsQuery = groupsQuery.in('grow_room_id', input.room_scope);
    }
    const { data: groups, error: groupErr } = await groupsQuery;
    if (groupErr) throwError(groupErr, 'startPlantAuditSession:loadGroups');

    type PreseedGroup = {
      id: string;
      grow_room_id: string;
      strain_id: string;
      plant_count: number;
      strains?: { name: string } | null;
    };
    const preseedRows = (groups as unknown as PreseedGroup[] | null ?? []).map(
      (g) => ({
        audit_session_id: session.id,
        plant_group_id: g.id,
        grow_room_id: g.grow_room_id,
        strain_id: g.strain_id,
        strain_name_snapshot: g.strains?.name ?? null,
        db_count_snapshot: g.plant_count,
        status: 'pending' as const,
      }),
    );

    if (preseedRows.length > 0) {
      const { error: seedErr } = await supabase
        .from('plant_audit_counts')
        .insert(preseedRows);
      if (seedErr) throwError(seedErr, 'startPlantAuditSession:preseed');
    }

    return plantAuditService.getPlantAuditSession(session.id);
  },

  /**
   * Records a physical count for an existing audit line. Computes status and
   * variance client-side so the DB remains a dumb store.
   *
   * - physical_count === db_count_snapshot → status='counted', variance=0
   * - physical_count !== db_count_snapshot → status='variance_noted'
   * - negative variance requires cause_of_death (enforced UI-side)
   */
  async recordPlantAuditCount(
    countId: string,
    input: RecordPlantAuditCountInput,
  ): Promise<PlantAuditCount> {
    const { data: { user } } = await supabase.auth.getUser();

    // Read the current row to compute variance against the original snapshot.
    const { data: existing, error: readErr } = await supabase
      .from('plant_audit_counts')
      .select('db_count_snapshot')
      .eq('id', countId)
      .single();
    if (readErr) throwError(readErr, 'recordPlantAuditCount:read');

    const dbSnapshot = (existing as { db_count_snapshot: number }).db_count_snapshot;
    const variance = input.physical_count - dbSnapshot;
    const status: PlantAuditCountStatus = variance === 0 ? 'counted' : 'variance_noted';

    const { data, error } = await supabase
      .from('plant_audit_counts')
      .update({
        physical_count: input.physical_count,
        status,
        counted_by: user?.id ?? null,
        counted_at: new Date().toISOString(),
        cause_of_death: variance < 0 ? input.cause_of_death ?? null : null,
        notes: input.notes ?? null,
      })
      .eq('id', countId)
      .select(COUNT_SELECT)
      .single();
    if (error) throwError(error, 'recordPlantAuditCount:update');
    return data as unknown as PlantAuditCount;
  },

  async markPlantAuditCountNotFound(
    countId: string,
    opts: { cause_of_death: PlantAuditCount['cause_of_death']; notes?: string | null },
  ): Promise<PlantAuditCount> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('plant_audit_counts')
      .update({
        status: 'not_found',
        physical_count: 0,
        counted_by: user?.id ?? null,
        counted_at: new Date().toISOString(),
        cause_of_death: opts.cause_of_death,
        notes: opts.notes ?? null,
      })
      .eq('id', countId)
      .select(COUNT_SELECT)
      .single();
    if (error) throwError(error, 'markPlantAuditCountNotFound');
    return data as unknown as PlantAuditCount;
  },

  async markPlantAuditCountSkipped(countId: string, notes?: string): Promise<PlantAuditCount> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('plant_audit_counts')
      .update({
        status: 'skipped',
        counted_by: user?.id ?? null,
        counted_at: new Date().toISOString(),
        notes: notes ?? null,
      })
      .eq('id', countId)
      .select(COUNT_SELECT)
      .single();
    if (error) throwError(error, 'markPlantAuditCountSkipped');
    return data as unknown as PlantAuditCount;
  },

  async resetPlantAuditCount(countId: string): Promise<PlantAuditCount> {
    const { data, error } = await supabase
      .from('plant_audit_counts')
      .update({
        status: 'pending',
        physical_count: null,
        counted_by: null,
        counted_at: null,
        cause_of_death: null,
        notes: null,
      })
      .eq('id', countId)
      .select(COUNT_SELECT)
      .single();
    if (error) throwError(error, 'resetPlantAuditCount');
    return data as unknown as PlantAuditCount;
  },

  /**
   * Creates a brand-new plant group discovered during the walk (plants that
   * exist physically but have no matching record) and writes an audit line
   * linking the new group to the session with status='orphan_created'.
   *
   * The plant group is created with its true count directly, so the RPC has
   * no work to do on apply — orphan lines are pure audit evidence.
   */
  async createOrphanPlantGroup(
    input: CreateOrphanPlantGroupInput,
  ): Promise<{ group: PlantGroup; count: PlantAuditCount }> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: groupRow, error: groupErr } = await supabase
      .from('plant_groups')
      .insert({
        strain_id: input.strain_id,
        grow_room_id: input.grow_room_id,
        plant_count: input.plant_count,
        growth_stage: input.growth_stage ?? 'veg',
        source_type: 'clone',
        is_mother: false,
        room_table_id: input.room_table_id ?? null,
        room_section_id: input.room_section_id ?? null,
        notes: input.notes ?? `Created during plant audit — orphan capture`,
      })
      .select(
        'id, plant_count, growth_stage, strain_id, grow_room_id, strains (name, abbreviation)',
      )
      .single();
    if (groupErr) throwError(groupErr, 'createOrphanPlantGroup:insertGroup');

    const group = groupRow as unknown as PlantGroup;

    const { data: countRow, error: countErr } = await supabase
      .from('plant_audit_counts')
      .insert({
        audit_session_id: input.audit_session_id,
        plant_group_id: group.id,
        grow_room_id: input.grow_room_id,
        strain_id: input.strain_id,
        strain_name_snapshot: group.strains?.name ?? null,
        db_count_snapshot: 0,
        physical_count: input.plant_count,
        status: 'orphan_created',
        is_orphan: true,
        counted_by: user?.id ?? null,
        counted_at: new Date().toISOString(),
        notes: input.notes ?? null,
      })
      .select(COUNT_SELECT)
      .single();
    if (countErr) throwError(countErr, 'createOrphanPlantGroup:insertCount');

    return { group, count: countRow as unknown as PlantAuditCount };
  },

  async movePlantAuditSessionToReview(sessionId: string): Promise<PlantAuditSession> {
    const { data, error } = await supabase
      .from('plant_audit_sessions')
      .update({
        status: 'review',
        review_started_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select(SESSION_SELECT)
      .single();
    if (error) throwError(error, 'movePlantAuditSessionToReview');
    return data as unknown as PlantAuditSession;
  },

  async applyPlantAudit(sessionId: string): Promise<PlantAuditSummary> {
    const { data, error } = await supabase.rpc('fn_apply_plant_audit', {
      p_audit_id: sessionId,
    });
    if (error) throwError(error, 'applyPlantAudit');
    return data as unknown as PlantAuditSummary;
  },

  async abandonPlantAuditSession(sessionId: string, reason?: string): Promise<PlantAuditSession> {
    const { data, error } = await supabase
      .from('plant_audit_sessions')
      .update({
        status: 'abandoned',
        abandoned_at: new Date().toISOString(),
        notes: reason ?? null,
      })
      .eq('id', sessionId)
      .select(SESSION_SELECT)
      .single();
    if (error) throwError(error, 'abandonPlantAuditSession');
    return data as unknown as PlantAuditSession;
  },
};
