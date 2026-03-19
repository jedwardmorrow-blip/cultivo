import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_CONTEXT_SUPABASE_URL?.replace('uayyhluztelnfxfvdhyt', 'fonreynkfeqywshijqpi'); // The prod URL isn't in env directly but we have SUPABASE_URL? Wait! Let's just use REST via standard. Wait, the production DB is what we need to hit!
