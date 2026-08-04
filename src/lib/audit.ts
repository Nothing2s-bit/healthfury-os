import { supabase } from "@/integrations/supabase/client";

export type ScanType = "health" | "security";
export type ScanStatus = "success" | "failed";

export type AuditEntry = {
  id: string;
  scan_type: ScanType;
  actor_id: string | null;
  status: ScanStatus;
  summary: string | null;
  urgency: string | null;
  findings: string[];
  created_at: string;
};

/** Records one scan attempt. Silently no-ops when nobody is signed in. */
export async function logScan(input: {
  scanType: ScanType;
  status: ScanStatus;
  summary?: string | null;
  urgency?: string | null;
  findings?: string[];
}) {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) return;

  await supabase.from("scan_audit_log").insert({
    scan_type: input.scanType,
    actor_id: uid,
    status: input.status,
    summary: input.summary ?? null,
    urgency: input.urgency ?? null,
    findings: input.findings ?? [],
  });
}

export async function fetchAuditLog(filter: ScanType | "all") {
  let query = supabase
    .from("scan_audit_log")
    .select("id, scan_type, actor_id, status, summary, urgency, findings, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter !== "all") query = query.eq("scan_type", filter);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    findings: Array.isArray(row.findings) ? (row.findings as string[]) : [],
  })) as AuditEntry[];
}
