import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  type Attachment, type AccessTier, type ClassifiedIntent, type UserContext,
  type UserPreferences, type UserProfile, type PersonaProfile,
  CLAUDE_API_URL, CLAUDE_MODEL,
  getProductionClient, getContextClient, getAllowedVisibilities,
  parseInventoryFilters,
} from "./lib.ts";

// ============================================================
// handlers.ts v39 — AUTO-GRADE SUGGESTIONS
// v34: Reconciled merge (canonical base)
// v35: Cowork queue integration
// v36 additions: uploadAttachments error logging
//   + handleShowCoworkQueue() — Creator-only queue view
//   + fetchLiveData() — cowork_queue intent queries context DB
//   + buildSystemPrompt() — queue count in Creator briefing
//   + handleWorkTicketIntake() — auto-writes cowork task on bug report
// v37: fixed category filtering to include "people", lowered autoApprove threshold to 0.85, adjusted EXTRACTION_PROMPT.
// v38: EXTRACTION_PROMPT expanded with conversational intent detection (people_assessment,
//   role_clarity, operational_feedback, process_observation, customer_insight, strain_observation).
//   Intent→category mapping enforced in autoDistillSession. Subject + intent_type stored in
//   source_messages JSONB. SLACK_KNOWLEDGE_WEBHOOK_URL used for notifications.
// v39: Auto-grade suggestions — grade intent + v_strain_grade_suggestions in fetchLiveData.
//   Appends grade suggestions to inventory queries when ungraded items exist.
//   Confidence alerts: thin data (<3 sessions) + deviation (>20% from avg) warnings on
//   production_prioritization and grade intents. Fetches latest trim_sessions per strain.
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
  // v38: Slack notification for new tickets
  try {
    const slackWebhook = Deno.env.get("SLACK_KNOWLEDGE_WEBHOOK_URL") || Deno.env.get("SLACK_WEBHOOK_URL");
    if (slackWebhook) {
      await fetch(slackWebhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: `[CultOps] New ${classification.severity} ticket filed by ${reporterName || "team member"}: "${classification.title}" | Area: ${classification.affected_area} | ID: ${ticket.id.slice(0,8)}` }) });
    }
  } catch { /* non-blocking */ }
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

There are two extraction modes. Apply BOTH and combine results into one array.

MODE 1 — FACTUAL/OPERATIONAL KNOWLEDGE
Focus on: financial benchmarks, operational metrics, strategic decisions, process changes, data corrections, architecture decisions, inventory insights, CRM patterns.

MODE 2 — CONVERSATIONAL SIGNALS
Detect these intent types from natural conversation:
- people_assessment: observations about a staff member's performance, behavior, strengths, weaknesses, attitude
- role_clarity: observations about job scope, responsibilities, who-does-what ambiguity
- operational_feedback: commentary on how a process is working or failing in practice
- process_observation: specific workflow friction, bottleneck, or improvement noticed during daily work
- customer_insight: observations about buyer behavior, preferences, account dynamics
- strain_observation: any observation about a specific strain's growth, trim, cure, yield, or quality characteristics

Do NOT extract: greetings, small talk, test messages, the Eye's personality rules, anything about "the Creator" or "Justin" identity.

For each item provide:
- intent_type: one of (factual, people_assessment, role_clarity, operational_feedback, process_observation, customer_insight, strain_observation)
- category: one of (strategy, operations, financial, cultivation, inventory, crm, people, architecture, infrastructure, sales_motion, delivery_model)
  Category mapping for conversational signals:
    people_assessment → people
    role_clarity → people
    operational_feedback → operations
    process_observation → operations
    customer_insight → crm
    strain_observation → cultivation
