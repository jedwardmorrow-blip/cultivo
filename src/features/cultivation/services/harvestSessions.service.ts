import { supabase } from '@/lib/supabase';
import type {
  HarvestSession,
  HarvestWeightEntry,
  HarvestSessionStatus,
  CreateHarvestSessionInput,
  CreateHarvestWeightEntryInput,
  FreshFrozenPackage,
  CreateFreshFrozenPackageInput,
} from '../types';

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

export const harvestSessionsService = {
  async listHarvestSessions(filter?: { status?: HarvestSessionStatus }): Promise<HarvestSession[]> {
    let query = supabase.from('harvest_sessions').select(HARVEST_SESSION_SELECT);
    if (filter?.status) {
      query = query.eq('session_status', filter.status);
    }
    const { data, error } = await query.order('harvest_date', { ascending: false });
    if (error) throwError(error, 'listHarvestSessions');
    return data as unknown as HarvestSession[];
  },

  async createHarvestSession(input: CreateHarvestSessionInput): Promise<HarvestSession> {
    const { data, error } = await supabase
      .from('harvest_sessions')
      .insert({ ...input, session_status: 'active' })
      .select(HARVEST_SESSION_SELECT)
      .single();
    if (error) throwError(error, 'createHarvestSession');
    return data as unknown as HarvestSession;
  },

  async completeHarvestSession(id: string): Promise<HarvestSession> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('harvest_sessions')
      .update({ session_status: 'completed', completed_by: user?.id ?? null })
      .eq('id', id)
      .select(HARVEST_SESSION_SELECT)
      .single();
    if (error) throwError(error, 'completeHarvestSession');
    return data as unknown as HarvestSession;
  },

  async cancelHarvestSession(id: string): Promise<HarvestSession> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('harvest_sessions')
      .update({ session_status: 'cancelled', cancelled_by: user?.id ?? null })
      .eq('id', id)
      .select(HARVEST_SESSION_SELECT)
      .single();
    if (error) throwError(error, 'cancelHarvestSession');
    return data as unknown as HarvestSession;
  },

  async adjustHarvestWeight(id: string, adjustedWeight: number, reason: string): Promise<HarvestSession> {
    const { data, error } = await supabase
      .from('harvest_sessions')
      .update({ adjusted_weight_grams: adjustedWeight, adjustment_reason: reason })
      .eq('id', id)
      .select(HARVEST_SESSION_SELECT)
      .single();
    if (error) throwError(error, 'adjustHarvestWeight');
    return data as unknown as HarvestSession;
  },

  async listHarvestWeightEntries(harvestSessionId: string): Promise<HarvestWeightEntry[]> {
    const { data, error } = await supabase
      .from('harvest_weight_entries')
      .select('id, harvest_session_id, weight_grams, plant_count, entry_order, destination, location_id, notes, created_at, created_by')
      .eq('harvest_session_id', harvestSessionId)
      .order('entry_order');
    if (error) throwError(error, 'listHarvestWeightEntries');
    return data as HarvestWeightEntry[];
  },

  async createHarvestWeightEntry(input: CreateHarvestWeightEntryInput): Promise<HarvestWeightEntry> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: existing } = await supabase
      .from('harvest_weight_entries')
      .select('entry_order')
      .eq('harvest_session_id', input.harvest_session_id)
      .order('entry_order', { ascending: false })
      .limit(1);
    const nextOrder = input.entry_order ?? ((existing?.[0] as { entry_order: number } | undefined)?.entry_order ?? 0) + 1;

    const { data, error } = await supabase
      .from('harvest_weight_entries')
      .insert({
        harvest_session_id: input.harvest_session_id,
        weight_grams: input.weight_grams,
        plant_count: input.plant_count,
        entry_order: nextOrder,
        destination: input.destination ?? null,
        location_id: input.location_id ?? null,
        notes: input.notes ?? null,
        created_by: user?.id ?? null,
      })
      .select('id, harvest_session_id, weight_grams, plant_count, entry_order, destination, location_id, notes, created_at, created_by')
      .single();
    if (error) throwError(error, 'createHarvestWeightEntry');
    return data as HarvestWeightEntry;
  },

  async updateHarvestWeightEntry(id: string, updates: Partial<Pick<HarvestWeightEntry, 'weight_grams' | 'plant_count' | 'destination' | 'notes'>>): Promise<HarvestWeightEntry> {
    const { data, error } = await supabase
      .from('harvest_weight_entries')
      .update(updates)
      .eq('id', id)
      .select('id, harvest_session_id, weight_grams, plant_count, entry_order, destination, location_id, notes, created_at, created_by')
      .single();
    if (error) throwError(error, 'updateHarvestWeightEntry');
    return data as HarvestWeightEntry;
  },

  async deleteHarvestWeightEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('harvest_weight_entries')
      .delete()
      .eq('id', id);
    if (error) throwError(error, 'deleteHarvestWeightEntry');
  },

  async finalizeHarvest(id: string, dryRoomId: string | null): Promise<HarvestSession> {
    const entries = await harvestSessionsService.listHarvestWeightEntries(id);
    if (entries.length === 0) {
      throw new Error('Cannot finalize harvest: no weight entries recorded.');
    }

    const totalWeight = entries.reduce((sum, e) => sum + Number(e.weight_grams), 0);
    const totalPlants = entries.reduce((sum, e) => sum + e.plant_count, 0);

    if (dryRoomId) {
      await supabase
        .from('harvest_weight_entries')
        .update({ location_id: dryRoomId })
        .eq('harvest_session_id', id)
        .eq('destination', 'flower');
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('harvest_sessions')
      .update({
        wet_weight_grams: totalWeight,
        plant_count_harvested: totalPlants,
        session_status: 'finalized',
        completed_by: user?.id ?? null,
      })
      .eq('id', id)
      .select(HARVEST_SESSION_SELECT)
      .single();
    if (error) throwError(error, 'finalizeHarvest');

    const session = data as unknown as HarvestSession;

    // Auto-create fresh_frozen_packages for entries with destination='fresh_frozen'
    const frozenEntries = entries.filter((e) => e.destination === 'fresh_frozen');
    if (frozenEntries.length > 0 && session.batch_registry_id) {
      const frozenWeight = frozenEntries.reduce((sum, e) => sum + Number(e.weight_grams), 0);
      // Get strain_id from the plant_group relation
      const strainId = (session as any).plant_groups?.strain_id ?? null;

      // Determine next package_number for this batch
      const { data: existing } = await supabase
        .from('fresh_frozen_packages')
        .select('package_number')
        .eq('batch_id', session.batch_registry_id)
        .order('package_number', { ascending: false })
        .limit(1);
      const nextPackageNumber = (existing?.[0]?.package_number ?? 0) + 1;

      const input: CreateFreshFrozenPackageInput = {
        batch_id: session.batch_registry_id,
        weight_grams: frozenWeight,
        strain_id: strainId,
        package_number: nextPackageNumber,
        frozen_at: new Date().toISOString(),
      };

      const { error: ffError } = await supabase
        .from('fresh_frozen_packages')
        .insert(input);
      if (ffError) {
        console.error('Failed to create fresh frozen package:', ffError);
        // Non-fatal: harvest is already finalized, log but don't throw
      }
    }

    // --- Post-finalization side effects ---
    // A) Transition all plant groups for this batch in this room to 'harvested'
    if (session.grow_room_id && session.batch_registry_id) {
      const { error: pgError } = await supabase
        .from('plant_groups')
        .update({
          growth_stage: 'harvested',
          stage_entered_at: new Date().toISOString(),
        })
        .eq('grow_room_id', session.grow_room_id)
        .eq('batch_registry_id', session.batch_registry_id)
        .neq('growth_stage', 'harvested');
      if (pgError) {
        console.error('Failed to transition plant groups to harvested:', pgError);
      }
    }

    // B) Advance batch lifecycle: flower → drying (only if currently in flower)
    if (session.batch_registry_id) {
      const hasFlowerEntries = entries.some((e) => e.destination === 'flower');
      const hasFrozenOnly = !hasFlowerEntries && frozenEntries.length > 0;

      const batchUpdate: Record<string, unknown> = {
        harvest_date: session.harvest_date,
      };

      if (hasFrozenOnly) {
        // All material went to fresh frozen — skip drying, go to fresh_frozen
        batchUpdate.lifecycle_state = 'fresh_frozen';
        batchUpdate.production_path = 'ff_lab';
        batchUpdate.fresh_frozen_at = new Date().toISOString();
      } else {
        // Standard flower path — goes to drying
        batchUpdate.lifecycle_state = 'drying';
        batchUpdate.production_path = 'flower';
        batchUpdate.drying_started_at = new Date().toISOString();
      }

      const { error: brError } = await supabase
        .from('batch_registry')
        .update(batchUpdate)
        .eq('id', session.batch_registry_id)
        .eq('lifecycle_state', 'flower');
      if (brError) {
        console.error('Failed to advance batch lifecycle:', brError);
      }
    }

    return session;
  },

  async listFreshFrozenPackages(batchId: string): Promise<FreshFrozenPackage[]> {
    const { data, error } = await supabase
      .from('fresh_frozen_packages')
      .select('*, strains (name, abbreviation)')
      .eq('batch_id', batchId)
      .order('package_number');
    if (error) throwError(error, 'listFreshFrozenPackages');
    return data as unknown as FreshFrozenPackage[];
  },

  async updateFreshFrozenPackage(id: string, updates: Partial<Pick<FreshFrozenPackage, 'weight_grams' | 'freezer_location' | 'vacuum_sealed_at' | 'frozen_at' | 'notes' | 'status'>>): Promise<FreshFrozenPackage> {
    const { data, error } = await supabase
      .from('fresh_frozen_packages')
      .update(updates)
      .eq('id', id)
      .select('*, strains (name, abbreviation)')
      .single();
    if (error) throwError(error, 'updateFreshFrozenPackage');
    return data as unknown as FreshFrozenPackage;
  },
};
