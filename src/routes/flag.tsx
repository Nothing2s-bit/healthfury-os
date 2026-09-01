import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HieroFrame } from "@/components/HieroFrame";
import { AnkhLogo } from "@/components/AnkhLogo";
import { Flag, Loader2, ShieldAlert, Send } from "lucide-react";

export const Route = createFileRoute("/flag")({
  head: () => ({
    meta: [
      { title: "Flag Misconduct — HealthFury" },
      {
        name: "description",
        content:
          "Report unethical, unprofessional or unlawful conduct at any clinic or hospital. Patients and staff can flag incidents confidentially.",
      },
      { property: "og:title", content: "Flag Misconduct — HealthFury" },
      {
        property: "og:description",
        content: "Confidential misconduct reporting for patients and health staff, reviewed by facility administrators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FlagPage,
});

type Report = {
  id: string;
  reporter_name: string | null;
  anonymous: boolean;
  category: string;
  severity: string;
  subject_name: string | null;
  subject_role: string | null;
  facility: string | null;
  incident_at: string | null;
  location: string | null;
  description: string;
  status: string;
  resolution_note: string | null;
  reviewed_by_name: string | null;
  reference: string;
  created_at: string;
};

const CATEGORIES = [
  "Rude or abusive behaviour",
  "Negligence / patient left unattended",
  "Bribery or corruption",
  "Discrimination",
  "Theft of medicine or equipment",
  "Sexual harassment or assault",
  "Breach of patient confidentiality",
  "Intoxication on duty",
  "Unlawful act / criminal conduct",
  "Other unprofessional conduct",
];

const SEVERITIES = ["minor", "moderate", "serious", "critical"] as const;
const STAFF_ROLES = ["doctor", "nurse", "admin", "storage_manager", "minister"];
const STATUSES = ["submitted", "under_review", "escalated", "resolved", "dismissed"] as const;

const EMPTY = {
  category: CATEGORIES[0],
  severity: "moderate",
  subject_name: "",
  subject_role: "",
  facility: "",
  incident_at: "",
  location: "",
  description: "",
  anonymous: false,
};

function reference() {
  return `FLG-${Date.now().toString(36).toUpperCase().slice(-6)}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function FlagPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("misconduct_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setReports((data ?? []) as Report[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (uid) {
        const [{ data: roles }, { data: profile }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", uid),
          supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle(),
        ]);
        if (cancelled) return;
        setIsStaff((roles ?? []).some((r) => STAFF_ROLES.includes(r.role as string)));
        setDisplayName(profile?.full_name ?? auth.user?.email ?? "");
        await load();
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("misconduct-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "misconduct_reports" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const description = form.description.trim();
    if (description.length < 20) {
      setMsg("Please describe what happened in at least 20 characters.");
      return;
    }
    if (description.length > 4000) {
      setMsg("Description must be under 4000 characters.");
      return;
    }
    setSaving(true);
    setMsg(null);
    const ref = reference();
    const { error } = await supabase.from("misconduct_reports").insert({
      reporter_id: userId,
      reporter_name: form.anonymous ? null : displayName || null,
      anonymous: form.anonymous,
      category: form.category,
      severity: form.severity,
      subject_name: form.subject_name.trim().slice(0, 120) || null,
      subject_role: form.subject_role.trim().slice(0, 60) || null,
      facility: form.facility.trim().slice(0, 120) || null,
      incident_at: form.incident_at ? new Date(form.incident_at).toISOString() : null,
      location: form.location.trim().slice(0, 160) || null,
      description,
      reference: ref,
    });
    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setForm({ ...EMPTY });
    setMsg(
      form.anonymous
        ? `Report filed anonymously · ${ref}. Keep this reference — anonymous reports do not appear in your list.`
        : `Report filed · ${ref}. Administrators have been notified.`,
    );
    load();
  }

  async function review(id: string, status: string, note: string) {
    await supabase
      .from("misconduct_reports")
      .update({
        status,
        resolution_note: note.trim().slice(0, 2000) || null,
        reviewed_by: userId,
        reviewed_by_name: displayName || null,
      })
      .eq("id", id);
    load();
  }

  if (loading) {
    return (
      <HieroFrame>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[oklch(0.6_0.15_65)]" />
        </div>
      </HieroFrame>
    );
  }

  if (!userId) {
    return (
      <HieroFrame>
        <div className="mx-auto max-w-md px-6 pt-10 text-center">
          <AnkhLogo size={48} />
          <h1 className="mt-4 font-display text-2xl font-bold tracking-wider text-gold-gradient">FLAG MISCONDUCT</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Sign in first so your report can be tracked and reviewed by the right administrators.
          </p>
          <Link
            to="/register"
            search={{ role: "patient" }}
            className="mt-5 inline-block rounded-lg bg-gradient-to-b from-[oklch(0.78_0.14_78)] to-[oklch(0.55_0.12_60)] px-5 py-2 font-display text-sm uppercase tracking-wider text-white shadow"
          >
            Sign in to report
          </Link>
        </div>
      </HieroFrame>
    );
  }

  return (
    <HieroFrame className="pb-16">
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="font-display text-sm text-[oklch(0.5_0.12_65)]">
            ‹ Back
          </Link>
          <AnkhLogo size={40} />
          <span className="w-10" />
        </div>

        <h1 className="mt-3 flex items-center justify-center gap-2 text-center font-display text-2xl font-bold tracking-wider text-gold-gradient">
          <Flag className="h-5 w-5 text-[oklch(0.5_0.19_25)]" /> FLAG MISCONDUCT
        </h1>
        <p className="text-center text-xs text-muted-foreground">
          Patients and staff can report unethical, unprofessional or unlawful conduct. Reports go to facility
          administrators for review.
        </p>

        <p className="mt-3 flex items-start gap-2 rounded-lg border border-[oklch(0.8_0.12_30)] bg-[oklch(0.97_0.03_40)] p-2 text-[11px] text-[oklch(0.45_0.15_28)]">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          If someone is in immediate danger or a crime is in progress, call 10111 (police) or 10177 (ambulance) first.
        </p>

        <form
          onSubmit={submit}
          className="mt-4 grid gap-2 rounded-xl border-2 border-[oklch(0.72_0.14_75)] bg-white/85 p-4 sm:grid-cols-2"
        >
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm sm:col-span-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
            className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                Severity: {s}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={form.incident_at}
            onChange={(e) => setForm({ ...form, incident_at: e.target.value })}
            className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
          />

          {(
            [
              ["subject_name", "Person or department involved"],
              ["subject_role", "Their role (nurse, doctor, security…)"],
              ["facility", "Clinic or hospital"],
              ["location", "Ward / room / area"],
            ] as const
          ).map(([key, label]) => (
            <input
              key={key}
              placeholder={label}
              maxLength={160}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm"
            />
          ))}

          <textarea
            placeholder="What happened? Include date, time and any witnesses."
            value={form.description}
            maxLength={4000}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={5}
            className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-3 py-2 text-sm sm:col-span-2"
          />

          <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
            <input
              type="checkbox"
              checked={form.anonymous}
              onChange={(e) => setForm({ ...form, anonymous: e.target.checked })}
            />
            File anonymously — your name is not stored on the report.
          </label>

          <button
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[oklch(0.62_0.19_28)] to-[oklch(0.45_0.17_28)] px-4 py-2 font-display text-sm uppercase tracking-wider text-white shadow disabled:opacity-60 sm:col-span-2"
          >
            <Send className="h-4 w-4" /> {saving ? "Filing report…" : "Submit flag"}
          </button>
        </form>

        {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}

        <h2 className="mt-6 font-display text-sm font-bold uppercase tracking-wider text-[oklch(0.4_0.12_65)]">
          {isStaff ? "All flagged reports" : "My reports"}
        </h2>
        <ul className="mt-2 space-y-2">
          {reports.map((r) => (
            <li key={r.id} className="rounded-xl border-2 border-[oklch(0.85_0.08_82)] bg-white/85 p-3">
              <button
                onClick={() => setOpenId(openId === r.id ? null : r.id)}
                className="flex w-full items-start justify-between gap-2 text-left"
              >
                <span>
                  <span className="font-display text-sm font-bold uppercase tracking-wider text-[oklch(0.35_0.1_65)]">
                    {r.category}
                  </span>
                  <br />
                  <span className="font-mono text-[11px] text-muted-foreground">{r.reference}</span>
                  <span className="ml-2 text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-display text-[10px] uppercase tracking-wider text-white ${
                    r.severity === "critical" || r.severity === "serious"
                      ? "bg-[oklch(0.5_0.19_25)]"
                      : r.severity === "moderate"
                        ? "bg-[oklch(0.62_0.15_65)]"
                        : "bg-[oklch(0.5_0.11_155)]"
                  }`}
                >
                  {r.severity}
                </span>
              </button>

              {openId === r.id && (
                <div className="mt-3 space-y-2 border-t border-[oklch(0.9_0.05_85)] pt-3 text-xs">
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <Field label="Reported by" value={r.anonymous ? "Anonymous" : r.reporter_name} />
                    <Field label="Status" value={r.status.replace("_", " ")} />
                    <Field label="Person / dept" value={r.subject_name} />
                    <Field label="Their role" value={r.subject_role} />
                    <Field label="Facility" value={r.facility} />
                    <Field label="Location" value={r.location} />
                    <Field
                      label="Incident time"
                      value={r.incident_at ? new Date(r.incident_at).toLocaleString() : null}
                    />
                    <Field label="Reviewed by" value={r.reviewed_by_name} />
                  </dl>
                  <p className="rounded-lg bg-[oklch(0.96_0.04_85)] p-2">{r.description}</p>
                  {r.resolution_note && (
                    <p className="rounded-lg bg-[oklch(0.95_0.05_155)] p-2">Outcome: {r.resolution_note}</p>
                  )}
                  {isStaff && <ReviewForm report={r} onSave={review} />}
                </div>
              )}
            </li>
          ))}
          {reports.length === 0 && (
            <li className="text-xs text-muted-foreground">No reports on record yet.</li>
          )}
        </ul>
      </div>
    </HieroFrame>
  );
}

function ReviewForm({
  report,
  onSave,
}: {
  report: Report;
  onSave: (id: string, status: string, note: string) => Promise<void>;
}) {
  const [status, setStatus] = useState(report.status);
  const [note, setNote] = useState(report.resolution_note ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid gap-2 rounded-lg border border-[oklch(0.86_0.06_82)] p-2 sm:grid-cols-[auto_1fr_auto]">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-2 py-1.5 text-xs"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace("_", " ")}
          </option>
        ))}
      </select>
      <input
        value={note}
        maxLength={2000}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Investigation outcome / action taken"
        className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white px-2 py-1.5 text-xs"
      />
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onSave(report.id, status, note);
          setBusy(false);
        }}
        className="rounded-lg bg-gradient-to-b from-[oklch(0.78_0.14_78)] to-[oklch(0.55_0.12_60)] px-3 py-1.5 font-display text-[11px] uppercase tracking-wider text-white shadow disabled:opacity-60"
      >
        {busy ? "Saving…" : "Update"}
      </button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </>
  );
}
