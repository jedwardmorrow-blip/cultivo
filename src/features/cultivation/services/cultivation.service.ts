import { supabase } from '@/lib/supabase';
import type {
  GrowRoom,
  PlantGroup,
  PlantGroupStageHistory,
  PlantGroupRoomHistory,
  PlantGroupCutSession,
  HarvestSession,
  HarvestWeightEntry,
  GrowthStage,
  HarvestSessionStatus,
  CreateGrowRoomInput,
  UpdateGrowRoomInput,
  CreatePlantGroupInput,
  CreatePlantGroupCutSessionInput,
  CreateHarvestSessionInput,
  CreateHarvestWeightEntryInput,
  RoomTable,
  RoomSection,
  UpdateRoomSectionInput,
  CreateRoomTableInput,
  UpdateRoomTableInput,
  CreateRoomSectionInput,
  UpdatePlantGroupPlacementInput,
  FlipRoomInput,
  DryRoom,
  BinningSession,
  BinningSessionStatus,
  BinEntry,
  CreateBinEntryInput,
  CreateDryRoomInput,
  UpdateDryRoomInput,
  CreateBinningSessionInput,
  IndividualPlant,
  AddIndividualPlantInput,
  BulkImportPlantResult,
  FreshFrozenPackage,
} from '../types';
import { inventoryMovementService } from '@/services';
import {
  getProductStageIdFromProductName,
  getCategoryFromProductName,
} from '@/features/inventory/services/conversions.service';

const CUT_SESSION_SELECT = `
  id, plant_group_id, mother_plant_group_id, cut_count, cut_date, notes, created_at, created_by,
  mother_group:plant_groups!mother_plant_group_id (
    id, growth_stage,
    strains (name, abbreviation),
    batch_registry (batch_number),
    individual_plants (state_plant_id, is_active)
  )
`;

const PLANT_GROUP_SELECT = `
  id, name, strain_id, grow_room_id, mother_plant_group_id,
  room_table_id, room_section_id, batch_registry_id,
  source_type, is_mother, plant_count, growth_stage, stage_entered_at, planted_date,
  notes, created_at, created_by, updated_at,
  strains (name, abbreviation),
  grow_rooms (name, room_code),
  mother_group:plant_groups!mother_plant_group_id (id, growth_stage, batch_registry (batch_number), individual_plants (state_plant_id, is_active)),
  room_tables (table_number, table_name),
  room_sections (section_label),
  batch_registry (batch_number, clone_date),
  cut_sessions:plant_group_cut_sessions!plant_group_id (${CUT_SESSION_SELECT})
`;

const PLANT_GROUP_SUMMARY_SELECT = `
  id, name, strain_id, grow_room_id, mother_plant_group_id,
  room_table_id, room_section_id, batch_registry_id,
  source_type, is_mother, plant_count, growth_stage, stage_entered_at, planted_date,
  notes, created_at, created_by, updated_at,
  strains (name, abbreviation),
  grow_rooms (name, room_code),
  mother_group:plant_groups!mother_plant_group_id (id, growth_stage, batch_registry (batch_number), individual_plants (state_plant_id, is_active)),
  room_tables (table_number, table_name),
  room_sections (section_label),
  batch_registry (batch_number, clone_date),
  individual_plants (state_plant_id, is_active)
`;

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
    dry_rooms!location_id (room_code)
  )
