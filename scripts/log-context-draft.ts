import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const CONTEXT_URL = process.env.VITE_CONTEXT_SUPABASE_URL;
const CONTEXT_ANON_KEY = process.env.VITE_CONTEXT_SUPABASE_ANON_KEY;

if (!CONTEXT_URL || !CONTEXT_ANON_KEY) {
  console.error("❌ Missing Context DB credentials in .env.local.");
  process.exit(1);
}

const supabase = createClient(CONTEXT_URL, CONTEXT_ANON_KEY);

const summary = `Refactored HarvestSession logic to support batch-level splitting into Fresh Frozen and Flower pipelines.

1. **Database**
   - Removed harvest_type and dry_room_id from harvest_sessions.
   - Added destination (HarvestType) and location_id (dry_room UUID) to harvest_weight_entries.
   - Migrated legacy data to push room/types onto the weight entries natively.

2. **Backend API**
   - Updated SUPABASE_SESSION_SELECT to fetch native nested \`harvest_weight_entries { destination, location_id, dry_rooms { room_code } }\`.
   - Updated cultivation.service.ts methods to route dryRoomId to entries where destination = 'flower' during finalizeHarvest.

3. **Frontend UI**
   - Refactored HarvestWorkflow to enforce batch-level session creation.
   - Added destination dropdown to WeightEntryForm for dynamic plant-group splitting.
   - Re-wired HarvestReviewFinalize to sum derived flowerWeight and frozenWeight.
   - Fixed BinningSessionsView to only display, target, and yield against flower-intended weight entries.

These changes correctly handle real-world cultivation where a single batch chopped on a single day might yield multiple end products requiring entirely different downstream pipelines.`;

const files_touched = [
  "supabase/migrations/20260319232024_harvest_split_refactor.sql",
  "src/features/cultivation/types/cultivation.types.ts",
  "src/features/cultivation/services/cultivation.service.ts",
  "src/features/cultivation/components/harvest/HarvestWorkflow.tsx",
  "src/features/cultivation/components/harvest/HarvestWeightRecorder.tsx",
  "src/features/cultivation/components/harvest/HarvestReviewFinalize.tsx",
  "src/features/cultivation/components/HarvestSessionsList.tsx",
  "src/features/cultivation/components/BinningSessionsView.tsx"
];

async function logDraft() {
  console.log("📝 Writing draft update to Context DB...");
  const { error } = await supabase.from('proposed_context_updates').insert({
    summary,
    files_touched,
    next_steps: 'Wait for Justin to review the codebase and draft Context update.',
    agent_id: 'antigravity'
  });

  if (error) {
    console.error("Failed to write draft:", error.message);
    process.exit(1);
  }

  console.log("✅ Successfully logged draft to proposed_context_updates!");
}

logDraft();
