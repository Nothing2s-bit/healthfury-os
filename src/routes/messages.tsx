import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  Send,
  Paperclip,
  Mic,
  Video as VideoIcon,
  Square,
  X,
  MessageCircle,
} from "lucide-react";
import { AnkhLogo } from "@/components/AnkhLogo";
import { HieroFrame } from "@/components/HieroFrame";
import { supabase } from "@/integrations/supabase/client";
import { startRecorder, type RecorderHandle } from "@/lib/chat-media";

type Conversation = {
  id: string;
  patient_id: string;
  doctor_id: string;
  last_message_at: string;
  other_name?: string | null;
  other_role?: "patient" | "doctor";
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: "text" | "image" | "audio" | "video";
  body: string | null;
  media_path: string | null;
  media_mime: string | null;
  media_duration_ms: number | null;
  created_at: string;
};

type Doctor = {
  id: string;
  full_name: string | null;
  dept_specialty: string | null;
  consult_hours: string | null;
};

type SearchParams = { c?: string };

export const Route = createFileRoute("/messages")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    c: typeof s.c === "string" ? s.c : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Doctor Messages — HealthFury 2.0" },
      {
        name: "description",
        content:
          "Secure doctor and patient chat with photo, voice, and video attachments on HealthFury 2.0.",
      },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"patient" | "doctor" | "other" | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const selectedId = search.c ?? null;

  // Load user + role + conversations
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (cancel) return;
      const uid = u.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const isDoctor = roles?.some((r) => r.role === "doctor");
      const isPatient = roles?.some((r) => r.role === "patient");
      setRole(isDoctor ? "doctor" : isPatient ? "patient" : "other");

      const { data: convs } = await supabase
        .from("conversations")
        .select("id, patient_id, doctor_id, last_message_at")
        .order("last_message_at", { ascending: false });

      const others = Array.from(
        new Set((convs ?? []).map((c) => (c.patient_id === uid ? c.doctor_id : c.patient_id))),
      );
      const nameMap = new Map<string, string | null>();
      if (others.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", others);
        (profs ?? []).forEach((p) => nameMap.set(p.id, p.full_name));
      }
      setConversations(
        (convs ?? []).map((c) => {
          const otherId = c.patient_id === uid ? c.doctor_id : c.patient_id;
          return {
            ...c,
            other_name: nameMap.get(otherId) ?? null,
            other_role: c.patient_id === uid ? "doctor" : "patient",
          };
        }),
      );
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // Live-refresh conversation list on new messages / new conversations
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`conv-list-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        async () => {
          const { data: convs } = await supabase
            .from("conversations")
            .select("id, patient_id, doctor_id, last_message_at")
            .order("last_message_at", { ascending: false });
          setConversations((prev) => {
            const nameById = new Map(prev.map((p) => [p.id, p.other_name] as const));
            return (convs ?? []).map((c) => ({
              ...c,
              other_name: nameById.get(c.id) ?? null,
              other_role: c.patient_id === userId ? "doctor" : "patient",
            }));
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId]);

  // Red unread bubbles: count messages from the other party not yet seen
  useEffect(() => {
    if (!userId || conversations.length === 0) return;
    let active = true;
    (async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        conversations.map(async (c) => {
          let seen = "";
          try {
            seen = localStorage.getItem(`hf-msg-seen-${c.id}`) ?? "";
          } catch {
            /* storage unavailable */
          }
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", c.id)
            .neq("sender_id", userId)
            .gt("created_at", seen || "1970-01-01T00:00:00Z");
          counts[c.id] = count ?? 0;
        }),
      );
      if (active) setUnread(counts);
    })();
    return () => {
      active = false;
    };
  }, [userId, conversations]);

  const markSeen = useCallback((conversationId: string, lastSeenAt: string) => {
    try {
      localStorage.setItem(`hf-msg-seen-${conversationId}`, lastSeenAt);
    } catch {
      /* storage unavailable */
    }
    setUnread((prev) => (prev[conversationId] === 0 ? prev : { ...prev, [conversationId]: 0 }));
  }, []);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  return (
    <HieroFrame className="pb-40">
      <div className="mx-auto max-w-md px-6 pt-6">
        <div className="flex items-center justify-between">
          <Link
            to={selectedId ? "/messages" : "/dashboard"}
            search={selectedId ? { c: undefined } : undefined}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)]"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <AnkhLogo size={40} />
          <div className="h-9 w-9" />
        </div>

        <h1 className="mt-2 text-center font-display text-2xl font-bold tracking-wider text-gold-gradient">
          {selected ? (selected.other_name || (selected.other_role === "doctor" ? "Doctor" : "Patient")) : "MESSAGES"}
        </h1>
        <p className="mt-1 text-center font-body text-xs italic text-muted-foreground">
          {selected
            ? "Secure end-to-end conversation"
            : "Doctor ↔ patient chat with photo, voice & video"}
        </p>

        {!userId && !loading && (
          <SignInRequired />
        )}

        {userId && !selectedId && (
          <ConversationList
            loading={loading}
            role={role}
            conversations={conversations}
            userId={userId}
            unread={unread}
            onOpen={(id) => {
              const conv = conversations.find((c) => c.id === id);
              markSeen(id, conv?.last_message_at ?? new Date().toISOString());
              navigate({ to: "/messages", search: { c: id } });
            }}
          />
        )}

        {userId && selected && (
          <ConversationView
            key={selected.id}
            conversation={selected}
            userId={userId}
            markSeen={markSeen}
          />
        )}
      </div>
    </HieroFrame>
  );
}

function SignInRequired() {
  return (
    <div className="mt-8 rounded-md border-2 border-[oklch(0.72_0.14_75)] bg-white/70 p-6 text-center">
      <MessageCircle className="mx-auto h-8 w-8 text-[oklch(0.6_0.15_65)]" />
      <p className="mt-2 font-body text-sm text-foreground">Sign in to open your messages.</p>
      <Link
        to="/register"
        search={{ role: "patient" }}
        className="mt-4 inline-block rounded-md border-2 border-[oklch(0.55_0.15_65)] bg-gradient-to-b from-[oklch(0.9_0.11_88)] to-[oklch(0.65_0.15_68)] px-4 py-2 font-display text-xs font-bold uppercase tracking-widest text-[oklch(0.25_0.06_50)] shadow"
      >
        Sign In
      </Link>
    </div>
  );
}

function ConversationList({
  loading,
  role,
  conversations,
  userId,
  unread,
  onOpen,
}: {
  loading: boolean;
  role: "patient" | "doctor" | "other" | null;
  conversations: Conversation[];
  userId: string;
  unread: Record<string, number>;
  onOpen: (id: string) => void;
}) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (role !== "patient") return;
    (async () => {
      const { data } = await supabase.from("doctors_directory").select("id, full_name, dept_specialty, consult_hours");
      setDoctors((data ?? []) as Doctor[]);
    })();
  }, [role]);

  async function openWithDoctor(doctorId: string) {
    setOpeningId(doctorId);
    setErr(null);
    const { data, error } = await supabase.rpc("get_or_create_conversation", { _doctor_id: doctorId });
    setOpeningId(null);
    if (error) {
      setErr(error.message);
      return;
    }
    if (typeof data === "string") onOpen(data);
  }

  return (
    <div className="mt-5 space-y-5">
      <section className="rounded-md border-2 border-[oklch(0.72_0.14_75)] bg-white/70 p-3">
        <h2 className="font-display text-xs font-bold uppercase tracking-widest text-[oklch(0.35_0.06_60)]">
          Your conversations
        </h2>
        <div className="mt-2 divide-y divide-[oklch(0.85_0.06_80)]">
          {loading && <p className="py-3 text-center text-xs text-muted-foreground">Loading…</p>}
          {!loading && conversations.length === 0 && (
            <p className="py-3 text-center text-xs text-muted-foreground">
              {role === "doctor"
                ? "No patient conversations yet."
                : "No conversations yet. Start one below."}
            </p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onOpen(c.id)}
              className="flex w-full items-center justify-between py-2 text-left"
            >
              <div>
                <p className="font-body text-sm font-semibold text-foreground">
                  {c.other_name || (c.other_role === "doctor" ? "Doctor" : "Patient")}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {c.other_role} · {new Date(c.last_message_at).toLocaleString()}
                </p>
              </div>
              <span className="flex items-center gap-2">
                {(unread[c.id] ?? 0) > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[oklch(0.55_0.2_25)] px-1.5 text-[10px] font-bold text-white shadow">
                    {unread[c.id] > 9 ? "9+" : unread[c.id]}
                  </span>
                )}
                <ChevronLeft className="h-4 w-4 rotate-180 text-[oklch(0.6_0.15_65)]" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {role === "patient" && (
        <section className="rounded-md border-2 border-[oklch(0.72_0.14_75)] bg-white/70 p-3">
          <h2 className="font-display text-xs font-bold uppercase tracking-widest text-[oklch(0.35_0.06_60)]">
            Message a doctor
          </h2>
          {doctors.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">No doctors registered yet.</p>
          )}
          <div className="mt-2 divide-y divide-[oklch(0.85_0.06_80)]">
            {doctors.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-body text-sm font-semibold text-foreground">
                    {d.full_name || "Doctor"}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {d.dept_specialty || "General practice"}
                    {d.consult_hours ? ` · ${d.consult_hours}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openWithDoctor(d.id)}
                  disabled={openingId === d.id}
                  className="rounded-md border border-[oklch(0.55_0.15_65)] bg-gradient-to-b from-[oklch(0.9_0.11_88)] to-[oklch(0.65_0.15_68)] px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-[oklch(0.25_0.06_50)] shadow disabled:opacity-60"
                >
                  {openingId === d.id ? "…" : "Chat"}
                </button>
              </div>
            ))}
          </div>
          {err && <p className="mt-2 text-xs text-[oklch(0.5_0.19_25)]">{err}</p>}
        </section>
      )}

      {role === "doctor" && conversations.length === 0 && (
        <p className="text-center text-xs italic text-muted-foreground">
          Patients you chat with will appear here.
        </p>
      )}

      <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        Signed in as {role ?? "user"}
      </p>
    </div>
  );
}

