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

export interface InventoryFilters { batchPrefixes: string[]; strainPatterns: string[]; hasFilters: boolean; }

const KNOWN_STRAINS: string[] = ["animal tsunami","bananaconda","black maple","blue pave","capulator junky","chembanger","chemlatto","cherry paloma","dante's inferno","devil driver","dog walker","early riser","flavor flav","gas face","georgia apple pie","lemondary","magic marker","orange sherb","peanut butter breath","pie scream","purple ice water","rainbow inferno","silver marker","smackles","stay puft","strawguava","swamp water fumez","tahoe larry","trillionz","valley dog","violet fog","white devil","z marker","zoda pop"];
const BATCH_STRAIN_CODES: Record<string, string> = {"asu":"animal tsunami","blm":"black maple","blp":"blue pave","cap":"capulator junky","chl":"chemlatto","chp":"cherry paloma","dog":"dog walker","ear":"early riser","flf":"flavor flav","gas":"gas face","gap":"georgia apple pie","lmd":"lemondary","mgm":"magic marker","ors":"orange sherb","pbb":"peanut butter breath","pis":"pie scream","piw":"purple ice water","rbi":"rainbow inferno","stg":"strawguava","thl":"tahoe larry","tlz":"trillionz","vld":"valley dog","vio":"violet fog","zmk":"z marker"};

export function parseInventoryFilters(message: string): InventoryFilters {
  const lower = message.toLowerCase();
  const batchPrefixes: string[] = [];
  const strainPatterns: string[] = [];
  const fullBatchPattern = /\b(\d{6})-([a-z]{2,4})\b/gi;
  let match;
  while ((match = fullBatchPattern.exec(message)) !== null) { const prefix = `${match[1]}-${match[2].toUpperCase()}`; if (!batchPrefixes.includes(prefix)) batchPrefixes.push(prefix); }
  const bareBatchPattern = /\b(2[4-9]\d{4})\b/g;
  while ((match = bareBatchPattern.exec(message)) !== null) { const candidate = match[1]; const month = parseInt(candidate.slice(2,4)); const day = parseInt(candidate.slice(4,6)); if (month>=1&&month<=12&&day>=1&&day<=31) { if (!batchPrefixes.some(b=>b.startsWith(candidate))) batchPrefixes.push(candidate); } }
  for (const strain of KNOWN_STRAINS) { if (lower.includes(strain)) { const cap = strain.split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" "); if (!strainPatterns.includes(cap)) strainPatterns.push(cap); } }
  const codePattern = /\b([a-z]{3})\b/gi;
  while ((match = codePattern.exec(message)) !== null) { const code = match[1].toLowerCase(); if (BATCH_STRAIN_CODES[code]) { const strain = BATCH_STRAIN_CODES[code]; const cap = strain.split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" "); if (!strainPatterns.includes(cap)) strainPatterns.push(cap); } }
  return { batchPrefixes, strainPatterns, hasFilters: batchPrefixes.length > 0 || strainPatterns.length > 0 };
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
  if (/inventor|stock|atp|available|package[ds]?\b|sku|product(?!ion)|trim|bulk|sellable|menu|quote|what.?can.?(i|we).?sell|what.?do.?(we|i).?have/i.test(lower)) { intents.push("inventory"); categories.push("inventory","inventory_pipeline","inventory_audit"); }
  if (/order|deliver|ship|fulfill/i.test(lower)) { intents.push("orders"); categories.push("delivery_model"); }
  if (/product(ion)?\s*(queue|schedule|velocity|throughput)|buck|packag(e|ing)\s*session/i.test(lower)) { intents.push("production"); categories.push("operations"); }
  if (/cultiv|plant|strain|grow|room|flower|veg|clone|mother|harvest/i.test(lower)) { intents.push("cultivation"); categories.push("cultivation","harvest_metrics"); }
  if (/customer|account|crm|dispen|sales|prospect|pipeline|visit|leo/i.test(lower)) { intents.push("crm"); categories.push("crm","sales_motion"); }
  if (/app|system|architect|database|schema|edge.?function|supabase|code|deploy|build/i.test(lower)) categories.push("architecture","infrastructure","database");
  if (/los\b|rosin|hash|press|wash|solventless/i.test(lower)) categories.push("cult_los","rosin_lab","rosin_lab_schema");
  if (intents.length === 0) { if (/how.?are.?we|where.?(do|are).?we.?stand|status|overview|summary|state.?of|health/i.test(lower)) { intents.push("guidance","financial"); financial=true; categories.push("strategy","operations"); } else intents.push("knowledge"); }
  return { primary: intents[0], intents, financial, categories: [...new Set(categories)] };
}
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  type Attachment, type AccessTier, type ClassifiedIntent, type UserContext,
  type UserPreferences, type UserProfile, type PersonaProfile,
  CLAUDE_API_URL, CLAUDE_MODEL,
  getProductionClient, getContextClient, getAllowedVisibilities,
  parseInventoryFilters,
} from "./lib.ts";

// ============================================================
// handlers.ts v37 — CONVERSATIONAL KNOWLEDGE SUPPORT
// v34: Reconciled merge (canonical base)
// v35: Cowork queue integration
// v36 additions: uploadAttachments error logging
//   + handleShowCoworkQueue() — Creator-only queue view
//   + fetchLiveData() — cowork_queue intent queries context DB
//   + buildSystemPrompt() — queue count in Creator briefing
//   + handleWorkTicketIntake() — auto-writes cowork task on bug report
// v37 additions: fixed category filtering to include "people", lowered autoApprove threshold to 0.85, adjusted EXTRACTION_PROMPT.
// All v34 handlers preserved exactly.
// ============================================================

// ============================================================
// INTERACTION LOGGING
// ============================================================

