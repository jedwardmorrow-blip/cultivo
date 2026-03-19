import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const CONTEXT_URL = process.env.VITE_CONTEXT_SUPABASE_URL;
const CONTEXT_ANON_KEY = process.env.VITE_CONTEXT_SUPABASE_ANON_KEY;

if (!CONTEXT_URL || !CONTEXT_ANON_KEY) {
  console.error("Missing Context DB credentials.");
  process.exit(1);
}

const supabase = createClient(CONTEXT_URL, CONTEXT_ANON_KEY);

async function dump() {
  console.log("=== DB DUMP START ===");
  const { data: bData } = await supabase.from('business_context').select('key, category').order('category');
  console.log("=== KEYS ===");
  console.log(JSON.stringify(bData, null, 2));

  const { data: qData } = await supabase.from('v_cowork_queue_active').select('title, description, priority, status');
  console.log("\n=== COWORK QUEUE ===");
  console.log(JSON.stringify(qData, null, 2));
  
  const { data: aData } = await supabase.from('business_context').select('key, value').in('category', ['architecture', 'roadmap', 'product_strategy', 'development_workflow']).order('updated_at', { ascending: false });
  console.log("\n=== CONTEXT DETAILS ===");
  aData?.forEach(row => {
    console.log(`\n--- ${row.key} ---`);
    console.log(JSON.stringify(row.value, null, 2).substring(0, 1500)); 
  });
  console.log("=== DB DUMP END ===");
}

dump();