function ConversationView({
  conversation,
  userId,
  markSeen,
}: {
  conversation: Conversation;
  userId: string;
  markSeen: (conversationId: string, lastSeenAt: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, kind, body, media_path, media_mime, media_duration_ms, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });
      if (cancel) return;
      setMessages((data ?? []) as Message[]);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [conversation.id]);

  useEffect(() => {
    const ch = supabase
      .channel(`conv-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            const m = payload.new as Message;
            if (prev.some((p) => p.id === m.id)) return prev;
            return [...prev, m];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversation.id]);

  useEffect(() => {
    if (messages.length) markSeen(conversation.id, messages[messages.length - 1].created_at);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.id, messages.length]);

  return (
    <div className="mt-4">
      <div className="min-h-[40vh] space-y-3">
        {loading && (
          <p className="text-center text-xs italic text-muted-foreground">Loading messages…</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-center text-xs italic text-muted-foreground">
            Say hello — send a message, photo, voice note or video.
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} mine={m.sender_id === userId} />
        ))}
        <div ref={bottomRef} />
      </div>
      <Composer conversationId={conversation.id} userId={userId} />
    </div>
  );
}

function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!message.media_path) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase.storage
        .from("chat-media")
        .createSignedUrl(message.media_path!, 60 * 60);
      if (!cancel) setUrl(data?.signedUrl ?? null);
    })();
    return () => {
      cancel = true;
    };
  }, [message.media_path]);

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow ${
          mine
            ? "rounded-br-sm bg-[oklch(0.55_0.11_155)] text-white"
            : "rounded-bl-sm bg-white text-foreground ring-1 ring-[oklch(0.82_0.1_80)]"
        }`}
      >
        {message.kind === "text" && (
          <p className="whitespace-pre-wrap">{message.body}</p>
        )}
        {message.kind === "image" && url && (
          <img
            src={url}
            alt={message.body ?? "Photo"}
            className="max-h-64 rounded-lg object-cover"
          />
        )}
        {message.kind === "audio" && url && (
          <audio controls src={url} className="w-56 max-w-full" />
        )}
        {message.kind === "video" && url && (
          <video controls src={url} className="max-h-64 w-56 max-w-full rounded-lg" />
        )}
        {message.kind !== "text" && !url && (
          <p className="italic opacity-70">Loading attachment…</p>
        )}
        <p
          className={`mt-1 text-[10px] ${
            mine ? "text-white/70" : "text-muted-foreground"
          }`}
        >
          {time}
        </p>
      </div>
    </div>
  );
}