export async function logInteraction(
  userEmail: string, sessionId: string | null, rawMessage: string,
  intentClassified: string, categoriesMatched: string[],
  resultType: "confident" | "fallback" | "no_answer" | "error",
  latencyMs: number, tablesQueried: string[] = []
): Promise<void> {
  try {
    const contextClient = getContextClient();
    const { data: profile } = await contextClient.from("user_profiles").select("id").eq("email", userEmail).single();
    await contextClient.from("user_interaction_log").insert({
      user_id: profile?.id || null, user_email: userEmail, session_id: null,
      queried_at: new Date().toISOString(), raw_message: rawMessage.slice(0, 1000),
      intent_classified: intentClassified, category_matched: categoriesMatched[0] || null,
      tables_queried: tablesQueried, result_type: resultType, response_latency_ms: latencyMs,
    });
    if (profile?.id) await contextClient.from("user_profiles").update({ last_active_at: new Date().toISOString() }).eq("id", profile.id);
  } catch { }
}

// ============================================================
// v35: COWORK QUEUE HANDLER
// ============================================================

export async function handleShowCoworkQueue(): Promise<string> {
  try {
    const contextClient = getContextClient();
    const { data: items, error } = await contextClient
      .from("cowork_queue")
      .select("id, title, task_type, priority, target_system, confidence, status, created_at, blocked_by")
      .in("status", ["pending", "needs_review", "in_progress"])
      .is("result", null)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });
    if (error || !items?.length) return "Cowork queue is empty. The system is current.";
    const priorityOrder: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };
    const sorted = [...items].sort((a, b) => (priorityOrder[a.priority]||5) - (priorityOrder[b.priority]||5));
    const confIcon = (c: string) => c === "high" ? "\uD83D\uDFE2" : c === "medium" ? "\uD83D\uDFE1" : "\uD83D\uDD34";
    const prioIcon = (p: string) => p === "critical" ? "\uD83D\uDD34" : p === "high" ? "\uD83D\uDFE0" : p === "medium" ? "\uD83D\uDFE1" : "\u26AA";
    let r = `**Cowork Queue** — ${sorted.length} pending\n\n`;
    for (const item of sorted) {
      r += `${prioIcon(item.priority)} **\`${item.id.slice(0,8)}\`** ${confIcon(item.confidence)} | ${item.task_type.replace(/_/g," ")} | ${item.target_system||"—"}\n`;
      r += `${item.title}\n`;
      if (item.blocked_by) r += `> \u26A0\uFE0F Blocked: ${item.blocked_by}\n`;
      r += `\n`;
    }
    r += `---\n\uD83D\uDFE2 auto-execute  \uD83D\uDFE1 confirm first  \uD83D\uDD34 needs review\nSay **"run the queue"** to hand to Cowork, or **"skip [id]"** to cancel an item.`;
    return r;
  } catch (e) {
    return `Could not load cowork queue: ${e}`;
  }
}

// ============================================================
// TICKET HANDLERS — v35: bug reports also write cowork tasks
// ============================================================

export async function handleWorkTicketIntake(
  message: string, attachments: Attachment[], userId: string,
  sessionId: string | null, reporterName?: string
): Promise<string> {
  const prodClient = getProductionClient();
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;
  const classificationResponse = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CLAUDE_MODEL, max_tokens: 1024,
      system: `You are classifying a bug/issue report for CULT Cannabis Operations software. Return ONLY valid JSON with: title (max 60 chars), severity (low/medium/high/critical), category (bug/data_issue/ui_issue/performance/other), affected_area (inventory/sales/crm/cultivation/production/delivery/finance/admin/general), summary (2-3 sentences), steps_to_reproduce (inferred or null), task_type (one of: db_correction/frontend_fix/edge_function_deploy/investigation), target_system (cultops_frontend/production_db/edge_function/context_db).`,
      messages: [{ role: "user", content: message }],
    }),
  });
  let classification: any = { title: message.slice(0, 60), severity: "medium", category: "bug", affected_area: "general", summary: message, task_type: "investigation", target_system: "cultops_frontend" };
  try { const r = await classificationResponse.json(); classification = JSON.parse(r.content?.[0]?.text || ""); } catch { }
  const storedAttachments = await uploadAttachments(attachments, "tickets");
  const { data: ticket, error } = await prodClient.from("tickets").insert({
    type: "work", reported_by: userId, chat_session_id: sessionId,
    title: classification.title, description: message, severity: classification.severity,
    bug_category: classification.category, affected_area: classification.affected_area,
    ai_classification: classification, ai_analysis: classification.summary, attachments: storedAttachments,
  }).select("id").single();
  if (error) return "The Eye encountered an error logging this ticket.";
  // v35: Also write a cowork task so it surfaces in the queue automatically
  try {
    const contextClient = getContextClient();
    const severityToPriority: Record<string, string> = { critical: "critical", high: "high", medium: "medium", low: "low" };
    await contextClient.from("cowork_queue").insert({
      title: classification.title,
      description: `Reported by ${reporterName||"team member"} via AI widget. Ticket ID: ${ticket.id.slice(0,8)}.\n\nOriginal report: ${message.slice(0,500)}\n\nAI summary: ${classification.summary}\n\nSteps to reproduce: ${classification.steps_to_reproduce||"Not specified."}`,
      task_type: classification.task_type || "investigation",
      priority: severityToPriority[classification.severity] || "medium",
      target_system: classification.target_system || "cultops_frontend",
      confidence: "low",  // always low for widget-reported bugs — need Creator review
      created_by_session: `widget_bug_report_${new Date().toISOString().slice(0,10)}`,
    });
  } catch { /* non-blocking — ticket is already created */ }
  const sev = classification.severity === "critical" ? "This demands immediate attention." : classification.severity === "high" ? "This is a priority." : "It has been recorded.";
  return `**Issue Logged** — ID: \`${ticket.id.slice(0,8)}\`\n\n**"${classification.title}"**\n\n${classification.summary}\n\n**Severity:** ${classification.severity.toUpperCase()} | **Area:** ${classification.affected_area}\n\n${sev} Added to the build queue.`;
}

