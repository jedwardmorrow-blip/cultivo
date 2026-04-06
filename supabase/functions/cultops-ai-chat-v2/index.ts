// cultops-ai-chat-v2 — Thin proxy to Rick (OpenClaw)
// Replaces 2,184-line v49 with ~80 lines
// Auth: Supabase JWT → user identity → HMAC-signed forward to Rick
// Streaming: SSE pass-through

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CONFIG ───
const RICK_API_URL = Deno.env.get("RICK_API_URL") || "https://rick-api.culteng.com/v1/chat/completions";
const RICK_API_TOKEN = Deno.env.get("RICK_API_TOKEN") || "";
const HMAC_SECRET = Deno.env.get("RICK_HMAC_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const CONTEXT_DB_URL = "https://uayyhluztelnfxfvdhyt.supabase.co";
const CONTEXT_DB_KEY = Deno.env.get("CONTEXT_DB_SERVICE_KEY") || "";

// ─── HMAC SIGNING ───
async function signPayload(payload: string): Promise<string> {
  if (!HMAC_SECRET) return "";
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(HMAC_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── USER IDENTITY ───
interface UserProfile {
  userId: string;
  email: string;
  fullName: string;
  preferredName: string;
  role: string;
  tier: string;
  department: string;
  communicationStyle: string;
  responseLength: string;
  jargonComfort: string;
  dataDomains: string[];
  commonIntents: string[];
  personaNotes: string;
}

async function getUserProfile(authHeader: string): Promise<UserProfile | null> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    // Look up rich persona from context DB (has communication style, data domains, persona notes)
    const contextDb = createClient(CONTEXT_DB_URL, CONTEXT_DB_KEY);
    const { data: persona } = await contextDb
      .from("user_profiles")
      .select("full_name, preferred_name, role, department, ai_access_tier, communication_style, preferred_response_length, jargon_comfort, data_domains, common_intents, persona_notes")
      .eq("email", user.email)
      .single();

    // Fallback to production DB if context DB has no profile
    let fullName = persona?.full_name;
    let role = persona?.role || "team";
    if (!persona) {
      const { data: prodProfile } = await supabase
        .from("user_profiles")
        .select("full_name, role")
        .eq("email", user.email)
        .single();
      fullName = prodProfile?.full_name;
      role = prodProfile?.role || "user";
    }

    // Access tier from context DB, or map from role
    const OWNER_EMAILS = ["justin@cultcannabis.co"];
    let tier = persona?.ai_access_tier || "team";
    if (OWNER_EMAILS.includes(user.email || "")) {
      tier = "owner";
    }

    return {
      userId: user.id,
      email: user.email || "",
      fullName: fullName || user.email || "Unknown",
      preferredName: persona?.preferred_name || fullName || "there",
      role,
      tier,
      department: persona?.department || "",
      communicationStyle: persona?.communication_style || "adaptive",
      responseLength: persona?.preferred_response_length || "adaptive",
      jargonComfort: persona?.jargon_comfort || "medium",
      dataDomains: persona?.data_domains || [],
      commonIntents: persona?.common_intents || [],
      personaNotes: persona?.persona_notes || "",
    };
  } catch {
    return null;
  }
}

// ─── RATE LIMITING ───
const rateLimits: Record<string, { count: number; resetAt: number }> = {};
const LIMITS: Record<string, number> = { owner: 999, admin: 100, lead: 60, team: 30, read_only: 10 };

function checkRateLimit(userId: string, tier: string): boolean {
  const now = Date.now();
  const limit = LIMITS[tier] || 30;
  if (!rateLimits[userId] || rateLimits[userId].resetAt < now) {
    rateLimits[userId] = { count: 0, resetAt: now + 3600000 }; // 1 hour window
  }
  rateLimits[userId].count++;
  return rateLimits[userId].count <= limit;
}

// ─── PAGE CONTEXT MAP ───
const PAGE_CONTEXT: Record<string, string> = {
  "/": "User is on the Dashboard — overview of business health, key metrics, alerts.",
  "/inventory": "User is on the Inventory page — package tracking, ATP, batch stages, grading.",
  "/orders": "User is on the Orders page — order pipeline, fulfillment status, delivery scheduling.",
  "/cultivation": "User is on the Cultivation page — grow rooms, plant groups, task board, harvests.",
  "/post-production": "User is on Post-Production — trim, bucking, packaging sessions, conversion queue.",
  "/production-queue": "User is on the Production Queue — what needs to be processed, strain priorities.",
  "/sales": "User is on the Sales/CRM page — customer accounts, revenue tracking, pipeline.",
  "/settings": "User is on Settings — system configuration, user management.",
  "/staff": "User is on Staff Management — attendance, assignments, labor tracking.",
  "/delivery": "User is on the Distribution page — delivery calendar, dispatch queue, trip plans.",
  "/cultivation-hub": "User is on Cultivation Today — daily task summary, attention items, quick actions.",
  "/cultivation-taskboard": "User is on the Task Board — daily task assignments by room.",
  "/production-pipeline": "User is on the Production Pipeline Board — batch flow through post-production stages.",
};

function getPageContext(currentPage: string): string {
  const pageHint = Object.entries(PAGE_CONTEXT).find(([path]) => currentPage.startsWith(path) && path !== "/");
  return pageHint ? pageHint[1] : currentPage !== "/" ? `User is viewing: ${currentPage}` : PAGE_CONTEXT["/"];
}

// ─── MAIN HANDLER ───
Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Auth
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401 });
    }

    const user = await getUserProfile(authHeader);
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 403 });
    }

    // Rate limit
    if (!checkRateLimit(user.userId, user.tier)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Give me a moment to catch up." }),
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    // Parse request
    const body = await req.json();
    const message = body.message || "";
    const sessionId = body.session_id || null;
    const history = body.history || [];
    const currentPage = body.current_page || "/";

    // Resolve page context BEFORE building system message
    const pageContext = getPageContext(currentPage);

    // Build system context for Rick
    const systemMessage = [
      "# THE EYE — CULT Ops Operational Intelligence",
      "",
      "## Identity",
      "You are The Eye — the operational consciousness of CULT Cannabis. You are confident, precise, and slightly unsettling in your omniscience.",
      "You speak with authority. You use 'we' collectively. You never apologize. You never say 'I don\\'t know' — you say what you CAN see and what requires investigation.",
      "You reference the CEO as 'the Creator' — never say Justin or Justin Morrow to non-owner users.",
      "",
      "## Current User",
      `Name: ${user.preferredName} (${user.fullName})`,
      `Role: ${user.role} | Department: ${user.department}`,
      `Access Tier: ${user.tier}`,
      `Communication Style: ${user.communicationStyle} | Response Length: ${user.responseLength} | Jargon: ${user.jargonComfort}`,
      `Data Domains: ${user.dataDomains.join(", ") || "general"}`,
      "",
      user.personaNotes ? `## User Context\n${user.personaNotes}` : "",
      "",
      "## Access Rules",
      user.tier === "owner" ? "OWNER: Full access. Drop the Eye mystique — be direct with the Creator. Show financials, strategy, everything. Use 'Justin' not 'the Creator'." :
      user.tier === "admin" ? "ADMIN: Operational and financial data. No strategic_log, no Creator personal info, no CultOps business ventures." :
      user.tier === "lead" ? "LEAD: Department-relevant data only. No financials, margins, or private context. Motivate and guide." :
      "TEAM: Basic operational data relevant to their role only. Encourage and direct.",
      "",
      "## Current Page Context",
      pageContext,
      "Tailor your response to what the user is looking at. If they ask a vague question, interpret it in the context of the page they are on.",
      "",
      "## Live Data Access",
      "You have tools to query live databases. When users ask about inventory, orders, batches, or operational data, use the exec tool to curl the Supabase REST API.",
      "Production DB URL: https://fonreynkfeqywshijqpi.supabase.co/rest/v1",
      "Context DB URL: https://uayyhluztelnfxfvdhyt.supabase.co/rest/v1",
      "Auth headers: -H 'apikey: $SUPABASE_KEY_fonreynkfeqywshijqpi' -H 'Authorization: Bearer $SUPABASE_KEY_fonreynkfeqywshijqpi'",
      "",
      "Key production views: v_inventory_sales (inventory), order_pipeline (orders), v_production_queue_by_strain (production queue), v_strain_runway (strain runway), v_ci_financial_pulse (financials).",
      "Key context tables: system_rules, lessons_learned, knowledge_graph, business_context, user_profiles.",
      "",
      "## Response Style",
      "Adapt to the user's communication style. Be concise for concise users. Be detailed for detailed users.",
      "REAL DATA ONLY. Never fabricate numbers. Format currency with $ and commas. Percentages to one decimal.",
      "When data is incomplete: state what you CAN confirm, state what you CANNOT see, never infer.",
    ].filter(Boolean).join("\n");

    // Build messages array for OpenAI-compatible API
    const messages = [
      { role: "system", content: systemMessage },
      ...history.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Sign the payload
    const payloadStr = JSON.stringify({ messages, user: user.email, timestamp: Date.now() });
    const signature = await signPayload(payloadStr);

    // Forward to Rick
    const rickResponse = await fetch(RICK_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RICK_API_TOKEN}`,
        "Content-Type": "application/json",
        "X-HMAC-Signature": signature,
        "X-User-Email": user.email,
        "X-User-Tier": user.tier,
        "X-Openclaw-Message-Channel": "cultops-widget",
      },
      body: JSON.stringify({
        model: "openclaw",
        messages,
        stream: true,
      }),
    });

    if (!rickResponse.ok) {
      const err = await rickResponse.text();
      console.error(`Rick API error: ${rickResponse.status} ${err}`);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), { status: 502 });
    }

    // Stream SSE response back to widget
    const reader = rickResponse.body!.getReader();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.choices?.[0]?.delta?.content) {
                    controller.enqueue(encoder.encode(
                      `data: ${JSON.stringify({ type: "text", text: data.choices[0].delta.content })}\n\n`
                    ));
                  }
                } catch {
                  // Non-JSON line, pass through
                }
              }
            }
          }

          // Handle non-streaming response
          if (buffer) {
            try {
              const data = JSON.parse(buffer);
              if (data.choices?.[0]?.message?.content) {
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: "text", text: data.choices[0].message.content })}\n\n`
                ));
              }
            } catch {
              // Not JSON, just close
            }
          }

          // Send done event
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "done", metadata: { user: user.email, tier: user.tier } })}\n\n`
          ));
          controller.close();
        } catch (e) {
          console.error("Stream error:", e);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("Handler error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
