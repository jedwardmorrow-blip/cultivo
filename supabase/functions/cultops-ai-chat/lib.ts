import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ============================================================
// CultOps AI Chat — lib.ts v37
// v35: Added cowork_queue intent to classifyIntent()
// v36: Version bump (no logic changes in lib.ts)
// v37: Version bump
// ============================================================

export const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
export const CLAUDE_MODEL = "claude-sonnet-4-20250514";
export const MAX_TOKENS = 4096;

export interface Attachment { fileName: string; mimeType: string; base64Data: string; storagePath?: string; }
export interface ChatRequest { message: string; session_id?: string; history?: Array<{ role: "user" | "assistant"; content: string }>; attachments?: Attachment[]; }
export interface UserProfile { userId: string; email: string; fullName: string; role: string; isCreator: boolean; }
export interface UserContext { profile: UserProfile; recentSessions: Array<{ title: string; date: string; messageCount: number }>; openTickets: number; totalSessions: number; }
export interface PersonaProfile { preferred_name: string | null; communication_style: string; preferred_response_length: string; jargon_comfort: string; data_domains: string[]; common_intents: string[]; persona_notes: string | null; ai_access_tier: string; onboarding_complete: boolean; }

export async function fetchPersonaProfile(email: string): Promise<PersonaProfile | null> {
  try {
    const contextClient = getContextClient();
    const { data, error } = await contextClient.from("user_profiles").select("preferred_name, communication_style, preferred_response_length, jargon_comfort, data_domains, common_intents, persona_notes, ai_access_tier, onboarding_complete").eq("email", email).eq("is_active", true).single();
    if (error || !data) return null;
    return data as PersonaProfile;
  } catch { return null; }
}

export interface UserPreferences { id: string; user_id: string; detail_level: "concise" | "standard" | "detailed"; tone_preference: "full_persona" | "moderate" | "data_only"; custom_instructions: string | null; frequent_topics: string[]; frequent_intents: string[]; preferred_categories: string[]; avg_message_length: "short" | "medium" | "long"; total_messages: number; topic_counts: Record<string, number>; intent_counts: Record<string, number>; last_active_at: string | null; pinned_context_ids: string[]; }
export const DEFAULT_PREFERENCES: Omit<UserPreferences, "id" | "user_id"> = { detail_level: "standard", tone_preference: "full_persona", custom_instructions: null, frequent_topics: [], frequent_intents: [], preferred_categories: [], avg_message_length: "medium", total_messages: 0, topic_counts: {}, intent_counts: {}, last_active_at: null, pinned_context_ids: [] };

export async function fetchUserPreferences(userId: string): Promise<UserPreferences> {
  const prodClient = getProductionClient();
  const { data } = await prodClient.from("user_preferences").select("*").eq("user_id", userId).single();
  if (data) return data as UserPreferences;
  const { data: newPrefs } = await prodClient.from("user_preferences").insert({ user_id: userId }).select("*").single();
  if (newPrefs) return newPrefs as UserPreferences;
  return { id: "", user_id: userId, ...DEFAULT_PREFERENCES };
}

export interface PreferenceUpdate { field: string; value: any; acknowledgment: string; }

export function detectExplicitPreferences(message: string): PreferenceUpdate | null {
  const lower = message.toLowerCase().trim();
  if (/\b(be (more )?concise|keep it (short|brief)|just (the )?numbers|tldr|tl;dr|shorter responses?)\b/i.test(lower)) return { field: "detail_level", value: "concise", acknowledgment: "Switching to concise mode. Less noise, more signal." };
  if (/\b(more detail|go deeper|explain more|be (more )?thorough|elaborate|give me everything|full (detail|breakdown|analysis))\b/i.test(lower)) return { field: "detail_level", value: "detailed", acknowledgment: "Switching to detailed mode. The Eye will leave nothing unseen." };
  if (/\b(normal (detail|mode|responses?)|standard (mode|detail)|reset (detail|verbosity))\b/i.test(lower)) return { field: "detail_level", value: "standard", acknowledgment: "Back to standard detail level." };
  if (/\b(just (the )?(data|facts|numbers)|no (personality|persona|fluff|flavor)|data only|skip the (persona|character|eye stuff|mystique))\b/i.test(lower)) return { field: "tone_preference", value: "data_only", acknowledgment: "Data-only mode. Raw signal, no persona." };
  if (/\b(tone it down|less (dramatic|intense|mystique)|moderate (tone|persona)|dial (it )?back)\b/i.test(lower)) return { field: "tone_preference", value: "moderate", acknowledgment: "Noted. The Eye moderates its gaze." };
  if (/\b(full (persona|character|eye)|bring back the (eye|persona|mystique)|normal (tone|voice|persona))\b/i.test(lower)) return { field: "tone_preference", value: "full_persona", acknowledgment: "The Eye returns to full presence." };
  const customMatch = lower.match(/\b(?:always|from now on|remember to|whenever i ask|every time|going forward)[,:?]?\s+(.+)/i);
  if (customMatch && customMatch[1].length > 10 && customMatch[1].length < 500) return { field: "custom_instructions", value: customMatch[1].trim(), acknowledgment: `Noted. The Eye will remember: "${customMatch[1].trim()}"` };
  if (/\b(show|what are|display|list) (my )?(preferences?|settings?)\b/i.test(lower)) return { field: "__show__", value: null, acknowledgment: "" };
  if (/\b(reset|clear|default) (my )?(preferences?|settings?)\b/i.test(lower)) return { field: "__reset__", value: null, acknowledgment: "Preferences reset to defaults. Clean slate." };
  return null;
}

