import { supabase } from '@/lib/supabase';
import type {
  RoomTable,
  RoomSection,
  SectionOccupancy,
  CreateRoomTableInput,
  UpdateRoomTableInput,
  CreateRoomSectionInput,
  UpdateRoomSectionInput,
} from '../types';

function throwError(error: { message: string } | null, context: string): never {
  throw new Error(error?.message ?? `Unknown error in ${context}`);
}

const ROOM_SECTION_SELECT = 'id, room_table_id, section_label, section_sqft, is_active, created_at, created_by, flip_date, projected_harvest_date';

export const roomLayoutService = {
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

  /**
   * Get per-section plant occupancy for a room.
   * Returns section_id → { total_plants, strain_counts } for all sections
   * that currently hold plants. Used by the grid-based placement builder.
   */
  async getSectionOccupancy(roomId: string): Promise<Map<string, SectionOccupancy>> {
    const { data, error } = await supabase
      .from('plant_groups')
      .select('room_section_id, plant_count, strains:strains!inner(abbreviation)')
      .eq('grow_room_id', roomId)
      .not('room_section_id', 'is', null)
      .gt('plant_count', 0)
      .neq('growth_stage', 'harvested');

    if (error) throwError(error, 'getSectionOccupancy');

    const map = new Map<string, SectionOccupancy>();
    for (const row of (data ?? [])) {
      const sectionId = row.room_section_id as string;
      const count = row.plant_count as number;
      const abbrev = (row.strains as unknown as { abbreviation: string })?.abbreviation ?? '';
      const existing = map.get(sectionId);
      if (existing) {
        existing.total_plants += count;
        const strainEntry = existing.strain_counts.find(s => s.abbreviation === abbrev);
        if (strainEntry) {
          strainEntry.count += count;
        } else if (abbrev) {
          existing.strain_counts.push({ abbreviation: abbrev, count });
        }
      } else {
        map.set(sectionId, {
          total_plants: count,
          strain_counts: abbrev ? [{ abbreviation: abbrev, count }] : [],
        });
      }
    }
    return map;
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
    return roomLayoutService.updateRoomTable(id, { is_active: false });
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
    return roomLayoutService.updateRoomSection(id, { is_active: false });
  },
};
