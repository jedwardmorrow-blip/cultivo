import { supabase } from '@/lib/supabase';

function throwError(error: { message: string } | null, context: string): never {
  throw new Error(error?.message ?? `Unknown error in ${context}`);
}

// ── Types ────────────────────────────────────────────────────────────

export type AuditStatus =
  | 'initiated'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'applied'
  | 'cancelled'
  | 'abandoned';

export type LineStatus = 'pending' | 'match' | 'variance' | 'not_found' | 'orphan';

export type VarianceReason =
  | 'moisture_loss'
  | 'spillage'
  | 'measurement_error'
  | 'waste'
  | 'theft_loss'
  | 'other'
  | 'qc_sampling'
  | 'coa_sampling'
  | 'processing_loss'
  | 'count_error'
  | 'data_entry_error'
  | 'moved_not_tracked'
  | 'damage_disposal'
  | 'not_found'
  | 'orphan_reconciled';

export interface AuditSession {
  id: string;
  audit_number: string;
  status: AuditStatus;
  selected_stages: string[];
  room_scope: string[] | null;
  notes: string | null;
  total_packages: number | null;
  packages_with_variance: number | null;
  total_variance_amount: number | null;
  is_locked: boolean | null;
  initiated_by: string | null;
  initiated_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  applied_at: string | null;
  applied_by: string | null;
  abandoned_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  summary: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AuditLine {
  id: string;
  audit_id: string;
  inventory_item_id: string | null;
  package_id: string;
  product_name: string;
  strain: string | null;
  batch: string | null;
  room: string | null;
  stage: string;
  expected_qty: number;
  unit: string;
  actual_qty: number | null;
  variance_qty: number | null;
  variance_percentage: number | null;
  variance_reason: VarianceReason | null;
  variance_notes: string | null;
  confirmed: boolean;
  confirmed_at: string | null;
  line_order: number | null;
  line_status: LineStatus;
  is_orphan: boolean;
  counted_by: string | null;
  counted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AuditSessionWithLines extends AuditSession {
  lines: AuditLine[];
}

export interface AuditApplySummary {
  total_lines: number;
  matches: number;
  variances: number;
  not_found: number;
  orphans: number;
  movements_written: number;
  variances_logged: number;
  net_variance_qty: number;
  applied_at: string;
  applied_by: string;
}

export interface StartAuditInput {
  selected_stages: string[];
  room_scope?: string[];
  notes?: string | null;
}

// ── Select constants ────────────────────────────────────────────────

const SESSION_SELECT = `
  id, audit_number, status, selected_stages, room_scope, notes,
  total_packages, packages_with_variance, total_variance_amount,
  is_locked, initiated_by, initiated_at,
  completed_at, completed_by, applied_at, applied_by,
  abandoned_at, cancelled_at, cancellation_reason,
  summary, created_at, updated_at
`;

const LINE_SELECT = `
  id, audit_id, inventory_item_id, package_id, product_name,
  strain, batch, room, stage, expected_qty, unit,
  actual_qty, variance_qty, variance_percentage,
  variance_reason, variance_notes,
  confirmed, confirmed_at, line_order,
  line_status, is_orphan, counted_by, counted_at,
  created_at, updated_at
`;

// ── Service ─────────────────────────────────────────────────────────

export const auditService = {
  async listSessions(opts?: {
    status?: 'active' | 'all' | AuditStatus;
  }): Promise<AuditSession[]> {
    let query = supabase
      .from('inventory_audits')
      .select(SESSION_SELECT)
      .order('initiated_at', { ascending: false })
      .limit(50);

    if (opts?.status === 'active') {
      query = query.in('status', ['initiated', 'in_progress', 'review']);
    } else if (opts?.status && opts.status !== 'all') {
      query = query.eq('status', opts.status);
    }

    const { data, error } = await query;
    if (error) throwError(error, 'listSessions');
    return (data ?? []) as unknown as AuditSession[];
  },

  async getSession(id: string): Promise<AuditSessionWithLines> {
    const { data: session, error: sessErr } = await supabase
      .from('inventory_audits')
      .select(SESSION_SELECT)
      .eq('id', id)
      .single();
    if (sessErr) throwError(sessErr, 'getSession:session');

    const { data: lines, error: lineErr } = await supabase
      .from('inventory_audit_lines')
      .select(LINE_SELECT)
      .eq('audit_id', id)
      .order('line_order', { ascending: true, nullsFirst: false })
      .order('product_name', { ascending: true });
    if (lineErr) throwError(lineErr, 'getSession:lines');

    return {
      ...(session as unknown as AuditSession),
      lines: (lines ?? []) as unknown as AuditLine[],
    };
  },

  /**
   * Creates an audit session and pre-seeds lines by snapshotting every
   * inventory_item that matches the selected stages (and optional room scope).
   */
  async startAudit(input: StartAuditInput): Promise<AuditSessionWithLines> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: numberResult, error: numberErr } = await supabase.rpc('fn_generate_audit_number');
    if (numberErr) throwError(numberErr, 'startAudit:generateNumber');
    const auditNumber = numberResult as string;

    const { data: sessionRow, error: sessErr } = await supabase
      .from('inventory_audits')
      .insert({
        audit_number: auditNumber,
        selected_stages: input.selected_stages,
        room_scope: input.room_scope?.length ? input.room_scope : null,
        initiated_by: user?.id ?? null,
        notes: input.notes ?? null,
        status: 'in_progress',
      })
      .select(SESSION_SELECT)
      .single();
    if (sessErr) throwError(sessErr, 'startAudit:insertSession');
    const session = sessionRow as unknown as AuditSession;

    // Snapshot inventory_items matching selected stages + optional room scope.
    // Stage lives in product_stages.name, linked via product_stage_id.
    let itemsQuery = supabase
      .from('inventory_items')
      .select(`
        id, package_id, product_name, strain, batch, room, unit, on_hand_qty,
        product_stages ( name )
      `)
      .gt('on_hand_qty', 0);

    if (input.room_scope?.length) {
      itemsQuery = itemsQuery.in('room', input.room_scope);
    }

    const { data: items, error: itemErr } = await itemsQuery;
    if (itemErr) throwError(itemErr, 'startAudit:loadItems');

    type SnapshotItem = {
      id: string;
      package_id: string;
      product_name: string;
      strain: string | null;
      batch: string | null;
      room: string | null;
      unit: string;
      on_hand_qty: number;
      product_stages: { name: string } | null;
    };

    const allItems = (items as unknown as SnapshotItem[] | null) ?? [];

    // Filter to only items whose stage matches selected_stages
    const stageSet = new Set(input.selected_stages.map((s) => s.toLowerCase()));
    const scopedItems = allItems.filter((item) => {
      const stageName = item.product_stages?.name?.toLowerCase();
      return stageName && stageSet.has(stageName);
    });

    if (scopedItems.length > 0) {
      const lineRows = scopedItems.map((item, idx) => ({
        audit_id: session.id,
        inventory_item_id: item.id,
        package_id: item.package_id,
        product_name: item.product_name,
        strain: item.strain,
        batch: item.batch,
        room: item.room,
        stage: item.product_stages?.name ?? 'Unknown',
        expected_qty: item.on_hand_qty,
        unit: item.unit,
        line_order: idx + 1,
        line_status: 'pending',
        is_orphan: false,
      }));

      const { error: seedErr } = await supabase
        .from('inventory_audit_lines')
        .insert(lineRows);
      if (seedErr) throwError(seedErr, 'startAudit:preseed');
    }

    return auditService.getSession(session.id);
  },

