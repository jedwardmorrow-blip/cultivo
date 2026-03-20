import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const url = process.env.VITE_CONTEXT_SUPABASE_URL || '';
  const key = process.env.VITE_CONTEXT_SUPABASE_ANON_KEY || '';
  
  if (!url || !key) {
    console.error("Missing context URL or key");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log("Inserting context draft for Layer 3 update...");
  const { error } = await supabase.from('proposed_context_updates').insert({
    summary: 'Layer 3 Command Center implementation complete. Built useRoomOperationalState to consume backend view. Deprecated EnhancedRoomCard/RoomGroup logic in favor of a flattened, urgency-sorted RoomCommandCard grid. Added specific tailwind urgency-pulse animations.',
    files_touched: ['src/features/cultivation/components/CultivationDashboard.tsx', 'src/features/cultivation/hooks/index.ts', 'src/features/cultivation/hooks/useRoomOperationalState.ts', 'tailwind.config.js'],
    next_steps: 'Wait for manager review of the CultivationDashboard command center flow. Proceed with scaling tests.',
    agent_id: 'antigravity'
  });

  if (error) {
    console.error('INSERT FAILED', error);
  } else {
    console.log('DRAFT INSERTED SUCCESSFULLY');
  }
}

run();
