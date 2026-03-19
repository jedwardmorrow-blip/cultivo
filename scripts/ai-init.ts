import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local strictly to get the context tokens
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const CONTEXT_URL = process.env.VITE_CONTEXT_SUPABASE_URL;
const CONTEXT_ANON_KEY = process.env.VITE_CONTEXT_SUPABASE_ANON_KEY;

if (!CONTEXT_URL || !CONTEXT_ANON_KEY) {
  console.error("❌ Missing Context DB credentials in .env.local.");
  console.error("Please ensure VITE_CONTEXT_SUPABASE_URL and VITE_CONTEXT_SUPABASE_ANON_KEY are set.");
  process.exit(1);
}

const supabase = createClient(CONTEXT_URL, CONTEXT_ANON_KEY);

async function init() {
  console.log("🧠 CULT-OPS AI CONTEXT INITIALIZATION 🧠\n========================================");

  // 1. Fetch Build State
  console.log("\n📦 CURRENT BUILD STATE (cultops_build_state_current):");
  const { data: buildState, error: buildError } = await supabase
    .from('business_context')
    .select('value')
    .eq('key', 'cultops_build_state_current')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (buildError) {
    console.error("Error fetching build state:", buildError.message);
  } else {
    console.log(buildState?.value || "No build state found.");
  }

  // 2. Fetch Lessons Learned
  console.log("\n⚠️ CRITICAL LESSONS LEARNED:");
  const { data: lessons, error: lessonError } = await supabase
    .from('lessons_learned')
    .select('category, lesson, prevention')
    .in('severity', ['critical', 'high'])
    .order('created_at', { ascending: false })
    .limit(5);

  if (lessonError) {
    console.error("Error fetching lessons:", lessonError.message);
  } else if (lessons && lessons.length > 0) {
    lessons.forEach(l => console.log(`[${l.category?.toUpperCase()}] ${l.lesson}\n -> Prevention: ${l.prevention}`));
  } else {
    console.log("No critical lessons found.");
  }

  // 3. Fetch Cowork Queue
  console.log("\n📋 ACTIVE COWORK QUEUE (Top 3):");
  const { data: queue, error: queueError } = await supabase
    .from('v_cowork_queue_active')
    .select('*')
    .limit(3);
    
  if (queueError) {
    console.error("Error fetching cowork queue:", queueError.message);
  } else if (queue && queue.length > 0) {
    queue.forEach((q: any, i) => console.log(`${i + 1}. [${q.priority || '?'}] ${q.title || 'Task'} - ${q.description || ''}`));
  } else {
    console.log("Queue is empty.");
  }

  console.log("\n========================================");
  console.log("✅ Initialization complete. Proceed with development.");
}

init();
