import { createClient } from '@supabase/supabase-js';
import type { Database } from './database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Module-load behavior is intentionally non-throwing. A previous
 * version threw a synchronous error here when env vars were missing,
 * which killed the whole app — including standalone demo bundles
 * that never call supabase. The demo build (vite.config.demo.ts)
 * doesn't include this module at all because consumers dynamic-import
 * it from inside live-fetch paths only. This safeguard is still
 * useful for any preview deploy that reuses the standard build but
 * hasn't had its env vars wired yet: the app boots, surfaces a clear
 * console error, and any code path that actually attempts a supabase
 * call gets a meaningful runtime error instead of a blank page.
 */
const HAS_SUPABASE_ENV = !!(supabaseUrl && supabaseAnonKey);

if (!HAS_SUPABASE_ENV && typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are missing. ' +
    'The Cult app needs these for any data-bearing surface. Demo / fixture ' +
    'routes (?demo=*, ?mock=1) work without them.'
  );
}

export const supabase = HAS_SUPABASE_ENV
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : (new Proxy({}, {
      get(_target, prop) {
        // Returning a function for any property access produces a
        // helpful error if anyone actually tries to query supabase
        // without env vars set.
        if (prop === 'auth') return new Proxy({}, { get: () => () => Promise.resolve({ data: { session: null }, error: null }) });
        return () => {
          throw new Error(
            `[supabase] Cannot call .${String(prop)} — Supabase client not initialized (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)`
          );
        };
      },
    }) as unknown as ReturnType<typeof createClient<Database>>);

/**
 * Health check for Supabase storage service
 * Tests if storage API is accessible and authenticated
 */
export async function checkStorageHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { ok: false, error: 'Not authenticated' };
    }

    // Try to list files in coa-pdfs bucket (should work even if empty)
    const { data: _data, error } = await supabase.storage
      .from('coa-pdfs')
      .list('', { limit: 1 });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Unknown error' };
  }
}