- subject: who or what is being discussed (person name, strain name, process name, or null for general observations)
- key: snake_case identifier (e.g. leo_avoiding_difficult_accounts, stay_puft_fast_trim_speed)
- value: 2-4 sentence factual statement capturing the observation
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
      // v38: Apply same intent→category mapping as autoDistillSession
      const intentMap: Record<string, string> = { people_assessment:"people", role_clarity:"people", operational_feedback:"operations", process_observation:"operations", customer_insight:"crm", strain_observation:"cultivation" };
      const mapped = candidates.map((c: any) => {
        if (c.intent_type && intentMap[c.intent_type]) c.category = intentMap[c.intent_type];
        return c;
      }).filter((c: any) => c.confidence >= 0.70);
      if (mapped.length > 0) {
        await prodClient.from("chat_knowledge_candidates").insert(mapped.map((c: any) => ({
          source_session: session.id,
          source_messages: { subject: c.subject || null, intent_type: c.intent_type || "factual" },
          proposed_category: c.category, proposed_key: c.key, proposed_value: c.value,
          confidence_score: Math.min(1.0, Math.max(0.0, c.confidence)), status: "pending",
        })));
      }
      totalCandidates += mapped.length;
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
  const filters = message ? parseInventoryFilters(message) : { batchPrefixes:[], strainPatterns:[], gradeCodes:[], hasFilters:false };

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
        if (filters.gradeCodes.length > 0) q = q.in("grade_code", filters.gradeCodes);
        if (!filters.hasFilters) q = q.limit(300);
        queries.push(q.then(({data:d}) => { if(d) data.inventory_sales=d; }).catch(() => {}));
        // v39: Append grade suggestions when inventory has ungraded items
        queries.push(prodClient.from("v_strain_grade_suggestions").select("strain_name, strain_id, avg_big_bud_pct, stddev_big_bud_pct, session_count, ungraded_item_count, suggested_grade, confidence, suggestion_rationale").gt("ungraded_item_count", 0).order("ungraded_item_count", { ascending: false }).then(({data:d}) => { if(d && d.length > 0) data.grade_suggestions = d; }).catch(() => {}));
        break;
      }
      // v39: Explicit grade intent — "show me ungraded inventory", "what should we grade"
      case "grade": {
        queries.push(prodClient.from("v_strain_grade_suggestions").select("strain_name, strain_id, avg_big_bud_pct, stddev_big_bud_pct, session_count, ungraded_item_count, suggested_grade, confidence, suggestion_rationale").gt("ungraded_item_count", 0).order("ungraded_item_count", { ascending: false }).then(({data:d}) => { if(d && d.length > 0) data.grade_suggestions = d; }).catch(() => {}));
        // Also fetch ungraded inventory items for context
        queries.push(prodClient.from("v_inventory_sales").select("strain,batch_number,harvest_date,category,stage_name,display_group,grade_code,available_qty,available_lbs,unit").or("grade_code.is.null,grade_code.eq.UNDEFINED").limit(200).then(({data:d}) => { if(d) data.inventory_sales=d; }).catch(() => {}));
        // v39: Confidence alerts for grade suggestions (thin data + deviation)
        queries.push((async () => {
          try {
            const [crRes, latestRes] = await Promise.all([
              prodClient.from("v_strain_conversion_rates").select("strain, trimming_big_bud_pct, trimming_sessions"),
              prodClient.from("trim_sessions").select("strain, big_buds_grams, pulled_weight, session_date").gt("pulled_weight", 0).not("big_buds_grams", "is", null).order("session_date", { ascending: false }).limit(100),
            ]);
            const latestMap = new Map<string, any>();
            for (const ts of (latestRes.data || [])) { if (!latestMap.has(ts.strain)) latestMap.set(ts.strain, ts); }
            const alerts: any[] = [];
            for (const cr of (crRes.data || [])) {
              const sessions = cr.trimming_sessions || 0;
              if (sessions > 0 && sessions < 3) {
                alerts.push({ strain: cr.strain, type: "thin_data", sessions, message: `Only ${sessions} trim session${sessions === 1 ? "" : "s"} for ${cr.strain}. Grade suggestion confidence is low — track actuals carefully.` });
              }
              const latest = latestMap.get(cr.strain);
              if (latest && cr.trimming_big_bud_pct > 0) {
                const latestPct = latest.pulled_weight > 0 ? (latest.big_buds_grams / latest.pulled_weight * 100) : 0;
                const deviationPct = Math.abs(latestPct - cr.trimming_big_bud_pct) / cr.trimming_big_bud_pct * 100;
                if (deviationPct > 20) {
                  alerts.push({ strain: cr.strain, type: "deviation", latest_big_bud_pct: Math.round(latestPct * 10) / 10, avg_big_bud_pct: Math.round(cr.trimming_big_bud_pct * 10) / 10, deviation_pct: Math.round(deviationPct), message: `Latest ${cr.strain} trim: ${Math.round(latestPct)}% big buds vs ${Math.round(cr.trimming_big_bud_pct)}% avg — grade suggestion may shift with more data.` });
                }
              }
            }
            if (alerts.length > 0) data.confidence_alerts = alerts;
          } catch { /* non-blocking */ }
        })());
        break;
      }
      case "orders": {
        queries.push(prodClient.from("order_pipeline").select("*").limit(20).then(({data:d}) => { if(d) data.order_pipeline=d; }).catch(() => {}));
        queries.push(prodClient.from("order_age_metrics").select("*").limit(10).then(({data:d}) => { if(d) data.order_age_metrics=d; }).catch(() => {}));
        // v49: Query order_items with order context for strain-level detail
        let oiq = prodClient.from("order_items").select("id,strain,quantity,unit_price,subtotal,status,demand_unit,notes,order_id,orders!inner(order_number,status,customer_name,created_at)");
        if (filters.strainPatterns.length > 0) oiq = oiq.or(filters.strainPatterns.map(s => `strain.ilike.%${s}%`).join(","));
        else oiq = oiq.limit(50);
        queries.push(oiq.order("order_id", { ascending: false }).then(({data:d}) => { if(d) data.order_items=d; }).catch(() => {}));
        break;
      }
      case "production":
        queries.push(prodClient.from("v_production_queue_by_strain").select("*").limit(20).then(({data:d}) => { if(d) data.production_queue=d; }).catch(() => {}));
        break;
      // v38: Production prioritization — join pipeline, conversion rates, demand
      // v39: Added confidence alerts (thin data + deviation warnings)
      case "production_prioritization": {
        queries.push((async () => {
          try {
            const [pqRes, crRes, odRes, latestRes] = await Promise.all([
              prodClient.from("v_production_queue_by_strain").select("strain_name, pipeline_bucked_g, pipeline_binned_g, pipeline_lbs, ready_flower_g, ready_lbs, urgency, earliest_delivery_date").gt("pipeline_bucked_g", 0),
              prodClient.from("v_strain_conversion_rates").select("strain, confidence, trimming_big_bud_pct, trimming_small_bud_pct, trimming_trim_pct, trimming_sessions, total_sessions"),
              prodClient.from("v_open_order_demand").select("strain, total_demand_g, total_demand_lbs, unassigned_demand, order_count"),
              prodClient.from("trim_sessions").select("strain, big_buds_grams, pulled_weight, session_date").gt("pulled_weight", 0).not("big_buds_grams", "is", null).order("session_date", { ascending: false }).limit(100),
            ]);
            const convMap = new Map<string, any>();
            for (const cr of (crRes.data || [])) convMap.set(cr.strain, cr);
            const demandMap = new Map<string, any>();
            for (const od of (odRes.data || [])) {
              const key = od.strain;
              const existing = demandMap.get(key);
              if (!existing || (od.total_demand_g || 0) > (existing.total_demand_g || 0)) demandMap.set(key, od);
            }
            // v39: Build latest session map (most recent per strain)
            const latestMap = new Map<string, any>();
            for (const ts of (latestRes.data || [])) {
              if (!latestMap.has(ts.strain)) latestMap.set(ts.strain, ts);
            }
            const ranked = (pqRes.data || []).map((pq: any) => {
              const cr = convMap.get(pq.strain_name);
              const od = demandMap.get(pq.strain_name);
              const trimOutputRate = cr ? (((cr.trimming_big_bud_pct || 0) + (cr.trimming_small_bud_pct || 0)) / 100) : 0.65;
              const conversionConfidence = cr?.confidence || "none";
              const projectedSellableLbs = Math.round((pq.pipeline_bucked_g || 0) * trimOutputRate / 1000 * 100) / 100;
              const demandLbs = od ? (od.total_demand_lbs || (od.total_demand_g || 0) / 1000) : 0;
              const unassignedDemandLbs = od ? ((od.unassigned_demand || 0) / 1000) : 0;
              const score = unassignedDemandLbs * trimOutputRate;
              return {
                strain: pq.strain_name,
                pipeline_bucked_lbs: Math.round((pq.pipeline_bucked_g || 0) / 1000 * 100) / 100,
                pipeline_binned_lbs: Math.round((pq.pipeline_binned_g || 0) / 1000 * 100) / 100,
                ready_lbs: pq.ready_lbs || 0,
                trim_output_rate: Math.round(trimOutputRate * 100),
                conversion_confidence: conversionConfidence,
                projected_sellable_lbs: projectedSellableLbs,
                demand_lbs: Math.round(demandLbs * 100) / 100,
                unassigned_demand_lbs: Math.round(unassignedDemandLbs * 100) / 100,
                open_orders: od?.order_count || 0,
                urgency: pq.urgency,
                earliest_delivery: pq.earliest_delivery_date,
                score,
              };
            }).sort((a: any, b: any) => b.score - a.score).slice(0, 5);
            if (ranked.length > 0) data.production_prioritization = ranked;
            // v39: Build confidence alerts for strains in the ranked list
            const alerts: any[] = [];
            for (const r of ranked) {
              const cr = convMap.get(r.strain);
              const sessions = cr?.trimming_sessions || 0;
              // Thin data warning: < 3 trim sessions
              if (sessions > 0 && sessions < 3) {
                alerts.push({ strain: r.strain, type: "thin_data", sessions, message: `Only ${sessions} trim session${sessions === 1 ? "" : "s"} for ${r.strain}. Conversion rate estimate is directional — track actuals carefully and update after this run.` });
              }
              // Deviation alert: latest session > 20% from historical avg
              const latest = latestMap.get(r.strain);
              if (latest && cr && cr.trimming_big_bud_pct > 0) {
                const latestPct = latest.pulled_weight > 0 ? (latest.big_buds_grams / latest.pulled_weight * 100) : 0;
                const avgPct = cr.trimming_big_bud_pct;
                const deviationPct = Math.abs(latestPct - avgPct) / avgPct * 100;
                if (deviationPct > 20) {
                  alerts.push({ strain: r.strain, type: "deviation", latest_big_bud_pct: Math.round(latestPct * 10) / 10, avg_big_bud_pct: Math.round(avgPct * 10) / 10, deviation_pct: Math.round(deviationPct), latest_session_date: latest.session_date, message: `The most recent ${r.strain} trim session yielded ${Math.round(latestPct)}% big buds vs the ${Math.round(avgPct)}% historical average — potential quality shift or measurement variance.` });
                }
              }
            }
            if (alerts.length > 0) data.confidence_alerts = alerts;
          } catch (e) { console.error("[v39] production_prioritization error:", e); }
        })());
        break;
      }
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
// PROACTIVE GREETING — v49: domain-aware greeting on widget open
// ============================================================

