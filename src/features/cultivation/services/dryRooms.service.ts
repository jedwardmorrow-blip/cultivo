import { supabase } from '@/lib/supabase';
import type {
  DryRoom,
  CreateDryRoomInput,
  UpdateDryRoomInput,
} from '../types';

function throwError(error: { message: string } | null, context: string): never {
  throw new Error(error?.message ?? `Unknown error in ${context}`);
}

export const dryRoomsService = {
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
    return dryRoomsService.updateDryRoom(id, { is_active: false });
  },
};