export async function applyPreferenceUpdate(userId: string, update: PreferenceUpdate): Promise<string> {
  const prodClient = getProductionClient();
  if (update.field === "__show__") { const prefs = await fetchUserPreferences(userId); const topTopics = Object.entries(prefs.topic_counts).sort(([,a],[,b]) => b-a).slice(0,5).map(([k,v]) => `${k.replace(/_/g," ")} (${v})`).join(", "); return `**Your Preferences**\n\n**Detail Level:** ${prefs.detail_level}\n**Tone:** ${prefs.tone_preference.replace(/_/g," ")}\n**Custom Instructions:** ${prefs.custom_instructions||"None"}\n**Total Messages:** ${prefs.total_messages}\n**Top Topics:** ${topTopics||"Still learning..."}\n**Pinned Context:** ${prefs.pinned_context_ids.length} item(s)\n\nSay **"be concise"**, **"more detail"**, **"data only"**, or **"always [instruction]"** to adjust.`; }
  if (update.field === "__reset__") { await prodClient.from("user_preferences").update({ detail_level:"standard", tone_preference:"full_persona", custom_instructions:null, pinned_context_ids:[] }).eq("user_id", userId); return update.acknowledgment; }
  if (update.field === "custom_instructions") { const prefs = await fetchUserPreferences(userId); const existing = prefs.custom_instructions || ""; await prodClient.from("user_preferences").update({ custom_instructions: existing ? `${existing}\n${update.value}` : update.value }).eq("user_id", userId); return update.acknowledgment; }
  await prodClient.from("user_preferences").update({ [update.field]: update.value }).eq("user_id", userId);
  return update.acknowledgment;
}

export async function updateLearnedPreferences(userId: string, intent: ClassifiedIntent, messageLength: number): Promise<void> {
  try {
    const prodClient = getProductionClient();
    const prefs = await fetchUserPreferences(userId);
    const topicCounts = { ...prefs.topic_counts };
    for (const i of intent.intents) topicCounts[i] = (topicCounts[i] || 0) + 1;
    const intentCounts = { ...prefs.intent_counts };
    for (const c of intent.categories) intentCounts[c] = (intentCounts[c] || 0) + 1;
    const frequentTopics = Object.entries(topicCounts).sort(([,a],[,b]) => b-a).slice(0,5).map(([k]) => k);
    const frequentIntents = Object.entries(intentCounts).sort(([,a],[,b]) => b-a).slice(0,5).map(([k]) => k);
    const preferredCategories = Object.entries(intentCounts).sort(([,a],[,b]) => b-a).slice(0,5).map(([k]) => k);
    await prodClient.from("user_preferences").update({ topic_counts: topicCounts, intent_counts: intentCounts, frequent_topics: frequentTopics, frequent_intents: frequentIntents, preferred_categories: preferredCategories, avg_message_length: messageLength < 50 ? "short" : messageLength > 300 ? "long" : "medium", total_messages: prefs.total_messages + 1, last_active_at: new Date().toISOString() }).eq("user_id", userId);
  } catch (e) { console.error("[lib] Failed to update learned preferences:", e); }
}

export async function fetchPinnedContext(pinnedIds: string[]): Promise<string> {
  if (!pinnedIds || pinnedIds.length === 0) return "";
  try {
    const contextClient = getContextClient();
    const { data } = await contextClient.from("business_context").select("category, key, value").in("id", pinnedIds);
    if (!data?.length) return "";
    return "PINNED CONTEXT (user always wants this):\n" + data.map((e: any) => `[${e.category}/${e.key}] ${e.value}`).join("\n\n");
  } catch { return ""; }
}

