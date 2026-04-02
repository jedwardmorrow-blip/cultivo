import { supabase } from '@/lib/supabase';
import type {
  HarvestSession,
  BinningSession,
  BinningSessionStatus,
  BinEntry,
  CreateBinEntryInput,
  CreateBinningSessionInput,
} from '../types';
import { inventoryMovementService } from '@/services';
import {
  getProductStageIdFromProductName,
  getCategoryFromProductName,
} from '@/features/inventory/services/conversions.service';

function throwError(error: { message: string } | null, context: string): never {
  throw new Error(error?.message ?? `Unknown error in ${context}`);
}

const HARVEST_SESSION_SELECT = `
  id, plant_group_id, harvest_date, wet_weight_grams, waste_grams, plant_count_harvested,
  adjusted_weight_grams, adjustment_reason, batch_registry_id, grow_room_id,
  session_status, completed_at, completed_by, cancelled_at, cancelled_by, notes, created_at, created_by,
  plant_groups (
    strain_id, grow_room_id,
    strains (name, abbreviation),
    grow_rooms (room_code)
  ),
  grow_rooms (name, room_code),
  batch_registry (batch_number),
  harvest_weight_entries (
    destination,
    location_id,
    dry_rooms:dry_rooms!location_id (room_code)
  )
`;

const BINNING_SESSION_SELECT = `
  id, harvest_session_id, dry_room_id, batch_registry_id,
  dry_weight_grams, water_loss_grams, bin_date, session_status,
  completed_at, completed_by, cancelled_at, cancelled_by,
  notes, created_at, created_by,
  harvest_sessions (
    harvest_date, wet_weight_grams, adjusted_weight_grams,
    plant_groups (
      strains (name, abbreviation)
    )
  ),
  dry_rooms (name, room_code),
  batch_registry (batch_number)
`;

