import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type PaymentInput = Database['public']['Tables']['payments']['Insert'];

export async function recordPayment(data: PaymentInput): Promise<void> {
  const { error } = await supabase.from('payments').insert(data);
  if (error) throw error;
}
