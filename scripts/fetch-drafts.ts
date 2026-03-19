import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const CONTEXT_URL = process.env.VITE_CONTEXT_SUPABASE_URL;
const CONTEXT_ANON_KEY = process.env.VITE_CONTEXT_SUPABASE_ANON_KEY;

const supabase = createClient(CONTEXT_URL, CONTEXT_ANON_KEY);

async function run() {
  console.log("Checking proposed_context_updates for recent Cowork drafts...");
  const { data, error } = await supabase
    .from('proposed_context_updates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error("Error fetching drafts:", error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log("No recent drafts found.");
  } else {
    data.forEach(d => {
      console.log(`\nDraft ID: ${d.id} | Agent: ${d.agent_id} | Created: ${d.created_at}`);
      console.log(`Summary: ${d.summary}`);
      console.log(`Files Touched: ${d.files_touched}`);
      console.log(`Next Steps: ${d.next_steps}`);
    });
  }
}

run();
