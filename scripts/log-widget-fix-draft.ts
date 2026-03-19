import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.VITE_CONTEXT_SUPABASE_URL!;
const key = process.env.VITE_CONTEXT_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

async function logDraft() {
  const summary =
    "Fixed the Widget Knowledge Extraction for conversational sessions. Expanded EXTRACTION_PROMPT and safeCategories in edge function handlers.ts to include tracking 'people' and feelings. Lowered auto-approve threshold from 0.90 to 0.85 in autoDistillSession. Bumped version to v37 and deployed cultops-ai-chat to production. Generated migration script to restore 12 rejected candidates back to pending.";
  const files_touched = [
    "supabase/functions/cultops-ai-chat/handlers.ts",
    "supabase/functions/cultops-ai-chat/index.ts",
    "supabase/functions/cultops-ai-chat/lib.ts",
    "supabase/migrations/20260319211130_restore_candidates.sql"
  ];
  const next_steps =
    "Push the data migration script via `supabase db push` to apply the status restoration for the rejected candidates. Address other Cowork queue items.";

  const { data, error } = await supabase
    .from("proposed_context_updates")
    .insert({
      summary,
      files_touched,
      next_steps,
      agent_id: "antigravity",
    });

  if (error) {
    console.error("Failed to log context draft:", error);
    process.exit(1);
  }

  console.log("Successfully logged context draft to proposed_context_updates.");
}

logDraft().catch(console.error);
