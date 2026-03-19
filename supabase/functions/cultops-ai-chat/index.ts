import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  type ChatRequest,
  CLAUDE_API_URL, CLAUDE_MODEL, MAX_TOKENS,
  verifyAuth, getUserAccessTier, classifyIntent,
  detectExplicitPreferences, applyPreferenceUpdate,
  fetchUserPreferences, fetchUserContext, fetchPinnedContext,
  updateLearnedPreferences, fetchPersonaProfile,
} from "./lib.ts";
import {
  handleDistill, handleReviewCandidates, handleApproveCandidate,
  handleRejectCandidate, handleShowTickets, handleWorkTicketIntake,
  handleRequestIntake, handleShowCoworkQueue, uploadAttachments,
  fetchLiveData, fetchContextKnowledge,
  buildSystemPrompt, logConversation, logInteraction, sseResponse,
  autoDistillSession,
} from "./handlers.ts";

// ============================================================
// MAIN HANDLER — v37 (CONVERSATIONAL KNOWLEDGE)
// v34: Reconciled merge (canonical)
// v35: Cowork queue wired to widget
// v36: Image attachments sent to Claude as vision blocks
// v37: Adjusted auto-distill filters to capture conversational data & restored people category
// ============================================================
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  }

  try {
    const userProfile = await verifyAuth(req);
    const tier = getUserAccessTier(userProfile);
    const body: ChatRequest = await req.json();
    if (!body.message?.trim()) throw new Error("Message is required");

    console.log(`[cultops-ai-chat v36] User: ${userProfile.fullName} (${userProfile.role}, tier=${tier}${userProfile.isCreator ? ", CREATOR" : ""}) | "${body.message.slice(0, 80)}"`);

    const requestStart = Date.now();

    const prefUpdate = detectExplicitPreferences(body.message);
    if (prefUpdate) {
      const response = await applyPreferenceUpdate(userProfile.userId, prefUpdate);
      logInteraction(userProfile.email, body.session_id || null, body.message, "preference", [], "confident", Date.now() - requestStart).catch(() => {});
      return sseResponse(response, ["preference"], logConversation(userProfile.userId, body.session_id || null, body.message, response, "preference"));
    }

    const intent = classifyIntent(body.message);
    const attachments = body.attachments || [];

    if (intent.primary === "distill") {
      const response = await handleDistill(userProfile.userId, tier);
      logInteraction(userProfile.email, body.session_id || null, body.message, intent.primary, intent.categories, "confident", Date.now() - requestStart).catch(() => {});
      return sseResponse(response, intent.intents, logConversation(userProfile.userId, body.session_id || null, body.message, response, "system"));
    }
    if (intent.primary === "review_candidates") {
      const response = await handleReviewCandidates(tier);
      logInteraction(userProfile.email, body.session_id || null, body.message, intent.primary, intent.categories, "confident", Date.now() - requestStart).catch(() => {});
      return sseResponse(response, intent.intents, logConversation(userProfile.userId, body.session_id || null, body.message, response, "system"));
    }
    if (intent.primary === "approve_candidate") {
      const response = await handleApproveCandidate(body.message, userProfile.userId, tier);
      logInteraction(userProfile.email, body.session_id || null, body.message, intent.primary, intent.categories, "confident", Date.now() - requestStart).catch(() => {});
      return sseResponse(response, intent.intents, logConversation(userProfile.userId, body.session_id || null, body.message, response, "system"));
    }
    if (intent.primary === "reject_candidate") {
      const response = await handleRejectCandidate(body.message, userProfile.userId, tier);
      logInteraction(userProfile.email, body.session_id || null, body.message, intent.primary, intent.categories, "confident", Date.now() - requestStart).catch(() => {});
      return sseResponse(response, intent.intents, logConversation(userProfile.userId, body.session_id || null, body.message, response, "system"));
    }
    if (intent.primary === "show_tickets") {
      const response = await handleShowTickets();
      logInteraction(userProfile.email, body.session_id || null, body.message, intent.primary, intent.categories, "confident", Date.now() - requestStart).catch(() => {});
      return sseResponse(response, intent.intents, logConversation(userProfile.userId, body.session_id || null, body.message, response, "system"));
    }
    // v35: Cowork queue — Creator only
    if (intent.primary === "cowork_queue" && (userProfile.isCreator || tier === "owner")) {
      const response = await handleShowCoworkQueue();
      logInteraction(userProfile.email, body.session_id || null, body.message, intent.primary, intent.categories, "confident", Date.now() - requestStart).catch(() => {});
      return sseResponse(response, intent.intents, logConversation(userProfile.userId, body.session_id || null, body.message, response, "system"));
    }
    if (intent.primary === "work_ticket") {
      const response = await handleWorkTicketIntake(body.message, attachments, userProfile.userId, body.session_id || null, userProfile.fullName);
      logInteraction(userProfile.email, body.session_id || null, body.message, intent.primary, intent.categories, "confident", Date.now() - requestStart).catch(() => {});
      return sseResponse(response, intent.intents, logConversation(userProfile.userId, body.session_id || null, body.message, response, "ticket_intake"));
    }
    if (intent.primary === "request_ticket") {
      const response = await handleRequestIntake(body.message, attachments, userProfile.userId, body.session_id || null);
      logInteraction(userProfile.email, body.session_id || null, body.message, intent.primary, intent.categories, "confident", Date.now() - requestStart).catch(() => {});
      return sseResponse(response, intent.intents, logConversation(userProfile.userId, body.session_id || null, body.message, response, "request_intake"));
    }

    // Write-back actions
    const writebackIntent = (() => {
      const lower = body.message.toLowerCase();
      if (/add.?(to|on).?(my|the)?.?(checklist|todo|to.?do|list)|remind me to|don.?t (let me )?forget|create.?(a |an )?(task|todo|to.?do|checklist|reminder)|^todo[:\s]/i.test(lower)) return "add_checklist";
      if (/flag.?(for|as).?(ids|l.?10|issue|l10|meeting)|should be an? (l.?10 |ids )?issue|escalate this|bring.?this.?(to|up at).?(l.?10|ids|meeting)|needs?.?team.?(attention|discussion)|discuss.?(this )?(at |in )?(l.?10|ids|the meeting)/i.test(lower)) return "flag_issue";
      return null;
    })();
    const myTasksIntent = (() => {
      const lower = body.message.toLowerCase();
      if (/my (checklist|to.?do|tasks?|plate|action items?)|what.?s on my|what do i (have|need) to do|show my (tasks?|checklist|to.?do|rocks?|scorecard|metrics?)|my open (items?|tasks?|to.?do)|what am i working on|my assignments?/i.test(lower)) return "my_tasks";
      return null;
    })();
    if (myTasksIntent) {
      const wbUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/chat-writeback`;
      const wbRes = await fetch(wbUrl, { method: "POST", headers: { "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "my_tasks", user_email: userProfile.email, user_name: userProfile.fullName }) });
      const wbData = await wbRes.json();
      const response = wbData.response || "Could not fetch your tasks.";
      logInteraction(userProfile.email, body.session_id || null, body.message, "my_tasks", [], "confident", Date.now() - requestStart).catch(() => {});
      return sseResponse(response, ["my_tasks"], logConversation(userProfile.userId, body.session_id || null, body.message, response, "write_back"));
    }
    if (writebackIntent) {
      const wbUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/chat-writeback`;
      const wbRes = await fetch(wbUrl, { method: "POST", headers: { "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: writebackIntent, message: body.message, user_email: userProfile.email, user_name: userProfile.fullName }) });
      const wbData = await wbRes.json();
      const response = wbData.response || "Write-back action completed.";
      logInteraction(userProfile.email, body.session_id || null, body.message, writebackIntent, [], "confident", Date.now() - requestStart).catch(() => {});
      return sseResponse(response, [writebackIntent], logConversation(userProfile.userId, body.session_id || null, body.message, response, "write_back"));
    }

    const [liveData, contextKnowledge, userCtx, prefs, persona] = await Promise.all([
      fetchLiveData(intent.intents, intent.financial, tier, userProfile.email, body.message, userProfile.isCreator),
      fetchContextKnowledge(body.message, intent.categories, tier, userProfile.userId),
      fetchUserContext(userProfile),
      fetchUserPreferences(userProfile.userId),
      fetchPersonaProfile(userProfile.email),
    ]);

    const pinnedContext = await fetchPinnedContext(prefs.pinned_context_ids);
    const systemPrompt = buildSystemPrompt(liveData, contextKnowledge, intent, userCtx, tier, prefs, pinnedContext, persona);
    const messages: Array<{ role: string; content: string | Array<Record<string, unknown>> }> = [];
    if (body.history?.length) messages.push(...body.history.slice(-10));

    // v36: If attachments include images, build multimodal content array for Claude vision
    const imageAttachments = attachments.filter((a: { mimeType: string }) => a.mimeType.startsWith("image/"));
    if (imageAttachments.length > 0) {
      const contentBlocks: Array<Record<string, unknown>> = [];
      for (const img of imageAttachments) {
        contentBlocks.push({
          type: "image",
          source: { type: "base64", media_type: img.mimeType, data: img.base64Data },
        });
      }
      contentBlocks.push({ type: "text", text: body.message });
      messages.push({ role: "user", content: contentBlocks });
      console.log(`[v36] Sending ${imageAttachments.length} image(s) to Claude vision`);
    } else {
      messages.push({ role: "user", content: body.message });
    }

    // v36: Upload attachments to storage in parallel (non-blocking, for record-keeping)
    if (attachments.length > 0) {
      uploadAttachments(attachments, "chat").catch((e: Error) => console.error(`[v36] background upload error: ${e.message}`));
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const claudeResponse = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: MAX_TOKENS, system: systemPrompt, messages, stream: true }),
    });
    if (!claudeResponse.ok) { const err = await claudeResponse.text(); throw new Error(`Claude API error (${claudeResponse.status}): ${err}`); }

    updateLearnedPreferences(userProfile.userId, intent, body.message.length).catch(() => {});
    const resultType = (contextKnowledge && contextKnowledge !== "No context available." && contextKnowledge !== "Context DB unavailable.") ? "confident" : "fallback";

    const encoder = new TextEncoder();
    let fullResponse = "";
    const stream = new ReadableStream({
      async start(controller) {
        const reader = claudeResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "metadata", intents: intent.intents, financial: intent.financial, tier })}\n\n`));
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const event = JSON.parse(data);
                if (event.type === "content_block_delta" && event.delta?.text) {
                  fullResponse += event.delta.text;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`));
                } else if (event.type === "message_stop") {
                  const latency = Date.now() - requestStart;
                  logInteraction(userProfile.email, body.session_id || null, body.message, intent.primary, intent.categories, resultType, latency, intent.intents).catch(() => {});
                  logConversation(userProfile.userId, body.session_id || null, body.message, fullResponse)
                    .then(sid => {
                      if (sid) autoDistillSession(sid).catch(e => console.log(`[v36] auto-distill error: ${e}`));
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", session_id: sid })}\n\n`));
                      controller.close();
                    })
                    .catch(() => controller.close());
                  return;
                }
              } catch { }
            }
          }
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: String(err) })}\n\n`));
          controller.close();
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("not found") ? 403 : message.includes("Invalid token") ? 401 : 400;
    return new Response(JSON.stringify({ error: message }), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
});