  /**
   * Records actual_qty for a line. Computes variance and sets line_status.
   * - actual === expected → match
   * - actual !== expected → variance
   */
  async recordCount(
    lineId: string,
    actualQty: number,
    opts?: { variance_reason?: VarianceReason; variance_notes?: string },
  ): Promise<AuditLine> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: existing, error: readErr } = await supabase
      .from('inventory_audit_lines')
      .select('expected_qty')
      .eq('id', lineId)
      .single();
    if (readErr) throwError(readErr, 'recordCount:read');

    const expected = Number((existing as { expected_qty: number }).expected_qty);
    const lineStatus: LineStatus = actualQty === expected ? 'match' : 'variance';

    // variance_qty and variance_percentage are GENERATED ALWAYS columns —
    // Postgres computes them from actual_qty and expected_qty automatically.
    const { data, error } = await supabase
      .from('inventory_audit_lines')
      .update({
        actual_qty: actualQty,
        line_status: lineStatus,
        variance_reason: lineStatus === 'variance' ? (opts?.variance_reason ?? null) : null,
        variance_notes: opts?.variance_notes ?? null,
        counted_by: user?.id ?? null,
        counted_at: new Date().toISOString(),
      })
      .eq('id', lineId)
      .select(LINE_SELECT)
      .single();
    if (error) throwError(error, 'recordCount:update');
    return data as unknown as AuditLine;
  },

  async markNotFound(
    lineId: string,
    opts?: { variance_notes?: string },
  ): Promise<AuditLine> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('inventory_audit_lines')
      .update({
        actual_qty: 0,
        line_status: 'not_found',
        variance_reason: 'not_found' as VarianceReason,
        variance_notes: opts?.variance_notes ?? null,
        counted_by: user?.id ?? null,
        counted_at: new Date().toISOString(),
      })
      .eq('id', lineId)
      .select(LINE_SELECT)
      .single();
    if (error) throwError(error, 'markNotFound');
    return data as unknown as AuditLine;
  },

  async resetLine(lineId: string): Promise<AuditLine> {
    // variance_qty and variance_percentage are GENERATED ALWAYS columns —
    // they reset automatically when actual_qty is set to null.
    const { data, error } = await supabase
      .from('inventory_audit_lines')
      .update({
        actual_qty: null,
        variance_reason: null,
        variance_notes: null,
        line_status: 'pending',
        counted_by: null,
        counted_at: null,
        confirmed: false,
        confirmed_at: null,
      })
      .eq('id', lineId)
      .select(LINE_SELECT)
      .single();
    if (error) throwError(error, 'resetLine');
    return data as unknown as AuditLine;
  },

  /**
   * Creates an orphan line for a package found physically but not in the system.
   * The caller must also create the inventory_item if it doesn't exist yet.
   */
  async createOrphanLine(
    auditId: string,
    item: {
      inventory_item_id?: string;
      package_id: string;
      product_name: string;
      strain?: string;
      batch?: string;
      room?: string;
      stage: string;
      actual_qty: number;
      unit: string;
      notes?: string;
    },
  ): Promise<AuditLine> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('inventory_audit_lines')
      .insert({
        audit_id: auditId,
        inventory_item_id: item.inventory_item_id ?? null,
        package_id: item.package_id,
        product_name: item.product_name,
        strain: item.strain ?? null,
        batch: item.batch ?? null,
        room: item.room ?? null,
        stage: item.stage,
        expected_qty: 0,
        actual_qty: item.actual_qty,
        variance_reason: 'orphan_reconciled' as VarianceReason,
        variance_notes: item.notes ?? null,
        unit: item.unit,
        line_status: 'orphan',
        is_orphan: true,
        counted_by: user?.id ?? null,
        counted_at: new Date().toISOString(),
      })
      .select(LINE_SELECT)
      .single();
    if (error) throwError(error, 'createOrphanLine');
    return data as unknown as AuditLine;
  },

  /**
   * Deletes an orphan line. Only works on lines where is_orphan = true.
   */
  async deleteOrphanLine(lineId: string): Promise<void> {
    const { error } = await supabase
      .from('inventory_audit_lines')
      .delete()
      .eq('id', lineId)
      .eq('is_orphan', true);
    if (error) throwError(error, 'deleteOrphanLine');
  },

  /**
   * Returns stages currently being audited by active sessions, with the audit number.
   */
  async getLockedStages(): Promise<Map<string, string>> {
    const { data, error } = await supabase
      .from('inventory_audits')
      .select('audit_number, selected_stages')
      .in('status', ['initiated', 'in_progress', 'review']);
    if (error) throwError(error, 'getLockedStages');
    const map = new Map<string, string>();
    for (const row of (data ?? []) as { audit_number: string; selected_stages: string[] }[]) {
      for (const stage of row.selected_stages) {
        map.set(stage, row.audit_number);
      }
    }
    return map;
  },

  async moveToReview(sessionId: string): Promise<AuditSession> {
    const { data, error } = await supabase
      .from('inventory_audits')
      .update({
        status: 'review' as AuditStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select(SESSION_SELECT)
      .single();
    if (error) throwError(error, 'moveToReview');
    return data as unknown as AuditSession;
  },

  async applyAudit(sessionId: string): Promise<AuditApplySummary> {
    const { data, error } = await supabase.rpc('fn_apply_audit_adjustments', {
      p_audit_id: sessionId,
    });
    if (error) throwError(error, 'applyAudit');
    return data as unknown as AuditApplySummary;
  },

  async abandonAudit(sessionId: string, reason?: string): Promise<AuditSession> {
    const { data, error } = await supabase
      .from('inventory_audits')
      .update({
        status: 'abandoned' as AuditStatus,
        abandoned_at: new Date().toISOString(),
        notes: reason ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select(SESSION_SELECT)
      .single();
    if (error) throwError(error, 'abandonAudit');
    return data as unknown as AuditSession;
  },
};
