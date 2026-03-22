import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local strictly to get the context tokens
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const CONTEXT_URL = process.env.VITE_CONTEXT_SUPABASE_URL;
const CONTEXT_ANON_KEY = process.env.VITE_CONTEXT_SUPABASE_ANON_KEY;

if (!CONTEXT_URL || !CONTEXT_ANON_KEY) {
  console.error("❌ Missing Context DB credentials in .env.local.");
  process.exit(1);
}

const supabase = createClient(CONTEXT_URL, CONTEXT_ANON_KEY);

/**
 * ai-writeback.ts — End-of-session build state writeback
 *
 * Usage:
 *   npx tsx scripts/ai-writeback.ts "Summary of what was done this session"
 *
 * Writes to business_context.cultops_build_state_current with a structured
 * build state document. The summary argument is required.
 */

async function writeback() {
  const summary = process.argv[2];

  if (!summary) {
    console.error("❌ Usage: npx tsx scripts/ai-writeback.ts \"<session summary>\"");
    console.error("   The summary should describe what was done, what's broken, and next steps.");
    process.exit(1);
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const timeHHMM = new Date().toISOString().split('T')[1].slice(0, 5);

  const buildState = `## Build State — Session Update ${timestamp} ${timeHHMM} UTC

${summary}`;

  console.log("📝 Writing build state to context DB...\n");
  console.log(buildState);
  console.log("\n---");

  // Upsert: update if key exists, insert if it doesn't
  const { data: existing } = await supabase
    .from('business_context')
    .select('id')
    .eq('key', 'cultops_build_state_current')
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('business_context')
      .update({
        value: buildState,
        updated_at: new Date().toISOString(),
        source: 'ai-writeback',
        source_detail: `session ${timestamp}`,
      })
      .eq('key', 'cultops_build_state_current');

    if (error) {
      console.error("❌ Error updating build state:", error.message);
      process.exit(1);
    }
    console.log("✅ Build state UPDATED.");
  } else {
    const { error } = await supabase
      .from('business_context')
      .insert({
        category: 'build_state',
        key: 'cultops_build_state_current',
        value: buildState,
        confidence: 'verified',
        source: 'ai-writeback',
        source_detail: `session ${timestamp}`,
      });

    if (error) {
      console.error("❌ Error inserting build state:", error.message);
      process.exit(1);
    }
    console.log("✅ Build state INSERTED (first time).");
  }
}

writeback();