export interface InventoryFilters { batchPrefixes: string[]; strainPatterns: string[]; gradeCodes: string[]; hasFilters: boolean; }

const KNOWN_STRAINS: string[] = ["animal tsunami","bananaconda","black maple","blue pave","capulator junky","chembanger","chemlatto","cherry paloma","dante's inferno","devil driver","dog walker","early riser","flavor flav","gas face","georgia apple pie","lemondary","magic marker","orange sherb","peanut butter breath","pie scream","purple ice water","rainbow inferno","silver marker","smackles","stay puft","strawguava","swamp water fumez","tahoe larry","trillionz","valley dog","violet fog","white devil","z marker","zoda pop"];
const BATCH_STRAIN_CODES: Record<string, string> = {"asu":"animal tsunami","blm":"black maple","blp":"blue pave","cap":"capulator junky","chl":"chemlatto","chp":"cherry paloma","dog":"dog walker","ear":"early riser","flf":"flavor flav","gas":"gas face","gap":"georgia apple pie","lmd":"lemondary","mgm":"magic marker","ors":"orange sherb","pbb":"peanut butter breath","pis":"pie scream","piw":"purple ice water","rbi":"rainbow inferno","stg":"strawguava","thl":"tahoe larry","tlz":"trillionz","vld":"valley dog","vio":"violet fog","zmk":"z marker"};

export function parseInventoryFilters(message: string): InventoryFilters {
  const lower = message.toLowerCase();
  const batchPrefixes: string[] = [];
  const strainPatterns: string[] = [];
  const gradeCodes: string[] = [];
  const fullBatchPattern = /\b(\d{6})-([a-z]{2,4})\b/gi;
  let match;
  while ((match = fullBatchPattern.exec(message)) !== null) { const prefix = `${match[1]}-${match[2].toUpperCase()}`; if (!batchPrefixes.includes(prefix)) batchPrefixes.push(prefix); }
  const bareBatchPattern = /\b(2[4-9]\d{4})\b/g;
  while ((match = bareBatchPattern.exec(message)) !== null) { const candidate = match[1]; const month = parseInt(candidate.slice(2,4)); const day = parseInt(candidate.slice(4,6)); if (month>=1&&month<=12&&day>=1&&day<=31) { if (!batchPrefixes.some(b=>b.startsWith(candidate))) batchPrefixes.push(candidate); } }
  for (const strain of KNOWN_STRAINS) { if (lower.includes(strain)) { const cap = strain.split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" "); if (!strainPatterns.includes(cap)) strainPatterns.push(cap); } }
  const codePattern = /\b([a-z]{3})\b/gi;
  while ((match = codePattern.exec(message)) !== null) { const code = match[1].toLowerCase(); if (BATCH_STRAIN_CODES[code]) { const strain = BATCH_STRAIN_CODES[code]; const cap = strain.split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" "); if (!strainPatterns.includes(cap)) strainPatterns.push(cap); } }
  // Grade detection: "C grade", "grade D", "CULT grade", "B", "C", "D" in grade context
  if (/\bcult\s*grade\b|\bgrade\s*cult\b/i.test(lower)) { if (!gradeCodes.includes("CULT")) gradeCodes.push("CULT"); }
  if (/\b[Bb]\s*grade\b|\bgrade\s*[Bb]\b/i.test(message)) { if (!gradeCodes.includes("B")) gradeCodes.push("B"); }
  if (/\b[Cc]\s*grade\b|\bgrade\s*[Cc]\b|\bc\s*&\s*d\b/i.test(message)) { if (!gradeCodes.includes("C")) gradeCodes.push("C"); }
  if (/\b[Dd]\s*grade\b|\bgrade\s*[Dd]\b|\bc\s*&\s*d\b/i.test(message)) { if (!gradeCodes.includes("D")) gradeCodes.push("D"); }
  if (/\bundefined\s*grade\b|\bgrade\s*undefined\b|\bno\s*grade\b|\bungraded\b/i.test(lower)) { if (!gradeCodes.includes("UNDEFINED")) gradeCodes.push("UNDEFINED"); }
  // Standalone grade letters in inventory context (e.g., "all the C & D grade", "count of C and D")
  if (/\bgrade/i.test(lower)) {
    if (/\bC\b/.test(message) && !gradeCodes.includes("C")) gradeCodes.push("C");
    if (/\bD\b/.test(message) && !gradeCodes.includes("D")) gradeCodes.push("D");
    if (/\bB\b/.test(message) && !gradeCodes.includes("B")) gradeCodes.push("B");
  }
  return { batchPrefixes, strainPatterns, gradeCodes, hasFilters: batchPrefixes.length > 0 || strainPatterns.length > 0 || gradeCodes.length > 0 };
}