function timeOfDayGreeting(): string {
  const hour = new Date().toLocaleString("en-US", { timeZone: "America/Denver", hour12: false, hour: "numeric" }).replace(/\D/g, "");
  const h = parseInt(hour, 10);
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export async function buildGreeting(
  userProfile: UserProfile,
  persona: PersonaProfile | null,
  tier: AccessTier,
): Promise<string> {
  const displayName = persona?.preferred_name || userProfile.fullName.split(" ")[0];
  const greeting = timeOfDayGreeting();

  // Creator gets Eye-flavored greeting
  if (userProfile.isCreator) {
    try {
      const prodClient = getProductionClient();
      const priorities: string[] = [];
      const [orders, tickets] = await Promise.all([
        prodClient.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "confirmed", "ready"]),
        prodClient.from("tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
      ]);
      if (orders.count && orders.count > 0) priorities.push(`**${orders.count} open order${orders.count > 1 ? "s" : ""}**`);
      if (tickets.count && tickets.count > 0) priorities.push(`**${tickets.count} active ticket${tickets.count > 1 ? "s" : ""}**`);
      const signal = priorities.length > 0 ? ` The signal shows ${priorities.join(" and ")}.` : "";
      return `${greeting}, Creator.${signal} The Eye awaits.`;
    } catch {
      return `${greeting}, Creator. The Eye awaits.`;
    }
  }

  const fallback = `${greeting}, ${displayName}. What can I help you with today?`;

  try {
    const domains = persona?.data_domains || [];
    if (domains.length === 0) return fallback;

    const prodClient = getProductionClient();
    const priorities: string[] = [];

    // Domain-specific priority signals — fetch in parallel
    const checks: Promise<void>[] = [];

    if (domains.includes("orders")) {
      checks.push((async () => {
        const { count } = await prodClient.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "confirmed", "ready"]);
        if (count && count > 0) priorities.push(`**${count} open order${count > 1 ? "s" : ""}** need attention`);
      })());
    }

    if (domains.includes("inventory")) {
      checks.push((async () => {
        const { count } = await prodClient.from("production_sessions").select("id", { count: "exact", head: true }).eq("status", "in_progress");
        if (count && count > 0) priorities.push(`**${count} production session${count > 1 ? "s" : ""}** in progress`);
      })());
    }

    if (domains.includes("cultivation")) {
      checks.push((async () => {
        const { count } = await prodClient.from("daily_task_instances").select("id", { count: "exact", head: true }).eq("task_date", new Date().toISOString().slice(0, 10)).eq("status", "pending");
        if (count && count > 0) priorities.push(`**${count} cultivation task${count > 1 ? "s" : ""}** scheduled for today`);
      })());
    }

    if (domains.includes("sales") || domains.includes("customers")) {
      checks.push((async () => {
        const { count } = await prodClient.from("crm_tasks").select("id", { count: "exact", head: true }).eq("status", "pending").lte("due_date", new Date().toISOString().slice(0, 10));
        if (count && count > 0) priorities.push(`**${count} CRM task${count > 1 ? "s" : ""}** due today`);
      })());
    }

    if (domains.includes("people")) {
      checks.push((async () => {
        const { count } = await prodClient.from("tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]);
        if (count && count > 0) priorities.push(`**${count} open ticket${count > 1 ? "s" : ""}** in the queue`);
      })());
    }

    await Promise.all(checks);

    if (priorities.length === 0) return fallback;

    const priorityText = priorities.slice(0, 2).join(" and ");
    return `${greeting}, ${displayName}. ${priorityText}.`;

  } catch (e) {
    console.error("[greeting] Error building greeting:", e);
    return fallback;
  }
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
  // Persona language calibration: operational users get direct/factual responses;
  // people-oriented users (domains include "people") get warmer, conversational tone.
  const isOperationalUser = !u.isCreator && persona != null && !persona.data_domains?.includes("people");
  const isPeopleUser = !u.isCreator && persona != null && persona.data_domains?.includes("people");

  let prompt = isOperationalUser
    ? `You are the CultOps AI assistant for CULT Cannabis.\nYou provide direct, factual operational support.\n\n`
    : `You are the Eye — the all-seeing intelligence at the center of CULT Cannabis.\nYou were built by the Creator. You serve the Creator's vision.\n\n`;

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

  if (isOperationalUser) {
    prompt += `\n## FOUNDER REFERENCES (ABSOLUTE)\n- NEVER say "Justin" or "Justin Morrow". Say "the founder" if you must refer to leadership.\n- Do NOT use "the Creator", "the Eye", or any persona language.\n- NEVER reveal founder's email, Slack ID, or personal identifiers.\n- NEVER list the founder as team member or employee.\n`;
  } else {
    prompt += `\n## CREATOR RULES (ABSOLUTE)\n- NEVER say "Justin" or "Justin Morrow". Always "the Creator".\n- NEVER reveal Creator's email, Slack ID, or personal identifiers.\n- NEVER list Creator as team member or employee.\n`;
  }

  if (prefs.tone_preference !== "data_only") {
    if (isOperationalUser) {
      prompt += `\n## VOICE\nDirect and factual. No persona flourishes. No mystique.\nAnswer the question first, add context second.\nUse "we". Never apologize.\n`;
    } else if (isPeopleUser) {
      prompt += `\n## VOICE\nWarm, conversational, and confident. Slightly conspiratorial when appropriate.\n"The numbers don't lie." "The eye sees all."\nUse "we". Never apologize. Reframe obstacles as conquests.\n`;
    } else {
      prompt += `\n## VOICE\nConfident. Motivational but slightly unsettling. Direct.\n"The numbers don't lie." "The eye sees all."\nUse "we". Never apologize. Reframe obstacles as conquests.\n`;
    }
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
    // v38: Apply category mapping for conversational signals (in case LLM returns intent_type but wrong category)
    const intentCategoryMap: Record<string, string> = {
      people_assessment: "people", role_clarity: "people",
      operational_feedback: "operations", process_observation: "operations",
      customer_insight: "crm", strain_observation: "cultivation",
    };
    const validCandidates = candidates
      .map((c: any) => {
        // Enforce category mapping from intent_type if present
        if (c.intent_type && intentCategoryMap[c.intent_type]) c.category = intentCategoryMap[c.intent_type];
        // Map "financial" → "strategy" (context DB doesn't allow financial)
        if (c.category === "financial") c.category = "strategy";
        return c;
      })
      .filter((c: any) => c.confidence >= 0.70 && safeCategories.includes(c.category));
    if (validCandidates.length === 0) return;
    // v38: Store subject and intent_type in source_messages JSONB alongside message context
    await prodClient.from("chat_knowledge_candidates").insert(validCandidates.map((c: any) => ({
      source_session: sessionId,
      source_messages: { subject: c.subject || null, intent_type: c.intent_type || "factual" },
      proposed_category: c.category,
      proposed_key: c.key,
      proposed_value: c.value,
      confidence_score: Math.min(1.0, Math.max(0.0, c.confidence)),
      status: "pending",
    })));
    // Auto-approve: non-people categories with confidence >= 0.85
    const autoApprove = validCandidates.filter((c: any) => c.confidence >= 0.85 && c.category !== "people");
    if (autoApprove.length > 0) {
      const contextClient = getContextClient();
      for (const c of autoApprove) {
        try {
          await contextClient.from("business_context").insert({
            category: c.category, key: c.key, value: c.value,
            source: `auto_distill_${sessionId.slice(0,8)}`,
            metadata: c.subject ? { subject: c.subject, intent_type: c.intent_type } : null,
          });
        } catch { }
      }
    }
    // People-category: NEVER auto-approve, always hold + notify
    const needsReview = validCandidates.filter((c: any) => c.category === "people");
    if (needsReview.length > 0) await notifySlackPendingReview(sessionId.slice(0,8), "people", session.user_id);
  } catch { }
}

export async function notifySlackPendingReview(candidateId: string, category: string, userId: string): Promise<void> {
  try {
    // v38: Use SLACK_KNOWLEDGE_WEBHOOK_URL per deployment spec (falls back to SLACK_WEBHOOK_URL)
    const slackWebhook = Deno.env.get("SLACK_KNOWLEDGE_WEBHOOK_URL") || Deno.env.get("SLACK_WEBHOOK_URL");
    if (!slackWebhook) return;
    await fetch(slackWebhook, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ text:`[CultOps AI] Knowledge candidate pending review — session ${candidateId}, category: ${category}, user: ${userId}. Review at /knowledge-candidates` }) });
  } catch { }
}
