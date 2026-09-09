import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, ChevronLeft, Siren, Plus, Trash2, History, X } from "lucide-react";
import { AnkhLogo } from "@/components/AnkhLogo";
import { HieroFrame } from "@/components/HieroFrame";
import { SymptomChecklist } from "@/components/SymptomChecklist";
import { supabase } from "@/integrations/supabase/client";
import {
  createSession,
  deleteSession,
  extractAssessment,
  listSessions,
  loadMessages,
  saveMessage,
  titleFrom,
  updateSessionMeta,
  type TriageSession,
} from "@/lib/triage";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Triage — HealthFury 2.0" },
      {
        name: "description",
        content:
          "HealthFury AI Triage: describe your symptoms and get a structured assessment, urgency level and next steps, with saved triage history.",
      },
      { property: "og:title", content: "AI Triage — HealthFury 2.0" },
      {
        property: "og:description",
        content: "Structured AI triage assessments with urgency, treatment plan and saved history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TriagePage,
});

function TriagePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<TriageSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  const refreshSessions = useCallback(async () => {
    const rows = await listSessions();
    setSessions(rows);
    return rows;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(data.user?.id ?? null);
      if (data.user) await refreshSessions();
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSessions]);

  const openSession = async (id: string) => {
    setLoading(true);
    const rows = await loadMessages(id);
    setInitialMessages(
      rows.map((r) => ({
        id: r.id,
        role: r.role,
        parts: [{ type: "text" as const, text: r.content }],
      })),
    );
    setActiveId(id);
    setHistoryOpen(false);
    setLoading(false);
  };

  const startNew = () => {
    setInitialMessages([]);
    setActiveId(null);
    setHistoryOpen(false);
  };

  const removeSession = async (id: string) => {
    await deleteSession(id);
    setSessions((s) => s.filter((x) => x.id !== id));
    if (id === activeId) startNew();
  };

  return (
    <HieroFrame className="pb-40">
      <div className="mx-auto max-w-md px-6 pt-6">
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)]"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <AnkhLogo size={40} />
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)]"
            aria-label="Triage history"
          >
            <History className="h-5 w-5" />
          </button>
        </div>

        <h1 className="mt-2 text-center font-display text-2xl font-bold tracking-wider text-gold-gradient">
          AI TRIAGE
        </h1>
        <p className="mt-1 text-center font-body text-xs italic text-muted-foreground">
          AI triage assessment — a clinician must confirm before treatment.
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-md border border-[oklch(0.7_0.19_25_/_0.5)] bg-[oklch(0.98_0.03_35)] p-3 text-[11px] leading-snug text-[oklch(0.35_0.15_25)]">
          <Siren className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            If this is an emergency (chest pain, trouble breathing, severe bleeding, stroke signs),
            call 10177 or 112 immediately.
          </span>
        </div>

        {!loading && (
          <ChatWindow
            key={activeId ?? "new"}
            sessionId={activeId}
            userId={userId}
            initialMessages={initialMessages}
            onSessionCreated={(id) => setActiveId(id)}
            onSessionsChanged={refreshSessions}
          />
        )}
      </div>

      {historyOpen && (
        <HistoryPanel
          sessions={sessions}
          activeId={activeId}
          signedIn={!!userId}
          onClose={() => setHistoryOpen(false)}
          onOpen={openSession}
          onNew={startNew}
          onDelete={removeSession}
        />
      )}
    </HieroFrame>
  );
}

