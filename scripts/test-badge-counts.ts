import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

const URL = 'https://fonreynkfeqywshijqpi.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvbnJleW5rZmVxeXdzaGlqcXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNjI3NzQsImV4cCI6MjA3NTYzODc3NH0.hNyNUziIrtRM_eMXNTZKYF0klV0kZHmpSfRXt6Qv2Po';

if (!URL || !KEY) {
  console.error("Missing DB credentials");
  process.exit(1);
}

const supabase = createClient(URL, KEY);

async function testView() {
  console.log("Testing v_badge_counts...");
  const { data, error } = await supabase.from('v_badge_counts').select('*').single();
  
  if (error) {
    console.error("❌ SQL Error from View:", error.message);
  } else {
    console.log("✅ Successfully hit the view! Data:");
    console.log(data);
  }
}

testView();
