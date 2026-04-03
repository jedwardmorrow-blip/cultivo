// GET /api/paperclip-sync
// Protected by: Authorization: Bearer $CRON_SECRET
// Called by: Vercel Cron (*/5 * * * *) + manual testing
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SEVERITY_TO_PRIORITY: Record<string, string> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Validate CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers["authorization"];
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const paperclipUrl = process.env.PAPERCLIP_API_URL;
  const paperclipKey = process.env.PAPERCLIP_API_KEY;
  const paperclipCompany = process.env.PAPERCLIP_COMPANY_ID;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!paperclipUrl || !paperclipKey || !paperclipCompany || !supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: "Missing required environment variables" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch pending/failed tickets
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("*")
    .in("paperclip_sync_status", ["pending", "failed"]);

  if (error) {
    res.status(500).json({ error: "Failed to query tickets", detail: error.message });
    return;
  }

  let synced = 0;
  let failed = 0;
  const skipped = 0;

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
              `**Severity:** ${ticket.severity}`,
              `**Area:** ${ticket.affected_area ?? "Unknown"}`,
              `**Reporter:** ${ticket.reporter_name ?? "Unknown"}`,
              "",
              "---",
              "",
              ticket.description ?? "",
              "",
              ticket.ai_analysis ? `*AI Summary: ${ticket.ai_analysis}*` : "",
            ]
              .join("\n")
              .trim(),
            priority: SEVERITY_TO_PRIORITY[ticket.severity] ?? "medium",
            status: "todo",
            assigneeAgentId: process.env.PAPERCLIP_AGENT_ID,
          }),
        }
      );

      if (ppRes.ok) {
        const ppIssue = await ppRes.json() as { identifier: string };
        await supabase
          .from("tickets")
          .update({
            paperclip_issue_id: ppIssue.identifier,
            paperclip_sync_status: "synced",
            paperclip_synced_at: new Date().toISOString(),
          })
          .eq("id", ticket.id);
        synced++;
      } else {
        await supabase
          .from("tickets")
          .update({ paperclip_sync_status: "failed" })
          .eq("id", ticket.id);
        failed++;
      }
    } catch {
      await supabase
        .from("tickets")
        .update({ paperclip_sync_status: "failed" })
        .eq("id", ticket.id);
      failed++;
    }
  }

  res.status(200).json({ synced, failed, skipped });
}