`;

const ROOM_SECTION_SELECT = 'id, room_table_id, section_label, section_sqft, is_active, created_at, created_by, flip_date, projected_harvest_date';

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

function throwError(error: { message: string } | null, context: string): never {
  throw new Error(error?.message ?? `Unknown error in ${context}`);
}

export const cultivationService = {
  async listGrowRooms(): Promise<GrowRoom[]> {
    const { data, error } = await supabase
      .from('grow_rooms')
      .select('*')
      .order('room_code');
    if (error) throwError(error, 'listGrowRooms');
    return data as GrowRoom[];
  },

  async createGrowRoom(input: CreateGrowRoomInput): Promise<GrowRoom> {
    const { data, error } = await supabase
      .from('grow_rooms')
      .insert({ ...input, is_active: true })
      .select()
      .single();
    if (error) throwError(error, 'createGrowRoom');
    return data as GrowRoom;
  },

  async updateGrowRoom(id: string, input: UpdateGrowRoomInput): Promise<GrowRoom> {
    const { data, error } = await supabase
      .from('grow_rooms')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throwError(error, 'updateGrowRoom');
    return data as GrowRoom;
  },

  async archiveGrowRoom(id: string): Promise<GrowRoom> {
    return cultivationService.updateGrowRoom(id, { is_active: false });
  },

  async listRoomTables(growRoomId: string, opts?: { includeArchived?: boolean }): Promise<RoomTable[]> {
    let query = supabase
      .from('room_tables')
      .select(`
        id, grow_room_id, table_number, table_name, total_sqft, is_active, created_at, created_by,
        sections:room_sections (
          ${ROOM_SECTION_SELECT}
        )
      `)
      .eq('grow_room_id', growRoomId)
      .order('table_number');

    if (!opts?.includeArchived) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throwError(error, 'listRoomTables');

    const tables = (data as unknown as RoomTable[]).map((t) => ({
      ...t,
      sections: (t.sections ?? [])
        .filter((s: RoomSection) => opts?.includeArchived ? true : s.is_active)
        .sort((a: RoomSection, b: RoomSection) => a.section_label.localeCompare(b.section_label)),
    }));
    return tables;
  },

  async createRoomTable(input: CreateRoomTableInput): Promise<RoomTable> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('room_tables')
      .insert({ ...input, is_active: true, created_by: user?.id ?? null })
      .select('id, grow_room_id, table_number, table_name, total_sqft, is_active, created_at, created_by')
      .single();
    if (error) throwError(error, 'createRoomTable');
    return { ...(data as unknown as RoomTable), sections: [] };
  },

  async updateRoomTable(id: string, input: UpdateRoomTableInput): Promise<RoomTable> {
    const { data, error } = await supabase
      .from('room_tables')
      .update(input)
      .eq('id', id)
      .select('id, grow_room_id, table_number, table_name, total_sqft, is_active, created_at, created_by')
      .single();
    if (error) throwError(error, 'updateRoomTable');
    return { ...(data as unknown as RoomTable), sections: [] };
  },

  async archiveRoomTable(id: string): Promise<RoomTable> {
    return cultivationService.updateRoomTable(id, { is_active: false });
  },

  async createRoomSection(input: CreateRoomSectionInput): Promise<RoomSection> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('room_sections')
      .insert({ ...input, is_active: true, created_by: user?.id ?? null })
      .select(ROOM_SECTION_SELECT)
      .single();
    if (error) throwError(error, 'createRoomSection');
    return data as unknown as RoomSection;
  },

  async updateRoomSection(id: string, input: UpdateRoomSectionInput): Promise<RoomSection> {
    const { data, error } = await supabase
      .from('room_sections')
      .update(input)
      .eq('id', id)
      .select(ROOM_SECTION_SELECT)
      .single();
    if (error) throwError(error, 'updateRoomSection');
    return data as unknown as RoomSection;
  },

  async archiveRoomSection(id: string): Promise<RoomSection> {
    return cultivationService.updateRoomSection(id, { is_active: false });
  },

  async flipRoom(input: FlipRoomInput): Promise<void> {
    const { grow_room_id, flip_date, projected_harvest_date } = input;

    const { data: tables, error: tableErr } = await supabase
      .from('room_tables')
      .select('id')
      .eq('grow_room_id', grow_room_id)
      .eq('is_active', true);
    if (tableErr) throwError(tableErr, 'flipRoom:listTables');

    if (tables && tables.length > 0) {
      const tableIds = tables.map((t: { id: string }) => t.id);
      const sectionUpdate: Record<string, string> = { flip_date };
      if (projected_harvest_date) {
        sectionUpdate.projected_harvest_date = projected_harvest_date;
      }
      const { error: sectionErr } = await supabase
        .from('room_sections')
        .update(sectionUpdate)
        .in('room_table_id', tableIds)
        .eq('is_active', true);
      if (sectionErr) throwError(sectionErr, 'flipRoom:updateSections');
    }

    const { data: groups, error: groupErr } = await supabase
      .from('plant_groups')
      .select('id, growth_stage')
      .eq('grow_room_id', grow_room_id)
      .not('growth_stage', 'in', '("flower","harvested")');
    if (groupErr) throwError(groupErr, 'flipRoom:listGroups');

    if (groups && groups.length > 0) {
      for (const group of groups as Array<{ id: string; growth_stage: string }>) {
        const { error: advErr } = await supabase
          .from('plant_groups')
          .update({ growth_stage: 'flower' })
          .eq('id', group.id);
        if (advErr) throwError(advErr, `flipRoom:advanceGroup:${group.id}`);
      }
    }
  },

  async listPlantGroups(filter?: { stage?: GrowthStage | 'active' }): Promise<PlantGroup[]> {
    let query = supabase.from('plant_groups').select(PLANT_GROUP_SUMMARY_SELECT);

    if (filter?.stage === 'active') {
      query = query.not('growth_stage', 'eq', 'harvested');
    } else if (filter?.stage) {
      query = query.eq('growth_stage', filter.stage);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throwError(error, 'listPlantGroups');
    return data as unknown as PlantGroup[];
  },

  async listPlantGroupsByRoom(growRoomId: string): Promise<PlantGroup[]> {
    const { data, error } = await supabase
      .from('plant_groups')
      .select(PLANT_GROUP_SUMMARY_SELECT)
      .eq('grow_room_id', growRoomId)
      .order('created_at', { ascending: false });
    if (error) throwError(error, 'listPlantGroupsByRoom');
    return data as unknown as PlantGroup[];
  },

  async getPlantGroup(id: string): Promise<PlantGroup> {
    const { data, error } = await supabase
      .from('plant_groups')
      .select(PLANT_GROUP_SELECT)
      .eq('id', id)
      .single();
    if (error) throwError(error, 'getPlantGroup');
    return data as unknown as PlantGroup;
  },

  async createPlantGroup(input: CreatePlantGroupInput): Promise<PlantGroup> {
    const { data: { user } } = await supabase.auth.getUser();
    const { cut_sessions, ...groupFields } = input;

    const primaryMotherId = cut_sessions && cut_sessions.length > 0
      ? cut_sessions[0].mother_plant_group_id
      : groupFields.mother_plant_group_id;

    const { data, error } = await supabase
      .from('plant_groups')
      .insert({
        ...groupFields,
        growth_stage: 'clone',
        is_mother: groupFields.is_mother ?? false,
        source_type: groupFields.source_type ?? 'clone',
        mother_plant_group_id: primaryMotherId ?? null,
      })
      .select(PLANT_GROUP_SELECT)
      .single();
    if (error) throwError(error, 'createPlantGroup');

    const group = data as unknown as PlantGroup;

    if (cut_sessions && cut_sessions.length > 0) {
      const rows = cut_sessions.map((cs) => ({
        plant_group_id: group.id,
        mother_plant_group_id: cs.mother_plant_group_id,
        cut_count: cs.cut_count,
        cut_date: cs.cut_date ?? null,
        notes: cs.notes ?? null,
        created_by: user?.id ?? null,
      }));
      const { error: csErr } = await supabase.from('plant_group_cut_sessions').insert(rows);
      if (csErr) throwError(csErr, 'createPlantGroup:cut_sessions');

      if (group.batch_registry_id) {
        const motherIds = cut_sessions.map((cs) => cs.mother_plant_group_id);
        await supabase
          .from('batch_registry')
          .update({ mother_plant_group_ids: motherIds })
          .eq('id', group.batch_registry_id);
      }
    }

    return group;
  },

  async advanceStage(id: string, toStage: GrowthStage): Promise<PlantGroup> {
    const { data, error } = await supabase
      .from('plant_groups')
      .update({ growth_stage: toStage })
      .eq('id', id)
      .select(PLANT_GROUP_SELECT)
      .single();
    if (error) throwError(error, 'advanceStage');
    return data as unknown as PlantGroup;
  },

  async moveToRoom(id: string, toRoomId: string): Promise<PlantGroup> {
    const { data, error } = await supabase
      .from('plant_groups')
      .update({ grow_room_id: toRoomId })
      .eq('id', id)
      .select(PLANT_GROUP_SELECT)
      .single();
    if (error) throwError(error, 'moveToRoom');
    return data as unknown as PlantGroup;
  },

  async updatePlantGroupPlacement(id: string, input: UpdatePlantGroupPlacementInput): Promise<PlantGroup> {
    const { data, error } = await supabase
      .from('plant_groups')
      .update({ room_table_id: input.room_table_id, room_section_id: input.room_section_id })
      .eq('id', id)
      .select(PLANT_GROUP_SELECT)
      .single();
    if (error) throwError(error, 'updatePlantGroupPlacement');
    return data as unknown as PlantGroup;
  },

  async setMotherStatus(id: string, isMother: boolean): Promise<PlantGroup> {
    const { data, error } = await supabase
      .from('plant_groups')
      .update({ is_mother: isMother })
      .eq('id', id)
      .select(PLANT_GROUP_SELECT)
      .single();
    if (error) throwError(error, 'setMotherStatus');
    return data as unknown as PlantGroup;
  },

  async updatePlantGroupNotes(id: string, notes: string): Promise<PlantGroup> {
    const { data, error } = await supabase
      .from('plant_groups')
      .update({ notes })
      .eq('id', id)
      .select(PLANT_GROUP_SELECT)
      .single();
    if (error) throwError(error, 'updatePlantGroupNotes');
    return data as unknown as PlantGroup;
  },

  async getStageHistory(plantGroupId: string): Promise<PlantGroupStageHistory[]> {
    const { data, error } = await supabase
      .from('plant_group_stage_history')
      .select('*')
      .eq('plant_group_id', plantGroupId)
      .order('transitioned_at', { ascending: false });
    if (error) throwError(error, 'getStageHistory');
    return data as PlantGroupStageHistory[];
  },

  async getRoomHistory(plantGroupId: string): Promise<PlantGroupRoomHistory[]> {
    const { data, error } = await supabase
      .from('plant_group_room_history')
      .select(`
        id, plant_group_id, from_room_id, to_room_id, moved_at, moved_by, notes,
        from_room:grow_rooms!from_room_id (name, room_code),
        to_room:grow_rooms!to_room_id (name, room_code)
      `)
      .eq('plant_group_id', plantGroupId)
      .order('moved_at', { ascending: false });
    if (error) throwError(error, 'getRoomHistory');
    return data as unknown as PlantGroupRoomHistory[];
  },

  async listMotherGroups(filter?: { strainId?: string }): Promise<PlantGroup[]> {
    let query = supabase
      .from('plant_groups')
      .select(PLANT_GROUP_SUMMARY_SELECT)
      .eq('is_mother', true)
      .not('growth_stage', 'eq', 'harvested');

    if (filter?.strainId) {
      query = query.eq('strain_id', filter.strainId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throwError(error, 'listMotherGroups');
    return data as unknown as PlantGroup[];
  },

  async listCutSessions(plantGroupId: string): Promise<PlantGroupCutSession[]> {
    const { data, error } = await supabase
      .from('plant_group_cut_sessions')
      .select(CUT_SESSION_SELECT)
      .eq('plant_group_id', plantGroupId)
      .order('created_at', { ascending: true });
    if (error) throwError(error, 'listCutSessions');
    return data as unknown as PlantGroupCutSession[];
  },

  async createCutSession(input: CreatePlantGroupCutSessionInput): Promise<PlantGroupCutSession> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('plant_group_cut_sessions')
      .insert({
        ...input,
        cut_date: input.cut_date ?? null,
        notes: input.notes ?? null,
        created_by: user?.id ?? null,
      })
      .select(CUT_SESSION_SELECT)
      .single();
    if (error) throwError(error, 'createCutSession');
    return data as unknown as PlantGroupCutSession;
  },

  async deleteCutSession(id: string): Promise<void> {
    const { error } = await supabase.from('plant_group_cut_sessions').delete().eq('id', id);
    if (error) throwError(error, 'deleteCutSession');
  },

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

  async deleteHarvestWeightEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('harvest_weight_entries')
      .delete()
      .eq('id', id);
    if (error) throwError(error, 'deleteHarvestWeightEntry');
  },

  async finalizeHarvest(id: string, dryRoomId: string | null): Promise<HarvestSession> {
    const entries = await cultivationService.listHarvestWeightEntries(id);
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
        session_status: 'completed',
        completed_by: user?.id ?? null,
      })
      .eq('id', id)
      .select(HARVEST_SESSION_SELECT)
      .single();
    if (error) throwError(error, 'finalizeHarvest');
    return data as unknown as HarvestSession;
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

  async listDryRooms(): Promise<DryRoom[]> {
    const { data, error } = await supabase
      .from('dry_rooms')
      .select('*')
      .order('room_code');
    if (error) throwError(error, 'listDryRooms');
    return data as DryRoom[];
  },

  async createDryRoom(input: CreateDryRoomInput): Promise<DryRoom> {
    const { data, error } = await supabase
      .from('dry_rooms')
      .insert({ ...input, is_active: true })
      .select()
      .single();
    if (error) throwError(error, 'createDryRoom');
    return data as DryRoom;
  },

  async updateDryRoom(id: string, input: UpdateDryRoomInput): Promise<DryRoom> {
    const { data, error } = await supabase
      .from('dry_rooms')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throwError(error, 'updateDryRoom');
    return data as DryRoom;
  },

  async archiveDryRoom(id: string): Promise<DryRoom> {
    return cultivationService.updateDryRoom(id, { is_active: false });
  },

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
      .eq('session_status', 'completed')
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
        .eq('session_status', 'completed')
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
        .eq('session_status', 'completed')
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
    const entries = await cultivationService.listBinEntries(id);
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

    const entry = await cultivationService.createBinEntry({
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

    const allEntries = await cultivationService.listBinEntries(sessionId);
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

  async listIndividualPlants(plantGroupId: string): Promise<IndividualPlant[]> {
    const { data, error } = await supabase
      .from('individual_plants')
      .select('id, plant_group_id, state_plant_id, is_active, notes, created_at, created_by')
      .eq('plant_group_id', plantGroupId)
      .order('state_plant_id');
    if (error) throwError(error, 'listIndividualPlants');
    return data as IndividualPlant[];
  },

  async addIndividualPlant(input: AddIndividualPlantInput): Promise<IndividualPlant> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('individual_plants')
      .insert({
        plant_group_id: input.plant_group_id,
        state_plant_id: input.state_plant_id,
        notes: input.notes ?? null,
        created_by: user?.id ?? null,
      })
      .select('id, plant_group_id, state_plant_id, is_active, notes, created_at, created_by')
      .single();
    if (error) throwError(error, 'addIndividualPlant');
    return data as IndividualPlant;
  },

  async bulkImportIndividualPlants(plantGroupId: string, statePlantIds: string[]): Promise<BulkImportPlantResult> {
    const { data: { user } } = await supabase.auth.getUser();
    const result: BulkImportPlantResult = { imported: 0, skipped: [], errors: [] };

    const FORMAT_RE = /^[0-9]{12}$/;

    const rows = statePlantIds
      .map((id) => id.trim())
      .filter((id) => {
        if (!FORMAT_RE.test(id)) {
          result.errors.push({ state_plant_id: id, reason: 'Must be exactly 12 digits' });
          return false;
        }
        return true;
      })
      .map((state_plant_id) => ({
        plant_group_id: plantGroupId,
        state_plant_id,
        created_by: user?.id ?? null,
      }));

    if (rows.length === 0) return result;

    const { data, error } = await supabase
      .from('individual_plants')
      .upsert(rows, { onConflict: 'state_plant_id', ignoreDuplicates: true })
      .select('state_plant_id');

    if (error) throwError(error, 'bulkImportIndividualPlants');

    const insertedIds = new Set((data ?? []).map((r: { state_plant_id: string }) => r.state_plant_id));
    result.imported = insertedIds.size;
    rows.forEach((r) => {
      if (!insertedIds.has(r.state_plant_id)) result.skipped.push(r.state_plant_id);
    });

    return result;
  },

  async deactivateIndividualPlant(id: string): Promise<IndividualPlant> {
    const { data, error } = await supabase
      .from('individual_plants')
      .update({ is_active: false })
      .eq('id', id)
      .select('id, plant_group_id, state_plant_id, is_active, notes, created_at, created_by')
      .single();
    if (error) throwError(error, 'deactivateIndividualPlant');
    return data as IndividualPlant;
  },
};