export const binningSessionsService = {
  async listBinningSessions(filter?: { status?: BinningSessionStatus }): Promise<BinningSession[]> {
    let query = supabase
      .from('binning_sessions')
      .select(BINNING_SESSION_SELECT);
    if (filter?.status) {
      query = query.eq('session_status', filter.status);
    }
    const { data, error } = await query.order('bin_date', { ascending: false });
    if (error) throwError(error, 'listBinningSessions');
    return data as unknown as BinningSession[];
  },

  async listHarvestSessionsByDryRoom(dryRoomId: string): Promise<HarvestSession[]> {
    const { data, error } = await supabase
      .from('harvest_sessions')
      .select(`${HARVEST_SESSION_SELECT}, harvest_weight_entries!inner(location_id, destination)`)
      .eq('harvest_weight_entries.location_id', dryRoomId)
      .eq('harvest_weight_entries.destination', 'flower')
      .in('session_status', ['completed', 'finalized'])
      .order('harvest_date', { ascending: false });
    if (error) throwError(error, 'listHarvestSessionsByDryRoom');
    return data as unknown as HarvestSession[];
  },

  async listDryingHarvests(): Promise<HarvestSession[]> {
    const [binnedResult, sessionsResult] = await Promise.all([
      supabase
        .from('binning_sessions')
        .select('harvest_session_id')
        .not('session_status', 'eq', 'cancelled'),
      supabase
        .from('harvest_sessions')
        .select(`${HARVEST_SESSION_SELECT}, harvest_weight_entries!inner(destination)`)
        .in('session_status', ['completed', 'finalized'])
        .eq('harvest_weight_entries.destination', 'flower')
        .order('harvest_date', { ascending: false }),
    ]);

    if (binnedResult.error) throwError(binnedResult.error, 'listDryingHarvests:getBinned');
    if (sessionsResult.error) throwError(sessionsResult.error, 'listDryingHarvests');

    const binnedIds = new Set(
      (binnedResult.data ?? []).map((r: { harvest_session_id: string }) => r.harvest_session_id)
    );

    return (sessionsResult.data as unknown as HarvestSession[]).filter((s) => !binnedIds.has(s.id));
  },

  async listUnbinnedHarvestSessions(): Promise<HarvestSession[]> {
    const [binnedResult, sessionsResult] = await Promise.all([
      supabase
        .from('binning_sessions')
        .select('harvest_session_id')
        .not('session_status', 'eq', 'cancelled'),
      supabase
        .from('harvest_sessions')
        .select(HARVEST_SESSION_SELECT)
        .in('session_status', ['completed', 'finalized'])
        .order('harvest_date', { ascending: false }),
    ]);

    if (binnedResult.error) throwError(binnedResult.error, 'listUnbinnedHarvestSessions:getBinned');
    if (sessionsResult.error) throwError(sessionsResult.error, 'listUnbinnedHarvestSessions');

    const binnedIds = new Set(
      (binnedResult.data ?? []).map((r: { harvest_session_id: string }) => r.harvest_session_id)
    );

    return (sessionsResult.data as unknown as HarvestSession[]).filter((s) => !binnedIds.has(s.id));
  },

  async createBinningSession(input: CreateBinningSessionInput): Promise<BinningSession> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('binning_sessions')
      .insert({ ...input, dry_weight_grams: input.dry_weight_grams ?? 0, session_status: 'active', created_by: user?.id ?? null })
      .select(BINNING_SESSION_SELECT)
      .single();
    if (error) throwError(error, 'createBinningSession');
    return data as unknown as BinningSession;
  },

  async completeBinningSession(id: string): Promise<BinningSession> {
    const entries = await binningSessionsService.listBinEntries(id);
    if (entries.length === 0) {
      throw new Error('Cannot complete binning session: no bin entries recorded.');
    }

    const totalDryWeight = entries.reduce((sum, e) => sum + Number(e.bin_weight_grams), 0);

    const { data: sessionRow } = await supabase
      .from('binning_sessions')
      .select('batch_registry_id, harvest_sessions(wet_weight_grams, adjusted_weight_grams, plant_groups(strains(name, abbreviation)))')
      .eq('id', id)
      .single();
    if (!sessionRow) throw new Error('Binning session not found');

    const harvest = sessionRow.harvest_sessions as { wet_weight_grams: number; adjusted_weight_grams: number | null; plant_groups: { strains: { name: string; abbreviation: string | null } } | null } | null;
    const wetWeight = harvest?.adjusted_weight_grams ?? harvest?.wet_weight_grams ?? 0;
    const waterLoss = Math.max(0, wetWeight - totalDryWeight);

    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('binning_sessions')
      .update({
        dry_weight_grams: totalDryWeight,
        water_loss_grams: waterLoss,
        session_status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user?.id ?? null,
      })
      .eq('id', id)
      .select(BINNING_SESSION_SELECT)
      .single();
    if (error) throwError(error, 'completeBinningSession');

    const session = data as unknown as BinningSession;
    const batchId = session.batch_registry_id;

    const { data: batchData, error: batchError } = await supabase
      .from('batch_registry')
      .select('batch_number, strain_id, strains(name)')
      .eq('id', batchId)
      .single();
    if (batchError || !batchData) throw new Error(`Batch not found: ${batchId}`);

    const strainName = (batchData.strains as { name: string } | null)?.name ?? 'Unknown';
    const productName = `Binned - ${strainName} - Flower`;

    const { generateNextPackageId } = await import('@/features/inventory/services/conversions.service');
    const inventoryStageId = await getProductStageIdFromProductName(productName);
    const inventoryCategory = getCategoryFromProductName(productName);
    const packageDate = new Date().toISOString().split('T')[0];

    for (const entry of entries) {
      const entryWeight = Number(entry.bin_weight_grams);
      const packageId = await generateNextPackageId(batchId);

      const inventoryRow = {
        package_id: packageId,
        batch_id: batchId,
        batch_number: batchData.batch_number,
        batch: batchData.batch_number,
        strain_id: batchData.strain_id,
        strain: strainName,
        product_stage_id: inventoryStageId,
        product_name: productName,
        category: inventoryCategory,
        net_weight: null as number | null,
        on_hand_qty: entryWeight,
        available_qty: entryWeight,
        reserved_qty: 0,
        unit: 'g',
        status: 'available',
        package_date: packageDate,
      };

      const { error: invError } = await supabase
        .from('inventory_items')
        .insert(inventoryRow);
      if (invError) throw new Error(`Failed to create inventory item: ${invError.message}`);

      const { data: invItem } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('package_id', packageId)
        .single();

      if (invItem) {
        await inventoryMovementService.recordMovement({
          movement_kind: 'PRODUCE',
          dest_item_id: invItem.id,
          qty: entryWeight,
          unit: 'g',
          reason_code: 'session_finalization',
          notes: `Binning entry ${entry.entry_order} of ${entries.length} — ${entryWeight}g`,
        });
      }
    }

    return session;
  },

  async addBinToCompletedSession(sessionId: string, binWeightGrams: number, notes?: string): Promise<BinEntry> {
    const { data: sessionRow } = await supabase
      .from('binning_sessions')
      .select('id, session_status, batch_registry_id, harvest_sessions(wet_weight_grams, adjusted_weight_grams, plant_groups(strains(name, abbreviation)))')
      .eq('id', sessionId)
      .single();
    if (!sessionRow) throw new Error('Binning session not found');
    if (sessionRow.session_status !== 'completed') throw new Error('Session must be completed to add post-completion bins');

    const entry = await binningSessionsService.createBinEntry({
      binning_session_id: sessionId,
      bin_weight_grams: binWeightGrams,
      notes: notes || undefined,
    });

    const batchId = sessionRow.batch_registry_id;
    const { data: batchData, error: batchError } = await supabase
      .from('batch_registry')
      .select('batch_number, strain_id, strains(name)')
      .eq('id', batchId)
      .single();
    if (batchError || !batchData) throw new Error(`Batch not found: ${batchId}`);

    const strainName = (batchData.strains as { name: string } | null)?.name ?? 'Unknown';
    const productName = `Binned - ${strainName} - Flower`;

    const { generateNextPackageId } = await import('@/features/inventory/services/conversions.service');
    const inventoryStageId = await getProductStageIdFromProductName(productName);
    const inventoryCategory = getCategoryFromProductName(productName);
    const packageDate = new Date().toISOString().split('T')[0];
    const entryWeight = Number(binWeightGrams);
    const packageId = await generateNextPackageId(batchId);

    const inventoryRow = {
      package_id: packageId,
      batch_id: batchId,
      batch_number: batchData.batch_number,
      batch: batchData.batch_number,
      strain_id: batchData.strain_id,
      strain: strainName,
      product_stage_id: inventoryStageId,
      product_name: productName,
      category: inventoryCategory,
      net_weight: null as number | null,
      on_hand_qty: entryWeight,
      available_qty: entryWeight,
      reserved_qty: 0,
      unit: 'g',
      status: 'available',
      package_date: packageDate,
    };

    const { error: invError } = await supabase
      .from('inventory_items')
      .insert(inventoryRow);
    if (invError) throw new Error(`Failed to create inventory item: ${invError.message}`);

    const { data: invItem } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('package_id', packageId)
      .single();

    if (invItem) {
      await inventoryMovementService.recordMovement({
        movement_kind: 'PRODUCE',
        dest_item_id: invItem.id,
        qty: entryWeight,
        unit: 'g',
        reason_code: 'session_finalization',
        notes: `Post-completion bin entry — ${entryWeight}g`,
      });
    }

    const allEntries = await binningSessionsService.listBinEntries(sessionId);
    const totalDryWeight = allEntries.reduce((sum, e) => sum + Number(e.bin_weight_grams), 0);
    const harvest = sessionRow.harvest_sessions as { wet_weight_grams: number; adjusted_weight_grams: number | null } | null;
    const wetWeight = harvest?.adjusted_weight_grams ?? harvest?.wet_weight_grams ?? 0;
    const waterLoss = Math.max(0, wetWeight - totalDryWeight);

    await supabase
      .from('binning_sessions')
      .update({ dry_weight_grams: totalDryWeight, water_loss_grams: waterLoss })
      .eq('id', sessionId);

    return entry;
  },

  async cancelBinningSession(id: string): Promise<BinningSession> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('binning_sessions')
      .update({ session_status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: user?.id ?? null })
      .eq('id', id)
      .select(BINNING_SESSION_SELECT)
      .single();
    if (error) throwError(error, 'cancelBinningSession');
    return data as unknown as BinningSession;
  },

  async listBinEntries(binningSessionId: string): Promise<BinEntry[]> {
    const { data, error } = await supabase
      .from('bin_entries')
      .select('id, binning_session_id, bin_weight_grams, entry_order, notes, created_at, created_by')
      .eq('binning_session_id', binningSessionId)
      .order('entry_order');
    if (error) throwError(error, 'listBinEntries');
    return data as BinEntry[];
  },

  async createBinEntry(input: CreateBinEntryInput): Promise<BinEntry> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: existing } = await supabase
      .from('bin_entries')
      .select('entry_order')
      .eq('binning_session_id', input.binning_session_id)
      .order('entry_order', { ascending: false })
      .limit(1);
    const nextOrder = input.entry_order ?? ((existing?.[0] as { entry_order: number } | undefined)?.entry_order ?? 0) + 1;

    const { data, error } = await supabase
      .from('bin_entries')
      .insert({
        binning_session_id: input.binning_session_id,
        bin_weight_grams: input.bin_weight_grams,
        entry_order: nextOrder,
        notes: input.notes ?? null,
        created_by: user?.id ?? null,
      })
      .select('id, binning_session_id, bin_weight_grams, entry_order, notes, created_at, created_by')
      .single();
    if (error) throwError(error, 'createBinEntry');
    return data as BinEntry;
  },

  async deleteBinEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('bin_entries')
      .delete()
      .eq('id', id);
    if (error) throwError(error, 'deleteBinEntry');
  },
};
