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
  buildSystemPrompt, buildGreeting, logConversation, logInteraction, sseResponse,
  autoDistillSession,
} from "./handlers.ts";

// ============================================================
// MAIN HANDLER — v49 (MESSAGE FEEDBACK)
// v34: Reconciled merge (canonical)
// v35: Cowork queue wired to widget
// v36: Image attachments sent to Claude as vision blocks
// v37: Adjusted auto-distill filters to capture conversational data & restored people category
// v38: Thread assistant message_id through done event for thumbs feedback
// v49: Grade detection, inventory limit fix, order_items query, sold/sales intent keywords
// ============================================================
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  }

  try {
    const userProfile = await verifyAuth(req);
    const tier = getUserAccessTier(userProfile);
    const body: ChatRequest & { greeting?: boolean } = await req.json();

    console.log(`[cultops-ai-chat v49] User: ${userProfile.fullName} (${userProfile.role}, tier=${tier}${userProfile.isCreator ? ", CREATOR" : ""}) | ${body.greeting ? "GREETING" : `"${(body.message || "").slice(0, 80)}"`}`);

    const requestStart = Date.now();

    // Proactive greeting on widget open
    if (body.greeting) {
      const persona = await fetchPersonaProfile(userProfile.email);
      const greetingText = await buildGreeting(userProfile, persona, tier);
      logInteraction(userProfile.email, null, "__greeting__", "daily_greeting", [], "confident", Date.now() - requestStart).catch(() => {});
      return sseResponse(greetingText, ["daily_greeting"], logConversation(userProfile.userId, null, "__greeting__", greetingText, "greeting"));
    }

    if (!body.message?.trim()) throw new Error("Message is required");

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

    // v36+v50: Handle attachments — images via Claude vision, documents via text extraction
    const imageAttachments = attachments.filter((a: { mimeType: string }) => a.mimeType.startsWith("image/"));
    const docAttachments = attachments.filter((a: { mimeType: string }) => !a.mimeType.startsWith("image/"));

    // Extract text content from document attachments
    const docContextParts: string[] = [];
    for (const doc of docAttachments) {
      try {
        if (doc.mimeType === "text/plain" || doc.mimeType === "text/csv") {
          // Decode base64 text directly
          const text = atob(doc.base64Data);
          docContextParts.push(`--- ATTACHED FILE: ${doc.fileName} (${doc.mimeType}) ---\n${text.slice(0, 15000)}`);
        } else if (doc.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || doc.mimeType === "application/vnd.ms-excel") {
          // Excel files: can't parse in Deno without a library — acknowledge and describe
          docContextParts.push(`--- ATTACHED FILE: ${doc.fileName} (Excel spreadsheet, ${Math.round(doc.base64Data.length * 0.75 / 1024)}KB) ---\nThis is a binary Excel file. You cannot read its contents directly, but it has been uploaded and stored. Acknowledge the attachment and let the user know you can see they attached "${doc.fileName}" but cannot parse Excel data directly in chat. Suggest they paste key data as text or ask specific questions about it.`);
        } else if (doc.mimeType === "application/pdf") {
          docContextParts.push(`--- ATTACHED FILE: ${doc.fileName} (PDF, ${Math.round(doc.base64Data.length * 0.75 / 1024)}KB) ---\nThis is a PDF file. It has been uploaded and stored. Acknowledge the attachment and let the user know you can see they attached "${doc.fileName}". For PDF analysis, suggest they paste relevant text or describe what they need.`);
        } else {
          docContextParts.push(`--- ATTACHED FILE: ${doc.fileName} (${doc.mimeType}) ---\nFile uploaded and stored. Cannot parse this format directly.`);
        }
      } catch (e) {
        console.error(`[v50] doc attachment parse error for ${doc.fileName}: ${e}`);
        docContextParts.push(`--- ATTACHED FILE: ${doc.fileName} ---\nFile received but could not be processed.`);
      }
    }

    const docContext = docContextParts.length > 0 ? "\n\n" + docContextParts.join("\n\n") : "";
    const userMessageWithDocs = body.message + docContext;

    if (imageAttachments.length > 0) {
      const contentBlocks: Array<Record<string, unknown>> = [];
      for (const img of imageAttachments) {
        contentBlocks.push({
          type: "image",
          source: { type: "base64", media_type: img.mimeType, data: img.base64Data },
        });
      }
      contentBlocks.push({ type: "text", text: userMessageWithDocs });
      messages.push({ role: "user", content: contentBlocks });
      console.log(`[v50] Sending ${imageAttachments.length} image(s) + ${docAttachments.length} doc(s) to Claude`);
    } else {
      messages.push({ role: "user", content: userMessageWithDocs });
      if (docAttachments.length > 0) console.log(`[v50] ${docAttachments.length} doc attachment(s): ${docAttachments.map(d => d.fileName).join(", ")}`);
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
    if (!claudeResponse.ok) {
      const errBody = await claudeResponse.text();
      console.error(`[cultops-ai-chat] Anthropic API ${claudeResponse.status}: ${errBody}`);
      // Map known API errors to user-friendly messages
      const status = claudeResponse.status;
      if (status === 400 && errBody.includes("credit balance is too low")) {
        throw new Error("The AI assistant is temporarily unavailable due to a billing issue. Please notify an admin.");
      } else if (status === 429) {
        throw new Error("The AI assistant is experiencing high demand. Please try again in a moment.");
      } else if (status === 529 || status === 503) {
        throw new Error("The AI assistant is temporarily overloaded. Please try again shortly.");
      } else if (status === 401) {
        throw new Error("AI service authentication error. Please notify an admin.");
      }
      throw new Error(`API ${status}: ${errBody.substring(0, 200)}`);
    }

    updateLearnedPreferences(userProfile.userId, intent, body.message.length).catch(() => {});
    const resultType = (contextKnowledge && contextKnowledge !== "No context available." && contextKnowledge !== "Context DB unavailable.") ? "confident" : "fallback";

    const encoder = new TextEncoder();
    let fullResponse = "";
    const stream = new ReadableStream({
      async start(controller) {
        const reader = claudeResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const newline = "\n\n";
        try {
          const metaData = JSON.stringify({ type: "metadata", intents: intent.intents, financial: intent.financial, tier });
          controller.enqueue(encoder.encode("data: " + metaData + newline));
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
                  const textData = JSON.stringify({ type: "text", text: event.delta.text });
                  controller.enqueue(encoder.encode("data: " + textData + newline));
                } else if (event.type === "message_stop") {
                  const latency = Date.now() - requestStart;
                  logInteraction(userProfile.email, body.session_id || null, body.message, intent.primary, intent.categories, resultType, latency, intent.intents).catch(() => {});
                  logConversation(userProfile.userId, body.session_id || null, body.message, fullResponse)
                    .then(result => {
                      if (result.sessionId) autoDistillSession(result.sessionId).catch(e => console.log(`[v36] auto-distill error: ${e}`));
                      const doneData = JSON.stringify({ type: "done", session_id: result.sessionId, message_id: result.messageId });
                      controller.enqueue(encoder.encode("data: " + doneData + newline));
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
          const errData = JSON.stringify({ type: "error", error: String(err) });
          controller.enqueue(encoder.encode("data: " + errData + newline));
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
