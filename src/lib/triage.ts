import { supabase } from "@/integrations/supabase/client";

export type TriageSession = {
  id: string;
  title: string;
  likely_condition: string | null;
  urgency: string | null;
  created_at: string;
  updated_at: string;
};

export type TriageMessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

/** Pulls "### Likely condition" and "### Urgency" out of an assistant reply. */
export function extractAssessment(text: string) {
  const section = (name: string) => {
    const re = new RegExp(`###\\s*${name}\\s*\\n([\\s\\S]*?)(?:\\n###|$)`, "i");
    return text.match(re)?.[1]?.trim() ?? null;
  };
  const condition = section("Likely condition");
  const urgency = section("Urgency");
  const firstLine = (s: string | null) =>
    s
      ? s
          .split("\n")[0]
          .replace(/[*_`#]/g, "")
          .replace(/^[-•]\s*/, "")
          .trim()
          .slice(0, 160) || null
      : null;
  return { likely_condition: firstLine(condition), urgency: firstLine(urgency) };
}

export function titleFrom(text: string) {
  const clean = text.replace(/\s+/g, " ").replace(/[*_`#]/g, "").trim();
  return clean.slice(0, 70) || "New triage";
}

export async function listSessions(): Promise<TriageSession[]> {
  const { data } = await supabase
    .from("triage_sessions")
    .select("id, title, likely_condition, urgency, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  return (data ?? []) as TriageSession[];
}

export async function createSession(userId: string, title = "New triage") {
  const { data, error } = await supabase
    .from("triage_sessions")
    .insert({ user_id: userId, title })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteSession(id: string) {
  await supabase.from("triage_sessions").delete().eq("id", id);
}

export async function loadMessages(sessionId: string): Promise<TriageMessageRow[]> {
  const { data } = await supabase
    .from("triage_messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  return (data ?? []) as TriageMessageRow[];
}

export async function saveMessage(input: {
  sessionId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
}) {
  await supabase.from("triage_messages").insert({
    session_id: input.sessionId,
    user_id: input.userId,
    role: input.role,
    content: input.content,
  });
}

export async function updateSessionMeta(
  sessionId: string,
  patch: Partial<Pick<TriageSession, "title" | "likely_condition" | "urgency">>,
) {
  await supabase
    .from("triage_sessions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}
