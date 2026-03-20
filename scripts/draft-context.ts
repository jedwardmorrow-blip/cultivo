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

  console.log("Inserting context draft...");
  const { error } = await supabase.from('proposed_context_updates').insert({
    summary: 'React Router v6 Migration Complete. Eliminated massive App.tsx monolith, modernized Layout and Navigation state, and resolved VisitCalendar strict Babel duplication error.',
    files_touched: ['src/App.tsx', 'src/main.tsx', 'src/lib/components/Layout.tsx', 'src/features/crm/components/VisitCalendar.tsx', 'src/shared/components/navigation/'],
    next_steps: 'Start phasing out the backwards-compatible onViewChange prop closures natively imported into deep features. Address any type holes.',
    agent_id: 'antigravity'
  });

  if (error) {
    console.error('INSERT FAILED', error);
  } else {
    console.log('DRAFT INSERTED SUCCESSFULLY');
  }
}

run();
