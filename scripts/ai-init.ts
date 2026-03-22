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

  // 3. Fetch Sprint Tickets (v_sprint_active — Rule 42)
  console.log("\n🎯 ACTIVE SPRINT TICKETS (Top 3 — v_sprint_active):");
  const { data: sprint, error: sprintError } = await supabase
    .from('v_sprint_active')
    .select('ticket_number, title, priority, task_type, executor, ticket_status, spec, acceptance_criteria, files_to_touch, known_traps, dependencies_met, tickets_done, tickets_total')
    .limit(3);

  if (sprintError) {
    console.error("Error fetching sprint tickets:", sprintError.message);
  } else if (sprint && sprint.length > 0) {
    // Print sprint progress from first ticket's aggregates
    const first = sprint[0] as any;
    console.log(`Sprint progress: ${first.tickets_done}/${first.tickets_total} done\n`);

    sprint.forEach((t: any, i) => {
      console.log(`${i + 1}. [P${t.priority}] #${t.ticket_number}: ${t.title}`);
      console.log(`   Type: ${t.task_type} | Executor: ${t.executor} | Status: ${t.ticket_status} | Deps met: ${t.dependencies_met}`);
      console.log(`   Files: ${(t.files_to_touch || []).join(', ')}`);
      if (t.known_traps) console.log(`   ⚠️  Traps: ${t.known_traps.slice(0, 200)}...`);
      console.log('');
    });

    // Print full spec of ticket #1 (the one to execute)
    console.log("--- TICKET #1 FULL SPEC ---");
    console.log(first.spec);
    console.log("\n--- ACCEPTANCE CRITERIA ---");
    console.log(first.acceptance_criteria);
  } else {
    console.log("No active sprint tickets.");
  }

  // 4. Fetch Cowork Queue (backlog / non-sprint items)
  console.log("\n📋 COWORK QUEUE (Top 3 non-sprint items):");
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
