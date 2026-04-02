import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type TicketUpdate = Database['public']['Tables']['tickets']['Update'];

export async function updateTicket(id: string, updates: TicketUpdate): Promise<void> {
  const { error } = await supabase.from('tickets').update(updates).eq('id', id);
  if (error) throw error;
}
