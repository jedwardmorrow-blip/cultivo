import { supabase } from '@/lib/supabase';
import type { StaffMember, StaffInput } from '@/types';

export async function upsertStaff(data: StaffInput): Promise<void> {
  const { id, ...fields } = data;
  const payload = { ...fields, updated_at: new Date().toISOString() };

  if (id) {
    const { error } = await supabase.from('staff').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('staff').insert(payload);
    if (error) {
      if (error.code === '23505') throw new Error('A staff member with this information already exists');
      throw new Error(error.message);
    }
  }
}

export async function deleteStaff(id: string): Promise<void> {
  const { error } = await supabase.from('staff').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function toggleStaffActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('staff')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function loadStaffList(): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('department')
    .order('first_name');
  if (error) throw new Error(error.message);
  return data || [];
}