function Composer({ conversationId, userId }: { conversationId: string; userId: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState<null | { kind: "audio" | "video"; startedAt: number }>(null);
  const recorderRef = useRef<RecorderHandle | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed(Date.now() - recording.startedAt), 250);
    return () => clearInterval(t);
  }, [recording]);

  useEffect(() => {
    if (recording?.kind === "video" && recorderRef.current && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = recorderRef.current.stream;
      videoPreviewRef.current.play().catch(() => {});
    }
  }, [recording]);

  const insertMessage = useCallback(
    async (row: {
      kind: Message["kind"];
      body?: string | null;
      media_path?: string | null;
      media_mime?: string | null;
      media_duration_ms?: number | null;
    }) => {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        kind: row.kind,
        body: row.body ?? null,
        media_path: row.media_path ?? null,
        media_mime: row.media_mime ?? null,
        media_duration_ms: row.media_duration_ms ?? null,
      });
      if (error) throw error;
    },
    [conversationId, userId],
  );

  async function sendText() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setErr(null);
    try {
      await insertMessage({ kind: "text", body: t });
      setText("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function uploadBlob(blob: Blob, ext: string, mime: string) {
    const path = `${conversationId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("chat-media")
      .upload(path, blob, { contentType: mime, upsert: false });
    if (error) throw error;
    return path;
  }

  async function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSending(true);
    setErr(null);
    try {
      const kind: Message["kind"] = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("audio/")
            ? "audio"
            : "image";
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = await uploadBlob(file, ext, file.type || "application/octet-stream");
      await insertMessage({ kind, media_path: path, media_mime: file.type });
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Upload failed");
    } finally {
      setSending(false);
    }
  }

  async function startRec(kind: "audio" | "video") {
    setErr(null);
    try {
      const handle = await startRecorder(kind);
      recorderRef.current = handle;
      setRecording({ kind, startedAt: Date.now() });
      setElapsed(0);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Microphone/camera unavailable");
    }
  }

  async function stopRec() {
    const handle = recorderRef.current;
    if (!handle || !recording) return;
    setSending(true);
    try {
      const { blob, mime, ext, durationMs } = await handle.stop();
      recorderRef.current = null;
      const kind = recording.kind;
      setRecording(null);
      const path = await uploadBlob(blob, ext, mime);
      await insertMessage({
        kind,
        media_path: path,
        media_mime: mime,
        media_duration_ms: durationMs,
      });
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Recording failed");
    } finally {
      setSending(false);
    }
  }

  function cancelRec() {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setRecording(null);
  }

  const seconds = Math.floor(elapsed / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[oklch(0.82_0.1_80)] bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-md px-4 py-3">
        {err && (
          <p className="mb-2 rounded-md border border-red-300 bg-red-50 p-1.5 text-center text-[11px] text-red-700">
            {err}
          </p>
        )}

        {recording?.kind === "video" && (
          <video
            ref={videoPreviewRef}
            muted
            playsInline
            className="mb-2 h-32 w-full rounded-lg bg-black object-cover"
          />
        )}

        {recording ? (
          <div className="flex items-center gap-2 rounded-xl border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 shadow-inner">
            <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-[oklch(0.5_0.19_25)]" />
            <span className="font-display text-xs font-semibold uppercase tracking-widest text-[oklch(0.35_0.06_60)]">
              Rec {recording.kind} · {mm}:{ss}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRec}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[oklch(0.5_0.19_25)] ring-1 ring-[oklch(0.82_0.1_80)]"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={stopRec}
                disabled={sending}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[oklch(0.5_0.19_25)] text-white shadow disabled:opacity-60"
                aria-label="Stop and send"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            </div>
          </div>
        ) : (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              sendText();
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,audio/*,video/*"
              className="hidden"
              onChange={onFilePick}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-white text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)] disabled:opacity-60"
              aria-label="Attach"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => startRec("audio")}
              disabled={sending}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-white text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)] disabled:opacity-60"
              aria-label="Record voice"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => startRec("video")}
              disabled={sending}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-white text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)] disabled:opacity-60"
              aria-label="Record video"
            >
              <VideoIcon className="h-4 w-4" />
            </button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendText();
                }
              }}
              placeholder="Type a message…"
              rows={1}
              className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 font-body text-sm text-foreground shadow-inner focus:border-[oklch(0.72_0.14_75)] focus:outline-none"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.78_0.14_80)] to-[oklch(0.55_0.13_65)] text-white shadow disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}