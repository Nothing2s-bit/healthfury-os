import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, ChevronLeft, Siren } from "lucide-react";
import { AnkhLogo } from "@/components/AnkhLogo";
import { HieroFrame } from "@/components/HieroFrame";
import { SymptomChecklist } from "@/components/SymptomChecklist";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Symptom Companion — HealthFury 2.0" },
      {
        name: "description",
        content:
          "Ask HealthFury's AI Symptom Companion for safe, non-diagnostic health guidance and clear next steps.",
      },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error, stop } = useChat({ transport });
  const [input, setInput] = useState("");
  const [intakeDone, setIntakeDone] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [status]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || isLoading) return;
    sendMessage({ text: t });
    setInput("");
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
          <div className="h-9 w-9" />
        </div>

        <h1 className="mt-2 text-center font-display text-2xl font-bold tracking-wider text-gold-gradient">
          AI SYMPTOM COMPANION
        </h1>
        <p className="mt-1 text-center font-body text-xs italic text-muted-foreground">
          General guidance only — not a diagnosis.
        </p>

        {/* Emergency banner */}
        <div className="mt-4 flex items-start gap-2 rounded-md border border-[oklch(0.7_0.19_25_/_0.5)] bg-[oklch(0.98_0.03_35)] p-3 text-[11px] leading-snug text-[oklch(0.35_0.15_25)]">
          <Siren className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            If this is an emergency (chest pain, trouble breathing, severe bleeding, stroke signs),
            call your local emergency number immediately.
          </span>
        </div>

        {/* Transcript */}
        <div className="mt-5 space-y-4">
          {!intakeDone && messages.length === 0 && (
            <SymptomChecklist
              disabled={isLoading}
              onSubmit={(summary) => {
                setIntakeDone(true);
                submit(summary);
              }}
            />
          )}

          {messages.map((m) => {
            const text = m.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("");
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
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
      </div>

      {/* Composer */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[oklch(0.82_0.1_80)] bg-white/95 backdrop-blur">
        <form
          className="mx-auto flex max-w-md items-end gap-2 px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
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
    </HieroFrame>
  );
}