function HistoryPanel({
  sessions,
  activeId,
  signedIn,
  onClose,
  onOpen,
  onNew,
  onDelete,
}: {
  sessions: TriageSession[];
  activeId: string | null;
  signedIn: boolean;
  onClose: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="h-full w-[85%] max-w-xs overflow-y-auto border-l border-[oklch(0.82_0.1_80)] bg-[oklch(0.99_0.01_85)] p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-gold-gradient">
            Triage history
          </h2>
          <button onClick={onClose} aria-label="Close history">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <button
          onClick={onNew}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[oklch(0.78_0.14_80)] to-[oklch(0.55_0.13_65)] px-3 py-2 font-display text-xs font-bold uppercase tracking-wider text-white shadow"
        >
          <Plus className="h-4 w-4" /> New triage
        </button>

        {!signedIn && (
          <p className="mt-4 rounded-md bg-white p-3 text-[11px] text-muted-foreground ring-1 ring-[oklch(0.82_0.1_80)]">
            Sign in to save your triage sessions.{" "}
            <Link to="/register" className="underline">
              Register
            </Link>
          </p>
        )}

        <ul className="mt-4 space-y-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className={`flex items-start gap-2 rounded-xl border p-3 ${
                s.id === activeId
                  ? "border-[oklch(0.72_0.14_75)] bg-white"
                  : "border-[oklch(0.88_0.05_85)] bg-white/70"
              }`}
            >
              <button className="flex-1 text-left" onClick={() => onOpen(s.id)}>
                <p className="line-clamp-2 font-body text-xs font-semibold text-foreground">
                  {s.title}
                </p>
                {s.likely_condition && (
                  <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                    {s.likely_condition}
                  </p>
                )}
                <p className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {s.urgency && (
                    <span className="rounded-full bg-[oklch(0.95_0.05_75)] px-2 py-0.5 text-[9px] font-bold text-[oklch(0.45_0.12_65)]">
                      {s.urgency}
                    </span>
                  )}
                  {new Date(s.updated_at).toLocaleDateString()}
                </p>
              </button>
              <button onClick={() => onDelete(s.id)} aria-label="Delete session">
                <Trash2 className="h-4 w-4 text-[oklch(0.6_0.17_25)]" />
              </button>
            </li>
          ))}
          {sessions.length === 0 && signedIn && (
            <li className="py-6 text-center text-xs text-muted-foreground">No saved triage yet.</li>
          )}
        </ul>
      </aside>
    </div>
  );
}

function ChatWindow({
  sessionId,
  userId,
  initialMessages,
  onSessionCreated,
  onSessionsChanged,
}: {
  sessionId: string | null;
  userId: string | null;
  initialMessages: UIMessage[];
  onSessionCreated: (id: string) => void;
  onSessionsChanged: () => void;
}) {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const sessionRef = useRef<string | null>(sessionId);
  const [input, setInput] = useState("");
  const [intakeDone, setIntakeDone] = useState(initialMessages.length > 0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, stop } = useChat({
    id: sessionId ?? "new",
    messages: initialMessages,
    transport,
    onFinish: async ({ message }) => {
      const text = message.parts
        .map((p) => (p.type === "text" ? p.text : ""))
        .join("")
        .trim();
      const sid = sessionRef.current;
      if (!text || !sid || !userId) return;
      await saveMessage({ sessionId: sid, userId, role: "assistant", content: text });
      await updateSessionMeta(sid, extractAssessment(text));
      onSessionsChanged();
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [status, sessionId]);

  const submit = async (text: string) => {
    const t = text.trim();
    if (!t || isLoading) return;
    setInput("");
    sendMessage({ text: t });

    if (!userId) return;
    let sid = sessionRef.current;
    if (!sid) {
      try {
        sid = await createSession(userId, titleFrom(t));
        sessionRef.current = sid;
        onSessionCreated(sid);
      } catch {
        return;
      }
    }
    await saveMessage({ sessionId: sid, userId, role: "user", content: t });
    onSessionsChanged();
  };

  return (
    <>
      <div className="mt-5 space-y-4">
        {!intakeDone && messages.length === 0 && (
          <SymptomChecklist
            disabled={isLoading}
            onSubmit={(summary) => {
              setIntakeDone(true);
              void submit(summary);
            }}
          />
        )}

        {messages.map((m) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={
                  isUser
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-[oklch(0.55_0.11_155)] px-3 py-2 text-sm text-white shadow"
                    : "max-w-[92%] font-body text-[15px] leading-relaxed text-foreground"
                }
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{text}</p>
                ) : (
                  <div className="prose prose-sm max-w-none prose-headings:font-display prose-headings:text-[oklch(0.45_0.12_75)] prose-p:my-2 prose-li:my-0.5 prose-strong:text-foreground">
                    <ReactMarkdown>{text || "…"}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {status === "submitted" && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 text-sm italic text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[oklch(0.72_0.14_75)]" />
              Thinking…
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700">
            {error.message || "Something went wrong. Please try again."}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[oklch(0.82_0.1_80)] bg-white/95 backdrop-blur">
        <form
          className="mx-auto flex max-w-md items-end gap-2 px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(input);
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(input);
              }
            }}
            placeholder="Describe your symptoms…"
            rows={1}
            className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 font-body text-sm text-foreground shadow-inner focus:border-[oklch(0.72_0.14_75)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.14_75_/_0.3)]"
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={() => stop()}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[oklch(0.5_0.19_25)] text-white shadow"
              aria-label="Stop"
            >
              ■
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.78_0.14_80)] to-[oklch(0.55_0.13_65)] text-white shadow disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>
    </>
  );
}
