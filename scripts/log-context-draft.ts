import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const CONTEXT_URL = process.env.VITE_CONTEXT_SUPABASE_URL;
const CONTEXT_ANON_KEY = process.env.VITE_CONTEXT_SUPABASE_ANON_KEY;
const supabase = createClient(CONTEXT_URL, CONTEXT_ANON_KEY);

async function run() {
  const { error } = await supabase.from('proposed_context_updates').insert({
    summary: "Validation Check: Discovered that 'Fix harvest workflow to group plant groups by batch' ticket is already fully implemented in the codebase (HarvestWorkflow.tsx). Claude Co-work finished the code but the database queue status was left active. Ticket is ready to be closed.",
    files_touched: ["src/features/cultivation/components/harvest/HarvestWorkflow.tsx"],
    next_steps: "Close Harvest Grouping ticket in cowork_queue and proceed to Widget Knowledge Extraction.",
    agent_id: "antigravity"
  });
  if (error) {
    console.error("Error inserting draft:", error.message);
  } else {
    console.log("Draft successfully inserted.");
  }
}
run();
