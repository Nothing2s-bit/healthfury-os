import { supabase } from "@/integrations/supabase/client";

function esc(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]) {
  const head = columns.join(",");
  const body = rows.map((r) => columns.map((c) => esc(r[c])).join(",")).join("\n");
  return `${head}\n${body}`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function dohReference() {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DOH-${Date.now().toString(36).toUpperCase().slice(-5)}-${rand}`;
}

/** Records a submission of a report batch to the Department of Health. */
export async function submitToDoh(opts: {
  reportType: string;
  rowCount: number;
  facility?: string;
  submittedBy: string | null;
  submittedByName?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  note?: string;
}) {
  const reference = dohReference();
  const { error } = await supabase.from("doh_submissions").insert({
    report_type: opts.reportType,
    row_count: opts.rowCount,
    facility: opts.facility ?? "HealthFury OS",
    submitted_by: opts.submittedBy,
    submitted_by_name: opts.submittedByName ?? null,
    period_start: opts.periodStart ?? null,
    period_end: opts.periodEnd ?? null,
    reference,
    status: "submitted",
    note: opts.note ?? null,
  });
  if (error) throw error;
  return reference;
}
