import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ScanLine, RefreshCw } from "lucide-react";
import { HieroFrame } from "@/components/HieroFrame";
import { AnkhLogo } from "@/components/AnkhLogo";
import { fetchAuditLog, logScan, type AuditEntry, type ScanType } from "@/lib/audit";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Scan Audit Log — HealthFury OS" },
      {
        name: "description",
        content:
          "Trace every AI health scan and security scan run in HealthFury OS with findings, status and timestamps.",
      },
      { property: "og:title", content: "Scan Audit Log — HealthFury OS" },
      {
        property: "og:description",
        content: "Every scan attempt, its findings and timestamp, in one traceable log.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditPage,
});

const TABS: { key: ScanType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "health", label: "Health scans" },
  { key: "security", label: "Security scans" },
];

function AuditPage() {
  const [filter, setFilter] = useState<ScanType | "all">("all");
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [findings, setFindings] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAuditLog(filter));
    } catch {
      setError("Could not load the audit log. Make sure you are signed in.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const recordSecurityScan = async () => {
    if (!summary.trim()) return;
    setSaving(true);
    try {
      await logScan({
        scanType: "security",
        status: "success",
        summary: summary.trim(),
        findings: findings
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean),
      });
      setSummary("");
      setFindings("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <HieroFrame className="pb-16">
      <div className="mx-auto max-w-md px-5 pt-6">
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)]"
          >
            ‹
          </Link>
          <AnkhLogo size={40} />
          <button
            type="button"
            onClick={() => void load()}
            aria-label="Refresh audit log"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[oklch(0.6_0.15_65)] shadow ring-1 ring-[oklch(0.72_0.14_75)]"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        <h1 className="mt-3 text-center font-display text-2xl font-bold tracking-wider text-gold-gradient">
          SCAN AUDIT LOG
        </h1>
        <p className="mt-1 text-center font-body text-xs text-foreground/70">
          Every AI health scan and security scan attempt, with its findings and timestamp.
        </p>

        <div className="mt-4 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={`flex-1 rounded-full border px-3 py-2 font-body text-[11px] font-semibold tracking-wide transition ${
                filter === t.key
                  ? "border-[oklch(0.72_0.14_75)] bg-[oklch(0.72_0.14_75)]/25 text-foreground"
                  : "border-[oklch(0.72_0.14_75)]/40 bg-white/60 text-foreground/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-[oklch(0.5_0.19_25)]/10 px-3 py-2 font-body text-xs text-[oklch(0.5_0.19_25)]">
            {error}
          </p>
        )}

        <div className="mt-4 space-y-3">
          {loading && <p className="font-body text-xs text-foreground/60">Loading…</p>}
          {!loading && rows.length === 0 && !error && (
            <p className="font-body text-xs text-foreground/60">No scans recorded yet.</p>
          )}
          {rows.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-[oklch(0.72_0.14_75)]/60 bg-white/75 p-3 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[oklch(0.72_0.14_75)]/25 text-[oklch(0.5_0.12_65)]">
                  {row.scan_type === "security" ? <ShieldCheck size={14} /> : <ScanLine size={14} />}
                </span>
                <span className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                  {row.scan_type} scan
                </span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 font-body text-[10px] font-semibold text-white ${
                    row.status === "success"
                      ? "bg-[oklch(0.55_0.11_155)]"
                      : "bg-[oklch(0.5_0.19_25)]"
                  }`}
                >
                  {row.status}
                </span>
              </div>

              <p className="mt-2 font-body text-xs text-foreground/80">{row.summary ?? "—"}</p>

              {row.urgency && (
                <p className="mt-1 font-body text-[11px] text-foreground/60">
                  Urgency: <span className="font-semibold">{row.urgency}</span>
                </p>
              )}

              {row.findings.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-4 font-body text-[11px] text-foreground/70">
                  {row.findings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}

              <p className="mt-2 font-body text-[10px] uppercase tracking-wider text-foreground/50">
                {new Date(row.created_at).toLocaleString()}
              </p>
            </article>
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-[oklch(0.72_0.14_75)]/60 bg-white/75 p-4 shadow-sm">
          <h2 className="font-display text-sm font-bold tracking-wider text-gold-gradient">
            RECORD A SECURITY SCAN
          </h2>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="What was scanned (e.g. backend RLS review)"
            className="mt-3 w-full rounded-xl border border-[oklch(0.72_0.14_75)]/50 bg-white px-3 py-2 font-body text-xs outline-none"
          />
          <textarea
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            rows={3}
            placeholder="One finding per line"
            className="mt-2 w-full rounded-xl border border-[oklch(0.72_0.14_75)]/50 bg-white px-3 py-2 font-body text-xs outline-none"
          />
          <button
            type="button"
            disabled={saving || !summary.trim()}
            onClick={() => void recordSecurityScan()}
            className="mt-3 w-full rounded-full bg-[oklch(0.72_0.14_75)] px-4 py-2 font-display text-xs font-bold tracking-wider text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add to audit log"}
          </button>
        </section>
      </div>
    </HieroFrame>
  );
}
