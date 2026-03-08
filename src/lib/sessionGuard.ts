import { supabase } from './supabase';

export async function ensureValidSession(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return false;

    const expiresAt = session.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now() + 30_000) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) return false;
    }

    return true;
  } catch {
    return false;
  }
}
