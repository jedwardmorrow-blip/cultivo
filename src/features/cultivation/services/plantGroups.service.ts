import { supabase } from '@/lib/supabase';
import type {
  PlantGroup,
  PlantGroupStageHistory,
  PlantGroupRoomHistory,
  PlantGroupCutSession,
  GrowthStage,
  CreatePlantGroupInput,
  CreatePlantGroupCutSessionInput,
  UpdatePlantGroupPlacementInput,
  SplitAndMoveInput,
  SplitAndMoveMultiInput,
  IndividualPlant,
  AddIndividualPlantInput,
  BulkImportPlantResult,
} from '../types';

function throwError(error: { message: string } | null, context: string): never {
  throw new Error(error?.message ?? `Unknown error in ${context}`);
}

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

const PLANT_GROUP_LIST_SELECT = `
  id, name, strain_id, grow_room_id,
  room_table_id, room_section_id, batch_registry_id,
  is_mother, plant_count, growth_stage, stage_entered_at,
  strains (name, abbreviation),
  grow_rooms (name, room_code),
  batch_registry (batch_number)
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

export const plantGroupsService = {
  async listPlantGroups(filter?: { stage?: GrowthStage | 'active' }): Promise<PlantGroup[]> {
    let query = supabase.from('plant_groups').select(PLANT_GROUP_LIST_SELECT);

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
      .select(PLANT_GROUP_LIST_SELECT)
      .eq('grow_room_id', growRoomId)
      .gt('plant_count', 0)
      .neq('growth_stage', 'harvested')
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
    // UPDATE triggers handle everything:
    //   fn_sync_stage_to_room_type          → auto-sets growth_stage to match destination room
    //   fn_clear_placement_on_room_transfer → nulls room_table_id / room_section_id
    //   fn_validate_plant_group_stage_transition → validates & stamps stage_entered_at
    //   fn_log_plant_group_room_history     → writes history with from/to room + table/section + count
    const { data, error } = await supabase
      .from('plant_groups')
      .update({ grow_room_id: toRoomId })
      .eq('id', id)
      .select(PLANT_GROUP_SELECT)
      .single();
    if (error) throwError(error, 'moveToRoom');

    return data as unknown as PlantGroup;
  },

  /**
   * Split a plant group across multiple table/sections in a destination FLW room.
   *
   * For each placement:
   *  1. Creates a new plant_group at the destination room/table/section with the specified count
   *  2. Writes a plant_group_room_history entry with full from/to details
   *
   * After all placements, decrements or archives the source group.
   * Returns the array of newly created groups.
   */
  async splitAndMoveToRoom(input: SplitAndMoveInput): Promise<PlantGroup[]> {
    const { source_group_id, to_room_id, placements } = input;

    // 1. Fetch source group
    const { data: source, error: srcErr } = await supabase
      .from('plant_groups')
      .select('*')
      .eq('id', source_group_id)
      .single();
    if (srcErr || !source) throwError(srcErr ?? new Error('Source group not found'), 'splitAndMoveToRoom');

    const totalPlacing = placements.reduce((sum, p) => sum + p.plant_count, 0);
    if (totalPlacing > source.plant_count) {
      throw new Error(`Cannot place ${totalPlacing} plants — source group only has ${source.plant_count}`);
    }

    // Fetch destination room to determine correct growth_stage
    const { data: destRoom, error: roomErr } = await supabase
      .from('grow_rooms')
      .select('room_type')
      .eq('id', to_room_id)
      .single();
    if (roomErr || !destRoom) throwError(roomErr ?? new Error('Destination room not found'), 'splitAndMoveToRoom');

    // Map room_type → growth_stage (room_type values: veg, flower, mother)
    const destStage = destRoom.room_type as string; // 'veg' | 'flower' | 'mother'

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const newGroups: PlantGroup[] = [];

    // 2. Create a child group for each placement
    for (const placement of placements) {
      const { data: child, error: childErr } = await supabase
        .from('plant_groups')
        .insert({
          strain_id: source.strain_id,
          grow_room_id: to_room_id,
          room_table_id: placement.table_id,
          room_section_id: placement.section_id,
          batch_registry_id: source.batch_registry_id,
          mother_plant_group_id: source.mother_plant_group_id,
          source_type: source.source_type,
          is_mother: false,
          plant_count: placement.plant_count,
          growth_stage: destStage,
          stage_entered_at: destStage !== source.growth_stage ? new Date().toISOString() : source.stage_entered_at,
          planted_date: source.planted_date,
          notes: null,
          created_by: userId,
        })
        .select(PLANT_GROUP_SELECT)
        .single();
      if (childErr) throwError(childErr, 'splitAndMoveToRoom:createChild');

      const childGroup = child as unknown as PlantGroup;
      newGroups.push(childGroup);

      // 3. Write history for each placement
      await supabase.from('plant_group_room_history').insert({
        plant_group_id: childGroup.id,
        from_room_id: source.grow_room_id,
        to_room_id,
        from_table_id: source.room_table_id,
        from_section_id: source.room_section_id,
        to_table_id: placement.table_id,
        to_section_id: placement.section_id,
        plant_count: placement.plant_count,
        source_group_id: source_group_id,
        moved_by: userId,
      });
    }

    // 4. Update source group: decrement plant_count or archive if fully depleted
    const remaining = source.plant_count - totalPlacing;
    if (remaining <= 0) {
      // All plants moved — transition source to flower (if not already) then harvested.
      // Trigger allows free movement between clone/veg/flower, but only flower→harvested.
      if (source.growth_stage !== 'flower') {
        await supabase
          .from('plant_groups')
          .update({ growth_stage: 'flower' })
          .eq('id', source_group_id);
      }
      await supabase
        .from('plant_groups')
        .update({ plant_count: 0, growth_stage: 'harvested' })
        .eq('id', source_group_id);
    } else {
      // Partial move — some plants remain in the source room
      await supabase
        .from('plant_groups')
        .update({ plant_count: remaining })
        .eq('id', source_group_id);
    }

    return newGroups;
  },

  /**
   * Batch-level move: distribute plants from MULTIPLE source groups across
   * table/sections in a destination room. Draws from source groups in order,
   * exhausting each before moving to the next.
   */
  async splitAndMoveMultipleToRoom(input: SplitAndMoveMultiInput): Promise<PlantGroup[]> {
    const { source_group_ids, to_room_id, placements, kill_count = 0 } = input;

    // 1. Fetch all source groups
    const { data: sources, error: srcErr } = await supabase
      .from('plant_groups')
      .select('*')
      .in('id', source_group_ids);
    if (srcErr || !sources) throwError(srcErr ?? new Error('Source groups not found'), 'splitAndMoveMultipleToRoom');

    const totalAvailable = sources.reduce((sum, g) => sum + g.plant_count, 0);
    const totalPlacing = placements.reduce((sum, p) => sum + p.plant_count, 0);
    if (totalPlacing + kill_count > totalAvailable) {
      throw new Error(`Cannot place ${totalPlacing} + kill ${kill_count} plants — sources only have ${totalAvailable}`);
    }

    // 2. Fetch destination room type for growth_stage
    const { data: destRoom, error: roomErr } = await supabase
      .from('grow_rooms')
      .select('room_type')
      .eq('id', to_room_id)
      .single();
    if (roomErr || !destRoom) throwError(roomErr ?? new Error('Destination room not found'), 'splitAndMoveMultipleToRoom');
    const destStage = destRoom.room_type as string;

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const newGroups: PlantGroup[] = [];

    // Use first source as representative for shared fields (strain, batch, etc.)
    const rep = sources[0];

    // 3. Create a child group for each placement
    for (const placement of placements) {
      const { data: child, error: childErr } = await supabase
        .from('plant_groups')
        .insert({
          strain_id: rep.strain_id,
          grow_room_id: to_room_id,
          room_table_id: placement.table_id,
          room_section_id: placement.section_id,
          batch_registry_id: rep.batch_registry_id,
          mother_plant_group_id: rep.mother_plant_group_id,
          source_type: rep.source_type,
          is_mother: false,
          plant_count: placement.plant_count,
          growth_stage: destStage,
          stage_entered_at: destStage !== rep.growth_stage ? new Date().toISOString() : rep.stage_entered_at,
          planted_date: rep.planted_date,
          notes: null,
          created_by: userId,
        })
        .select(PLANT_GROUP_SELECT)
        .single();
      if (childErr) throwError(childErr, 'splitAndMoveMultipleToRoom:createChild');

      const childGroup = child as unknown as PlantGroup;
      newGroups.push(childGroup);

      // Write history
      await supabase.from('plant_group_room_history').insert({
        plant_group_id: childGroup.id,
        from_room_id: rep.grow_room_id,
        to_room_id,
        from_table_id: null,
        from_section_id: null,
        to_table_id: placement.table_id,
        to_section_id: placement.section_id,
        plant_count: placement.plant_count,
        source_group_id: rep.id,
        moved_by: userId,
      });
    }

    // 4. Decrement source groups in order — exhaust each before moving to next
    let toDeduct = totalPlacing + kill_count;
    // Sort sources by the order they were passed in
    const orderedSources = source_group_ids.map(id => sources.find(s => s.id === id)!).filter(Boolean);

    for (const src of orderedSources) {
      if (toDeduct <= 0) break;

      const deductFromThis = Math.min(toDeduct, src.plant_count);
      const remaining = src.plant_count - deductFromThis;
      toDeduct -= deductFromThis;

      if (remaining <= 0) {
        // Fully depleted — archive: flower → harvested
        if (src.growth_stage !== 'flower') {
          await supabase.from('plant_groups').update({ growth_stage: 'flower' }).eq('id', src.id);
        }
        await supabase.from('plant_groups').update({ plant_count: 0, growth_stage: 'harvested' }).eq('id', src.id);
      } else {
        await supabase.from('plant_groups').update({ plant_count: remaining }).eq('id', src.id);
      }
    }

    return newGroups;
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
