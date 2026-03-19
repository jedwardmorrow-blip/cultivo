import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.VITE_CONTEXT_SUPABASE_URL!;
const key = process.env.VITE_CONTEXT_SUPABASE_ANON_KEY!;
const supabase = createClient(url, key);

async function analyzeTable(tableName: string) {
  const { count, error } = await supabase.from(tableName).select("*", { count: "exact", head: true });
  if (error) {
    return { name: tableName, error: error.message };
  }
  
  // Fetch 1 row to examine schema layout
  const { data } = await supabase.from(tableName).select("*").limit(1);
  const keys = data && data.length > 0 ? Object.keys(data[0]) : [];
  
  return { name: tableName, rowCount: count, columns: keys };
}

async function runAnalysis() {
  const tables = [
    "business_context",
    "lessons_learned",
    "cowork_queue",
    "user_profiles",
    "proposed_context_updates",
    "decisions"
  ];
  
  console.log("Analyzing Context DB...");
  for (const table of tables) {
    const stats = await analyzeTable(table);
    console.log(`\nTable: ${stats.name}`);
    if (stats.error) {
      console.log(`  Error: ${stats.error}`);
    } else {
      console.log(`  Row count: ${stats.rowCount}`);
      console.log(`  Columns: ${stats.columns.join(", ")}`);
    }
  }
}

runAnalysis().catch(e => console.error(e));