export type AccessTier = "owner" | "admin" | "collaborator" | "public";
export function getUserAccessTier(profile: UserProfile): AccessTier { if (profile.isCreator) return "owner"; if (profile.role === "admin") return "admin"; return "collaborator"; }
export function getAllowedVisibilities(tier: AccessTier): string[] { switch (tier) { case "owner": return ["private","admin","collaborator","public"]; case "admin": return ["admin","collaborator","public"]; case "collaborator": return ["collaborator","public"]; case "public": return ["public"]; } }
export function getProductionClient() { return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!); }
export function getContextClient() { const url = Deno.env.get("CONTEXT_DB_URL"); const key = Deno.env.get("CONTEXT_DB_SERVICE_KEY"); if (!url||!key) throw new Error("Context DB credentials not configured"); return createClient(url, key); }

export async function verifyAuth(req: Request): Promise<UserProfile> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing Authorization header");
  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const internalUserId = req.headers.get("x-cultops-user-id");
  const internalSource = req.headers.get("x-cultops-source");
  if (token === serviceRoleKey && internalUserId) {
    const prodClient = getProductionClient();
    const { data: profile } = await prodClient.from("user_profiles").select("id, full_name, email, role").eq("id", internalUserId).single();
    if (!profile) throw new Error("User profile not found");
    const isCreator = (profile.email||"").toLowerCase().includes("justin") || (profile.full_name||"").toLowerCase().includes("justin morrow");
    return { userId: profile.id, email: profile.email||"unknown", fullName: profile.full_name||"Unknown", role: profile.role, isCreator };
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY") || serviceRoleKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Invalid token");
  const prodClient = getProductionClient();
  const { data: profile } = await prodClient.from("user_profiles").select("full_name, email, role").eq("id", user.id).single();
  if (!profile) throw new Error("User profile not found");
  const isCreator = (profile.email||user.email||"").toLowerCase().includes("justin") || (profile.full_name||"").toLowerCase().includes("justin morrow");
  return { userId: user.id, email: profile.email||user.email||"unknown", fullName: profile.full_name||"Unknown", role: profile.role, isCreator };
}

export async function fetchUserContext(userProfile: UserProfile): Promise<UserContext> {
  const prodClient = getProductionClient();
  const [sessionsResult, ticketsResult, countResult] = await Promise.all([
    prodClient.from("ai_chat_sessions").select("title, created_at").eq("user_id", userProfile.userId).order("created_at", { ascending: false }).limit(5),
    prodClient.from("tickets").select("id", { count: "exact", head: true }).eq("reported_by", userProfile.userId).in("status", ["open","in_progress"]),
    prodClient.from("ai_chat_sessions").select("id", { count: "exact", head: true }).eq("user_id", userProfile.userId),
  ]);
  const recentSessions: Array<{ title: string; date: string; messageCount: number }> = [];
  if (sessionsResult.data) { for (const s of sessionsResult.data) { recentSessions.push({ title: s.title||"Untitled", date: new Date(s.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}), messageCount: 0 }); } }
  return { profile: userProfile, recentSessions, openTickets: ticketsResult.count||0, totalSessions: countResult.count||0 };
}

export interface ClassifiedIntent { primary: string; intents: string[]; financial: boolean; categories: string[]; }