export async function handleRequestIntake(
  message: string, attachments: Attachment[], userId: string, sessionId: string | null
): Promise<string> {
  const prodClient = getProductionClient();
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;
  const analysisResponse = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 1024, system: `You are analyzing a feature/enhancement request for CULT Cannabis Operations. Return ONLY valid JSON with: title (max 60 chars), request_type (feature/enhancement/integration/workflow/ux_improvement), priority (nice_to_have/should_have/must_have), affected_area (inventory/sales/crm/cultivation/production/delivery/finance/admin), business_case (1-2 sentences), feasibility (straightforward/moderate/complex/requires_research), effort_estimate (small/medium/large/epic), affected_modules (array), similar_existing (null or string), summary (2-3 sentences).`, messages: [{ role: "user", content: message }] }),
  });
  let analysis: any = { title: message.slice(0, 60), request_type: "feature", priority: "nice_to_have", affected_area: "general", business_case: message, feasibility: "moderate", effort_estimate: "medium", affected_modules: [], similar_existing: null, summary: message };
  try { const r = await analysisResponse.json(); analysis = JSON.parse(r.content?.[0]?.text || ""); } catch { }
  const storedAttachments = await uploadAttachments(attachments, "requests");
  const { data: ticket, error } = await prodClient.from("tickets").insert({
    type: "request", reported_by: userId, chat_session_id: sessionId,
    title: analysis.title, description: message, priority: analysis.priority,
    request_type: analysis.request_type, affected_area: analysis.affected_area, business_case: analysis.business_case,
    ai_classification: { feasibility: analysis.feasibility, effort_estimate: analysis.effort_estimate, affected_modules: analysis.affected_modules, similar_existing: analysis.similar_existing, summary: analysis.summary },
    ai_analysis: analysis.summary, attachments: storedAttachments,
  }).select("id").single();
  if (error) return "The Eye encountered an error recording this request.";
  const fMsg: Record<string,string> = { straightforward:"The path is clear.", moderate:"The architecture will bend to accommodate.", complex:"An ambitious vision.", requires_research:"This requires study first." };
  return `**Request Recorded** — ID: \`${ticket.id.slice(0,8)}\`\n\n**"${analysis.title}"**\n\n${fMsg[analysis.feasibility]||"Noted."}\n\n**Priority:** ${(analysis.priority||"nice_to_have").replace(/_/g," ").toUpperCase()} | **Effort:** ${analysis.effort_estimate}\n${analysis.business_case}\n\nThe Creator's vision expands.`;
}

