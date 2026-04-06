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
async function getUserProfile(authHeader: string): Promise<{ userId: string; email: string; fullName: string; role: string; tier: string } | null> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    // Look up user profile for persona/tier info
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, role")
      .eq("email", user.email)
      .single();

    // Map role + email to access tier
    // Owner: justin@cultcannabis.co (CEO)
    // Admin: admin role users
    // Team: everyone else
    const OWNER_EMAILS = ["justin@cultcannabis.co"];
    const role = profile?.role || "user";
    let tier = "team";
    if (OWNER_EMAILS.includes(user.email || "")) {
      tier = "owner";
    } else if (role === "admin") {
      tier = "admin";
    } else if (role === "manager") {
      tier = "lead";
    }

    return {
      userId: user.id,
      email: user.email || "",
      fullName: profile?.full_name || user.email || "Unknown",
      role,
      tier,
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

    // Build system context for Rick
    const systemMessage = [
      `User: ${user.fullName} (${user.email})`,
      `Role: ${user.role}`,
      `Access Tier: ${user.tier}`,
      `Session: ${sessionId || "new"}`,
      "",
      "You are the AI assistant embedded in CULT Ops. Respond based on the user's role and access tier.",
      "Do not share financial details, strategic plans, or private context with non-owner users.",
      "Be concise and helpful. Use data from the production and context databases when relevant.",
    ].join("\n");

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
    // Convert Rick's response format to match what AIChatWidget expects
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
                  // Convert OpenAI streaming format to widget SSE format
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

          // If non-streaming response, handle full response
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