export function classifyIntent(message: string): ClassifiedIntent {
  const lower = message.toLowerCase();
  let intents: string[] = [];
  const categories: string[] = [];
  let financial = false;
  if (/distill|extract.?knowledge|learn from.?(chat|conversation|session)|scan.?(chat|conversation|session)/i.test(lower)) return { primary:"distill", intents:["distill"], financial:false, categories:[] };
  if (/pending.?(knowledge|candidate|insight)|review.?(candidate|knowledge|insight)|show.?candidate|what.?did.?(you|the eye).?learn/i.test(lower)) return { primary:"review_candidates", intents:["review_candidates"], financial:false, categories:[] };
  if (/^approve\s+/i.test(lower.trim())) return { primary:"approve_candidate", intents:["approve_candidate"], financial:false, categories:[] };
  if (/^reject\s+/i.test(lower.trim())) return { primary:"reject_candidate", intents:["reject_candidate"], financial:false, categories:[] };
  if (/show.?tickets?|pending.?tickets?|ticket.?(status|overview|triage|list|queue)/i.test(lower)) return { primary:"show_tickets", intents:["show_tickets"], financial:false, categories:[] };
  // v35: Cowork queue intent — Creator only in practice (index.ts enforces)
  if (/cowork.?(queue|tasks?|list|backlog)|show.?(cowork|the queue|build queue)|what.?s.?(pending|in the queue|queued)|queue.?status/i.test(lower)) return { primary:"cowork_queue", intents:["cowork_queue"], financial:false, categories:["development_workflow"] };
  if (/bug|broken|not working|issue|fix this|error|crash|wrong|glitch|something.?s? wrong|report.?(bug|issue|problem)/i.test(lower)) intents.push("work_ticket");
  if (/feature.?request|can we add|could we (have|add|get|build)|would be nice|enhancement|i wish|suggest(ion)?|we should (add|build|have|create)|we need (a |an |to add)|it.?d be great|new feature|missing.?(feature|ability|capability)|request.?(a |an |the |to )/i.test(lower)) intents.push("request_ticket");
  if (intents.includes("work_ticket") && intents.includes("request_ticket")) { if (/broken|not working|error|crash|wrong|glitch|bug/i.test(lower)) intents = intents.filter(i=>i!=="request_ticket"); else intents = intents.filter(i=>i!=="work_ticket"); }
  if (/revenue|profit|deficit|burn|break.?even|financial|money|cash|ar\b|accounts?.receivable|margin|\$\d|budget|cost|price|gross|net\b|sale[s]?\b|income|earning|billing|invoice|collect|owe[ds]?|debt|roi/i.test(lower)) { intents.push("financial"); financial=true; categories.push("strategy","sales_motion"); }
  if (/priori|strateg|what.?should|what.?(do|need|can)\s+we|recommend|guidance|plan|next|goal|target|hit|reach|make\s+\$|how.?(do|can).?we|need.?to|gap|shortfall|catch.?up|get.?to|path.?to/i.test(lower)) { intents.push("guidance"); financial=true; categories.push("strategy","operations"); }
  if (/staff|team|employee|people|person|who\s+(is|works|runs|leads|manages)|org.?chart|department|role[s]?\b|hire|payroll|performance|review|90.?day|headcount|report.?to/i.test(lower)) { intents.push("people"); categories.push("people"); }
  if (/\b(andrew|laura|leo|josie|greg|dave|sam|james|scott|david|carver|ynez)\b/i.test(lower)) { if (!intents.includes("people")) intents.push("people"); if (!categories.includes("people")) categories.push("people"); }
  if (/\bjustin\b|\bcreator\b|\bfounder\b|who.?(built|made|created|started)|ceo/i.test(lower)) { intents.push("creator"); categories.push("people","architecture"); }
  if (/inventor|stock|atp|available|package[ds]?\b|sku|product(?!ion)|trim|bulk|sellable|menu|quote|what.?can.?(i|we).?sell|what.?do.?(we|i).?have|\bgrade[ds]?\b|\bgrading\b|[ABCD]\s*grade|grade\s*[ABCD]|cult\s*grade/i.test(lower)) { intents.push("inventory"); categories.push("inventory","inventory_pipeline","inventory_audit"); }
  if (/order|deliver|ship|fulfill|sold\b|have we sold|sales?\s*history|purchased|who bought|what.?s? been sold/i.test(lower)) { intents.push("orders"); categories.push("delivery_model"); }
  if (/product(ion)?\s*(queue|schedule|velocity|throughput)|buck|packag(e|ing)\s*session/i.test(lower)) { intents.push("production"); categories.push("operations"); }
  if (/cultiv|plant|strain|grow|room|flower|veg|clone|mother|harvest/i.test(lower)) { intents.push("cultivation"); categories.push("cultivation","harvest_metrics"); }
  if (/customer|account|crm|dispen|sales|prospect|pipeline|visit|leo/i.test(lower)) { intents.push("crm"); categories.push("crm","sales_motion"); }
  if (/app|system|architect|database|schema|edge.?function|supabase|code|deploy|build/i.test(lower)) categories.push("architecture","infrastructure","database");
  if (/los\b|rosin|hash|press|wash|solventless/i.test(lower)) categories.push("cult_los","rosin_lab","rosin_lab_schema");
  if (intents.length === 0) { if (/how.?are.?we|where.?(do|are).?we.?stand|status|overview|summary|state.?of|health/i.test(lower)) { intents.push("guidance","financial"); financial=true; categories.push("strategy","operations"); } else intents.push("knowledge"); }
  return { primary: intents[0], intents, financial, categories: [...new Set(categories)] };
}