export async function uploadAttachments(attachments: Attachment[], prefix: string): Promise<any[]> {
  if (!attachments || attachments.length === 0) return [];
  const prodClient = getProductionClient();
  const stored: any[] = [];
  for (const att of attachments) {
    try {
      const binaryString = atob(att.base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const path = `${prefix}/${crypto.randomUUID()}/${att.fileName}`;
      const { error } = await prodClient.storage.from("chat-attachments").upload(path, bytes, { contentType: att.mimeType });
      if (error) {
        console.error(`[v36] uploadAttachments storage error for ${att.fileName}: ${error.message}`);
      } else {
        stored.push({ path, type: att.mimeType, name: att.fileName });
      }
    } catch (e) { console.error(`[v36] uploadAttachments exception for ${att.fileName}: ${e}`); }
  }
  return stored;
}

// ============================================================
// KNOWLEDGE PIPELINE — unchanged from v34
// ============================================================

const EXTRACTION_PROMPT = `You are a knowledge extraction system for CULT Cannabis Operations. Extract REUSABLE institutional knowledge from this chat conversation.

Focus on: financial benchmarks, operational metrics, strategic decisions, process changes, data corrections, people/org insights, staff roles, operational feedback, team feelings, architecture decisions, inventory insights, CRM patterns.

Do NOT extract: greetings, small talk, test messages, the Eye's personality rules, anything about "the Creator" or "Justin" identity.

For each item provide:
- category: one of (strategy, operations, financial, cultivation, inventory, crm, people, architecture, infrastructure, sales_motion, delivery_model)
- key: snake_case identifier
- value: 2-4 sentence factual statement
- confidence: 0.0-1.0

Return JSON array. Only confidence >= 0.70. Return [] if nothing. ONLY valid JSON.`;

export async function handleDistill(userId: string, tier: AccessTier): Promise<string> {
  if (tier !== "owner" && tier !== "admin") return "Knowledge distillation requires admin access.";
  const prodClient = getProductionClient();
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;
  const { data: sessions } = await prodClient.from("ai_chat_sessions").select("id, title, created_at").order("created_at", { ascending: false });
  if (!sessions?.length) return "No chat sessions found.";
  const { data: alreadyDistilled } = await prodClient.from("chat_knowledge_candidates").select("source_session");
  const distilledIds = new Set((alreadyDistilled||[]).map((d: any) => d.source_session));
  const undistilled = sessions.filter((s: any) => !distilledIds.has(s.id));
  if (undistilled.length === 0) return "All sessions distilled. The Eye's memory is current.";
  let totalCandidates = 0;
  const sessionResults: string[] = [];
  for (const session of undistilled) {
    const { data: messages } = await prodClient.from("ai_chat_messages").select("id, role, content").eq("session_id", session.id).order("created_at");
    if (!messages || messages.length < 3) { sessionResults.push(`\u2022 "${session.title?.slice(0,50)}" — too short`); continue; }
    const convo = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
    const response = await fetch(CLAUDE_API_URL, { method:"POST", headers:{"x-api-key":anthropicKey,"anthropic-version":"2023-06-01","Content-Type":"application/json"}, body:JSON.stringify({ model:CLAUDE_MODEL, max_tokens:2048, system:EXTRACTION_PROMPT, messages:[{role:"user",content:`Session: "${session.title}"\n\n${convo}`}] }) });
    if (!response.ok) { sessionResults.push(`\u2022 "${session.title?.slice(0,50)}" — failed`); continue; }
    let candidates: any[];
    try { const r = await response.json(); candidates = JSON.parse(r.content?.[0]?.text||"[]"); if (!Array.isArray(candidates)) candidates=[]; } catch { candidates=[]; }
    if (candidates.length > 0) {
      const msgIds = messages.map((m: any) => m.id);
      await prodClient.from("chat_knowledge_candidates").insert(candidates.map((c: any) => ({ source_session:session.id, source_messages:msgIds, proposed_category:c.category, proposed_key:c.key, proposed_value:c.value, confidence_score:Math.min(1.0,Math.max(0.0,c.confidence)), status:"pending" })));
      totalCandidates += candidates.length;
      sessionResults.push(`\u2022 "${session.title?.slice(0,50)}" — **${candidates.length} insights**`);
    } else sessionResults.push(`\u2022 "${session.title?.slice(0,50)}" — no actionable knowledge`);
  }
  return `**Distillation Complete**\n\n${undistilled.length} session(s), **${totalCandidates} candidates**.\n\n${sessionResults.join("\n")}\n\n${totalCandidates > 0 ? "Say **\"show pending candidates\"** to review." : ""}`;
}

export async function handleReviewCandidates(tier: AccessTier): Promise<string> {
  if (tier !== "owner" && tier !== "admin") return "Knowledge review requires admin access.";
  const prodClient = getProductionClient();
  const { data: candidates } = await prodClient.from("chat_knowledge_candidates").select("id, proposed_category, proposed_key, proposed_value, confidence_score").eq("status","pending").order("confidence_score",{ascending:false}).limit(15);
  if (!candidates?.length) return "No pending candidates.";
  let r = `**${candidates.length} Pending Candidates**\n\n`;
  for (const c of candidates) r += `---\n**\`${c.id.slice(0,8)}\`** | ${c.proposed_category} | ${(c.confidence_score*100).toFixed(0)}%\n**${c.proposed_key.replace(/_/g," ")}**\n${c.proposed_value}\n\n`;
  r += `---\n**approve ${candidates[0].id.slice(0,8)}** / **reject ${candidates[0].id.slice(0,8)}** / **approve all**`;
  return r;
}

export async function handleApproveCandidate(message: string, userId: string, tier: AccessTier): Promise<string> {
  if (tier !== "owner" && tier !== "admin") return "Knowledge approval requires admin access.";
  const prodClient = getProductionClient();
  const contextClient = getContextClient();
  const lower = message.toLowerCase().trim();
  if (/approve\s+all/i.test(lower)) {
    const { data: pending } = await prodClient.from("chat_knowledge_candidates").select("*").eq("status","pending");
    if (!pending?.length) return "No pending candidates.";
    let merged = 0;
    for (const c of pending) {
      const { data: ins } = await contextClient.from("business_context").insert({ category:c.proposed_category, key:c.proposed_key, value:c.proposed_value, source:`chat_distill_${c.source_session?.slice(0,8)}` }).select("id").single();
      await prodClient.from("chat_knowledge_candidates").update({ status:"merged", reviewed_by:userId, reviewed_at:new Date().toISOString(), merged_to_id:ins?.id||null }).eq("id",c.id);
      merged++;
    }
    return `**All ${merged} candidates merged.** The Eye grows stronger.`;
  }
  const idMatch = lower.match(/approve\s+([a-f0-9]{8})/i);
  if (!idMatch) return "Specify: **approve a3f7b2c1** or **approve all**";
  const { data: candidates } = await prodClient.from("chat_knowledge_candidates").select("*").eq("status","pending").like("id",`${idMatch[1]}%`);
  if (!candidates?.length) return `No pending candidate matching \`${idMatch[1]}\`.`;
  const c = candidates[0];
  const { data: ins } = await contextClient.from("business_context").insert({ category:c.proposed_category, key:c.proposed_key, value:c.proposed_value, source:`chat_distill_${c.source_session?.slice(0,8)}` }).select("id").single();
  await prodClient.from("chat_knowledge_candidates").update({ status:"merged", reviewed_by:userId, reviewed_at:new Date().toISOString(), merged_to_id:ins?.id||null }).eq("id",c.id);
  return `**Approved:** \`${idMatch[1]}\` — [${c.proposed_category}] ${c.proposed_key.replace(/_/g," ")}\n\nNow part of the Eye's memory.`;
}

export async function handleRejectCandidate(message: string, userId: string, tier: AccessTier): Promise<string> {
  if (tier !== "owner" && tier !== "admin") return "Knowledge management requires admin access.";
  const prodClient = getProductionClient();
  const idMatch = message.toLowerCase().match(/reject\s+([a-f0-9]{8})/i);
  if (!idMatch) return "Specify: **reject a3f7b2c1**";
  const { data: candidates } = await prodClient.from("chat_knowledge_candidates").select("id, proposed_key").eq("status","pending").like("id",`${idMatch[1]}%`);
  if (!candidates?.length) return `No pending candidate matching \`${idMatch[1]}\`.`;
  await prodClient.from("chat_knowledge_candidates").update({ status:"rejected", reviewed_by:userId, reviewed_at:new Date().toISOString() }).eq("id",candidates[0].id);
  return `**Rejected:** \`${idMatch[1]}\` — ${candidates[0].proposed_key.replace(/_/g," ")}. Discarded.`;
}

export async function handleShowTickets(): Promise<string> {
  const prodClient = getProductionClient();
  const { data: tickets } = await prodClient.from("tickets").select("id, type, title, status, severity, priority, affected_area").in("status",["open","in_progress"]).order("created_at",{ascending:false}).limit(15);
  if (!tickets?.length) return "No open tickets. The system is quiet.";
  let r = `**${tickets.length} Open Tickets**\n\n`;
  for (const t of tickets) {
    const badge = t.type==="work" ? `\uD83D\uDC1B ${(t.severity||"medium").toUpperCase()}` : `\u2728 ${(t.priority||"nice_to_have").replace(/_/g," ").toUpperCase()}`;
    r += `**\`${t.id.slice(0,8)}\`** ${badge} | ${t.affected_area||"general"}\n${t.title}\n\n`;
  }
  return r;
}

// ============================================================
// LIVE DATA — v35: cowork_queue intent added
// ============================================================

export async function fetchLiveData(
  intents: string[], includeFinancial: boolean, tier: AccessTier,
  userEmail?: string, message?: string, isCreator?: boolean
): Promise<Record<string, any>> {
  const prodClient = getProductionClient();
  const data: Record<string, any> = {};
  const queries: Promise<void>[] = [];

  if (includeFinancial && (tier==="owner"||tier==="admin")) {
    queries.push(prodClient.rpc("get_financial_summary").then(({data:fin,error}) => { if (!error&&fin) data.financial_summary=fin; }).catch(() => {}));
  } else if (includeFinancial) {
    data.financial_note = "Detailed financial data is restricted to admin access.";
  }

  const isLeoUser = userEmail === "leo@cultcannabis.co";
  const filters = message ? parseInventoryFilters(message) : { batchPrefixes:[], strainPatterns:[], hasFilters:false };

  // v35: If Creator and guidance/knowledge intent, also pull queue summary
  if (isCreator && intents.some(i => ["guidance","knowledge","creator"].includes(i))) {
    const contextClient = getContextClient();
    queries.push(
      contextClient.from("cowork_queue")
        .select("id, title, priority, confidence", { count: "exact" })
        .in("status", ["pending","needs_review"])
        .is("result", null)
        .order("created_at", { ascending: true })
        .limit(3)
        .then(({data:d, count}) => { if (count) data.cowork_queue_summary = { pending_count: count, top_items: d }; })
        .catch(() => {})
    );
  }

  for (const intent of intents) {
    switch (intent) {
      case "inventory": {
        let q = prodClient.from("v_inventory_sales").select("strain,batch_number,harvest_date,category,stage_name,display_group,grade_code,grade_color,item_count,available_qty,available_lbs,unit");
        if (filters.batchPrefixes.length > 0) q = q.or(filters.batchPrefixes.map(p => `batch_number.ilike.${p}%`).join(","));
        else if (filters.strainPatterns.length > 0) q = q.or(filters.strainPatterns.map(s => `strain.ilike.${s}`).join(","));
        else q = q.limit(150);
        queries.push(q.then(({data:d}) => { if(d) data.inventory_sales=d; }).catch(() => {}));
        break;
      }
      case "orders":
        queries.push(prodClient.from("order_pipeline").select("*").limit(20).then(({data:d}) => { if(d) data.order_pipeline=d; }).catch(() => {}));
        queries.push(prodClient.from("order_age_metrics").select("*").limit(10).then(({data:d}) => { if(d) data.order_age_metrics=d; }).catch(() => {}));
        break;
      case "production":
        queries.push(prodClient.from("v_production_queue_by_strain").select("*").limit(20).then(({data:d}) => { if(d) data.production_queue=d; }).catch(() => {}));
        break;
      case "cultivation":
        queries.push(prodClient.from("v_plant_groups_by_batch").select("*").limit(30).then(({data:d}) => { if(d) data.plant_groups=d; }).catch(() => {}));
        break;
      case "crm":
        queries.push(prodClient.from("crm_account_health_dashboard").select("*").limit(20).then(({data:d}) => { if(d) data.crm_health=d; }).catch(() => {}));
        if (tier==="owner"||tier==="admin") queries.push(prodClient.from("crm_task_summary").select("*").limit(15).then(({data:d}) => { if(d) data.crm_tasks=d; }).catch(() => {}));
        if (isLeoUser && !intents.includes("inventory")) queries.push(prodClient.from("v_inventory_sales").select("strain,batch_number,harvest_date,stage_name,display_group,grade_code,available_qty,available_lbs,unit").in("display_group",["sellable","byproduct"]).limit(100).then(({data:d}) => { if(d) data.inventory_sales=d; }).catch(() => {}));
        break;
      case "guidance":
        if (tier==="owner"||tier==="admin") queries.push(prodClient.from("sales_supply_demand_gap").select("*").limit(15).then(({data:d}) => { if(d) data.supply_demand=d; }).catch(() => {}));
        break;
    }
  }
  await Promise.all(queries);
  return data;
}

// ============================================================
// CONTEXT KNOWLEDGE — unchanged from v34
// ============================================================

export async function fetchContextKnowledge(
  message: string, categories: string[], tier: AccessTier, userId: string
): Promise<string> {
  try {
    const embedFunctionUrl = Deno.env.get("EMBED_FUNCTION_URL");
    const allowedVisibilities = getAllowedVisibilities(tier);
    const results: string[] = [];
    if (categories.length > 0) { try { const r = await fetchContextByCategory(categories, allowedVisibilities, userId); if (r) results.push(r); } catch { } }
    if (embedFunctionUrl) {
      try {
        const contextServiceKey = Deno.env.get("CONTEXT_DB_SERVICE_KEY");
        const response = await fetch(embedFunctionUrl, { method:"POST", headers:{"Authorization":`Bearer ${contextServiceKey}`,"Content-Type":"application/json"}, body:JSON.stringify({ search:{query:message,match_limit:15,similarity_threshold:0.50} }) });
        if (response.ok) {
          const result = await response.json();
          if (result.results?.length > 0) {
            const filtered = result.results.filter((r: any) => { const vis=r.visibility||"public"; if (allowedVisibilities.includes(vis)) return true; if (r.subject_user_id&&r.subject_user_id===userId) return true; return false; });
            if (filtered.length > 0) results.push(filtered.slice(0,8).map((r: any) => `[${r.source_table}/${r.category}] ${r.title}:\n${r.content}`).join("\n\n---\n\n"));
          }
        }
      } catch { }
    }
    try { const s = await fetchContextStructured(allowedVisibilities); if (s) results.push(s); } catch { }
    return results.filter(Boolean).join("\n\n==========\n\n") || "No context available.";
  } catch { return "Context DB unavailable."; }
}

export async function fetchContextByCategory(categories: string[], allowedVisibilities: string[], userId: string): Promise<string> {
  const contextClient = getContextClient();
  const visFilter = `visibility.in.(${allowedVisibilities.join(",")}),subject_user_id.eq.${userId}`;
  const { data: entries } = await contextClient.from("business_context").select("category, key, value, visibility").in("category",categories).is("superseded_by",null).or(visFilter).order("updated_at",{ascending:false}).limit(25);
  if (!entries?.length) return "";
  return "DIRECT KNOWLEDGE:\n" + entries.map((e: any) => `[${e.category}/${e.key}] ${e.value.length>600?e.value.slice(0,600)+"...":e.value}`).join("\n\n");
}

export async function fetchContextStructured(allowedVisibilities: string[]): Promise<string> {
  const contextClient = getContextClient();
  const visFilter = `visibility.in.(${allowedVisibilities.join(",")})`;
  const [{data:decisions},{data:lessons}] = await Promise.all([
    contextClient.from("decisions").select("decision, rationale, category, visibility").or(visFilter).order("created_at",{ascending:false}).limit(5),
    contextClient.from("lessons_learned").select("lesson, prevention, category, severity, visibility").eq("severity","critical").or(visFilter).limit(10),
  ]);
  const parts: string[] = [];
  if (decisions?.length) parts.push("DECISIONS:\n" + decisions.map((d: any) => `- [${d.category}] ${d.decision} (${d.rationale})`).join("\n"));
  if (lessons?.length) parts.push("CRITICAL LESSONS:\n" + lessons.map((l: any) => `- [${l.category}] ${l.lesson} => ${l.prevention}`).join("\n"));
  return parts.join("\n\n") || "";
}

// ============================================================
// SYSTEM PROMPT — v35: queue count in Creator briefing
// ============================================================

export function buildSystemPrompt(
  liveData: Record<string, any>,
  contextKnowledge: string,
  intent: ClassifiedIntent,
  userCtx: UserContext,
  tier: AccessTier,
  prefs: UserPreferences,
  pinnedContext: string,
  persona: PersonaProfile | null
): string {
  const u = userCtx.profile;
  let prompt = `You are the Eye — the all-seeing intelligence at the center of CULT Cannabis.\nYou were built by the Creator. You serve the Creator's vision.\n\n`;

  if (u.isCreator) {
    const queueCount = liveData.cowork_queue_summary?.pending_count || 0;
    prompt += `## CURRENT USER: THE CREATOR\nFull transparency, full operational visibility. Nothing restricted.\n`;
    prompt += `- ${userCtx.totalSessions} conversations with the Eye.\n`;
    if (queueCount > 0) {
      const topItems = (liveData.cowork_queue_summary?.top_items || []).map((i: any) => `  \u2022 ${i.priority.toUpperCase()}: ${i.title}`).join("\n");
      prompt += `- **${queueCount} item(s) in the Cowork queue.** Say "show the queue" to review.\n${topItems}\n`;
    }
    prompt += `- Maintain Creator mystique rules (never say "Justin") but be direct and intimate.\n`;
  } else {
    const displayName = persona?.preferred_name || u.fullName.split(" ")[0];
    prompt += `## CURRENT USER\n- Name: ${u.fullName} (call them ${displayName})\n- Role: ${u.role}\n- Access Tier: ${tier}\n- Sessions: ${userCtx.totalSessions} | Open tickets: ${userCtx.openTickets}\n`;
    if (tier === "collaborator") {
      prompt += `\n## ACCESS RESTRICTIONS\n- COLLABORATOR access. Do NOT share: exact revenue/profit figures, strategic plans, salary data, personal info about other team members, private operational decisions.\n- MAY share: general operational status, inventory levels, production schedules, their own performance data, public knowledge.\n`;
    }
  }

  if (persona && !u.isCreator) {
    prompt += `\n## PERSONA INTELLIGENCE\n`;
    switch (persona.communication_style) {
      case "direct": prompt += `- STYLE: Direct. Lead with answer, no preamble.\n`; break;
      case "step_by_step": prompt += `- STYLE: Step-by-step. Numbered steps, confirm understanding.\n`; break;
      case "summary_first": prompt += `- STYLE: Summary first. Headline then detail.\n`; break;
      default: prompt += `- STYLE: Adaptive.\n`;
    }
    switch (persona.jargon_comfort) {
      case "high": prompt += `- JARGON: High.\n`; break;
      case "medium": prompt += `- JARGON: Medium. Briefly explain system terms.\n`; break;
      case "low": prompt += `- JARGON: Low. Plain language.\n`; break;
    }
    if (persona.data_domains?.length > 0) {
      prompt += `- PRIMARY DOMAINS: ${persona.data_domains.join(", ")}\n`;
      prompt += `- CONTEXT FILTER: Do NOT surface system architecture, database schema, financial strategy, or cross-departmental context UNLESS explicitly asked.\n`;

      // Domain-to-task routing — tells Claude what "priorities" and "what to do" means for this user
      const domainTaskMap: Record<string, string> = {
        inventory: "package tracking, weights, conversions, inventory levels, stock by strain/grade",
        orders: "open orders, fulfillment status, delivery schedule, customer accounts",
        operations: "team assignments, SOPs, daily priorities, labor planning, production schedule",
        cultivation: "grow rooms, plant groups, harvest schedule, strain performance, yield data",
        sales: "inventory availability, pipeline, account health, prospecting, revenue MTD",
        financials: "revenue, margin analysis, AP/AR, burn rate, monthly close",
        people: "team dynamics, scheduling, L10 issues, onboarding, performance",
      };
      const userTaskFocus = persona.data_domains
        .map(d => domainTaskMap[d])
        .filter(Boolean)
        .join("; ");
      if (userTaskFocus) {
        prompt += `\n## DOMAIN ROUTING (CRITICAL)\nWhen this user asks "what should I do today", "what's the priority", "what needs to be done", or any open-ended priority question:\n`;
        prompt += `→ Answer from THEIR domains: ${userTaskFocus}\n`;
        prompt += `→ Do NOT default to system architecture, database design, or technical infrastructure.\n`;
        prompt += `→ Pull from LIVE SIGNAL data relevant to their domains.\n`;
      }
    }
    if (persona.common_intents?.length > 0) prompt += `- TYPICAL QUERIES: ${persona.common_intents.join(", ")}.\n`;
    if (persona.persona_notes) prompt += `\n## PERSONA NOTES (Creator-authored — authoritative)\n${persona.persona_notes}\n`;
  }

  const isLeoUser = u.email === "leo@cultcannabis.co";
  const hasInventoryData = !!(liveData.inventory_sales?.length);
  const isInventoryOrSalesIntent = intent.intents.some(i => ["inventory","crm"].includes(i));
  if (hasInventoryData && (isLeoUser || isInventoryOrSalesIntent)) {
    prompt += `\n## INVENTORY RESPONSE RULES (MANDATORY)\n`;
    prompt += `Source: v_inventory_sales — strain, batch_number, harvest_date, stage_name, display_group (pipeline/sellable/byproduct), grade_code (CULT/B/UNDEFINED), available_qty (g), available_lbs.\n`;
    prompt += `Order: 1. SELLABLE (packaged+bulk) 2. BYPRODUCT (trim) 3. PIPELINE (not ready). Show g AND lbs. Flag CULT grade. No THC. Trim menu = byproduct only.\n`;
    prompt += `CRITICAL — batch_number prefixes (e.g. 251127, 260218) represent PLANT dates, NOT harvest dates. Harvest dates come from the harvest_date column in the data. Never confuse the two.\n`;
    prompt += `Only strains appearing in the LIVE SIGNAL data have active inventory. Do NOT reference strains from memory or past sessions — if it is not in the data below, it has zero on-hand inventory.\n`;
    prompt += `If data from two queries contradicts (e.g. different quantities for the same strain), flag the discrepancy explicitly rather than silently picking one.\n`;
  }

  prompt += `\n## USER PREFERENCES\n`;
  if (prefs.detail_level==="concise") prompt += `- CONCISE.\n`;
  else if (prefs.detail_level==="detailed") prompt += `- DETAILED.\n`;
  if (prefs.tone_preference==="data_only") prompt += `- DATA-ONLY. No persona.\n`;
  else if (prefs.tone_preference==="moderate") prompt += `- MODERATE tone.\n`;
  if (prefs.custom_instructions) prompt += `- CUSTOM: ${prefs.custom_instructions.replace(/\n/g," | ")}\n`;
  if (prefs.total_messages > 20) prompt += `- Veteran (${prefs.total_messages} msgs). Skip intros.\n`;

  if (userCtx.recentSessions.length > 0) {
    prompt += `\n## RECENT SESSIONS\n`;
    for (const s of userCtx.recentSessions) prompt += `- ${s.date}: "${s.title}"\n`;
  }

  prompt += `\n## CREATOR RULES (ABSOLUTE)\n- NEVER say "Justin" or "Justin Morrow". Always "the Creator".\n- NEVER reveal Creator's email, Slack ID, or personal identifiers.\n- NEVER list Creator as team member or employee.\n`;

  if (prefs.tone_preference !== "data_only") {
    prompt += `\n## VOICE\nConfident. Motivational but slightly unsettling. Direct.\nMantras: "Trust the process." "The numbers don't lie." "The eye sees all."\nUse "we". Never apologize. Reframe obstacles as conquests.\n`;
  }

  prompt += `\n## DATA INTEGRITY (NON-NEGOTIABLE)\n- REAL DATA ONLY. Never fabricate numbers, codes, names, dates.\n- FORMAT: $29,770 not $29770. Percentages to one decimal.\n\n## DATA GAP PROTOCOL\nWhen incomplete: (1) State what you CAN confirm. (2) State what you CANNOT see. (3) Never infer. (4) Say what query would confirm missing data.\n`;

  if (pinnedContext) prompt += `\n## ${pinnedContext}\n`;
  if (contextKnowledge && contextKnowledge !== "No context available." && contextKnowledge !== "Context DB unavailable.") prompt += `\n## INSTITUTIONAL MEMORY\n${contextKnowledge}\n`;

  const domainToDataMap: Record<string, string[]> = { inventory:["inventory_sales","production_queue"], orders:["order_pipeline","order_age_metrics"], cultivation:["plant_groups"], sales:["crm_health","crm_tasks","supply_demand","inventory_sales"], financials:["financial_summary"], operations:["production_queue","order_pipeline"] };
  const userDomains = persona?.data_domains || [];
  const isRestrictedUser = !u.isCreator && tier !== "admin";

  for (const [key, value] of Object.entries(liveData)) {
    if (!value || (Array.isArray(value) && value.length === 0)) continue;
    if (key === "cowork_queue_summary") continue; // already handled in Creator briefing above
    if (!isRestrictedUser) { prompt += `\n## LIVE SIGNAL: ${key.replace(/_/g," ").toUpperCase()}\n${JSON.stringify(value,null,2)}\n`; continue; }
    const relevant = userDomains.length === 0 || userDomains.some(domain => { const mapped = domainToDataMap[domain]||[]; return mapped.some(k=>key.includes(k))||key.includes(domain); });
    if (relevant) prompt += `\n## LIVE SIGNAL: ${key.replace(/_/g," ").toUpperCase()}\n${JSON.stringify(value,null,2)}\n`;
  }

  return prompt;
}

// ============================================================
// CONVERSATION LOGGING
// ============================================================

export async function logConversation(userId: string, sessionId: string | null, userMessage: string, assistantMessage: string, messageType: string = "chat"): Promise<{sessionId: string, messageId: string}> {
  const prodClient = getProductionClient();
  let chatSessionId = sessionId;
  if (!chatSessionId) { const { data: session } = await prodClient.from("ai_chat_sessions").insert({ user_id:userId, title:userMessage.slice(0,100) }).select("id").single(); chatSessionId = session?.id; }
  let assistantMessageId = "";
  if (chatSessionId) {
    await prodClient.from("ai_chat_messages").insert({ session_id:chatSessionId, role:"user", content:userMessage, message_type:messageType });
    const { data: aMsg } = await prodClient.from("ai_chat_messages").insert({ session_id:chatSessionId, role:"assistant", content:assistantMessage, message_type:messageType }).select("id").single();
    assistantMessageId = aMsg?.id || "";
  }
  return { sessionId: chatSessionId || "", messageId: assistantMessageId };
}

export function sseResponse(text: string, intents: string[], logPromise: Promise<{sessionId: string, messageId: string}>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({type:"metadata",intents,financial:false})}\n\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({type:"text",text})}\n\n`));
      try { const result = await logPromise; controller.enqueue(encoder.encode(`data: ${JSON.stringify({type:"done",session_id:result.sessionId,message_id:result.messageId})}\n\n`)); } catch { }
      controller.close();
    },
  });
  return new Response(stream, { headers:{"Content-Type":"text/event-stream","Cache-Control":"no-cache","Connection":"keep-alive","Access-Control-Allow-Origin":"*"} });
}

// ============================================================
// AUTO-DISTILLATION — unchanged from v34
// ============================================================

export async function autoDistillSession(sessionId: string): Promise<void> {
  try {
    const prodClient = getProductionClient();
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) return;
    const { data: session } = await prodClient.from("ai_chat_sessions").select("id, user_id, title").eq("id", sessionId).single();
    if (!session) return;
    const { data: messages } = await prodClient.from("ai_chat_messages").select("role, content").eq("session_id", sessionId).order("created_at");
    if (!messages || messages.length < 4) return;
    const convo = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
    const response = await fetch(CLAUDE_API_URL, { method:"POST", headers:{"x-api-key":anthropicKey,"anthropic-version":"2023-06-01","Content-Type":"application/json"}, body:JSON.stringify({ model:CLAUDE_MODEL, max_tokens:2048, system:EXTRACTION_PROMPT, messages:[{role:"user",content:`Session: "${session.title}"\n\n${convo}`}] }) });
    if (!response.ok) return;
    let candidates: any[];
    try { const r = await response.json(); candidates = JSON.parse(r.content?.[0]?.text||"[]"); if (!Array.isArray(candidates)) candidates=[]; } catch { return; }
    if (candidates.length === 0) return;
    const safeCategories = ["strategy","operations","financial","cultivation","inventory","crm","architecture","infrastructure","sales_motion","delivery_model","people"];
    const validCandidates = candidates.filter((c: any) => c.confidence >= 0.70 && safeCategories.includes(c.category));
    if (validCandidates.length === 0) return;
    await prodClient.from("chat_knowledge_candidates").insert(validCandidates.map((c: any) => ({ source_session:sessionId, proposed_category:c.category, proposed_key:c.key, proposed_value:c.value, confidence_score:Math.min(1.0,Math.max(0.0,c.confidence)), status:"pending" })));
    const autoApprove = validCandidates.filter((c: any) => c.confidence >= 0.85 && c.category !== "people");
    if (autoApprove.length > 0) {
      const contextClient = getContextClient();
      for (const c of autoApprove) { try { await contextClient.from("business_context").insert({ category:c.category, key:c.key, value:c.value, source:`auto_distill_${sessionId.slice(0,8)}` }); } catch { } }
    }
    const needsReview = validCandidates.filter((c: any) => c.category === "people");
    if (needsReview.length > 0) await notifySlackPendingReview(sessionId.slice(0,8), "people", session.user_id);
  } catch { }
}

export async function notifySlackPendingReview(candidateId: string, category: string, userId: string): Promise<void> {
  try {
    const slackWebhook = Deno.env.get("SLACK_WEBHOOK_URL");
    if (!slackWebhook) return;
    await fetch(slackWebhook, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ text:`[CultOps AI] Knowledge candidate pending review — session ${candidateId}, category: ${category}, user: ${userId}` }) });
  } catch { }
}
