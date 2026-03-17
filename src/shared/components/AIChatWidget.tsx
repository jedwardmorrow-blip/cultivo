// AIChatWidget.tsx — CultOps AI Assistant v3
// Floating chat widget with streaming, financial intelligence, semantic search
// Mount: Add <AIChatWidget /> to App.tsx root, before closing tag
// Branding: Cult Cannabis — black/white/gray, Montserrat, Cult Eye logo

import { useState, useRef, useEffect, useCallback } from "react";

// ─── CONFIGURATION ───
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const CHAT_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/cultops-ai-chat`;

// ─── BRAND COLORS ───
const BRAND = {
  black: "#0A0A0A",
  graphite: "#1C1C1C",
  charcoal: "#2E2E2E",
  silver: "#A6A6A6",
  offWhite: "#F8F8F8",
  white: "#FFFFFF",
  red: "#B81D24",
  redHover: "#D42029",
  // Semantic
  surface: "#111111",
  border: "#333333",
  textPrimary: "#F0F0F0",
  textSecondary: "#A6A6A6",
  textMuted: "#666666",
};

// ─── TYPES ───
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: {
    intents?: string[];
    financial?: boolean;
  };
}

// ─── SUGGESTED PROMPTS ───
const SUGGESTED_PROMPTS = [
  {
    icon: "◉",
    label: "Financial Pulse",
    prompt: "What's our financial situation? Revenue vs burn rate, deficit, and break-even analysis.",
  },
  {
    icon: "◉",
    label: "Inventory Pipeline",
    prompt: "Show me the inventory pipeline — what's at each stage and the revenue potential.",
  },
  {
    icon: "◉",
    label: "Production Velocity",
    prompt: "What's our production throughput vs break-even target? Are we on track?",
  },
  {
    icon: "◉",
    label: "Customer Health",
    prompt: "Which customers are most valuable and which are at risk of churning?",
  },
  {
    icon: "◉",
    label: "Order Pipeline",
    prompt: "What orders are open and what's the delivery schedule this week?",
  },
  {
    icon: "◉",
    label: "What Should I Focus On?",
    prompt: "Given the current financial and operational data, what should be the top 3 priorities this week?",
  },
];

// ─── MARKDOWN RENDERER ───
function renderMarkdown(text: string): string {
  return text
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="ai-code-block"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, '<h4 class="ai-h4">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="ai-h3">$1</h3>')
    .replace(/^- (.+)$/gm, '<li class="ai-li">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="ai-ul">$&</ul>')
    .replace(/\n/g, "<br />");
}

// ─── MAIN COMPONENT ───
export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY || ""
      );
      const { data } = await supabase.auth.getSession();
      return data?.session?.access_token || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // ─── SEND MESSAGE ───
  const sendMessage = useCallback(
    async (messageText?: string) => {
      const text = (messageText || input).trim();
      if (!text || isLoading) return;

      setError(null);
      setInput("");

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Not authenticated");

        const response = await fetch(CHAT_FUNCTION_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: text,
            session_id: sessionId,
            history: messages.slice(-10).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (response.status === 403) {
          throw new Error("Access denied. Speak to the Creator for permission.");
        }
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `Server error (${response.status})`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantText = "";
        const assistantId = crypto.randomUUID();

        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: "" },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "text") {
                assistantText += event.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: assistantText }
                      : m
                  )
                );
              } else if (event.type === "metadata") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          metadata: {
                            intents: event.intents,
                            financial: event.financial,
                          },
                        }
                      : m
                  )
                );
              } else if (event.type === "done") {
                if (event.session_id) setSessionId(event.session_id);
              } else if (event.type === "error") {
                throw new Error(event.error);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setMessages((prev) =>
          prev.filter((m) => m.role !== "assistant" || m.content.length > 0)
        );
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, sessionId, getAccessToken]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  };

  // ─── CLOSED STATE: Cult Eye Bubble ───
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: BRAND.black,
          border: `2px solid ${BRAND.charcoal}`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 255, 255, 0.05)",
          zIndex: 9999,
          transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
          padding: 0,
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 28px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 255, 255, 0.08)";
          e.currentTarget.style.borderColor = BRAND.silver;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 24px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 255, 255, 0.05)";
          e.currentTarget.style.borderColor = BRAND.charcoal;
        }}
        title="CULT AI"
      >
        <img
          src="/cult-logo-eye.png"
          alt="CULT"
          style={{
            width: "36px",
            height: "36px",
            objectFit: "contain",
            filter: "brightness(1.1)",
          }}
        />
      </button>
    );
  }

  // ─── OPEN STATE: Chat Panel ───
  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "420px",
        height: "600px",
        borderRadius: "12px",
        background: BRAND.black,
        border: `1px solid ${BRAND.charcoal}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0, 0, 0, 0.7)",
        zIndex: 9999,
        fontFamily: 'Montserrat, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: "14px 16px",
          background: BRAND.graphite,
          borderBottom: `1px solid ${BRAND.charcoal}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img
            src="/cult-logo-eye.png"
            alt="CULT"
            style={{ width: "22px", height: "22px", objectFit: "contain" }}
          />
          <span style={{ color: BRAND.white, fontWeight: 700, fontSize: "14px", letterSpacing: "1px", textTransform: "uppercase" }}>
            CULT AI
          </span>
          <span style={{ color: BRAND.textMuted, fontSize: "10px", letterSpacing: "0.5px" }}>
            v3 · Intelligence
          </span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={clearChat}
            style={{
              background: BRAND.charcoal,
              border: `1px solid ${BRAND.border}`,
              color: BRAND.silver,
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "10px",
              cursor: "pointer",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              fontFamily: "inherit",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = BRAND.white; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = BRAND.silver; }}
          >
            Clear
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: BRAND.charcoal,
              border: `1px solid ${BRAND.border}`,
              color: BRAND.silver,
              width: "28px",
              height: "28px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "inherit",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = BRAND.white; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = BRAND.silver; }}
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.length === 0 && (
          <div>
            <p style={{ color: BRAND.textSecondary, fontSize: "12px", margin: "0 0 16px 0", letterSpacing: "0.3px" }}>
              The eye sees all. Ask about inventory, orders, production, finances, or strategy.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {SUGGESTED_PROMPTS.map((sp) => (
                <button
                  key={sp.label}
                  onClick={() => sendMessage(sp.prompt)}
                  style={{
                    background: BRAND.graphite,
                    border: `1px solid ${BRAND.charcoal}`,
                    borderRadius: "6px",
                    padding: "10px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "border-color 0.2s, background 0.2s",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = BRAND.silver;
                    e.currentTarget.style.background = BRAND.charcoal;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = BRAND.charcoal;
                    e.currentTarget.style.background = BRAND.graphite;
                  }}
                >
                  <span style={{ fontSize: "10px", color: BRAND.red }}>
                    {sp.icon}
                  </span>
                  <div style={{ color: BRAND.offWhite, fontSize: "11px", fontWeight: 600, marginTop: "4px", letterSpacing: "0.3px" }}>
                    {sp.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {/* Intent badges */}
            {msg.role === "assistant" && msg.metadata?.intents && (
              <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                {msg.metadata.intents.map((intent) => (
                  <span
                    key={intent}
                    style={{
                      fontSize: "9px",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      background: intent === "financial" ? "rgba(184, 29, 36, 0.15)" : "rgba(255, 255, 255, 0.06)",
                      color: intent === "financial" ? "#E07070" : BRAND.silver,
                      border: `1px solid ${intent === "financial" ? "rgba(184, 29, 36, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    {intent}
                  </span>
                ))}
              </div>
            )}

            <div
              style={{
                maxWidth: "90%",
                padding: "10px 14px",
                borderRadius: msg.role === "user" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                background: msg.role === "user" ? BRAND.white : BRAND.graphite,
                color: msg.role === "user" ? BRAND.black : BRAND.textPrimary,
                fontSize: "13px",
                lineHeight: 1.6,
                border: msg.role === "user" ? "none" : `1px solid ${BRAND.charcoal}`,
              }}
              dangerouslySetInnerHTML={
                msg.role === "assistant"
                  ? { __html: renderMarkdown(msg.content) || `<span style="opacity:0.4">Thinking...</span>` }
                  : undefined
              }
            >
              {msg.role === "user" ? msg.content : undefined}
            </div>
          </div>
        ))}

        {/* Loading dots */}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div style={{ display: "flex", gap: "4px", padding: "8px" }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "3px",
                  background: BRAND.white,
                  animation: `cultPulse 1.4s infinite ${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              background: "rgba(184, 29, 36, 0.1)",
              border: `1px solid rgba(184, 29, 36, 0.25)`,
              borderRadius: "6px",
              padding: "10px",
              color: "#E07070",
              fontSize: "12px",
            }}
          >
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: `1px solid ${BRAND.charcoal}`,
          display: "flex",
          gap: "8px",
          background: BRAND.graphite,
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the eye..."
          rows={1}
          style={{
            flex: 1,
            background: BRAND.black,
            border: `1px solid ${BRAND.charcoal}`,
            borderRadius: "6px",
            padding: "10px 12px",
            color: BRAND.textPrimary,
            fontSize: "13px",
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            letterSpacing: "0.3px",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = BRAND.silver; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = BRAND.charcoal; }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim()}
          style={{
            background: isLoading || !input.trim() ? BRAND.charcoal : BRAND.white,
            border: "none",
            borderRadius: "6px",
            width: "40px",
            cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isLoading || !input.trim() ? BRAND.textMuted : BRAND.black}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {/* ── Styles ── */}
      <style>{`
        @keyframes cultPulse {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        .ai-code-block {
          background: ${BRAND.graphite};
          border: 1px solid ${BRAND.charcoal};
          padding: 12px;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 12px;
          font-family: 'SF Mono', 'Fira Code', monospace;
        }
        .ai-inline-code {
          background: ${BRAND.charcoal};
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 12px;
          font-family: 'SF Mono', 'Fira Code', monospace;
        }
        .ai-h3 {
          font-size: 14px;
          font-weight: 700;
          margin: 10px 0 4px;
          letter-spacing: 0.5px;
          color: ${BRAND.white};
        }
        .ai-h4 {
          font-size: 13px;
          font-weight: 600;
          margin: 8px 0 2px;
          color: ${BRAND.offWhite};
        }
        .ai-ul { margin: 4px 0; padding-left: 20px; }
        .ai-li { margin: 2px 0; color: ${BRAND.textPrimary}; }
      `}</style>
    </div>
  );
}
