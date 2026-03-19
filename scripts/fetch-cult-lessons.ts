import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.VITE_CONTEXT_SUPABASE_URL!;
const key = process.env.VITE_CONTEXT_SUPABASE_ANON_KEY!;
const supabase = createClient(url, key);

async function fetchLessons() {
  const { data, error } = await supabase
    .from("lessons_learned")
    .select("category, lesson, prevention")
    .eq("category", "cultivation");
    
  if (error) {
    console.error("Error fetching lessons:", error.message);
  } else {
    console.log("CULTIVATION LESSONS LEARNED:");
    console.log(JSON.stringify(data, null, 2));
  }
}

fetchLessons().catch(console.error);
