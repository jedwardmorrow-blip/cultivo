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
    summary: 'Extracted LabelGenerator state mess into useLabelGenerator.ts dual-reducer mechanism. Solved the barcode generation Promise race condition.',
    files_touched: ['src/features/orders/hooks/useLabelGenerator.ts', 'src/features/orders/components/LabelGenerator.tsx'],
    next_steps: 'Validate UI generation locally prior to main branch Go-Live. Review type holes around JSBarcode imports if tsc strict mode fails.',
    agent_id: 'antigravity'
  });

  if (error) {
    console.error('INSERT FAILED', error);
  } else {
    console.log('DRAFT INSERTED SUCCESSFULLY');
  }
}

run();
