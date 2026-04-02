import { supabase } from '@/lib/supabase';
import type {
  GrowRoom,
  CreateGrowRoomInput,
  UpdateGrowRoomInput,
  FlipRoomInput,
} from '../types';

function throwError(error: { message: string } | null, context: string): never {
  throw new Error(error?.message ?? `Unknown error in ${context}`);
}

export const growRoomsService = {
  async listGrowRooms(): Promise<GrowRoom[]> {
    const { data, error } = await supabase
      .from('grow_rooms')
      .select('*')
      .order('room_code')
      .limit(100);
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
    return growRoomsService.updateGrowRoom(id, { is_active: false });
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
};
