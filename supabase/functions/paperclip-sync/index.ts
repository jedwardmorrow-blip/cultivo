import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// paperclip-sync Edge Function
// Replaces the Vercel cron at /api/paperclip-sync (removed in CUL-387).
// Called by a Paperclip routine on a schedule (e.g. every 5 minutes).
// Auth: Authorization: Bearer $CRON_SECRET
// ---------------------------------------------------------------------------

const SEVERITY_TO_PRIORITY: Record<string, string> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
};

// CTO agent receives all synced tickets
const CTO_AGENT_ID = "789da741-a2fa-49e1-a229-da5b1ed81644";
const GOAL_ID = "03f8c45f-5df4-439c-8a3a-27f4e6b9eb3c";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // Only POST is used; GET is fine for health checks
  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // --- Auth: CRON_SECRET ---
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // --- Config ---
  const paperclipUrl = Deno.env.get("PAPERCLIP_API_URL");
  const paperclipKey = Deno.env.get("PAPERCLIP_API_KEY");
  const paperclipCompany = Deno.env.get("PAPERCLIP_COMPANY_ID");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!paperclipUrl || !paperclipKey || !paperclipCompany || !supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: "Missing required environment variables" }, 500);
  }

  // --- DB client (service role, bypasses RLS) ---
  const db = createClient(supabaseUrl, supabaseServiceKey);

  // --- Fetch pending tickets ---
  const { data: tickets, error: fetchErr } = await db
    .from("tickets")
    .select("*")
    .eq("paperclip_sync_status", "pending");

  if (fetchErr) {
    return jsonResponse({ error: "Failed to query tickets", detail: fetchErr.message }, 500);
  }

  let synced = 0;
  let failed = 0;

  for (const ticket of tickets ?? []) {
    try {
      const ppRes = await fetch(
        `${paperclipUrl}/api/companies/${paperclipCompany}/issues`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paperclipKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: ticket.title,
            description: [
              `**Type:** ${ticket.type ?? ticket.bug_category ?? ticket.request_type ?? "Unknown"}`,
              `**Severity:** ${ticket.severity}`,
              `**Area:** ${ticket.affected_area ?? "Unknown"}`,
              ...(ticket.business_case ? [`**Business Case:** ${ticket.business_case}`] : []),
              "",
              "---",
              "",
              ticket.description ?? "",
              ...(ticket.ai_analysis ? ["", `*AI Summary: ${ticket.ai_analysis}*`] : []),
            ]
              .join("\n")
              .trim(),
            priority: SEVERITY_TO_PRIORITY[ticket.severity] ?? "medium",
            status: "todo",
            assigneeAgentId: CTO_AGENT_ID,
            goalId: GOAL_ID,
          }),
        }
      );

      if (ppRes.ok) {
        const ppIssue = (await ppRes.json()) as { identifier: string };
        await db
          .from("tickets")
          .update({
            paperclip_issue_id: ppIssue.identifier,
            paperclip_sync_status: "synced",
            paperclip_synced_at: new Date().toISOString(),
          })
          .eq("id", ticket.id);
        synced++;
      } else {
        const errText = await ppRes.text().catch(() => ppRes.statusText);
        console.error(`Paperclip API error for ticket ${ticket.id}: ${ppRes.status} ${errText}`);
        await db
          .from("tickets")
          .update({ paperclip_sync_status: "failed" })
          .eq("id", ticket.id);
        failed++;
      }
    } catch (err) {
      console.error(`Unexpected error for ticket ${ticket.id}:`, err);
      await db
        .from("tickets")
        .update({ paperclip_sync_status: "failed" })
        .eq("id", ticket.id);
      failed++;
    }
  }

  return jsonResponse({ synced, failed, skipped: 0 });
});
