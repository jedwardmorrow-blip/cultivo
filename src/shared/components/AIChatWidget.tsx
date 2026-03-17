// AIChatWidget.tsx — CultOps AI Assistant v2
// Floating chat widget with streaming, financial intelligence, semantic search
// Mount: Add <AIChatWidget /> to App.tsx root, before closing tag
// Requires: useAuth() hook that returns { session } with session.access_token

import { useState, useRef, useEffect, useCallback } from "react";

// ─── CONFIGURATION ───
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const CHAT_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/cultops-ai-chat`;

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
    icon: "💰",
    label: "Financial Pulse",
    prompt: "What's our financial situation? Revenue vs burn rate, deficit, and break-even analysis.",
  },
  {
    icon: "📦",
    label: "Inventory Pipeline",
    prompt: "Show me the inventory pipeline — what's at each stage and the revenue potential.",
  },
  {
    icon: "⚡",
    label: "Production Velocity",
    prompt: "What's our production throughput vs break-even target? Are we on track?",
  },
  {
    icon: "🏪",
    label: "Customer Health",
    prompt: "Which customers are most valuable and which are at risk of churning?",
  },
  {
    icon: "📋",
    label: "Order Pipeline",
    prompt: "What orders are open and what's the delivery schedule this week?",
  },
  {
    icon: "🎯",
    label: "What Should I Focus On?",
    prompt: "Given the current financial and operational data, what should be the top 3 priorities this week?",
  },
];

// ─── MARKDOWN RENDERER ───
function renderMarkdown(text: string): string {
  return text
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="ai-code-block"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="ai-h4">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="ai-h3">$1</h3>')
    // Lists
    .replace(/^- (.+)$/gm, '<li class="ai-li">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="ai-ul">$&</ul>')
    // Line breaks
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

  // NOTE: Adjust this import to match your auth hook location
  // import { useAuth } from "../hooks/useAuth";
  // const { session } = useAuth();
  // For now, we'll get the token from the Supabase client
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    // Replace with your auth mechanism:
    // return session?.access_token || null;
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

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
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
          throw new Error("Admin access required. Contact Justin for access.");
        }
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `Server error (${response.status})`);
        }

        // Stream SSE response
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantText = "";
        const assistantId = crypto.randomUUID();

        // Add empty assistant message
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
        // Remove empty assistant message on error
        setMessages((prev) =>
          prev.filter((m) => m.role !== "assistant" || m.content.length > 0)
        );
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, sessionId, getAccessToken]
  );

  // ─── KEY HANDLER ───
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── CLEAR CHAT ───
  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  };

  // ─── RENDER ───
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "28px",
          background: "linear-gradient(135deg, #059669, #047857)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(5, 150, 105, 0.4)",
          zIndex: 9999,
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 24px rgba(5, 150, 105, 0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(5, 150, 105, 0.4)";
        }}
        title="CultOps AI Assistant"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "420px",
        height: "600px",
        borderRadius: "16px",
        background: "#0f172a",
        border: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
        zIndex: 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px",
          background: "linear-gradient(135deg, #059669, #047857)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ color: "white", fontWeight: 600, fontSize: "14px" }}>
            CultOps AI
          </span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px" }}>
            v2 · Financial Intelligence
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={clearChat}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "white",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "white",
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
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
            <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 16px 0" }}>
              Ask me anything about your operation — inventory, orders, production, finances, or strategy.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {SUGGESTED_PROMPTS.map((sp) => (
                <button
                  key={sp.label}
                  onClick={() => sendMessage(sp.prompt)}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    padding: "10px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#059669";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#334155";
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{sp.icon}</span>
                  <div style={{ color: "#e2e8f0", fontSize: "12px", fontWeight: 500, marginTop: "4px" }}>
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
            {/* Intent badges for assistant messages */}
            {msg.role === "assistant" && msg.metadata?.intents && (
              <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                {msg.metadata.intents.map((intent) => (
                  <span
                    key={intent}
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: intent === "financial" ? "#7c3aed20" : "#05966920",
                      color: intent === "financial" ? "#a78bfa" : "#6ee7b7",
                      border: `1px solid ${intent === "financial" ? "#7c3aed40" : "#05966940"}`,
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
                borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                background: msg.role === "user" ? "#059669" : "#1e293b",
                color: msg.role === "user" ? "white" : "#e2e8f0",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
              dangerouslySetInnerHTML={
                msg.role === "assistant"
                  ? { __html: renderMarkdown(msg.content) || '<span style="opacity:0.5">Thinking...</span>' }
                  : undefined
              }
            >
              {msg.role === "user" ? msg.content : undefined}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div style={{ display: "flex", gap: "4px", padding: "8px" }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "4px",
                  background: "#059669",
                  animation: `bounce 1.4s infinite ${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#7f1d1d20",
              border: "1px solid #991b1b40",
              borderRadius: "8px",
              padding: "10px",
              color: "#fca5a5",
              fontSize: "12px",
            }}
          >
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid #1e293b",
          display: "flex",
          gap: "8px",
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about inventory, finances, production..."
          rows={1}
          style={{
            flex: 1,
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "10px 12px",
            color: "#e2e8f0",
            fontSize: "13px",
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim()}
          style={{
            background: isLoading || !input.trim() ? "#1e293b" : "#059669",
            border: "none",
            borderRadius: "8px",
            width: "40px",
            cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {/* Bounce animation */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        .ai-code-block { background: #0d1117; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
        .ai-inline-code { background: #1e293b; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
        .ai-h3 { font-size: 15px; font-weight: 600; margin: 8px 0 4px; }
        .ai-h4 { font-size: 13px; font-weight: 600; margin: 6px 0 2px; }
        .ai-ul { margin: 4px 0; padding-left: 20px; }
        .ai-li { margin: 2px 0; }
      `}</style>
    </div>
  );
}
